const cds = require('@sap/cds');
const path = require('path');
const soap = require('soap');
const axios = require("axios");
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const xml2js = require('xml2js');
const { Token } = require('@sap/xssec');
const { threadId } = require('worker_threads');

//REVISAR QUE JUEGO DE CONSTANTES ESTÁ PRENDIDO
//AMBIENTE DEV
const DEFINITION_ID_BPA_DEV = "us30.process-automation-95oeuot4.ajustescontables.main";
const URL_BPA_DEV = '/workflow/rest/v1/workflow-instances?environmentId=dev';
const APIKEY_BPA_DEV = 'eoV2Z3u1DDGAQdusyr_qNQuU0Pjil5Rj';

//AMBIENTE PRD
const DEFINITION_ID_BPA_PRD = "us30.process-automation-95oeuot4.ajustescontables.main";
const URL_BPA_PRD = '/workflow/rest/v1/workflow-instances?environmentId=prd';
const APIKEY_BPA_PRD = 'lh8zeBreIeV5VsVISeTEbu8yX9uk48cs';

/* ============================================================================================
 * 🧩 HELPER — URLs de Adjuntos (DMS)
 * ============================================================================================ */
async function getUrlsAdjuntos(req) {
  try {

    const cab = req.data;
    const adjuntos = cab.adjuntosSolicitud;

    //LOG console.info("🟩 [confirmAdjuntos] adjuntos", JSON.stringify(adjuntos, null, 2));

    if(adjuntos) {
      if (adjuntos.length == 0){
          //LOG console.info("📊 [confirmAdjuntos] No hay adjuntos");
          return;
      };
    } else{
          //LOG console.info("📊 [confirmAdjuntos] No hay adjuntos");
          return;              
    }

    return adjuntos
      .map(a => a.urlAdjunto)
      .filter(u => u && u.trim() !== '');

  } catch (err) {
    console.error("❌ [getUrlsAdjuntos] 🔴 Error detectado", err);
    if (err.code) throw err;
    return req.reject(500, "[getUrlsAdjuntos] 🔴 Error interno");
  }
}

/* ============================================================================================
 * 🧩 HELPER 1 — Obtener valores de cabecera desde entidades maestro
 * ============================================================================================ */
async function getValoresCabecera(req) {
  try{
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
        console.error("❌ [getValoresCabecera] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [getValoresCabecera] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[getValoresCabecera] 🔴 Error interno");
      }
}

/* ============================================================================================
 * 🧩 HELPER 2 — Calcular tablasumatorias agrupando por cuenta y tipoCuenta
 * ============================================================================================ */

//!!!!!!!ATENCION!!!!!! EN ESTE METODOS Y OTROS RELACIOANDOS EN PARTE DEL CIRCUITO SE UTILIZA
//                                EL NRO DE SOLICITUD EN EL EL CAMPO IdSolicitud PORQUE EN EL WORKFLOW 
//                                SE UTILIZÓ DE ESA MANERA.
async function getTablaSumatorias(req) {
    try {
        const catalog = await cds.connect.to("CatalogService");
        const d = req.data;

        // 1️⃣ Validación: Deben existir items
        if (!d.items || !Array.isArray(d.items) || d.items.length === 0) {
            return req.reject(400, "[getTablaSumatorias] ❌ No se enviaron items para calcular sumatorias");
        }

        // 2️⃣ Validación: Todos los items deben tener cuentaContable_ID
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

                sumMap[numeroCuenta].SumatoriaTotal += (Math.abs(Number(it.importe || 0)) * (it.clave === 40 ? 1 : -1));
            }



        // return Object.values(sumMap);
        const resultado = Object.values(sumMap);

        // 5️⃣ LOG DETALLADO DE RESULTADO
        //LOG console.info("📊 [getTablaSumatorias] Tabla de sumatorias generada:");
        //LOG console.info(`   🔢 Total cuentas agrupadas: ${resultado.length}`);

        //LOG resultado.forEach(elem => {
        //     console.info(`   ➡ Cuenta ${elem.IdCuenta} → SumatoriaTotal = ${elem.SumatoriaTotal}`);
        // });

        return resultado;

    } catch (err) {

        console.error("❌ [getTablaSumatorias] 🔴 Error detectado", err);

        // Si el error ya es de CAP → relanzar
        if (err.code) {
            throw err;
        }

        // Error inesperado → 500
        console.error("❌ [getTablaSumatorias] 🔴 Error interno:", err);
        return req.reject(500, "[getTablaSumatorias] 🔴 Error interno");
    }
}


