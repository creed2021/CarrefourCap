const cds = require('@sap/cds');
const AppLog = require('../helpers/logging/app-log');
const DEFINITION_ID_BPA_DEV = "us30.process-automation-95oeuot4.ajustescontables.main";
const URL_BPA_DEV = '/workflow/rest/v1/workflow-instances?environmentId=dev';
const APIKEY_BPA_DEV = 'eoV2Z3u1DDGAQdusyr_qNQuU0Pjil5Rj';
const URL_MYINBOX_DEV = 'https://process-automation-95oeuot4.launchpad.cfapps.us30.hana.ondemand.com/site/Finanzas-DEV#Shell-home';
const DEFINITION_ID_BPA_PRD = "us30.process-automation-95oeuot4.ajustescontables.main";
const URL_BPA_PRD = '/workflow/rest/v1/workflow-instances?environmentId=prd';
const APIKEY_BPA_PRD = 'lh8zeBreIeV5VsVISeTEbu8yX9uk48cs';
const URL_MYINBOX_PRD = 'https://carrefour-asientos-manuales-6nw9u6rt.launchpad.cfapps.us30.hana.ondemand.com/site?siteId=05c77039-b85c-4a2a-b196-0ea24a6a2489#Shell-home';
const NOMBRES_NIVEL = {
  1: 'Aprobación Gerente o Director Area Solicitante',
  2: 'Aprobación Jefe Contabilidad',
  3: 'Aprobación Gerente o Director Contabilidad',
  4: 'Aprobación CFO'
};

async function getValoresCabecera(req) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    const d = req.data;
    const solicitante = await catalog.run(
      SELECT.one.from('CatalogService.Empleados').where({ ID: d.solicitante_ID })
    );
    if (!solicitante) return req.reject(400, "No se encontró el solicitante");
    const tipoAsiento = await catalog.run(
      SELECT.one.from('CatalogService.TiposAsiento').where({ ID: d.tipoAsiento_ID })
    );
    if (!tipoAsiento) return req.reject(400, "No se encontró el Tipo de Asiento");
    const subtipoAsiento = await catalog.run(
      SELECT.one.from('CatalogService.SubTiposAsiento').where({ ID: d.subtipoAsiento_ID })
    );
    if (!subtipoAsiento) return req.reject(400, "No se encontró el Subtipo de Asiento");
    const referencia = await catalog.run(
      SELECT.one.from('CatalogService.Referencia').where({ ID: d.referencia_ID })
    );
    if (!referencia) return req.reject(400, "No se encontró la Referencia");
    const sector = await catalog.run(
      SELECT.one.from('CatalogService.Sectores').where({ ID: d.sectorSolicitante_ID })
    );
    if (!sector) return req.reject(400, "No se encontró el sector del solicitante");
    return { solicitante, tipoAsiento, subtipoAsiento, referencia, sector };
  } catch (err) {
    AppLog.error("❌ [getValoresCabecera] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getValoresCabecera] 🔴 Error interno:", err);
    return req.reject(500, "[getValoresCabecera] 🔴 Error interno");
  }
}

// Nota: en este circuito el campo IdSolicitud lleva el número de solicitud, porque así lo espera el workflow de BPA.
async function getTablaSumatorias(req) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    const d = req.data;
    if (!d.items || !Array.isArray(d.items) || d.items.length === 0) {
      return req.reject(400, "[getTablaSumatorias] ❌ No se enviaron items para calcular sumatorias");
    }
    const cuentaIDs = d.items.map(i => i.cuentaContable_ID);
    if (cuentaIDs.some(id => !id)) {
      return req.reject(400, "[getTablaSumatorias] ❌ Hay items sin cuentaContable_ID");
    }
    const cuentas = await catalog.run(
      SELECT.from('CatalogService.Cuentas')
        .columns(
          'ID',
          'nombre',
          'numero'
        )
        .where({ ID: { in: cuentaIDs } })
    );
    if (!cuentas || cuentas.length === 0) {
      return req.reject(400, "[getTablaSumatorias] ❌ No se encontraron cuentas para los IDs enviados");
    }
    const mapCtas = new Map(
      cuentas.map(c => [
        c.ID,
        {
          numero: c.numero,
          nombre: c.nombre
        }
      ])
    );
    const sumMap = {};
    const tipoCambioVigente = Number(d.tipoCambio) || 1;
    for (const it of d.items) {
      const cta = mapCtas.get(it.cuentaContable_ID);
      if (!cta) {
        return req.reject(
          400,
          `[getTablaSumatorias] ❌ La cuenta ${it.cuentaContable_ID} no existe en el maestro`
        );
      }
      const numeroCuenta = cta.numero;
      const cuentaNombre = cta.nombre;
      if (!sumMap[numeroCuenta]) {
        sumMap[numeroCuenta] = {
          IdCuenta: numeroCuenta,
          TipoCuenta: cuentaNombre,
          SumatoriaTotal: 0
        };
      }
      sumMap[numeroCuenta].SumatoriaTotal += (Math.abs(Number(it.importe || 0)) * tipoCambioVigente * (it.clave === 40 ? 1 : -1));
    }
    const resultado = Object.values(sumMap);
    AppLog.debug("📊 [getTablaSumatorias] Tabla de sumatorias generada:");
    AppLog.debug(`   🔢 Total cuentas agrupadas: ${resultado.length}`);
    resultado.forEach(elem => {
      AppLog.debug(`   ➡ Cuenta ${elem.IdCuenta} → SumatoriaTotal = ${elem.SumatoriaTotal}`);
    });
    return resultado;
  } catch (err) {
    AppLog.error("❌ [getTablaSumatorias] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getTablaSumatorias] 🔴 Error interno:", err);
    return req.reject(500, "[getTablaSumatorias] 🔴 Error interno");
  }
}

