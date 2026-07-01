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
const AppLog = require('./helpers/logging/app-log');

// ===========================================================
// 🗺️ Helper: determinar próximo estado según nivel aprobado
// ===========================================================
function determinarProximoEstado(nivelQueAprobo, totalNiveles) {
  // Si aprobó el último nivel → Aprobada, lista para contabilizar
  if (nivelQueAprobo >= totalNiveles) return 'APO';
  // Si quedan niveles → avanzar al siguiente pendiente
  const mapa = {
    1: 'P2', // aprobó N1 → Pendiente Jefe Contabilidad
    2: 'P3', // aprobó N2 → Pendiente Gte. Dir. Contabilidad
    3: 'P4', // aprobó N3 → Pendiente CFO
  };
  return mapa[nivelQueAprobo] ?? 'APO';
}

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
   * Before read entidad CabeceraAsiento - Genera el query
   * tomando el campo numeroSolicitud como numero para ordenar en lugar de
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

  // Controles de constraints en maestros y configuraciones
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
  this.on(['CREATE', 'UPDATE'], 'ConfigAprobadores', informaFailConstraint);
  this.on('DELETE', 'ConfigAprobadores', informaConstraintsDelete);
  this.on(['CREATE', 'UPDATE'], 'UmbralesCuentas', informaFailConstraint);
  this.on('DELETE', 'UmbralesCuentas', informaConstraintsDelete);

  // ===========================================================
  // 🟢 RegistrarAprobacion — MEJORA 10
  // ===========================================================
  this.on("RegistrarAprobacion", async (req) => {
    // ✅ MEJORA 10: se agrega nivelAprobacion al destructuring
    const { idSolicitud, emailAprobador, nivelAprobacion, flujoaprobadores } = req.data;
    const tx = req.tx;
    const numeroSolicitudPram = idSolicitud;

    try {
      if (!numeroSolicitudPram || !emailAprobador) {
        return req.reject(400, "Debe enviar idSolicitud y emailAprobador.");
      }

      // ✅ MEJORA 10: validar que venga el nivel
      if (!nivelAprobacion) {
        return req.reject(400, "Debe enviar nivelAprobacion.");
      }

      const catalogService = await cds.connect.to('CatalogService');
      AppLog.info(`[RegistrarAprobacion] numeroSolicitud=${numeroSolicitudPram}, emailAprobador=${emailAprobador}, nivelAprobacion=${nivelAprobacion}`);

      // 🔎 Buscar empleado
      const empleado = await catalogService.run(
        SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador })
      );
      if (!empleado) return req.reject(404, `No se encontró empleado con email ${emailAprobador}`);

      // 🔎 Validar solicitud — sin filtrar por estado, puede llegar en cualquier instancia pendiente
      const solicitud = await tx.run(
        SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram })
      );
      if (!solicitud) return req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram}`);

      // ✅ MEJORA 10: determinar próximo estado según nivel aprobado y total de niveles del workflow
      const nivel = parseInt(nivelAprobacion);
      const totalNiveles = solicitud.nivelesWorkflow ?? 1;
      const proximoCodigo = determinarProximoEstado(nivel, totalNiveles);

      AppLog.info(`[RegistrarAprobacion] Nivel=${nivel}, TotalNiveles=${totalNiveles}, ProximoEstado=${proximoCodigo}`);

      const proximoEstado = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: proximoCodigo })
      );
      if (!proximoEstado) return req.reject(404, `No se encontró estado con código '${proximoCodigo}'`);

      // 📝 Insertar registro en AprobadorSolicitud
      await tx.run(
        INSERT.into('GestionaAsientos.AprobadorSolicitud').entries({
          empleado_ID: empleado.ID,
          cabecera_ID: solicitud.ID,
          fechaAprobacion: new Date(),
          nivelAprobacion: String(nivel),
          decision: DECISION_APROBACION,
          flujoaprobadores: flujoaprobadores ?? null  // ✅ MEJORA 11
        })
      );

      // ✅ MEJORA 10: actualizar estado al próximo correspondiente
      await tx.run(
        UPDATE('GestionaAsientos.CabeceraAsiento')
          .set({ estadoSolicitud_ID: proximoEstado.ID })
          .where({ ID: solicitud.ID })
      );

      AppLog.info(`[RegistrarAprobacion] ✅ Aprobación nivel ${nivel} registrada → Estado actualizado a '${proximoCodigo}'`);
      return { message: "Aprobación registrada correctamente" };

    } catch (err) {
      AppLog.error("❌ [RegistrarAprobacion] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [RegistrarAprobacion] 🔴 Error interno", err);
      return req.reject(500, "[RegistrarAprobacion] 🔴 Error interno");
    }
  });

  // ===========================================================
  // 🔴 RegistrarRechazo
  // ===========================================================
  this.on("RegistrarRechazo", async (req) => {
    try {
      const { idSolicitud, emailAprobador, flujoaprobadores, motivoRechazo } = req.data;
      const numeroSolicitudPram = idSolicitud;
      const tx = req.tx;
      const catalogService = await cds.connect.to('CatalogService');
      AppLog.info(`[RegistrarRechazo] numeroSolicitud=${numeroSolicitudPram}, emailAprobador=${emailAprobador}`);

      // 🔎 Buscar empleado
      const empleado = await catalogService.run(
        SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador })
      );
      if (!empleado) return req.reject(404, `No se encontró empleado con email ${emailAprobador}`);

      // 🔎 Validar solicitud
      const solicitud = await tx.run(
        SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram })
      );
      if (!solicitud) return req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram}`);

      // 📝 Insertar registro en AprobadorSolicitud
      await tx.run(
        INSERT.into('GestionaAsientos.AprobadorSolicitud').entries({
          empleado_ID: empleado.ID,
          cabecera_ID: solicitud.ID,
          fechaAprobacion: new Date(),
          decision: DECISION_RECHAZO,
          flujoaprobadores: flujoaprobadores ?? null,  
          motivoRechazo: motivoRechazo ?? null         
        })
      );

      // 🔄 Actualizar estadoSolicitud al código 'RDA'
      const estadoRechazada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "RDA" })
      );
      if (!estadoRechazada) return req.reject(404, `No se encontró estado con código 'RDA'`);

      await tx.run(
        UPDATE('GestionaAsientos.CabeceraAsiento')
          .set({ estadoSolicitud_ID: estadoRechazada.ID })
          .where({ ID: solicitud.ID })
      );

      AppLog.info(`[RegistrarRechazo] 🔴 Rechazo registrado y estado actualizado a 'RDA'`);
      return { message: "Rechazo registrado correctamente" };

    } catch (err) {
      AppLog.error("❌ [RegistrarRechazo] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [RegistrarRechazo] 🔴 Error interno", err);
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

      // ✅ MEJORA 10: contabilización valida contra estado APO (Aprobada), no INI
      const estadoAprobada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "APO" })
      );
      if (!estadoAprobada) return req.reject(404, `No se encontró estado con código 'APO'`);

      const cabecera = await SELECT.one
        .from('com.carrefour.journal.CabeceraAsiento')
        .where({ numeroSolicitud: numeroSolicitudParam });

      if (!cabecera || cabecera.estadoSolicitud_ID != estadoAprobada.ID)
        return req.reject(400, `Solicitud con numero ${numeroSolicitudParam} no encontrada o no está en estado Aprobada`);

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

      if (!items) return req.reject(400, `Items de CabeceraAsiento con numero de solicitud ${numeroSolicitudParam} no encontrados`);

      cabecera.items = items;
      req.data = cabecera;

      return await ValidaContabilizaAsiento(req, false);

    } catch (err) {
      AppLog.error("❌ [EjecutarContabilizacionPorID] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [EjecutarContabilizacionPorID] 🔴 Error interno", err);
      return req.reject(500, "[EjecutarContabilizacionPorID] 🔴 Error interno");
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
      const numeroSolicitudParam = req.data.id;
      if (!numeroSolicitudParam) return req.reject(400, 'Falta ID de la solicitud');

      AppLog.info(`[RealizarContabilizacion] 🧮 Iniciando contabilización para numero de solicitud=${numeroSolicitudParam}`);

      // 1️⃣ Ejecutar contabilización en S/4HANA
      const resultado = await EjecutarContabilizacionPorID(numeroSolicitudParam, req);

      // 2️⃣ Si el resultado fue exitoso → actualizar estadoSolicitud = CON
      if (resultado.success) {
        AppLog.info(`[RealizarContabilizacion] ✅ Contabilización exitosa y estado actualizado a 'CON'`);
        return resultado;
      } else {
        AppLog.error(`[RealizarContabilizacion] ⚠️ Error en contabilización: ${resultado.message}`);
        return req.reject(400, resultado.message || 'Error en contabilización');
      }

    } catch (err) {
      AppLog.error("❌ [RealizarContabilizacion] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [RealizarContabilizacion] 🔴 Error interno:", err);
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
      AppLog.error("❌ [prepareAdjuntos] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [prepareAdjuntos] 🔴 Error interno:", err);
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
    AppLog.info('[CabeceraAsiento] 🟢 Entrando en BEFORE CREATE');
    try {
      const { periodoAnio, periodoMes, fechaDocumento, fechaContabilizacion, correo_solicitante } = req.data;

      // Adjunto obligatorio según ConfigAdjuntoObligatorio
      const cabReq = req.data;
      if (!cabReq.tipoAsiento_ID) {
        return req.reject(400, "Falta tipoAsiento_ID");
      }

      const tipoAsientoReq = await SELECT.one
        .from('com.carrefour.journal.TipoAsiento')
        .where({ ID: cabReq.tipoAsiento_ID });
      if (!tipoAsientoReq) {
        return req.reject(404, `No se encontró TipoAsiento con ID ${cabReq.tipoAsiento_ID}`);
      }

      const configAdjunto = await SELECT.one
        .from('com.carrefour.journal.ConfigAdjuntoObligatorio')
        .where({ tipoAsiento_ID: cabReq.tipoAsiento_ID });

      const esObligatorio = configAdjunto ? configAdjunto.obligatorio : true;
      if (esObligatorio) {
        const tieneAdjuntos = Array.isArray(cabReq.adjuntosSolicitud) && cabReq.adjuntosSolicitud.length > 0;
        if (!tieneAdjuntos) {
          return req.reject(400, "Para el tipo de asiento ingresado debe adjuntar documentación de respaldo.");
        }
      }
      AppLog.debug(`[CabeceraAsiento] ✅ Validación adjunto OK (tipoAsiento.codigo=${tipoAsientoReq.codigo}, obligatorio=${esObligatorio})`);

      if (!periodoAnio || !periodoMes)
        return req.reject(400, `Falta periodoAnio y periodoMes`);

      // 1️⃣ Obtener fecha inicio y fin del período
      const mes = Number(periodoMes);
      const anio = Number(periodoAnio);
      const fechaInicio = new Date(anio, mes - 1, 1);
      const fechaFin = new Date(anio, mes, 0);

      // 2️⃣ Validar fechaDocumento
      if (fechaDocumento) {
        const fdoc = new Date(fechaDocumento);
        if (fdoc < fechaInicio || fdoc > fechaFin) {
          return req.reject(
            400,
            `La fechaDocumento (${fechaDocumento}) debe estar dentro del período ${periodoMes}/${periodoAnio}`
          );
        }
      }

      // 3️⃣ Validar fechaContabilizacion
      if (fechaContabilizacion) {
        const fcont = new Date(fechaContabilizacion);
        if (fcont < fechaInicio || fcont > fechaFin) {
          return req.reject(
            400,
            `La fechaContabilizacion (${fechaContabilizacion}) debe estar dentro del período ${periodoMes}/${periodoAnio}`
          );
        }
      }
      AppLog.debug(`[ValidaFechasPeriodo] OK - Fechas dentro del período ${periodoMes}/${periodoAnio}`);

      const MAX_ITEMS_ASIENTO = 900;
      const cab = req.data;
      const items = cab.items || [];
      const tx = req.tx;

      if (items.length > MAX_ITEMS_ASIENTO) {
        return req.reject(
          400,
          `El asiento no puede contener más de ${MAX_ITEMS_ASIENTO} ítems. Se enviaron ${items.length}.`
        );
      }

      let sumaDebe = 0;
      let sumaHaber = 0;

      for (const it of items) {
        if (it.clave !== 40 && it.clave !== 50) {
          return req.reject(
            400,
            `El ítem con cuenta ${it.cuentaContable_ID || it.cuentaContable} tiene clave inválida (${it.clave}). Debe ser 40 o 50.`
          );
        }
        if (!it.descripcion || it.descripcion.length == 0) {
          return req.reject(400, `El campo descripción de la linea ${it.numeroLinea} debe estar definido.`);
        } else if (it.descripcion.length > 50) {
          return req.reject(400, `El campo descripción de la linea ${it.numeroLinea} supera los 50 caracteres de extensión incluyendo espacios`);
        }
        if (!it.importe || Number(it.importe) <= 0) {
          return req.reject(
            400,
            `El ítem con cuenta ${it.cuentaContable_ID || it.cuentaContable} tiene importe inválido (${it.importe}). Debe ser mayor a 0.`
          );
        }
        const importe = Math.round(Number(it.importe) * 100);
        if (it.clave === 40) sumaDebe += importe;
        if (it.clave === 50) sumaHaber += importe;
      }

      sumaDebe = sumaDebe / 100;
      sumaHaber = sumaHaber / 100;

      if (sumaDebe !== sumaHaber) {
        return req.reject(
          400,
          `Las sumatorias del asiento no cuadran: Debe=${sumaDebe} | Haber=${sumaHaber}. La suma de clave 40 debe ser igual a la suma de clave 50.`
        );
      }
      AppLog.debug(`🧮 Validación contable OK → Debe=${sumaDebe}, Haber=${sumaHaber}`);

      await ReemplazaMailSolicitantePorID(req);
      await ReemplazaCuentaPorID(req);
      await CompletaCamposCabecera(req);
      await ValidaContabilizaAsiento(req, true);

      if (!cab.numeroSolicitud) {
        cab.numeroSolicitud = await getNextNumeroSolicitudFU(tx);
        AppLog.info(`[CabeceraAsiento] NumeroSolicitud asignado = ${cab.numeroSolicitud}`);
      }

      // ================================================================
      // ✅ MEJORA 10: IniciaWorkflowBPA ahora retorna { id, niveles }
      // ================================================================
      const resultadoBPA = await IniciaWorkflowBPA(req);
      cab.idInstanciaWorkflow = resultadoBPA.id;
      cab.nivelesWorkflow = resultadoBPA.niveles;
      AppLog.info(`[CabeceraAsiento] idInstanciaWorkflow=${cab.idInstanciaWorkflow}, nivelesWorkflow=${cab.nivelesWorkflow}`);

      await confirmAdjuntos(req);

    } catch (err) {
      AppLog.error("❌ [CabeceraAsiento] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [CabeceraAsiento] 🔴 Error interno:", err);
      //DJ 2025-12-25 se comenta ya que no es aplicable por el momento
      //DJ 2025-12-25 await rollbackAdjuntos(req);
      return req.reject(500, "[CabeceraAsiento] 🔴 Error interno");
    }
  });

  /* ============================================================================================
   * 🟩 FUNCIÓN PRINCIPAL — IniciaWorkflowBPA
   * ============================================================================================ */
  //!!!!!!!ATENCION!!!!!! EN ESTE METODO Y OTROS RELACIONADOS EN PARTE DEL CIRCUITO SE UTILIZA
  //                      EL NRO DE SOLICITUD EN EL CAMPO IdSolicitud PARA ENVIARLO AL WORKFLOW
  //                      PORQUE EN EL WORKFLOW SE UTILIZÓ DE ESA MANERA.
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

      AppLog.info("🟦 [IniciaWorkflowBPA] Inicio");
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
      }

      if (tipoAsiento.codigo == TIPO_ASIENTO_AJU_EXC) {
        n4 = await getAprobadoresNivel4(req, tablasumatorias);
      }

      const listaurldms = await getUrlsAdjuntos(req);

      // 4️⃣ Construir payload final
      const payload = buildPayloadBPA(d, valores, tablasumatorias, n1, n2, n3, n4, listaurldms);
      AppLog.debug("🟩 [IniciaWorkflowBPA] Payload final:", JSON.stringify(payload, null, 2));

      // 5️⃣ Enviar workflow
      const id = await callBPA(payload, req);

      // ✅ MEJORA 10: calcular cuántos niveles tiene este workflow y retornarlos junto al id
      const niveles = [n1, n2, n3, n4].filter(arr => arr && arr.length > 0).length;
      AppLog.info(`🟩 [IniciaWorkflowBPA] Instancia BPA creada: ${id}, niveles: ${niveles}`);

      return { id, niveles };

    } catch (err) {
      AppLog.error("❌ [IniciaWorkflowBPA] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [IniciaWorkflowBPA] 🔴 Error interno:", err);
      return req.reject(500, "[IniciaWorkflowBPA] 🔴 Error interno");
    }
  }

  async function getNextNumeroSolicitudFU(tx) {
    try {
      const scope = 'NUMERO_SOLICITUD';
      const secuencias = await tx.run(
        SELECT.one.from('GestionaAsientos.Secuencias').where({ nombre: scope }).forUpdate()
      );
      if (secuencias) {
        const nextNumber = secuencias.valor + 1;
        await tx.run(
          UPDATE('GestionaAsientos.Secuencias').set({ valor: nextNumber }).where({ nombre: scope })
        );
        return nextNumber;
      }
    } catch (err) {
      AppLog.error("❌ [getNextNumeroSolicitudFU] 🔴 Error detectado", err);
      if (err.code) throw err;
      AppLog.error("❌ [getNextNumeroSolicitudFU] 🔴 Error interno:", err);
      return req.reject(500, "[getNextNumeroSolicitudFU] 🔴 Error interno");
    }
  }
});