/* ============================================================================================
 * 🧩 HELPER 3 — Aprobadores Nivel 1: sector solicitante + cargos GER/DIR
 * ============================================================================================ */
async function getAprobadoresNivel1(req) {
    try{
          const catalog = await cds.connect.to("CatalogService");
          const d = req.data;

          // 1️⃣ Traer todos los ConfigAprobadores del sector
          const cfgSector = await catalog.run(
            SELECT.from('CatalogService.ConfigAprobadores')
              .columns('empleado_ID', 'cargo_ID')
              .where({ sector_ID: d.sectorSolicitante_ID })
          );

          if (!cfgSector.length) return [];

          // 2️⃣ Traer los cargos asociados
          const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];

          const cargos = await catalog.run(
            SELECT.from('CatalogService.Cargos')
              .columns('ID', 'codigo')
              .where({ ID: { in: cargoIDs } })
          );

          if (!cargos.length) return [];

          // 3️⃣ Filtrar solo cargos GER o DIR
          const cargosValidos = cargos
            .filter(c => ["GER", "DIR"].includes(c.codigo))
            .map(c => c.ID);

          if (!cargosValidos.length) return [];

          // 4️⃣ Filtrar ConfigAprobadores nuevamente pero ahora con cargos válidos
          const aprobadoresIDs = cfgSector
            .filter(c => cargosValidos.includes(c.cargo_ID))
            .map(c => c.empleado_ID);

          if (!aprobadoresIDs.length) return [];

          // 5️⃣ Traer empleados finales
          const empleados = await catalog.run(
            SELECT.from('CatalogService.Empleados')
              .columns('email')
              .where({ ID: { in: aprobadoresIDs } })
          );

          return empleados.map(e => e.email);
    } catch (err) {
      console.error("❌ [getAprobadoresNivel1] 🔴 Error detectado", err);
      // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
      if (err.code) {
        throw err; // ⚡ sigue para arriba sin cambios
      }

      // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
      console.error("❌ [getAprobadoresNivel1] 🔴 Error interno:", err);

      // devolvemos un error 500 limpio
      return req.reject(500, "[getAprobadoresNivel1] 🔴 Error interno");
    }
}




    /* ============================================================================================
    * 🧩 HELPER 4 — Aprobadores Nivel 2: sector CON + cargo JFE
    * ============================================================================================ */
    async function getAprobadoresNivel2(req) {
      try{
            const catalog = await cds.connect.to("CatalogService");

            // 1️⃣ Buscar sector con código = "CON"
            const sectorCON = await catalog.run(
              SELECT.one.from('CatalogService.Sectores')
                .columns('ID')
                .where({ codigo: 'CON' })
            );

            if (!sectorCON) return [];

            // 2️⃣ Obtener todos los ConfigAprobadores del sector CON
            const cfgSector = await catalog.run(
              SELECT.from('CatalogService.ConfigAprobadores')
                .columns('empleado_ID', 'cargo_ID')
                .where({ sector_ID: sectorCON.ID })
            );

            if (!cfgSector.length) return [];

            // 3️⃣ Obtener los cargos asociados
            const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];

            const cargos = await catalog.run(
              SELECT.from('CatalogService.Cargos')
                .columns('ID', 'codigo')
                .where({ ID: { in: cargoIDs } })
            );

            if (!cargos.length) return [];

            // 4️⃣ Filtrar solo cargo "JFE"
            const cargosValidos = cargos
              .filter(c => c.codigo === "JFE")
              .map(c => c.ID);

            if (!cargosValidos.length) return [];

            // 5️⃣ Filtrar ConfigAprobadores solo con cargo JFE
            const aprobadoresIDs = cfgSector
              .filter(c => cargosValidos.includes(c.cargo_ID))
              .map(c => c.empleado_ID);

            if (!aprobadoresIDs.length) return [];

            // 6️⃣ Traer los empleados finales
            const empleados = await catalog.run(
              SELECT.from('CatalogService.Empleados')
                .columns('email')
                .where({ ID: { in: aprobadoresIDs } })
            );

            return empleados.map(e => e.email);
        } catch (err) {
          console.error("❌ [getAprobadoresNivel2] 🔴 Error detectado", err);
          // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
          if (err.code) {
            throw err; // ⚡ sigue para arriba sin cambios
          }

          // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
          console.error("❌ [getAprobadoresNivel2] 🔴 Error interno:", err);

          // devolvemos un error 500 limpio
          return req.reject(500, "[getAprobadoresNivel2] 🔴 Error interno");
        }
    }


    /* ============================================================================================
    * 🧩 HELPER 5 — Aprobadores Nivel 3: supera importeGerencia
    * ============================================================================================ */
    async function getAprobadoresNivel3(req, tablasumatorias) {
      try{
            const catalog = await cds.connect.to("CatalogService");

            let supera = false;

            // 1️⃣ Verificar si alguna cuenta supera el importeGerencia
            for (const t of tablasumatorias) {

              //LOG console.info(`➡ [getAprobadoresNivel3] Procesando cuenta ${t.IdCuenta} con sumatoria ${t.SumatoriaTotal}`);

              const cuenta = await catalog.run(
                SELECT.one.from('CatalogService.Cuentas')
                  .columns('ID')
                  .where({ numero: t.IdCuenta })
              );

              if (!cuenta) {
                console.error(`❌ [getAprobadoresNivel3] La cuenta ${t.IdCuenta} NO existe en CatalogService.Cuentas`);
                return req.reject(400, `[getAprobadoresNivel3] La cuenta ${t.IdCuenta} no existe en el maestro de cuentas`);
              }

              const umbral = await catalog.run(
                SELECT.one.from('CatalogService.UmbralesCuentas')
                  .columns('importeGerencia')
                  .where({ cuentaContable_ID: cuenta.ID })
              );

              if (!umbral && !umbral.importeGerencia) {
                //LOG console.warn(`⚠ [getAprobadoresNivel3] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
                return req.reject(400, `[getAprobadoresNivel4] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
              } //LOG else {
                // console.info(`   🔍  [getAprobadoresNivel3] Umbral Gerencia: ${umbral.importeGerencia}`);
              //}
              

              if (umbral && umbral.importeGerencia && t.SumatoriaTotal >= Number(umbral.importeGerencia)) {
                //LOG console.info(` [getAprobadoresNivel3]  ✔ Supera umbral → requiere Aprobador Nivel 3`);
                
                supera = true;
                break;
              } //LOG else {
                //console.info(` [getAprobadoresNivel3] ✖ No supera umbral`);
              //}
            }

              if (!supera) {
                //LOG console.info("🟦 [getAprobadoresNivel3] Ninguna cuenta supera el umbral de Gerencia → NO hay aprobadores de nivel 3");
                return [];
              }

            // 2️⃣ Buscar Sector con código = CON
            const sectorCON = await catalog.run(
              SELECT.one.from('CatalogService.Sectores')
                .columns('ID')
                .where({ codigo: 'CON' })
            );

            if (!sectorCON) {
              console.error("❌ [getAprobadoresNivel3] Sector 'CON' no existe en CatalogService.Sectores");
              return req.reject(400, "[getAprobadoresNivel3] Sector 'CON' no existe");
            }

            // 3️⃣ Obtener ConfigAprobadores del sector CON
            const cfgSector = await catalog.run(
              SELECT.from('CatalogService.ConfigAprobadores')
                .columns('empleado_ID', 'cargo_ID')
                .where({ sector_ID: sectorCON.ID })
            );

            if (!cfgSector.length) {
              console.error("❌ [getAprobadoresNivel3] No existen ConfigAprobadores para el sector CON");
              return req.reject(400, "[getAprobadoresNivel3] No existen ConfigAprobadores para el sector CON");
            }

            // 4️⃣ Obtener los cargos asociados
            const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];

            const cargos = await catalog.run(
              SELECT.from('CatalogService.Cargos')
                .columns('ID', 'codigo')
                .where({ ID: { in: cargoIDs } })
            );

              if (!cargos.length) {
                console.error("❌ [getAprobadoresNivel3] No existen cargos para los ConfigAprobadores del sector CON");
                return req.reject(400, "[getAprobadoresNivel3] No existen cargos asociados al sector CON");
              }

            // 5️⃣ Filtrar los cargos GER
            const cargosValidos = cargos
              .filter(c => ((c.codigo === "GER") || (c.codigo === "DIR")) ) //DJ 2025-11-19: agregué DIR
              .map(c => c.ID);

              if (!cargosValidos.length) {
                console.error("❌ [getAprobadoresNivel3] No hay cargos GER/DIR en sector CON");
                return req.reject(400, "[getAprobadoresNivel3] No existen cargos GER/DIR para sector CON");
              }

            // 6️⃣ Filtrar aprobadores con cargo GER
            const aprobadoresIDs = cfgSector
              .filter(c => cargosValidos.includes(c.cargo_ID))
              .map(c => c.empleado_ID);

              if (!aprobadoresIDs.length) {
                console.error("❌ getAprobadoresNivel3] No existen empleados asociados a cargos GER/DIR");
                return req.reject(400, "[getAprobadoresNivel3] No se encontraron empleados para cargos GER/DIR");
              }

            // 7️⃣ Traer empleados finales
            const empleados = await catalog.run(
              SELECT.from('CatalogService.Empleados')
                .columns('email')
                .where({ ID: { in: aprobadoresIDs } })
            );

            //LOG console.info(`🟦 [getAprobadoresNivel3] Aprobadores Nivel 3 encontrados: ${empleados.map(e => e.email).join(", ")}`);


            return empleados.map(e => e.email);
        } catch (err) {
          console.error("❌ [getAprobadoresNivel3] 🔴 Error detectado", err);
          // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
          if (err.code) {
            throw err; // ⚡ sigue para arriba sin cambios
          }

          // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
          console.error("❌ [getAprobadoresNivel3] 🔴 Error interno:", err);

          // devolvemos un error 500 limpio
          return req.reject(500, "[getAprobadoresNivel3] 🔴 Error interno");
        }
    }

      /* ============================================================================================
      * 🧩 HELPER 6 — Aprobadores Nivel 4: supera importeCFO
      * ============================================================================================ */
      async function getAprobadoresNivel4(req, tablasumatorias) {

        try{
              const catalog = await cds.connect.to("CatalogService");

              let supera = false;

              // 1️⃣ Verificar si alguna cuenta supera el importeCFO
              for (const t of tablasumatorias) {

              //LOG console.info(`➡ [getAprobadoresNivel4] Procesando cuenta ${t.IdCuenta} con sumatoria ${t.SumatoriaTotal}`);

                const cuenta = await catalog.run(
                  SELECT.one.from('CatalogService.Cuentas')
                    .columns('ID')
                    .where({ numero: t.IdCuenta })
                );

              if (!cuenta) {
                console.error(`❌ [getAprobadoresNivel4] La cuenta ${t.IdCuenta} NO existe en CatalogService.Cuentas`);
                return req.reject(400, `[getAprobadoresNivel4] La cuenta ${t.IdCuenta} no existe en el maestro de cuentas`);
              }

                const umbral = await catalog.run(
                  SELECT.one.from('CatalogService.UmbralesCuentas')
                    .columns('importeCFO')
                    .where({ cuentaContable_ID: cuenta.ID })
                );

                if (!umbral && !umbral.importeCFO) {
                  //LOG console.warn(`⚠ [getAprobadoresNivel4] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
                  return req.reject(400, `[getAprobadoresNivel4] Cuenta ${t.IdCuenta} no tiene umbral configurado en UmbralesCuentas`);
                } //LOG else {
                  //console.info(`   🔍  [getAprobadoresNivel4] Umbral CFO: ${umbral.importeCFO}`);
                //}

                if (umbral && umbral.importeCFO && t.SumatoriaTotal >= Number(umbral.importeCFO)) {
                  //LOG console.info(` [getAprobadoresNivel4]  ✔ Supera umbral → requiere Aprobador Nivel 4`);
                  
                  supera = true;
                  break;
                } 
                // LOG else {
                //   console.info(` [getAprobadoresNivel4] ✖ No supera umbral`);
                // }
              }

              if (!supera) {
                //LOG console.info("🟦 [getAprobadoresNivel4] Ninguna cuenta supera el umbral de CFO → NO hay aprobadores de nivel 4");
                return [];
              }

              // 2️⃣ Buscar sector EMP
              const sectorEMP = await catalog.run(
                SELECT.one.from('CatalogService.Sectores')
                  .columns('ID')
                  .where({ codigo: 'EMP' })
              );

              if (!sectorEMP) {
                console.error("❌ Sector 'EMP' no existe en CatalogService.Sectores");
                return req.reject(400, "[getAprobadoresNivel4] Sector 'EMP' no existe");
              }

              // 3️⃣ Obtener ConfigAprobadores del sector EMP
              const cfgSector = await catalog.run(
                SELECT.from('CatalogService.ConfigAprobadores')
                  .columns('empleado_ID', 'cargo_ID')
                  .where({ sector_ID: sectorEMP.ID })
              );

                if (!cfgSector.length) {
                  console.error("❌ No hay ConfigAprobadores para sector EMP");
                  return req.reject(400, "[getAprobadoresNivel4] No existen ConfigAprobadores para sector EMP");
                }

              // 4️⃣ Obtener los cargos asociados
              const cargoIDs = [...new Set(cfgSector.map(c => c.cargo_ID).filter(Boolean))];

              const cargos = await catalog.run(
                SELECT.from('CatalogService.Cargos')
                  .columns('ID', 'codigo')
                  .where({ ID: { in: cargoIDs } })
              );

              if (!cargos.length) {
                console.error("❌ No existen cargos asociados al sector EMP");
                return req.reject(400, "[getAprobadoresNivel4] No existen cargos para sector EMP");
              }

              // 5️⃣ Filtrar los cargos CFO
              const cargosValidos = cargos
                .filter(c => c.codigo === "CFO")
                .map(c => c.ID);

              if (!cargosValidos.length) {
                console.error("❌ No hay cargos CFO en sector EMP");
                return req.reject(400, "[getAprobadoresNivel4] No existen cargos CFO en sector EMP");
              }

              // 6️⃣ Filtrar aprobadores
              const aprobadoresIDs = cfgSector
                .filter(c => cargosValidos.includes(c.cargo_ID))
                .map(c => c.empleado_ID);

              if (!aprobadoresIDs.length) {
                console.error("❌ No se encontraron empleados CFO para sector EMP");
                return req.reject(400, "[getAprobadoresNivel4] No existen empleados para cargo CFO");
              }

              // 7️⃣ Traer empleados finales
              const empleados = await catalog.run(
                SELECT.from('CatalogService.Empleados')
                  .columns('email')
                  .where({ ID: { in: aprobadoresIDs } })
              );

              //LOG console.info(`🟥 Aprobadores Nivel 4 encontrados: ${empleados.map(e => e.email).join(", ")}`);

              return empleados.map(e => e.email);
          } catch (err) {
            console.error("❌ [getAprobadoresNivel4] 🔴 Error detectado", err);
            // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
            if (err.code) {
              throw err; // ⚡ sigue para arriba sin cambios
            }

            // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
            console.error("❌ [getAprobadoresNivel4] 🔴 Error interno:", err);

            // devolvemos un error 500 limpio
            return req.reject(500, "[getAprobadoresNivel4] 🔴 Error interno");
          }
      }



/* ============================================================================================
 * 🧩 HELPER 7 — Construir payload final BPA
 * ============================================================================================ */
function buildPayloadBPA(d, valores, tablasumatorias, n1, n2, n3, n4, listaurldms) {
  try{
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
              listamailsnivel1: n1,
              listamailsnivel2: n2,
              listamailsnivel3: n3,
              listamailsnivel4: n4,
              enlacedms: "",
              listaurldms
            }
          };
      } catch (err) {
        console.error("❌ [buildPayloadBPA] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [buildPayloadBPA] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[buildPayloadBPA] 🔴 Error interno");
      }
}

    async function callBPA(payload, req) {
        //LOG console.info("[callBPA] Payload enviado:", JSON.stringify(payload, null, 2));
        console.info("[callBPA] Enrenado....:");

        const bpa_destination = await cds.connect.to("bpa-api");

          try {

                  let header = {
                    'irpa-api-key': APIKEY_BPA_DEV
                  };
                  
                  let oResult = await bpa_destination.tx(req).post(URL_BPA_DEV, 
                                      payload,
                                      header);


                  oResultoSTR = JSON.stringify(oResult, null, 2);
                  //LOG console.info(`[callBPA] ✅ Solicitud registrada correctamente ${oResultoSTR}`);

                  if (oResult.status !== "RUNNING") {
                    throw new Error('Failed to trigger the process.');
                  }else{
                    return oResult.id;
                  }

            } catch (err) {
              console.error("❌ [callBPA] 🔴 Error detectado", err);
              // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
              if (err.code) {
                throw err; // ⚡ sigue para arriba sin cambios
              }

              // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
              console.error("❌ [callBPA] 🔴 Error interno:", err);

              // devolvemos un error 500 limpio
              return req.reject(500, "[callBPA] 🔴 Error interno");
            }
    }

module.exports = {
  getValoresCabecera,  
  getUrlsAdjuntos,
  getTablaSumatorias,
  getAprobadoresNivel1,
  getAprobadoresNivel2,
  getAprobadoresNivel3,
  getAprobadoresNivel4,
  buildPayloadBPA,
  callBPA
};