async function getAprobadoresNivel1(req) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    const d = req.data;
    const cfgSector = await catalog.run(
      SELECT.from('CatalogService.ConfigAprobadores')
        .columns('empleado_ID', 'cargo_ID')
        .where({ sector_ID: d.sectorSolicitante_ID })
    );
    if (!cfgSector.length) return [];
    const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];
    const cargos = await catalog.run(
      SELECT.from('CatalogService.Cargos')
        .columns('ID', 'codigo')
        .where({ ID: { in: cargoIDs } })
    );
    if (!cargos.length) return [];
    const cargosValidos = cargos
      .filter(c => ["GER", "DIR"].includes(c.codigo))
      .map(c => c.ID);
    if (!cargosValidos.length) return [];
    const aprobadoresIDs = cfgSector
      .filter(c => cargosValidos.includes(c.cargo_ID))
      .map(c => c.empleado_ID);
    if (!aprobadoresIDs.length) return [];
    const empleados = await catalog.run(
      SELECT.from('CatalogService.Empleados')
        .columns('ID', 'email')
        .where({ ID: { in: aprobadoresIDs } })
    );
    return empleados.map(e => ({ email: e.email }));
  } catch (err) {
    AppLog.error("❌ [getAprobadoresNivel1] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getAprobadoresNivel1] 🔴 Error interno:", err);
    return req.reject(500, "[getAprobadoresNivel1] 🔴 Error interno");
  }
}

async function getAprobadoresNivel2(req) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    const sectorCON = await catalog.run(
      SELECT.one.from('CatalogService.Sectores')
        .columns('ID')
        .where({ codigo: 'CON' })
    );
    if (!sectorCON) return [];
    const cfgSector = await catalog.run(
      SELECT.from('CatalogService.ConfigAprobadores')
        .columns('empleado_ID', 'cargo_ID')
        .where({ sector_ID: sectorCON.ID })
    );
    if (!cfgSector.length) return [];
    const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];
    const cargos = await catalog.run(
      SELECT.from('CatalogService.Cargos')
        .columns('ID', 'codigo')
        .where({ ID: { in: cargoIDs } })
    );
    if (!cargos.length) return [];
    const cargosValidos = cargos
      .filter(c => c.codigo === "JFE")
      .map(c => c.ID);
    if (!cargosValidos.length) return [];
    const aprobadoresIDs = cfgSector
      .filter(c => cargosValidos.includes(c.cargo_ID))
      .map(c => c.empleado_ID);
    if (!aprobadoresIDs.length) return [];
    const empleados = await catalog.run(
      SELECT.from('CatalogService.Empleados')
        .columns('ID', 'email')
        .where({ ID: { in: aprobadoresIDs } })
    );
    return empleados.map(e => ({ email: e.email }));
  } catch (err) {
    AppLog.error("❌ [getAprobadoresNivel2] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getAprobadoresNivel2] 🔴 Error interno:", err);
    return req.reject(500, "[getAprobadoresNivel2] 🔴 Error interno");
  }
}

