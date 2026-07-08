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
  callBPA,
  sembrarAprobadoresPendientes
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
  const DECISION_PENDIENTE = "PENDIENTE";

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


  function determinarProximoEstado(nivelQueAprobo, totalNiveles) {
    if (nivelQueAprobo >= totalNiveles) return 'APO';
    const mapa = {
      1: 'P2', // aprobó N1 (Gte/Dir Área) → Pendiente Jefe Contabilidad
      2: 'P3', // aprobó N2 (Jefe Contabilidad) → Pendiente Gte/Dir Contabilidad
      3: 'P4', // aprobó N3 (Gte/Dir Contabilidad) → Pendiente CFO
    };
    return mapa[nivelQueAprobo] ?? 'APO';
  }

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

  this.on("RegistrarAprobacion", async (req) => {
    const { idSolicitud, emailAprobador, nivelAprobacion, flujoaprobadores, totalNiveles } = req.data;
    const tx = req.tx;
    const numeroSolicitudPram = idSolicitud;
    try {
      if (!numeroSolicitudPram || !emailAprobador) {
        return req.reject(400, "Debe enviar idSolicitud y emailAprobador.");
      }
      if (!nivelAprobacion) {
        return req.reject(400, "Debe enviar nivelAprobacion.");
      }
      const catalogService = await cds.connect.to('CatalogService');
      console.info(`[RegistrarAprobacion] numeroSolicitud=${numeroSolicitudPram}, emailAprobador=${emailAprobador}, nivelAprobacion=${nivelAprobacion}, totalNiveles=${totalNiveles}`);

      const empleado = await catalogService.run(SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador }));
      if (!empleado) req.reject(404, `No se encontró empleado con email ${emailAprobador}`);

      const solicitud = await tx.run(SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram }));
      if (!solicitud) req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram}`);

      const nivel = parseInt(nivelAprobacion);
      const total = parseInt(totalNiveles ?? 1);
      const proximoCodigo = determinarProximoEstado(nivel, total);
      console.info(`[RegistrarAprobacion] Nivel=${nivel}, TotalNiveles=${total}, ProximoEstado=${proximoCodigo}`);
      const proximoEstado = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: proximoCodigo })
      );
      if (!proximoEstado) req.reject(404, `No se encontró estado con código '${proximoCodigo}'. Verificar maestro EstadosSolicitud.`);

      const updateResult = await tx.run(
        UPDATE('GestionaAsientos.AprobadorSolicitud')
          .set({
            empleado_ID: empleado.ID,
            fechaAprobacion: new Date(),
            decision: DECISION_APROBACION,
            flujoaprobadores: flujoaprobadores ?? null
          })
          .where({
            cabecera_ID: solicitud.ID,
            nivelAprobacion: String(nivel),
            decision: DECISION_PENDIENTE
          })
      );

      if (!updateResult) {
        console.warn(`[RegistrarAprobacion] ⚠️ No se encontró fila PENDIENTE para nivel=${nivel} en solicitud=${numeroSolicitudPram}. Fallback a INSERT.`);
        await tx.run(
          INSERT.into('GestionaAsientos.AprobadorSolicitud').entries({
            empleado_ID: empleado.ID,
            cabecera_ID: solicitud.ID,
            fechaAprobacion: new Date(),
            nivelAprobacion: String(nivel),
            decision: DECISION_APROBACION,
            flujoaprobadores: flujoaprobadores ?? null
          })
        );
      }

      await tx.run(
        UPDATE('GestionaAsientos.CabeceraAsiento')
          .set({ estadoSolicitud_ID: proximoEstado.ID })
          .where({ ID: solicitud.ID })
      );

      console.info(`[RegistrarAprobacion] ✅ Aprobación registrada, estado actualizado a '${proximoCodigo}'`);
      return { message: "Aprobación registrada correctamente" };
    } catch (err) {
      console.error("❌ [RegistrarAprobacion] 🔴 Error detectado", err);
      if (err.code) {
        throw err; 
      }
      console.error("❌ [RegistrarAprobacion] 🔴 Error interno", err);
      return req.reject(500, "[RegistrarAprobacion] 🔴 Error interno");
    }
  });

  this.on("RegistrarRechazo", async (req) => {
    try {
      const { idSolicitud, emailAprobador, flujoaprobadores, motivoRechazo } = req.data;
      const numeroSolicitudPram = idSolicitud;
      const tx = req.tx;
      const catalogService = await cds.connect.to('CatalogService');
      console.info(`[RegistrarRechazo] numeroSolicitud=${numeroSolicitudPram}, emailAprobador=${emailAprobador}, motivoRechazo=${motivoRechazo}`);

      const empleado = await catalogService.run(SELECT.one.from('CatalogService.Empleados').where({ email: emailAprobador }));
      if (!empleado) req.reject(404, `No se encontró empleado con email ${emailAprobador}`);

      const solicitud = await tx.run(SELECT.one.from('GestionaAsientos.CabeceraAsiento').where({ numeroSolicitud: numeroSolicitudPram }));
      if (!solicitud) req.reject(404, `No existe la solicitud con número ${numeroSolicitudPram}`);

      const updateResult = await tx.run(
        UPDATE('GestionaAsientos.AprobadorSolicitud')
          .set({
            empleado_ID: empleado.ID,
            fechaAprobacion: new Date(),
            decision: DECISION_RECHAZO,
            flujoaprobadores: flujoaprobadores ?? null,
            motivoRechazo: motivoRechazo ?? null
          })
          .where({
            cabecera_ID: solicitud.ID,
            decision: DECISION_PENDIENTE
          })
      );

      if (!updateResult) {
        console.warn(`[RegistrarRechazo] ⚠️ No se encontró fila PENDIENTE en solicitud=${numeroSolicitudPram}. Fallback a INSERT.`);
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
      }

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
      if (err.code) {
        throw err; 
      }
      console.error("❌ [RegistrarRechazo] 🔴 Error interno", err);
      return req.reject(500, "[RegistrarRechazo] 🔴 Error interno");
    }
  });


  async function EjecutarContabilizacionPorID(id, req) {
    const numeroSolicitudParam = id;
    try {
      const catalogService = await cds.connect.to('CatalogService');
      const estadoAprobada = await catalogService.run(
        SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "APO" })
      );
      if (!estadoAprobada) req.reject(404, `No se encontró estado con código 'APO'`);
      const cabecera = await SELECT.one
        .from('com.carrefour.journal.CabeceraAsiento')
        .where({ numeroSolicitud: numeroSolicitudParam });
      if (!cabecera || cabecera.estadoSolicitud_ID != estadoAprobada.ID)
        req.reject(400, `Solicitud con numero ${numeroSolicitudParam} no encontrada o en estado distinto a Aprobada`);
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
      return await ValidaContabilizaAsiento(req, false);
    } catch (err) {
      console.error("❌ [RegistrarRechazo] 🔴 Error detectado", err);
      if (err.code) {
        throw err;
      }
      console.error("❌ [RegistrarRechazo] 🔴 Error interno", err);
      return req.reject(500, "[RegistrarRechazo] 🔴 Error interno");
    }
  }

  this.on('RealizarContabilizacion', async (req) => {
    const tx = req.tx;
    const catalogService = await cds.connect.to('CatalogService');
    try {
      const numeroSolicitudParam = req.data.id;
      if (!numeroSolicitudParam) return req.reject(400, 'Falta ID de la solicitud');
      console.info(`[RealizarContabilizacion] 🧮 Iniciando contabilización para numero de solicitud=${numeroSolicitudParam}`);
      const resultado = await EjecutarContabilizacionPorID(numeroSolicitudParam, req);
      if (resultado.success) {
        console.info(`[RealizarContabilizacion] ✅ Contabilización exitosa y estado actualizado a 'CON'`);
        return resultado;
      } else {
        console.warn(`[RealizarContabilizacion] ⚠️ Error en contabilización: ${resultado.message}`);
        return req.reject(400, resultado.message || 'Error en contabilización');
      }
    } catch (err) {
      console.error("❌ [RealizarContabilizacion] 🔴 Error detectado", err);
      if (err.code) {
        throw err;
      }
      console.error("❌ [RealizarContabilizacion] 🔴 Error interno:", err);
      return req.reject(500, "[RealizarContabilizacion] 🔴 Error interno");
    }
  });

  this.on("prepareAdjuntos", async req => {
    try {
      const { sessionId } = req.data;
      if (!sessionId) return req.reject(400, "sessionId requerido");
      await ensureFolder(`/solicitud-asientos-adjuntos/temp/${sessionId}`, req);
      return { success: true };
    } catch (err) {
      console.error("❌ [prepareAdjuntos] 🔴 Error detectado", err);
      if (err.code) {
        throw err; 
      }
      console.error("❌ [prepareAdjuntos] 🔴 Error interno:", err);
      return req.reject(500, "[prepareAdjuntos] 🔴 Error interno");
    }
  });

  this.on("confirmAdjuntos", async req => {
    await confirmAdjuntos(req);
  });

  this.on("rollbackAdjuntos", async req => {
    await rollbackAdjuntos(req);
  });

  this.before('CREATE', 'CabeceraAsiento', async (req) => {
    console.info('[CabeceraAsiento] 🟢 Entrando en BEFORE CREATE');
    try {
      const { periodoAnio, periodoMes, fechaDocumento, fechaContabilizacion, correo_solicitante } = req.data;
      if (!periodoAnio || !periodoMes)
        req.reject(400,
          `Falta fechaDocumento y fechaContabilizaci[on]`);
      const mes = Number(periodoMes);
      const anio = Number(periodoAnio);
      const fechaInicio = new Date(anio, mes - 1, 1);      
      const fechaFin = new Date(anio, mes, 0);            
      if (fechaDocumento) {
        const fdoc = new Date(fechaDocumento);
        if (fdoc < fechaInicio || fdoc > fechaFin) {
          req.reject(
            400,
            `La fechaDocumento (${fechaDocumento}) debe estar dentro del período ${periodoMes}/${periodoAnio}`
          );
        }
      }
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
      console.info(`🧮 Validación contable OK → Debe=${sumaDebe}, Haber=${sumaHaber}`);
      await ReemplazaMailSolicitantePorID(req);
      await ReemplazaCuentaPorID(req);
      await CompletaCamposCabecera(req);
      await ValidaContabilizaAsiento(req, true);
      if (!cab.numeroSolicitud) {
        cab.numeroSolicitud = await getNextNumeroSolicitudFU(tx);
        console.info(`[CabeceraAsiento] NumeroSolicitud asignado = ${cab.numeroSolicitud}`);
      }
      const resultadoBPA = await IniciaWorkflowBPA(req);
      cab.idInstanciaWorkflow = resultadoBPA.id;
      console.info(`[CabeceraAsiento] Workflow iniciado. idInstanciaWorkflow=${resultadoBPA.id}, niveles calculados=${resultadoBPA.niveles}`);
      await confirmAdjuntos(req);
    } catch (err) {
      console.error("❌ [CabeceraAsiento] 🔴 Error detectado", err);
      if (err.code) {
        throw err;
      }
      console.error("❌ [CabeceraAsiento] 🔴 Error interno:", err);
      return req.reject(500, "[CabeceraAsiento] 🔴 Error interno");
    }
  });

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
      if (!d.items?.length) return req.reject(400, "La solicitud no contiene items");
      if (!d.tipoAsiento_ID) return req.reject(400, "Falta tipoAsiento_ID");
      if (!d.subtipoAsiento_ID) return req.reject(400, "Falta subtipoAsiento_ID");
      if (!d.solicitante_ID) return req.reject(400, "Falta solicitante");
      if (!d.sectorSolicitante_ID) return req.reject(400, "Falta sector solicitante");
      const valores = await getValoresCabecera(req);
      const { solicitante, tipoAsiento, subtipoAsiento, referencia, sector } = valores;
      const tablasumatorias = await getTablaSumatorias(req);
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
      const payload = buildPayloadBPA(d, valores, tablasumatorias, n1, n2, n3, n4, listaurldms);
      console.info("🟩 [IniciaWorkflowBPA] Payload final:", JSON.stringify(payload, null, 2));

      const id = await callBPA(payload, req);

      await sembrarAprobadoresPendientes(req.tx, req.data.ID, n1, n2, n3, n4);
      const niveles = [n1, n2, n3, n4].filter(arr => arr && arr.length > 0).length;
      console.info(`🟩 [IniciaWorkflowBPA] Instancia BPA creada: ${id}, niveles: ${niveles}`);
      return { id, niveles };
    } catch (err) {
      console.error("❌ [IniciaWorkflowBPA] 🔴 Error detectado", err);
      if (err.code) {
        throw err;
      }
      console.error("❌ [IniciaWorkflowBPA] 🔴 Error interno:", err);
      return req.reject(500, "[IniciaWorkflowBPA] 🔴 Error interno");
    }
  }

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
      console.error("❌ [getNextNumeroSolicitudFU] 🔴 Error detectado", err);
      if (err.code) {
        throw err; 
      }
      console.error("❌ [getNextNumeroSolicitudFU] 🔴 Error interno:", err);
      return req.reject(500, "[getNextNumeroSolicitudFU] 🔴 Error interno");
    }
  }
});