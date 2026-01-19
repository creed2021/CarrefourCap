const cds = require('@sap/cds');
const path = require('path');
const soap = require('soap');
const axios = require("axios");
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const xml2js = require('xml2js');
const { Token } = require('@sap/xssec');
const { threadId } = require('worker_threads');

const URL_S4_HANA_QAS = '/sap/bc/srt/xip/sap/journalentrycreaterequestconfi/300/journalentrycreaterequestconfi_b/journalentrycreaterequestconfi';
const URL_S4_HANA_PRD = '/sap/bc/srt/xip/sap/journalentrycreaterequestconfi/300/journalentrycreaterequestconfi/journalentrycreaterequestconfi?saml2=disabled';
                        


      function safeUndef(value) {
        if (
          value === undefined ||
          value === null ||
          value === 'undefined' ||
          value === 'null'
        ) {
          return '';
        }
        return String(value);
      }


      /**
       * Devuelve fecha en formato YYYY-MM-DD o vacío si no es válida
       */
      function safeDate(dateValue) {
        if (!dateValue) return '';
        try {
          const d = new Date(dateValue);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      }

      function primerDiaMesSiguiente(fechaStr) {
          const fecha = new Date(fechaStr);

          // Obtener año y mes
          let year = fecha.getFullYear();
          let month = fecha.getMonth(); // 0=Enero ... 11=Diciembre

          // Avanzar al mes siguiente
          if (month === 11) {          // Si es diciembre
              year += 1;
              month = 0;               // Enero
          } else {
              month += 1;
          }

          // Primer día del mes siguiente → día 1
          const nuevaFecha = new Date(year, month, 1);

          // Formato YYYY-MM-DD
          const yyyy = nuevaFecha.getFullYear();
          const mm = String(nuevaFecha.getMonth() + 1).padStart(2, "0");
          const dd = String(nuevaFecha.getDate()).padStart(2, "0");

          return `${yyyy}-${mm}-${dd}`;
      }

      /**
       * Envía un asiento a SAP S/4HANA (modo test o real)
       * @param {Object} req - Request CAP con datos de CabeceraAsiento e items
       * @param {Boolean} testDataIndicator - true = test / false = contabilización real
       */
      async function ValidaContabilizaAsiento(req, testDataIndicator) {
        console.info('[ValidaContabilizaAsiento] ✅ Ingresando al método');
        console.info(`[ValidaContabilizaAsiento] 🧩 testDataIndicator = ${testDataIndicator}`);
        const Referencia = cds.entities.Referencia;
        const Cuenta = cds.entities.Cuenta;
        const TipoAsiento = cds.entities.TipoAsiento;

        const tx = req.tx;

       try {
                // 1️⃣ Conectar al destino configurado
                const remote = await cds.connect.to('S4HANA');
                const destinationName = remote.options.credentials.destination;
                const destination = await getDestination({ destinationName });

                const CabeceraAsiento = cds.entities.CabceraAsiento;
                

                if (!destination) throw new Error(`No se encontró el destino ${destinationName}`);
                console.info(`[ValidaContabilizaAsiento] 🌍 Usando destination: ${destinationName}`);

                // 2️⃣ Extraer datos del request
                const cabecera = req.data;
                let nombreReferencia = '';
                const numeroSol = !testDataIndicator ? cabecera.numeroSolicitud:'';


                // ============================================================
                // 3️⃣ OBTENER TIPO ASIENTO
                // ============================================================
                const tipoAsiento = await SELECT.one.from(TipoAsiento).where({ ID: cabecera.tipoAsiento_ID });

                if (!tipoAsiento) {
                  return req.reject(400, "No existe el TipoAsiento indicado.");
                }

                const codigoTS = tipoAsiento.codigo;
                let reversalDateValor = '';
                let reversalReasonValor = '';
                console.info(`📌 [ValidaContabilizaAsiento] TipoAsiento.codigo = ${codigoTS}`);

                if (codigoTS == "1") {
                    reversalDateValor = primerDiaMesSiguiente(cabecera.fechaContabilizacion);
                    reversalReasonValor = '05';
                }

                if (cabecera.referencia_ID) {
                  const ref = await SELECT.one.from(Referencia).where({ ID: cabecera.referencia_ID });
                  if (ref) nombreReferencia = ref.nombre;
                }

                const items = Array.isArray(cabecera.items) ? cabecera.items : [];

                const cuentas = await SELECT.from(Cuenta).where({
                    ID: { in: items.map(i => i.cuentaContable_ID) }
                });
                const mapCuentas = new Map(cuentas.map(c => [c.ID, c]));


                // 3️⃣ Armar los ítems con reglas de clave e importe
                const itemsXml = items.map(item => {
                  const debitCreditCode = item.clave === 40 ? 'S' : 'H';
                  const importe = item.clave === 50
                    ? -Math.abs(Number(item.importe) || 0)
                    : Math.abs(Number(item.importe) || 0);
                  
                  var cuentaFinal = 0; 
                  
                  if (!testDataIndicator){
                      cuentaFinal = item.numero;
                  } else {
                      const cta = mapCuentas.get(item.cuentaContable_ID);
                      cuentaFinal = cta.numero;
                  };

                  return `
                    <Item>
                      <GLAccount>${cuentaFinal}</GLAccount>
                      <DebitCreditCode>${debitCreditCode}</DebitCreditCode>
                      <DocumentItemText>${item.descripcion}</DocumentItemText>
                      <AccountAssignment>
                        <CostCenter>${safeUndef(item.centroCosto)}</CostCenter>
                      </AccountAssignment>
                      <AmountInTransactionCurrency currencyCode="${cabecera.moneda || 'ARS'}">${importe}</AmountInTransactionCurrency>
                    </Item>`;
                }).join('');

                // 4️⃣ Construir el XML SOAP
                const xmlPayload = `
                  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sfin="http://sap.com/xi/SAPSCORE/SFIN">
                    <soapenv:Header/>         
                    <soapenv:Body>
                      <sfin:JournalEntryBulkCreateRequest>
                        <MessageHeader>
                          <CreationDateTime>${new Date().toISOString()}</CreationDateTime>
                          <TestDataIndicator>${testDataIndicator}</TestDataIndicator>
                        </MessageHeader>
                        <JournalEntryCreateRequest>
                          <MessageHeader>
                            <CreationDateTime>${new Date().toISOString()}</CreationDateTime>
                            <TestDataIndicator>${testDataIndicator}</TestDataIndicator>
                          </MessageHeader>
                          <JournalEntry>
                            <OriginalReferenceDocumentType>BKPFF</OriginalReferenceDocumentType>
                            <BusinessTransactionType>RFBU</BusinessTransactionType>
                            <AccountingDocumentType>${cabecera.claseDocumento || 'SA'}</AccountingDocumentType>
                            <CreatedByUser>BTP_ASI_CONT</CreatedByUser>
                            <CompanyCode>${cabecera.sociedad || '1000'}</CompanyCode>
                            <DocumentDate>${safeDate(cabecera.fechaDocumento)}</DocumentDate>
                            <PostingDate>${safeDate(cabecera.fechaContabilizacion)}</PostingDate>
                            <DocumentReferenceID>${nombreReferencia}</DocumentReferenceID>
                            <Reference1InDocumentHeader>${numeroSol}</Reference1InDocumentHeader>
                            <DocumentHeaderText>${cabecera.textoCabecera}</DocumentHeaderText>
                            <ReversalDate>${reversalDateValor}</ReversalDate>
                            <ReversalReason>${reversalReasonValor}</ReversalReason>
                            ${itemsXml}
                          </JournalEntry>
                        </JournalEntryCreateRequest>
                      </sfin:JournalEntryBulkCreateRequest>
                    </soapenv:Body>
                  </soapenv:Envelope>`;

                console.info(`[ValidaContabilizaAsiento] 🚀 Enviando payload SOAP a SAP... ${xmlPayload}`);

                // 5️⃣ Ejecutar la llamada
                const response = await executeHttpRequest(destination, {
                  method: 'POST',
                  url: URL_S4_HANA_PRD,
                  headers: { 'Content-Type': 'text/xml', 'Accept': 'text/xml' },
                  data: xmlPayload
                });

                const xmlResponse = response.data;
                console.info('[ValidaContabilizaAsiento] 📦 Respuesta recibida desde SAP');

                // 6️⃣ Parsear XML a JSON
                const parsed = await xml2js.parseStringPromise(xmlResponse, {
                  explicitArray: false,
                  ignoreAttrs: false
                });

                const confirmation = parsed?.['soap-env:Envelope']?.['soap-env:Body']?.['n0:JournalEntryBulkCreateConfirmation'];
                const responseDoc = confirmation?.JournalEntryCreateConfirmation?.JournalEntryCreateConfirmation;
                const log = confirmation?.JournalEntryCreateConfirmation?.Log;
                  // 7️⃣ Detectar errores en SAP
                  const maxSeverity = Number(log?.MaximumLogItemSeverityCode || 0);
                  const logItems = Array.isArray(log?.Item)
                    ? log.Item
                    : log?.Item
                      ? [log.Item]
                      : [];

                  // Solo tomamos los primeros 10
                  const primeros10 = logItems.slice(0, 10);

                  if (maxSeverity >= 2) {
                    const errores = primeros10.map(e => ({
                      codigo: e.TypeID,
                      severidad: e.SeverityCode,
                      mensaje: e.Note,
                      link: e.WebURI
                    }));

                  // const erroresOData = errores.slice(0, 10).map(e => ({
                  //   code: e.codigo || 'SAP_ERROR',
                  //   message: e.mensaje,
                  //   severity: e.severidad,
                  //   target: 'ValidaContabilizaAsiento'
                  // }));

                  return req.reject(400, `SAP devolvió errores en la validación/contabilización ${JSON.stringify(errores, null, 2)}`, {
                    details: errores.map(e => ({
                      code: e.codigo,
                      message: e.mensaje,
                      target: null
                    }))
                  });
                }

                // 8️⃣ Si no hay errores y es contabilización real, actualizar datos en CAP
                if (!testDataIndicator) {
                  const numeroDocumento = responseDoc?.AccountingDocument;
                  const codigoEmpresa = responseDoc?.CompanyCode || cabecera.sociedad || null;
                  const anioFiscal = responseDoc?.FiscalYear
                    ? Number(responseDoc.FiscalYear)
                    : new Date().getFullYear();

                  const fechaContabilizacionSAP = safeDate(new Date());
                  console.info(`[ValidaContabilizaAsiento] 💾 Actualizando registro CAP → Documento=${numeroDocumento}`);

                  const catalogService = await cds.connect.to('CatalogService');

                    const estadoContabilizada= await catalogService.run(
                      SELECT.one.from('CatalogService.EstadosSolicitud').where({ codigo: "CON" })
                    );
                    if (!estadoContabilizada) req.reject(404, `No se encontró estado con código 'CON'`);                  

                    await tx.run(
                          UPDATE('GestionaAsientos.CabeceraAsiento')
                            .set({
                              numeroDocumentoSAP: numeroDocumento,
                              numeroAsiento: numeroDocumento,
                              numeroDocumentoContable: numeroDocumento,
                              fechaContabilizacion: fechaContabilizacionSAP,
                              CodigoEmpresaContabilizacion: codigoEmpresa,
                              AnioFiscalContabilizacion: anioFiscal,
                              estadoSolicitud_ID: estadoContabilizada.ID
                            })
                            .where({ ID: cabecera.ID })
                          );
                  }
                      // 9️⃣ Retornar resultado exitoso
                  return {
                    success: true,
                    message: testDataIndicator
                      ? 'Asiento validado correctamente (modo test)'
                      : 'Asiento contabilizado correctamente',
                    rawXML: xmlResponse,
                    parsed
                  };
   
        } catch (err) {
          console.error("❌ [ValidaContabilizaAsiento] 🔴 Error detectado", err);
          // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
          if (err.code) {
            throw err; // ⚡ sigue para arriba sin cambios
          }

          // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
          console.error("❌ [ValidaContabilizaAsiento] 🔴 Error interno:", err);

          // devolvemos un error 500 limpio
          return req.reject(500, "[ValidaContabilizaAsiento] 🔴 Error interno");
        }
      }




    // 🔹 1. Reemplaza mail del solicitante por el ID real de Empleado
  async function ReemplazaMailSolicitantePorID(req) {
    const emailSolicitante = req.data.correo_solicitante;
    const Empleado = cds.entities.Empleado;

    console.info('[ReemplazaMailSolicitantePorID] ✅ Ingresa en método');

    try{
            if (!emailSolicitante) return;
            const empleado = await SELECT.one.from(Empleado).where({ email: emailSolicitante });
            if (empleado) {
              req.data.solicitante_ID = empleado.ID;
              console.info(`[ReemplazaMailSolicitantePorID] ✅ Mail ${emailSolicitante} → ID ${empleado.ID}`);
            } else {
              console.error(`[ReemplazaMailSolicitantePorID] ❌ Error buscando empleado con mail ${emailSolicitante}`);
              return req.reject(400,`[ReemplazaMailSolicitantePorID] ⚠ No se encontró empleado con mail ${emailSolicitante}`)
            }

            console.info('[ReemplazaMailSolicitantePorID] ✅ Sale del método');
        } catch (err) {
          console.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error detectado", err);
          // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
          if (err.code) {
            throw err; // ⚡ sigue para arriba sin cambios
          }

          // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
          console.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error interno:", err);

          // devolvemos un error 500 limpio
          return req.reject(500, "[ReemplazaMailSolicitantePorID] 🔴 Error interno");
        }
  }

    // 🔹 2. Completa los campos calculados de la cabecera
  async function CompletaCamposCabecera(req) {
    const cab = req.data;
    const tx = req.tx;
    const TipoAsiento = cds.entities.TipoAsiento;
    const EstadosSolicitud = cds.entities.EstadosSolicitud;
    const Referencia = cds.entities.Referencia;

    console.info('[CompletaCamposCabecera] ✅ Ingresa en método');

    try{

            // -------------------------------------------------------------------------
            // 🔹 Generar número de solicitud NO repetido, atómico, sin baches
            // -------------------------------------------------------------------------
            // if (!cab.numeroSolicitud) {
            //   cab.numeroSolicitud = await getNextNumeroSolicitudFU(tx);
            //   console.info(`[CompletaCamposCabecera] NumeroSolicitud asignado = ${cab.numeroSolicitud}`);
            // }
            // -------------------------------------------------------------------------

              // estadoSolicitud_ID con código REG
              const estado = await SELECT.one.from(EstadosSolicitud).where({ codigo: 'INI' });
              if (estado) cab.estadoSolicitud_ID = estado.ID 
              else {
                  console.error(`[CompletaCamposCabecera] ❌ Error al completar el estado`);
                  return req.reject(404, `[CompletaCamposCabecera] ❌ Error al completar el estado`);
              }

              // subtipoAsiento_ID
              const subtipoID = await ObtenerIDSubtipoAsiento(req);
              if (subtipoID) cab.subtipoAsiento_ID = subtipoID;

              const tipo = await SELECT.one.from(TipoAsiento).where({ ID: cab.tipoAsiento_ID });

              // referencia_ID según tipoAsiento
              if (tipo?.codigo) {
                let refCodigo = null;
                switch (tipo.codigo) {
                  case '1': refCodigo = 'PRO'; break;
                  case '2': refCodigo = 'AJC'; break;
                  case '3': refCodigo = 'AJX'; break;
                }
                if (refCodigo) {
                  const ref = await SELECT.one.from(Referencia).where({ codigo: refCodigo });
                  if (ref) cab.referencia_ID = ref.ID;
                }
              }
        } catch (err) {
          console.error("❌ [CompletaCamposCabecera] 🔴 Error detectado", err);
          // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
          if (err.code) {
            throw err; // ⚡ sigue para arriba sin cambios
          }

          // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
          console.error("❌ [CompletaCamposCabecera] 🔴 Error interno:", err);

          // devolvemos un error 500 limpio
          return req.reject(500, "[CompletaCamposCabecera] 🔴 Error interno");
        }
  }

// 🔹 3. Determina el ID del SubTipoAsiento según lógica completa, validación y joins
async function ObtenerIDSubtipoAsiento(req) {
  try{
        //TODO DJ: Agregar valicación de minimo en tipo asiento 1
        //TODO DJ: Agregar que si viene solo PRO se acepta en tipo asiento 2

        //try {
          console.info("🔎 [ObtenerIDSubtipoAsiento] Inicio");

          const tx = cds.transaction(req); //req.tx;
          const cab = req.data;
          const items = req.data.items || [];

          if (!items.length) {
            return req.reject(400, "Debe enviar al menos un ítem en el detalle del asiento.");
          }

          // ============================================================
          // 1️⃣ AGRUPAR CUENTAS POR TIPO DE CUENTA
          // ============================================================
          const cuentasPorTipo = {};
          const cuentasUnicas = new Set();
          const cuentasDetalle = [];

          for (const it of items) {

            const cuentaID = it.cuentaContable_ID || it.cuentaContable;
            if (!cuentaID) {
              return req.reject(400,
                `El ítem con ID ${it.ID || "(sin ID)"} no tiene cuenta contable informada`);
            }

            cuentasUnicas.add(cuentaID);

            // 🔍 Un solo SELECT con join → Cuenta + TipoCuenta
            const cuentaRow = await tx.run(
              SELECT.one.from("com.carrefour.journal.Cuenta as C")
                .columns(
                  "C.ID",
                  "C.numero",
                  "C.nombre",
                  "T.codigo as tipoCodigo",
                  "T.nombre as tipoNombre"
                )
                .join("com.carrefour.journal.TipoCuenta as T").on("C.tipo_ID = T.ID")
                .where({ "C.ID": cuentaID })
            );

            if (!cuentaRow) {
              return req.reject(
                400,
                `La cuenta contable seleccionada (${cuentaID}) no existe en el maestro de Cuentas.`
              );
            }

            const tipoCod = cuentaRow.tipoCodigo;

            if (!cuentasPorTipo[tipoCod]) cuentasPorTipo[tipoCod] = new Set();
            cuentasPorTipo[tipoCod].add(cuentaRow.numero);

            cuentasDetalle.push({
              cuenta: cuentaRow.numero,
              nombreCuenta: cuentaRow.nombre,
              tipoCuenta: cuentaRow.tipoCodigo,
              nombreTipoCuenta: cuentaRow.tipoNombre
            });

            console.info(
              `📌 Cuenta ${cuentaRow.numero} | ${cuentaRow.nombre} → Tipo ${cuentaRow.tipoCodigo} (${cuentaRow.tipoNombre})`
            );
          }

          // ============================================================
          // 🧾 LOG: TOTALES DE CUENTAS
          // ============================================================

          // 1) Total global de cuentas únicas
          console.info(`🔢 Total de cuentas distintas recibidas: ${cuentasUnicas.size}`);

          // 2) Total por tipo de cuenta
          console.info("📘 Totales por Tipo de Cuenta:");
          for (const [tipo, setCuentas] of Object.entries(cuentasPorTipo)) {
            console.info(`   - ${tipo}: ${setCuentas.size} cuenta(s) → [${[...setCuentas].join(", ")}]`);
          }

          // ============================================================
          // 2️⃣ SUMAR IMPORTES CLAVE 40 Y 50
          // ============================================================
          let sumaClave40 = 0;
          let sumaClave50 = 0;

          items.forEach(it => {
            if (it.clave == 40) sumaClave40 += Number(it.importe || 0);
            if (it.clave == 50) sumaClave50 += Number(it.importe || 0);
          });

          console.info(`🧮 Suma clave 40 = ${sumaClave40}, Suma clave 50 = ${sumaClave50}`);

          // ============================================================
          // 3️⃣ OBTENER TIPO ASIENTO (antes: TipoSolicitud)
          // ============================================================
          const tipoAsiento = await tx.run(
            SELECT.one.from("com.carrefour.journal.TipoAsiento")
              .where({ ID: cab.tipoAsiento_ID })
          );

          if (!tipoAsiento) {
            return req.reject(400, "No existe el TipoAsiento indicado.");
          }

          const codigoTS = tipoAsiento.codigo;
          console.info(`📌 TipoAsiento.codigo = ${codigoTS}`);

          // ============================================================
          // Helper para obtener subtipo
          // ============================================================
          async function getSub(cod) {
            const r = await tx.run(
              SELECT.one.from("com.carrefour.journal.SubTipoAsiento").where({ codigo: cod })
            );
            if (!r) {
              return req.reject(400, `No existe SubTipoAsiento con código ${cod}`);
            }
            return r;
          }

          const solo = arr =>
            Object.keys(cuentasPorTipo).length === arr.length &&
            arr.every(k => cuentasPorTipo[k]);

          // ============================================================
          // 🟦 TIPO ASIENTO 1
          // ============================================================
          if (codigoTS == "1") {

            const tienePRO = cuentasPorTipo.PRO?.size > 0;
            const tieneGAS = cuentasPorTipo.GAS?.size > 0;
            const tieneMAR = cuentasPorTipo.MAR?.size > 0;

            const valido =
              (
                (tienePRO && tieneGAS) ||
                (tienePRO && tieneGAS && tieneMAR) ||
                (tienePRO && tieneMAR)
              ) && 
              (
                  solo(["GAS", "MAR", "PRO"]) ||
                  solo(["GAS", "PRO"]) ||
                  solo(["MAR", "PRO"])

              );
              

            if (valido){
              const st = await getSub("G");
              if (sumaClave40 >= st.umbralMinimoAsiento) {
                  return st.ID;
              } else {
                  return req.reject(
                    400,
                    `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo .`
                  );
              };
            };

            // ❌ → RETORNO CON JSON EXTRAS
            return req.reject(400, {
              message:
                "El tipo de asiento solicitado (TipoAsiento=1) no es compatible con las cuentas presentadas.",
              detalleCuentas: {
                totalCuentas: cuentasUnicas.size,
                cuentasPorTipo: Object.fromEntries(
                  Object.entries(cuentasPorTipo).map(([k, v]) => [k, v.size])
                )
              }
            });
          }

          const SUBT_ASIENTO_RECLA_MISMAS_GASTOS = "A";
          const SUBT_ASIENTO_RECLA_DIF_GASTOS = "B";
          const SUBT_ASIENTO_RECLA_MAR_GAS = "C";
          const SUBT_ASIENTO_PROV_GASTOS = "D";
          const SUBT_ASIENTO_PROV_MARGEN = "E";
          const SUBT_ASIENTO_BANCOS = "F";
          const SUBT_ASIENTO_PROV_REVERSA = "G";
          const SUBT_ASIENTO_CUENTAS_EXCEP = "H";

          // ============================================================
          // 🟩 TIPO ASIENTO 2
          // ============================================================
          if (codigoTS == "2") {

            const subA = solo(["GAS"]) && cuentasPorTipo.GAS.size === 1;
            const subB = solo(["GAS"]) && cuentasPorTipo.GAS.size > 1;
            const subC = solo(["GAS", "MAR"]) || solo(["MAR"]);
            const subD = solo(["GAS", "PRO"]) || solo(["GAS", "PAT"]) || solo(["GAS", "PRO", "PAT"]); //DJ 2025-12-19
            const subE = solo(["MAR", "PRO"]) || solo(["MAR", "GAS", "PRO"]) || 
                         solo(["MAR", "PAT"]) || solo(["MAR", "GAS", "PAT"]) ||
                         solo(["MAR", "PRO", "PAT"]) || solo(["MAR", "GAS", "PRO", "PAT"]); //DJ 2025-12-19
            const subF = solo(["BAN"]);

            if (subA) return (await getSub("A")).ID;
            if (subB) return (await getSub("B")).ID;
            if (subC) return (await getSub("C")).ID;

            if (subD) {
              const st = await getSub("D");
              if (sumaClave40 >= st.umbralMinimoAsiento) return st.ID;
              return req.reject(
                400,
                `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo D.`
              );
            }

            if (subE) {
              const st = await getSub("E");
              if (sumaClave40 >= st.umbralMinimoAsiento) return st.ID;
              return req.reject(
                400,
                `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo E.`
              );
            }

            if (subF) return (await getSub("F")).ID;

            // ❌ → RETORNO CON JSON EXTRAS
            return req.reject(400, {
              message:
                "El tipo de asiento solicitado (TipoAsiento=2) no es compatible con las cuentas presentadas.",
              detalleCuentas: {
                totalCuentas: cuentasUnicas.size,
                cuentasPorTipo: Object.fromEntries(
                  Object.entries(cuentasPorTipo).map(([k, v]) => [k, v.size])
                )
              }
            });
          }

          // ============================================================
          // 🟧 TIPO ASIENTO 3
          // ============================================================
          if (codigoTS == "3") {

            const tieneEXC = cuentasPorTipo.EXC?.size > 0;
            const tienePAT = cuentasPorTipo.PAT?.size > 0;

            if (tieneEXC && tienePAT && solo(["EXC", "PAT"]) )
              return (await getSub("H")).ID;

            // ❌ → RETORNO CON JSON EXTRAS
            return req.reject(400, {
              message:
                "El tipo de asiento solicitado (TipoAsiento=3) requiere al menos una cuenta EXC y una PAT.",
              detalleCuentas: {
                totalCuentas: cuentasUnicas.size,
                cuentasPorTipo: Object.fromEntries(
                  Object.entries(cuentasPorTipo).map(([k, v]) => [k, v.size])
                )
              }
            });
          }

          // ============================================================
          // ❌ TIPO ASIENTO DESCONOCIDO
          // ============================================================
          return req.reject(
            400,
            "El tipo de asiento solicitado no es compatible con las cuentas presentadas."
          );
      } catch (err) {
        console.error("❌ [ObtenerIDSubtipoAsiento] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [ObtenerIDSubtipoAsiento] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[ObtenerIDSubtipoAsiento] 🔴 Error interno");
      }
}


  

    async function ReemplazaCuentaPorID(req) {
      const data = req.data;
      const Cuenta = cds.entities.Cuenta;
      const tx = req.tx;

      try{      
            console.info('[ReemplazaCuentaPorID] ✅ Ingresa en método');

            const catalogService = await cds.connect.to('CatalogService');

            if (!data.items || !Array.isArray(data.items)) {
                  console.error(`[ReemplazaCuentaPorID] ❌ Error en items`);
                  return req.reject(404,`[ReemplazaCuentaPorID] ❌ Error en items`);
            } 

            for (const item of data.items) {
              if (item.cuentaContable_ID && !/^[0-9a-fA-F-]{36}$/.test(item.cuentaContable_ID)) {
                const codigoCuenta = String(item.cuentaContable_ID).trim();
              // try {
                  const cuentaRec = await catalogService.run(
                    SELECT.one.from('CatalogService.Cuentas').where({ numero: codigoCuenta })
                  );

                  if (cuentaRec) {
                    item.cuentaContable_ID = cuentaRec.ID;
                    console.info(`[ReemplazaCuentaPorID] ✅ Mapeada cuenta ${codigoCuenta} → ${cuentaRec.ID}`);
                  } else {
                    const msg = `[ReemplazaCuentaPorID] ❌ Cuenta contable inexistente: ${codigoCuenta}`;
                    console.error(msg);
                    req.reject(404, msg);
                  }
                //FIXME DJ: arreglar catch
                  // } catch (err) {
                //   console.error(`[ReemplazaCuentaPorID] ❌ Error buscando cuenta ${codigoCuenta}: ${err.message}`);
                //   return req.reject(404, `Error buscando cuenta contable: ${codigoCuenta}`);
                // }
            } else if (!item.cuentaContable_ID){
                  console.error(`[ReemplazaCuentaPorID] ❌ Error buscando cuenta ${codigoCuenta}: ${err.message}`);
                  return req.reject(404, `Error buscando cuenta contable: ${codigoCuenta}`);
            }
          }
      } catch (err) {
        console.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[ReemplazaMailSolicitantePorID] 🔴 Error interno");
      }
  }

module.exports = {
  safeUndef,
  safeDate,
  primerDiaMesSiguiente,
  ValidaContabilizaAsiento,
  ReemplazaMailSolicitantePorID,
  CompletaCamposCabecera,
  ObtenerIDSubtipoAsiento,
  ReemplazaCuentaPorID
};