async function getAprobadoresNivel3(req, tablasumatorias) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    let supera = false;
    for (const t of tablasumatorias) {
      AppLog.debug(`➡ [getAprobadoresNivel3] Procesando cuenta ${t.IdCuenta} con sumatoria ${t.SumatoriaTotal}`);
      const cuenta = await catalog.run(
        SELECT.one.from('CatalogService.Cuentas')
          .columns('ID')
          .where({ numero: t.IdCuenta })
      );
      if (!cuenta) {
        AppLog.error(`❌ [getAprobadoresNivel3] La cuenta ${t.IdCuenta} NO existe en CatalogService.Cuentas`);
        return req.reject(400, `[getAprobadoresNivel3] La cuenta ${t.IdCuenta} no existe en el maestro de cuentas`);
      }
      const umbral = await catalog.run(
        SELECT.one.from('CatalogService.UmbralesCuentas')
          .columns('importeGerencia')
          .where({ cuentaContable_ID: cuenta.ID })
      );
      if (!umbral || !umbral.importeGerencia) {
        AppLog.error(`⚠ [getAprobadoresNivel3] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
        return req.reject(400, `[getAprobadoresNivel3] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
      } else {
        AppLog.debug(`   🔍  [getAprobadoresNivel3] Umbral Gerencia: ${umbral.importeGerencia}`);
      }
      if (umbral && umbral.importeGerencia && t.SumatoriaTotal >= Number(umbral.importeGerencia)) {
        AppLog.debug(` [getAprobadoresNivel3]  ✔ Supera umbral → requiere Aprobador Nivel 3`);
        supera = true;
        break;
      } else {
        AppLog.debug(` [getAprobadoresNivel3] ✖ No supera umbral`);
      }
    }
    if (!supera) {
      AppLog.debug("🟦 [getAprobadoresNivel3] Ninguna cuenta supera el umbral de Gerencia → NO hay aprobadores de nivel 3");
      return [];
    }
    const sectorCON = await catalog.run(
      SELECT.one.from('CatalogService.Sectores')
        .columns('ID')
        .where({ codigo: 'CON' })
    );
    if (!sectorCON) {
      AppLog.error("❌ [getAprobadoresNivel3] Sector 'CON' no existe en CatalogService.Sectores");
      return req.reject(400, "[getAprobadoresNivel3] Sector 'CON' no existe");
    }
    const cfgSector = await catalog.run(
      SELECT.from('CatalogService.ConfigAprobadores')
        .columns('empleado_ID', 'cargo_ID')
        .where({ sector_ID: sectorCON.ID })
    );
    if (!cfgSector.length) {
      AppLog.error("❌ [getAprobadoresNivel3] No existen ConfigAprobadores para el sector CON");
      return req.reject(400, "[getAprobadoresNivel3] No existen ConfigAprobadores para el sector CON");
    }
    const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];
    const cargos = await catalog.run(
      SELECT.from('CatalogService.Cargos')
        .columns('ID', 'codigo')
        .where({ ID: { in: cargoIDs } })
    );
    if (!cargos.length) {
      AppLog.error("❌ [getAprobadoresNivel3] No existen cargos para los ConfigAprobadores del sector CON");
      return req.reject(400, "[getAprobadoresNivel3] No existen cargos asociados al sector CON");
    }
    const cargosValidos = cargos
      .filter(c => ((c.codigo === "GER") || (c.codigo === "DIR")))
      .map(c => c.ID);
    if (!cargosValidos.length) {
      AppLog.error("❌ [getAprobadoresNivel3] No hay cargos GER/DIR en sector CON");
      return req.reject(400, "[getAprobadoresNivel3] No existen cargos GER/DIR para sector CON");
    }
    const aprobadoresIDs = cfgSector
      .filter(c => cargosValidos.includes(c.cargo_ID))
      .map(c => c.empleado_ID);
    if (!aprobadoresIDs.length) {
      AppLog.error("❌ getAprobadoresNivel3] No existen empleados asociados a cargos GER/DIR");
      return req.reject(400, "[getAprobadoresNivel3] No se encontraron empleados para cargos GER/DIR");
    }
    const empleados = await catalog.run(
      SELECT.from('CatalogService.Empleados')
        .columns('ID', 'email')
        .where({ ID: { in: aprobadoresIDs } })
    );
    console.info(`🟦 [getAprobadoresNivel3] Aprobadores Nivel 3 encontrados: ${empleados.map(e => e.email).join(", ")}`);
    return empleados.map(e => ({ email: e.email }));
  } catch (err) {
    AppLog.error("❌ [getAprobadoresNivel3] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getAprobadoresNivel3] 🔴 Error interno:", err);
    return req.reject(500, "[getAprobadoresNivel3] 🔴 Error interno");
  }
}

