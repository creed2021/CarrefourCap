const cds = require('@sap/cds');
const path = require('path');
const soap = require('soap');
const axios = require("axios");
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const xml2js = require('xml2js');
const { Token } = require('@sap/xssec');
const { threadId } = require('worker_threads');
const { ensureFolder, confirmAdjuntos, rollbackAdjuntos } = require("./helpers/dms-helper");
const { getUrlsAdjuntos,
  getValoresCabecera,
  getTablaSumatorias,
  getAprobadoresNivel1,
  getAprobadoresNivel2,
  getAprobadoresNivel3,
  getAprobadoresNivel4,
  buildPayloadBPA,
  callBPA
} = require("./helpers/bpa-helper");
const { safeUndef,
  safeDate,
  primerDiaMesSiguiente,
  ValidaContabilizaAsiento,
  ReemplazaMailSolicitantePorID,
  CompletaCamposCabecera,
  ObtenerIDSubtipoAsiento,
  ReemplazaCuentaPorID
} = require("./helpers/sol-helper");

const { informaFailConstraint,
  informaConstraintsDelete,
  controlesCampoRegistro
} = require("./helpers/con-helper");

//module.exports = { ValidaAsiento };
//AMBIENTE: DEV

module.exports = cds.service.impl(async function () {


  const DECISION_APROBACION = "APROBACION";
  const DECISION_RECHAZO = "RECHAZO";

  // 🔹 Entidades del namespace com.carrefour.journal
  const {
    'com.carrefour.journal.CabeceraAsiento': CabeceraAsiento,
    'com.carrefour.journal.DetalleAsiento': DetalleAsiento,
    'com.carrefour.journal.EstadosSolicitud': EstadosSolicitud,
    'com.carrefour.journal.Cuenta': Cuenta,
    'com.carrefour.journal.Empleado': Empleado,
    'com.carrefour.journal.TipoAsiento': TipoAsiento,
    'com.carrefour.journal.SubTipoAsiento': SubTipoAsiento,
    'com.carrefour.journal.Referencia': Referencia,
    'com.carrefour.journal.TipoCuenta': TipoCuenta
  } = cds.entities;


  /**
   * Before read entidad CabceraAsiento - Genera el query
   * tomando el campo numeroSolcitud como numero para odenar en lugar de 
   * tomarlo como string como está en la tabla lo cual no ordena bien.
   */
  this.before('READ', 'CabeceraAsiento', req => {
    const q = req.query?.SELECT;
    if (!q) return;

    // 🔒 Solo ListReport
    const isListReport =
      Array.isArray(q.orderBy) &&
      q.limit?.rows?.val !== undefined &&
      !q.where;

    if (!isListReport) return;

    const idx = q.orderBy.findIndex(o =>
      o.ref && o.ref[0] === 'numeroSolicitud'
    );

    if (idx === -1) return;

    const desc = q.orderBy[idx].sort === 'desc';

    // 🔁 Reemplazo limpio y válido para HANA
    q.orderBy[idx] = {
      xpr: [
        'cast',
        '(',
        { ref: ['numeroSolicitud'] },
        'as',
        'Integer',
        ')'
      ],
      sort: desc ? 'desc' : 'asc'
    };
  });

  this.on(['CREATE', 'UPDATE'], 'Cuentas', informaFailConstraint);
  this.on('DELETE', 'Cuentas', informaConstraintsDelete);
  this.before(['UPDATE'], 'Cuentas', controlesCampoRegistro({
    immutable: ['numero', 'tipo_ID']
  }));

  this.on(['CREATE', 'UPDATE'], 'Sectores', informaFailConstraint);
  this.on('DELETE', 'Sectores', informaConstraintsDelete);

  this.before('UPDATE', 'Sectores', controlesCampoRegistro({
    immutable: ['codigo'],
    isProtected: r => r.ID === '847ff617-9692-4b63-bb60-cc0a36b7b71a'
  }));


  
  this.on(['CREATE', 'UPDATE'], 'Empleados', informaFailConstraint);
  this.on('DELETE', 'Empleados', informaConstraintsDelete);
  this.before(['UPDATE', 'draftActivate'], 'Empleados', controlesCampoRegistro({ immutable: ['email'] }));

  this.before(['CREATE', 'UPDATE'], 'Empleados', async (req) => {
    if (req.data.email) {
      try {
        const iasApi = await cds.connect.to("ias-api");
        // IAS API uses SCIM protocol, searching by email
        let res = await iasApi.tx(req).get(`/scim/Users?filter=emails.value eq "${req.data.email}"`);
        if (res && res.Resources && res.Resources.length > 0) {
          let user = res.Resources[0];
          // Intentamos sacar el userName, si está vacío usamos el id (UUID)
          let fetchedUsername = user.userName;
          if (!fetchedUsername || fetchedUsername.trim() === "") {
            fetchedUsername = user.id;
          }
          req.data.username = fetchedUsername;
          console.info(`[IAS API] Fetched username ${req.data.username} for email ${req.data.email}`);
        } else {
          console.warn(`[IAS API] User with email ${req.data.email} not found in IAS.`);
        }
      } catch (err) {
        console.error("❌ [IAS API] Error fetching username from IAS:", err.message);
      }
    }
  });

  this.on(['CREATE', 'UPDATE'], 'ConfigAprobadores', informaFailConstraint);
  this.on('DELETE', 'ConfigAprobadores', informaConstraintsDelete);

  this.on(['CREATE', 'UPDATE'], 'UmbralesCuentas', informaFailConstraint);
  this.on('DELETE', 'UmbralesCuentas', informaConstraintsDelete);

  // ===========================================================
  // 🟢 RegistrarAprobacion
  // ===========================================================
  this.on("RegistrarAprobacion", async (req) => {
    const { idSolicitud, emailAprobador } = req.data;

    const tx = req.tx;
    const numeroSolicitudPram = idSolicitud;

    try {

      if (!numeroSolicitudPram || !emailAprobador) {
        return req.reject(400, "Debe enviar al menos un ítem en el detalle del asiento.");
      }

      const catalogService = await cds.connect.to('CatalogService');

      console.info(`[RegistrarAprobacion] numeroSolicitud=${numeroSolicitudPram}, emailAprobador=${emailAprobador}`);

      // 🔎 Buscar empleado
      const empleado = await catalogService.run(SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador }));
      if (!empleado) req.reject(404, `No se encontró empleado con email ${emailAprobador}`);


      const estadoIniciada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "INI" })
      );
      if (!estadoIniciada) req.reject(404, `No se encontró estado con código 'INI'`);


      // 🔎 Validar solicitud
      const solicitud = await tx.run(SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram }));
      if (!solicitud || solicitud.estadoSolicitud_ID != estadoIniciada.ID)
        req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram} o no se encuentra en el estado Iniciada`);

      // 📝 Insertar registro en AprobadorSolicitud
      await tx.run(
        INSERT.into('GestionaAsientos.AprobadorSolicitud').entries({
          empleado_ID: empleado.ID,
          cabecera_ID: solicitud.ID,
          fechaAprobacion: new Date(),
          decision: DECISION_APROBACION
        })
      );

      console.info(`[RegistrarAprobacion] ✅ Aprobación registrada correctamente`);
      return { message: "Aprobación registrada correctamente" };
    } catch (err) {
      console.error("❌ [RegistrarAprobacion] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [RegistrarAprobacion] 🔴 Error interno", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[RegistrarAprobacion] 🔴 Error interno");
    }
  });


  // ===========================================================
  // 🔴 RegistrarRechazo
  // ===========================================================
  this.on("RegistrarRechazo", async (req) => {
    try {
      const { idSolicitud, emailAprobador } = req.data;

      const numeroSolicitudPram = idSolicitud;

      const tx = req.tx;

      // const {
      //   Empleado,
      //   AprobadorSolicitud,
      //   CabeceraAsiento,
      //   EstadosSolicitud
      // } = cds.entities["com.carrefour.journal"];

      const catalogService = await cds.connect.to('CatalogService');

      console.info(`[RegistrarRechazo] numeroSolicitu=${numeroSolicitudPram}, emailAprobador=${emailAprobador}`);

      // 🔎 Buscar empleado
      const empleado = await catalogService.run(SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador }));
      if (!empleado) req.reject(404, `No se encontró empleado con email ${emailAprobador}`);

      const estadoIniciada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "INI" })
      );
      if (!estadoIniciada) req.reject(404, `No se encontró estado con código 'INI'`);


      // 🔎 Validar solicitud
      const solicitud = await tx.run(SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram }));
      if (!solicitud || solicitud.estadoSolicitud_ID != estadoIniciada.ID)
        req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram} o no se encuentra en el estado Iniciada`);

      // 📝 Insertar registro en AprobadorSolicitud
      await tx.run(
        INSERT.into('GestionaAsientos.AprobadorSolicitud').entries({
          empleado_ID: empleado.ID,
          cabecera_ID: solicitud.ID,
          fechaAprobacion: new Date(),
          decision: DECISION_RECHAZO
        })
      );

      // 🔄 Actualizar estadoSolicitud al código 'RDA'
      const estadoRechazada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "RDA" })
      );
      if (!estadoRechazada) req.reject(404, `No se encontró estado con código 'RDA'`);

      await tx.run(
        UPDATE('GestionaAsientos.CabeceraAsiento')
          .set({ estadoSolicitud_ID: estadoRechazada.ID })
          .where({ ID: solicitud.ID })
      );

      console.info(`[RegistrarRechazo] 🔴 Rechazo registrado y estado actualizado a 'RDA'`);
      return { message: "Rechazo registrado correctamente" };
    } catch (err) {
      console.error("❌ [RegistrarRechazo] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [RegistrarRechazo] 🔴 Error interno", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[RegistrarRechazo] 🔴 Error interno");
    }
  });



  /**
   * -------------------------------------------------------------------------
   * Helper: EjecutarContabilizacionPorID
   * -------------------------------------------------------------------------
   */
  async function EjecutarContabilizacionPorID(id, req) {

    const numeroSolicitudParam = id;

    try {

      const catalogService = await cds.connect.to('CatalogService');

      const estadoIniciada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "INI" })
      );
      if (!estadoIniciada) req.reject(404, `No se encontró estado con código 'INI'`);

      const cabecera = await SELECT.one
        .from('com.carrefour.journal.CabeceraAsiento')
        .where({ numeroSolicitud: numeroSolicitudParam });

      if (!cabecera || cabecera.estadoSolicitud_ID != estadoIniciada.ID)
        req.reject(400, `Solicitud con numero ${numeroSolicitudParam} no encontrada o en estado distinto a Iniciada`);

      // 🔥 Traer los items + el número de cuenta desde Cuenta
      const items = await SELECT
        .from('com.carrefour.journal.DetalleAsiento as D')
        .leftJoin('com.carrefour.journal.Cuenta as C').on`C.ID = D.cuentaContable_ID`
        .columns(
          'D.ID',
          'D.numeroLinea',
          'D.descripcion',
          'D.centroCosto',
          'D.clave',
          'D.importe',
          'C.numero',
          'D.cuentaContable_ID'
        )
        .where({ cabecera_ID: cabecera.ID });

      if (!items) req.reject(400, `Items de CabeceraAsiento con numero de solicitud ${numeroSolicitudParam} no encontrados`);


      cabecera.items = items;

      req.data = cabecera;

      // Llama al método real de contabilización
      return await ValidaContabilizaAsiento(req, false);
    } catch (err) {
      console.error("❌ [RegistrarRechazo] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [RegistrarRechazo] 🔴 Error interno", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[RegistrarRechazo] 🔴 Error interno");
    }
  }


  /**
   * -------------------------------------------------------------------------
   * Acción: RealizarContabilizacion (versión completa)
   * -------------------------------------------------------------------------
   */
  this.on('RealizarContabilizacion', async (req) => {
    const tx = req.tx;
    const catalogService = await cds.connect.to('CatalogService');

    try {
      //const id = req.data.id;
      const numeroSolicitudParam = req.data.id;

      if (!numeroSolicitudParam) return req.reject(400, 'Falta ID de la solicitud');

      console.info(`[RealizarContabilizacion] 🧮 Iniciando contabilización para numero de solicitud=${numeroSolicitudParam}`);

      // 1️⃣ Ejecutar contabilización en S/4HANA
      const resultado = await EjecutarContabilizacionPorID(numeroSolicitudParam, req);

      //2️⃣ Si el resultado fue exitoso → actualizar estadoSolicitud = CON
      if (resultado.success) {
        //const { CabeceraAsiento, EstadosSolicitud } = cds.entities['com.carrefour.journal'];

        // const estadoContabilizada = await catalogService.run(
        //   SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: 'CON' })
        // );
        // if (!estadoContabilizada)
        //   req.reject(404, `No se encontró estado con código 'CON'`);

        // await tx.run(
        //   UPDATE('GestionaAsientos.CabeceraAsiento')
        //     .set({ estadoSolicitud_ID: estadoContabilizada.ID })
        //     .where({ numeroSolicitud: numeroSolicitudParam })
        // );

        console.info(`[RealizarContabilizacion] ✅ Contabilización exitosa y estado actualizado a 'CON'`);
        return resultado;
      } else {
        // Si la contabilización devolvió error
        console.warn(`[RealizarContabilizacion] ⚠️ Error en contabilización: ${resultado.message}`);
        return req.reject(400, resultado.message || 'Error en contabilización');
      }
    } catch (err) {
      console.error("❌ [RealizarContabilizacion] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [RealizarContabilizacion] 🔴 Error interno:", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[RealizarContabilizacion] 🔴 Error interno");
    }
  });


  // 1️⃣ Preparar carpeta temporal
  this.on("prepareAdjuntos", async req => {
    try {

      const { sessionId } = req.data;

      if (!sessionId) return req.reject(400, "sessionId requerido");

      await ensureFolder(`/solicitud-asientos-adjuntos/temp/${sessionId}`, req);

      return { success: true };

    } catch (err) {
      console.error("❌ [prepareAdjuntos] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [prepareAdjuntos] 🔴 Error interno:", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[prepareAdjuntos] 🔴 Error interno");
    }
  });

  this.on("confirmAdjuntos", async req => {
    await confirmAdjuntos(req);
  });

  // 3️⃣ Rollback
  this.on("rollbackAdjuntos", async req => {
    await rollbackAdjuntos(req);
  });


  // ===========================================================
  // BEFORE CREATE: Validaciones previas + helpers
  // ===========================================================
  this.before('CREATE', 'CabeceraAsiento', async (req) => {
    console.info('[CabeceraAsiento] 🟢 Entrando en BEFORE CREATE');

    try {

      const { periodoAnio, periodoMes, fechaDocumento, fechaContabilizacion, correo_solicitante } = req.data;

      // Si no vienen estos campos -> no validar
      if (!periodoAnio || !periodoMes)
        req.reject(400,
          `Falta fechaDocumento y fechaContabilizaci[on]`);;

      //try {
      // 1️⃣ Obtener fecha inicio y fin del período
      const mes = Number(periodoMes);
      const anio = Number(periodoAnio);

      const fechaInicio = new Date(anio, mes - 1, 1);      // primer día del mes
      const fechaFin = new Date(anio, mes, 0);             // último día del mes

      // 2️⃣ Validar fechaDocumento
      if (fechaDocumento) {
        const fdoc = new Date(fechaDocumento);
        if (fdoc < fechaInicio || fdoc > fechaFin) {
          req.reject(
            400,
            `La fechaDocumento (${fechaDocumento}) debe estar dentro del período ${periodoMes}/${periodoAnio}`
          );
        }
      }

      // 3️⃣ Validar fechaContabilizacion
      if (fechaContabilizacion) {
        const fcont = new Date(fechaContabilizacion);
        if (fcont < fechaInicio || fcont > fechaFin) {
          req.reject(
            400,
            `La fechaContabilizacion (${fechaContabilizacion}) debe estar dentro del período ${periodoMes}/${periodoAnio}`
          );
        }
      }

      console.info(
        `[ValidaFechasPeriodo] OK - Fechas dentro del período ${periodoMes}/${periodoAnio}`
      );


      // ================================================================
      // 1️⃣ CONSTANTE DE CONTROL
      // ================================================================
      const MAX_ITEMS_ASIENTO = 900;

      const cab = req.data;
      const items = cab.items || [];
      const tx = req.tx;

      // ================================================================
      // 2️⃣ VALIDAR CANTIDAD MÁXIMA DE ITEMS
      // ================================================================
      if (items.length > MAX_ITEMS_ASIENTO) {
        return req.reject(
          400,
          `El asiento no puede contener más de ${MAX_ITEMS_ASIENTO} ítems. Se enviaron ${items.length}.`
        );
      }

      // ================================================================
      // 3️⃣ VALIDACIÓN DE CLAVE Y IMPORTE
      // ================================================================
      let sumaDebe = 0;
      let sumaHaber = 0;


      for (const it of items) {

        // Clave válida
        if (it.clave !== 40 && it.clave !== 50) {
          return req.reject(
            400,
            `El ítem con cuenta ${it.cuentaContable_ID || it.cuentaContable} tiene clave inválida (${it.clave}). Debe ser 40 o 50.`
          );
        }

        if (!it.descripcion || it.descripcion.length == 0) {
          return req.reject(
            400,
            `El campo descripción de la linea ${it.numeroLinea} debe estar definido.`
          );
        } else if (it.descripcion.length > 50) {
          return req.reject(
            400,
            `El campo descripción de la linea ${it.numeroLinea} supera los 50 caracteres de extensión incluyendo espacios`
          );
        }

        // Importe válido
        if (!it.importe || Number(it.importe) <= 0) {
          return req.reject(
            400,
            `El ítem con cuenta ${it.cuentaContable_ID || it.cuentaContable} tiene importe inválido (${it.importe}). Debe ser mayor a 0.`
          );
        }

        // Acumular sumatoria
        const importe = Math.round(Number(it.importe) * 100);

        if (it.clave === 40) sumaDebe += importe;
        if (it.clave === 50) sumaHaber += importe;

        // console.info(`🧮 Log por items → nro linea=${it.numeroLinea} , Clave=${it.clave} it.importe= ${it.importe}, Importe=${importe}, Debe=${sumaDebe}, Haber=${sumaHaber}`);
      }

      sumaDebe = sumaDebe / 100;
      sumaHaber = sumaHaber / 100;

      // ================================================================
      // 4️⃣ VALIDAR QUE SUMA DEBE == SUMA HABER
      // ================================================================
      if (sumaDebe !== sumaHaber) {
        return req.reject(
          400,
          `Las sumatorias del asiento no cuadran: Debe=${sumaDebe} | Haber=${sumaHaber}. La suma de clave 40 debe ser igual a la suma de clave 50.`
        );
      }

      console.info(`🧮 Validación contable OK → Debe=${sumaDebe}, Haber=${sumaHaber}`);

      // ================================================================
      // 6️⃣ REEMPLAZOS Y COMPLETADO AUTOMÁTICO
      // ================================================================
      await ReemplazaMailSolicitantePorID(req);
      await ReemplazaCuentaPorID(req);
      await CompletaCamposCabecera(req);

      // ================================================================
      // 5️⃣ LLAMAR VALIDACIÓN SOAP (modo test)
      // ================================================================
      await ValidaContabilizaAsiento(req, true);

      // -------------------------------------------------------------------------
      // 🔹 Generar número de solicitud NO repetido, atómico, sin baches
      // -------------------------------------------------------------------------
      if (!cab.numeroSolicitud) {
        cab.numeroSolicitud = await getNextNumeroSolicitudFU(tx);
        console.info(`[CabeceraAsiento] NumeroSolicitud asignado = ${cab.numeroSolicitud}`);
      }

      // ================================================================
      // 7️⃣ Iniciar Workflow BPA
      // ================================================================
      idWF = await IniciaWorkflowBPA(req);
      cab.idInstanciaWorkflow = idWF;

      await confirmAdjuntos(req);

    } catch (err) {
      console.error("❌ [CabeceraAsiento] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [CabeceraAsiento] 🔴 Error interno:", err);

      //DJ 2025-12-25 se comenta ya que no es aplicable por el momento
      //DJ 2025-12-25 await rollbackAdjuntos(req);

      // devolvemos un error 500 limpio
      return req.reject(500, "[CabeceraAsiento] 🔴 Error interno");
    }
  });

  /* ============================================================================================
   * 🟩 FUNCIÓN PRINCIPAL — IniciaWorkflowBPA
   * ============================================================================================ */

  //!!!!!!!ATENCION!!!!!! EN ESTE METODO Y OTROS RELACIOANDOS EN PARTE DEL CIRCUITO SE UTILIZA
  //                                EL NRO DE SOLICITUD EN EL EL CAMPO IdSolicitud PARA ENVIARLO AL WORKFLOW 
  //                                PORQUE EN EL WORKFLOW SE UTILIZÓ DE ESA MANERA.


  async function IniciaWorkflowBPA(req) {
    try {
      const TIPO_ASIENTO_PROV_REVERSA = "1";
      const TIPO_ASIENTO_ASI_CIERRE = "2";
      const TIPO_ASIENTO_AJU_EXC = "3";

      const SUBT_ASIENTO_RECLA_MISMAS_GASTOS = "A";
      const SUBT_ASIENTO_RECLA_DIF_GASTOS = "B";
      const SUBT_ASIENTO_RECLA_MAR_GAS = "C";
      const SUBT_ASIENTO_PROV_GASTOS = "D";
      const SUBT_ASIENTO_PROV_MARGEN = "E";
      const SUBT_ASIENTO_BANCOS = "F";
      const SUBT_ASIENTO_PROV_REVERSA = "G";
      const SUBT_ASIENTO_CUENTAS_EXCEP = "H";

      console.info("🟦 [IniciaWorkflowBPA] Inicio");

      const d = req.data;

      var n1 = [];
      var n2 = [];
      var n3 = [];
      var n4 = [];

      // 🔍 Validaciones mínimas
      if (!d.items?.length) return req.reject(400, "La solicitud no contiene items");
      if (!d.tipoAsiento_ID) return req.reject(400, "Falta tipoAsiento_ID");
      if (!d.subtipoAsiento_ID) return req.reject(400, "Falta subtipoAsiento_ID");
      if (!d.solicitante_ID) return req.reject(400, "Falta solicitante");
      if (!d.sectorSolicitante_ID) return req.reject(400, "Falta sector solicitante");

      // 1️⃣ Obtener maestros
      const valores = await getValoresCabecera(req);

      const { solicitante, tipoAsiento, subtipoAsiento, referencia, sector } = valores;

      // 2️⃣ Calcular sumatorias
      const tablasumatorias = await getTablaSumatorias(req);



      // 3️⃣ Aprobadores
      n1 = await getAprobadoresNivel1(req);

      if ((tipoAsiento.codigo == TIPO_ASIENTO_PROV_REVERSA) ||

        (tipoAsiento.codigo == TIPO_ASIENTO_ASI_CIERRE &&
          (subtipoAsiento.codigo == SUBT_ASIENTO_RECLA_MAR_GAS ||
            subtipoAsiento.codigo == SUBT_ASIENTO_PROV_GASTOS ||
            subtipoAsiento.codigo == SUBT_ASIENTO_PROV_MARGEN
          )
        ) ||

        (tipoAsiento.codigo == TIPO_ASIENTO_AJU_EXC)
      ) {
        n2 = await getAprobadoresNivel2(req);
        n3 = await getAprobadoresNivel3(req, tablasumatorias);
      };

      if (tipoAsiento.codigo == TIPO_ASIENTO_AJU_EXC) {
        n4 = await getAprobadoresNivel4(req, tablasumatorias);
      };

      const listaurldms = await getUrlsAdjuntos(req);

      // 4️⃣ Construir payload final
      const payload = buildPayloadBPA(d, valores, tablasumatorias, n1, n2, n3, n4, listaurldms);

      console.info("🟩 [IniciaWorkflowBPA] Payload final:", JSON.stringify(payload, null, 2));

      // 5️⃣ Enviar workflow
      const id = await callBPA(payload, req);

      console.info("🟩 [IniciaWorkflowBPA] Instancia BPA creada:", id);

      return id;
    } catch (err) {
      console.error("❌ [IniciaWorkflowBPA] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [IniciaWorkflowBPA] 🔴 Error interno:", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[IniciaWorkflowBPA] 🔴 Error interno");
    }
  }



  // ============================================================================
  // EXPORTS PARA USO EN service.js
  // ============================================================================
  // module.exports = {
  //   getValoresCabecera,
  //   getTablaSumatorias,
  //   getAprobadoresNivel1,
  //   getAprobadoresNivel2,
  //   getAprobadoresNivel3,
  //   getAprobadoresNivel4,
  //   buildPayloadBPA,
  //   callBPA,
  //   IniciaWorkflowBPA
  // };

  // this.on("ListarWorkflowsBPA", async (req) => {
  //   try {
  //           const remote = await cds.connect.to("bpa-api");  // igual que en callBPA

  //           const destinationName = remote.options.credentials.destination;
  //           const destination = await getDestination({ destinationName });

  //         console.log("👉 Destination seleccionado:", destinationName);
  //         console.log("👉 Destination completo:", destination);

  //           const resp = await executeHttpRequest(destination, {
  //             method: "get",
  //             url: "/workflow/rest/v1/workflow-definitions",
  //             headers: {
  //               'Accept': 'application/json','api-key': 'BdBXlx-emFjZWctW6ozyjRUOUAMBt8II'
  //             }
  //           });

  //           console.info("[ListarWorkflowsBPA] ✔ Workflow definitions:");
  //           console.info(JSON.stringify(resp.data, null, 2));

  //           return resp.data;

  //       } catch (err) {
  //         console.error("❌ [ListarWorkflowsBPA] 🔴 Error detectado", err);
  //         // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
  //         if (err.code) {
  //           throw err; // ⚡ sigue para arriba sin cambios
  //         }

  //         // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
  //         console.error("❌ [ListarWorkflowsBPA] 🔴 Error interno:", err);

  //         // devolvemos un error 500 limpio
  //         return req.reject(500, "[ListarWorkflowsBPA] 🔴 Error interno");
  //       }
  // });

  async function getNextNumeroSolicitudFU(tx) {
    try {
      //const db = cds.connect.to('db');
      const scope = 'NUMERO_SOLICITUD'; // Define your scope

      // Acquire a lock and get the current number within a transaction
      //const tx = db.transaction(req);
      const secuencias = await tx.run(
        SELECT.one.from('GestionaAsientos.Secuencias').where({ nombre: scope }).forUpdate() // forUpdate() helps with concurrency in HANA
      );

      if (secuencias) {
        const nextNumber = secuencias.valor + 1;
        // Format the ID with prefix, padding, etc.
        //req.data.ID = `${numberRange.prefix}${String(nextNumber).padStart(5, '0')}${numberRange.suffix}`;

        // Update the number range
        await tx.run(
          UPDATE('GestionaAsientos.Secuencias').set({ valor: nextNumber }).where({ nombre: scope })
        );

        return nextNumber;
      }

    } catch (err) {
      console.error("❌ [getNextNumeroSolicitudFU] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [getNextNumeroSolicitudFU] 🔴 Error interno:", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[getNextNumeroSolicitudFU] 🔴 Error interno");
    }
  }



  // async function getNextNumeroSolicitud(tx) {
  //   try{
  //         //const { Secuencias } = cds.entities['com.carrefour.journal'];

  //         // 1️⃣ Incrementar la secuencia (sin returning)

  //         await tx.run(
  //           UPDATE('GestionaAsientos.Secuencias')
  //             .set({ valor: { "+=": 1 } })
  //             .where({ nombre: 'NUMERO_SOLICITUD' })
  //         );

  //         // 2️⃣ Leer el valor actualizado
  //         const row = await tx.run(
  //           SELECT.one.from('GestionaAsientos.Secuencias').columns('valor')
  //             .where({ nombre: 'NUMERO_SOLICITUD' })
  //         );

  //         // 3️⃣ Si aún no existe → crearlo
  //         if (!row) {
  //           const nuevoValor = 1;

  //           await tx.run(
  //             INSERT.into('GestionaAsientos.Secuencias').entries({
  //               ID: cds.utils.uuid(),
  //               nombre: 'NUMERO_SOLICITUD',
  //               valor: nuevoValor,
  //               createdAt: new Date().toISOString(),
  //               createdBy: 'system',
  //               modifiedAt: new Date().toISOString(),
  //               modifiedB: 'system'
  //             })
  //           );

  //           return nuevoValor;
  //         }

  //       return row.valor;
  //     } catch (err) {
  //       console.error("❌ [getNextNumeroSolicitud] 🔴 Error detectado", err);
  //       // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
  //       if (err.code) {
  //         throw err; // ⚡ sigue para arriba sin cambios
  //       }

  //       // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
  //       console.error("❌ [getNextNumeroSolicitud] 🔴 Error interno:", err);

  //       // devolvemos un error 500 limpio
  //       return req.reject(500, "[getNextNumeroSolicitud] 🔴 Error interno");
  //     }
  // }


});