async function getAprobadoresNivel4(req, tablasumatorias) {
  try {
    const catalog = await cds.connect.to("CatalogService");
    let supera = false;
    for (const t of tablasumatorias) {
      AppLog.debug(`➡ [getAprobadoresNivel4] Procesando cuenta ${t.IdCuenta} con sumatoria ${t.SumatoriaTotal}`);
      const cuenta = await catalog.run(
        SELECT.one.from('CatalogService.Cuentas')
          .columns('ID')
          .where({ numero: t.IdCuenta })
      );
      if (!cuenta) {
        AppLog.error(`❌ [getAprobadoresNivel4] La cuenta ${t.IdCuenta} NO existe en CatalogService.Cuentas`);
        return req.reject(400, `[getAprobadoresNivel4] La cuenta ${t.IdCuenta} no existe en el maestro de cuentas`);
      }
      const umbral = await catalog.run(
        SELECT.one.from('CatalogService.UmbralesCuentas')
          .columns('importeCFO')
          .where({ cuentaContable_ID: cuenta.ID })
      );
      if (!umbral || !umbral.importeCFO) {
        AppLog.error(`⚠ [getAprobadoresNivel4] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
        return req.reject(400, `[getAprobadoresNivel4] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
      } else {
        AppLog.debug(`   🔍  [getAprobadoresNivel4] Umbral CFO: ${umbral.importeCFO}`);
      }
      if (umbral && umbral.importeCFO && t.SumatoriaTotal >= Number(umbral.importeCFO)) {
        AppLog.debug(` [getAprobadoresNivel4]  ✔ Supera umbral → requiere Aprobador Nivel 4`);
        supera = true;
        break;
      } else {
        AppLog.debug(` [getAprobadoresNivel4] ✖ No supera umbral`);
      }
    }
    if (!supera) {
      AppLog.debug("🟦 [getAprobadoresNivel4] Ninguna cuenta supera el umbral de CFO → NO hay aprobadores de nivel 4");
      return [];
    }
    const sectorEMP = await catalog.run(
      SELECT.one.from('CatalogService.Sectores')
        .columns('ID')
        .where({ codigo: 'EMP' })
    );
    if (!sectorEMP) {
      AppLog.error("❌ Sector 'EMP' no existe en CatalogService.Sectores");
      return req.reject(400, "[getAprobadoresNivel4] Sector 'EMP' no existe");
    }
    const cfgSector = await catalog.run(
      SELECT.from('CatalogService.ConfigAprobadores')
        .columns('empleado_ID', 'cargo_ID')
        .where({ sector_ID: sectorEMP.ID })
    );
    if (!cfgSector.length) {
      AppLog.error("❌ No hay ConfigAprobadores para sector EMP");
      return req.reject(400, "[getAprobadoresNivel4] No existen ConfigAprobadores para sector EMP");
    }
    const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];
    const cargos = await catalog.run(
      SELECT.from('CatalogService.Cargos')
        .columns('ID', 'codigo')
        .where({ ID: { in: cargoIDs } })
    );
    if (!cargos.length) {
      AppLog.error("❌ No existen cargos asociados al sector EMP");
      return req.reject(400, "[getAprobadoresNivel4] No existen cargos para sector EMP");
    }
    const cargosValidos = cargos
      .filter(c => c.codigo === "CFO")
      .map(c => c.ID);
    if (!cargosValidos.length) {
      AppLog.error("❌ No hay cargos CFO en sector EMP");
      return req.reject(400, "[getAprobadoresNivel4] No existen cargos CFO en sector EMP");
    }
    const aprobadoresIDs = cfgSector
      .filter(c => cargosValidos.includes(c.cargo_ID))
      .map(c => c.empleado_ID);
    if (!aprobadoresIDs.length) {
      AppLog.error("❌ No se encontraron empleados CFO para sector EMP");
      return req.reject(400, "[getAprobadoresNivel4] No existen empleados para cargo CFO");
    }
    const empleados = await catalog.run(
      SELECT.from('CatalogService.Empleados')
        .columns('ID', 'email')
        .where({ ID: { in: aprobadoresIDs } })
    );
    console.info(`🟥 Aprobadores Nivel 4 encontrados: ${empleados.map(e => e.email).join(", ")}`);
    return empleados.map(e => ({ email: e.email }));
  } catch (err) {
    AppLog.error("❌ [getAprobadoresNivel4] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [getAprobadoresNivel4] 🔴 Error interno:", err);
    return req.reject(500, "[getAprobadoresNivel4] 🔴 Error interno");
  }
}

async function getUrlsAdjuntos(req) {
  try {
    const cab = req.data;
    const adjuntos = cab.adjuntosSolicitud;
    AppLog.debug("🟩 [confirmAdjuntos] adjuntos", JSON.stringify(adjuntos, null, 2));
    if (adjuntos) {
      if (adjuntos.length == 0) {
        AppLog.debug("📊 [confirmAdjuntos] No hay adjuntos");
        return;
      };
    } else {
      AppLog.debug("📊 [confirmAdjuntos] No hay adjuntos");
      return;
    }
    return adjuntos
      .map(a => a.urlAdjunto)
      .filter(u => u && u.trim() !== '');
  } catch (err) {
    AppLog.error("❌ [getUrlsAdjuntos] 🔴 Error detectado", err);
    if (err.code) throw err;
    return req.reject(500, "[getUrlsAdjuntos] 🔴 Error interno");
  }
}

function buildPayloadBPA(d, valores, tablasumatorias, n1, n2, n3, n4, listaurldms) {
  try {
    const { solicitante, tipoAsiento, subtipoAsiento, referencia, sector } = valores;
    return {
      definitionId: DEFINITION_ID_BPA_DEV,
      context: {
        numerosolicitud: `${String(d.numeroSolicitud)}`,
        clasedocumento: d.claseDocumento,
        fechacontabilizacion: d.fechaContabilizacion,
        fechadocumento: d.fechaDocumento,
        periodo: `${d.periodoMes}/${d.periodoAnio}`,
        referencia: referencia.nombre,
        sector: sector.nombre,
        sociedad: d.sociedad,
        solicitante: solicitante.nombre,
        subtipoasiento: subtipoAsiento.nombre,
        textocabecera: d.textoCabecera,
        tipoasiento: tipoAsiento.nombre,
        tablasumatorias,
        emailsolicitante: solicitante.email,
        moneda: d.moneda,
        testmode: false,
        listamailsnivel1: n1.map(e => e.email),
        listamailsnivel2: n2.map(e => e.email),
        listamailsnivel3: n3.map(e => e.email),
        listamailsnivel4: n4.map(e => e.email),
        enlacedms: "",
        listaurldms,
        urlmyinbox: URL_MYINBOX_DEV,
      }
    };
  } catch (err) {
    AppLog.error("❌ [buildPayloadBPA] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [buildPayloadBPA] 🔴 Error interno:", err);
    return req.reject(500, "[buildPayloadBPA] 🔴 Error interno");
  }
}

async function callBPA(payload, req) {
  AppLog.debug("[callBPA] Payload enviado:", JSON.stringify(payload, null, 2));
  AppLog.info("[callBPA] Entrando....:");
  const bpa_destination = await cds.connect.to("bpa-api");
  try {
    let header = {
      'irpa-api-key': APIKEY_BPA_DEV
    };
    let oResult = await bpa_destination.tx(req).post(URL_BPA_DEV,
      payload,
      header);
    oResultoSTR = JSON.stringify(oResult, null, 2);
    AppLog.debug(`[callBPA] ✅ Solicitud registrada correctamente ${oResultoSTR}`);
    if (oResult.status !== "RUNNING") {
      throw new Error('Failed to trigger the process.');
    } else {
      return oResult.id;
    }
  } catch (err) {
    AppLog.error("❌ [callBPA] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [callBPA] 🔴 Error interno:", err);
    return req.reject(500, "[callBPA] 🔴 Error interno");
  }
}

async function sembrarAprobadoresPendientes(tx, cabeceraID, n1, n2, n3, n4) {
  try {
    const niveles = [n1, n2, n3, n4];
    const filas = [];
    niveles.forEach((lista, idx) => {
      const nivel = idx + 1;
      if (lista && lista.length > 0) {
        filas.push({
          cabecera_ID: cabeceraID,
          nivelAprobacion: String(nivel),
          responsable: NOMBRES_NIVEL[nivel],
          usuariosAlternativos: lista.map(e => e.email).join(', '),
          decision: 'PENDIENTE'
        });
      }
    });
    if (filas.length > 0) {
      await tx.run(INSERT.into('GestionaAsientos.AprobadorSolicitud').entries(filas));
      AppLog.debug(`🟩 [sembrarAprobadoresPendientes] ${filas.length} instancias pendientes sembradas`);
    }
  } catch (err) {
    AppLog.error("❌ [sembrarAprobadoresPendientes] 🔴 Error detectado", err);
    throw err; // sí o sí debe abortar el CREATE si esto falla — sin pendientes sembrados, la Mejora 11 queda rota
  }
}

module.exports = {
  getValoresCabecera,
  getTablaSumatorias,
  getAprobadoresNivel1,
  getAprobadoresNivel2,
  getAprobadoresNivel3,
  getAprobadoresNivel4,
  getUrlsAdjuntos,
  buildPayloadBPA,
  callBPA,
  sembrarAprobadoresPendientes
};
