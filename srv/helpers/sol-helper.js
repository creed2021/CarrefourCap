const cds = require('@sap/cds');
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const xml2js = require('xml2js');
const AppLog = require('../helpers/logging/app-log');
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
  let year = fecha.getFullYear();
  let month = fecha.getMonth();
  if (month === 11) {
    year += 1;
    month = 0;
  } else {
    month += 1;
  }
  const nuevaFecha = new Date(year, month, 1);
  const yyyy = nuevaFecha.getFullYear();
  const mm = String(nuevaFecha.getMonth() + 1).padStart(2, "0");
  const dd = String(nuevaFecha.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function AplicaConversionMoneda(req) {
  const cab = req.data;
  const moneda = (cab.moneda || 'ARS').toUpperCase();
  if (moneda === 'ARS') {
    cab.tipoCambio = 1;
  } else {
    const tc = Number(cab.tipoCambio);
    if (!cab.tipoCambio || isNaN(tc) || tc <= 0) {
      return req.reject(
        400,
        `El campo Tipo de Cambio es obligatorio y debe ser mayor a 0 `
        + `cuando la moneda es distinta de ARS (moneda seleccionada: ${moneda}).`
      );
    }
    cab.tipoCambio = tc;
  }
  AppLog.debug(`[AplicaConversionMoneda] Moneda=${moneda} TipoCambio=${cab.tipoCambio}`);
}

async function ReemplazaMailSolicitantePorID(req) {
  const emailSolicitante = req.data.correo_solicitante;
  const Empleado = cds.entities.Empleado;
  AppLog.info('[ReemplazaMailSolicitantePorID] ✅ Ingresa en método');
  try {
    if (!emailSolicitante) return;
    const empleado = await SELECT.one.from(Empleado).where({ email: emailSolicitante });
    if (empleado) {
      req.data.solicitante_ID = empleado.ID;
      AppLog.debug(`[ReemplazaMailSolicitantePorID] ✅ Mail ${emailSolicitante} → ID ${empleado.ID}`);
    } else {
      AppLog.error(`[ReemplazaMailSolicitantePorID] ❌ Error buscando empleado con mail ${emailSolicitante}`);
      return req.reject(400, `[ReemplazaMailSolicitantePorID] ⚠ No se encontró empleado con mail ${emailSolicitante}`)
    }
    AppLog.info('[ReemplazaMailSolicitantePorID] ✅ Sale del método');
  } catch (err) {
    AppLog.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error interno:", err);
    return req.reject(500, "[ReemplazaMailSolicitantePorID] 🔴 Error interno");
  }
}

async function ReemplazaCuentaPorID(req) {
  const data = req.data;
  const Cuenta = cds.entities.Cuenta;
  const tx = req.tx;
  try {
    AppLog.info('[ReemplazaCuentaPorID] ✅ Ingresa en método');
    const catalogService = await cds.connect.to('CatalogService');
    if (!data.items || !Array.isArray(data.items)) {
      AppLog.error(`[ReemplazaCuentaPorID] ❌ Error en items`);
      return req.reject(404, `[ReemplazaCuentaPorID] ❌ Error en items`);
    }
    for (const item of data.items) {
      if (item.cuentaContable_ID && !/^[0-9a-fA-F-]{36}$/.test(item.cuentaContable_ID)) {
        const codigoCuenta = String(item.cuentaContable_ID).trim();
        const cuentaRec = await catalogService.run(
          SELECT.one.from('CatalogService.Cuentas').where({ numero: codigoCuenta })
        );
        if (cuentaRec) {
          item.cuentaContable_ID = cuentaRec.ID;
          AppLog.debug(`[ReemplazaCuentaPorID] ✅ Mapeada cuenta ${codigoCuenta} → ${cuentaRec.ID}`);
        } else {
          const msg = `[ReemplazaCuentaPorID] ❌ Cuenta contable inexistente: ${codigoCuenta}`;
          AppLog.error(msg);
          req.reject(404, msg);
        }
      } else if (!item.cuentaContable_ID) {
        AppLog.error(`[ReemplazaCuentaPorID] ❌ Error buscando cuenta ${codigoCuenta}: ${err.message}`);
        return req.reject(404, `Error buscando cuenta contable: ${codigoCuenta}`);
      }
    }
  } catch (err) {
    AppLog.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [ReemplazaMailSolicitantePorID] 🔴 Error interno:", err);
    return req.reject(500, "[ReemplazaMailSolicitantePorID] 🔴 Error interno");
  }
}

async function CompletaCamposCabecera(req) {
  const cab = req.data;
  const tx = req.tx;
  const TipoAsiento = cds.entities.TipoAsiento;
  const EstadosSolicitud = cds.entities.EstadosSolicitud;
  const Referencia = cds.entities.Referencia;
  AppLog.info('[CompletaCamposCabecera] ✅ Ingresa en método');
  try {
    const estado = await SELECT.one.from(EstadosSolicitud).where({ codigo: 'P1' });
    if (estado) cab.estadoSolicitud_ID = estado.ID
    else {
      AppLog.error(`[CompletaCamposCabecera] ❌ No se encontró estado con código 'P1' en el maestro EstadosSolicitud`);
      return req.reject(404, `[CompletaCamposCabecera] ❌ Error al completar el estado: falta código 'P1' en EstadosSolicitud`);
    }
    if (!cab.subtipoAsiento_ID) {
      return req.reject(400, "Debe seleccionar un Subtipo de Asiento.");
    }
    const SubTipoAsiento = cds.entities.SubTipoAsiento;
    const subtipoElegido = await SELECT.one.from(SubTipoAsiento)
      .where({ ID: cab.subtipoAsiento_ID });
    if (!subtipoElegido || subtipoElegido.tipoAsiento_ID !== cab.tipoAsiento_ID) {
      return req.reject(400, "El subtipo seleccionado no corresponde al tipo de asiento elegido.");
    }
    const subtipoSeleccionado_ID = cab.subtipoAsiento_ID;
    const subtipoDetectado_ID = await ObtenerIDSubtipoAsiento(req);
    if (subtipoDetectado_ID && subtipoDetectado_ID !== subtipoSeleccionado_ID) {
      const detectado = await SELECT.one.from(SubTipoAsiento).where({ ID: subtipoDetectado_ID });
      return req.reject(400,
        `El subtipo seleccionado no corresponde a las cuentas ingresadas. ` +
        `Según las cuentas cargadas, el subtipo correcto es: ${detectado.codigo} - ${detectado.nombre}.`
      );
    }
    const tipo = await SELECT.one.from(TipoAsiento).where({ ID: cab.tipoAsiento_ID });
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
    AppLog.error("❌ [CompletaCamposCabecera] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [CompletaCamposCabecera] 🔴 Error interno:", err);
    return req.reject(500, "[CompletaCamposCabecera] 🔴 Error interno");
  }
}

async function ObtenerIDSubtipoAsiento(req) {
  try {
    AppLog.info("🔎 [ObtenerIDSubtipoAsiento] Inicio");
    const tx = cds.transaction(req);
    const cab = req.data;
    const items = req.data.items || [];
    if (!items.length) {
      return req.reject(400, "Debe enviar al menos un ítem en el detalle del asiento.");
    }
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
      AppLog.debug(`📌 Cuenta ${cuentaRow.numero} | ${cuentaRow.nombre} → Tipo ${cuentaRow.tipoCodigo} (${cuentaRow.tipoNombre})`);
    }
    AppLog.debug(`🔢 Total de cuentas distintas recibidas: ${cuentasUnicas.size}`);
    AppLog.debug("📘 Totales por Tipo de Cuenta:");
    for (const [tipo, setCuentas] of Object.entries(cuentasPorTipo)) {
      AppLog.debug(`   - ${tipo}: ${setCuentas.size} cuenta(s) → [${[...setCuentas].join(", ")}]`);
    }
    let sumaClave40 = 0;
    let sumaClave50 = 0;
    const tipoCambioVigente = Number(cab.tipoCambio) || 1;
    items.forEach(it => {
      const importeARS = Number(it.importe || 0) * tipoCambioVigente;
      if (it.clave == 40) sumaClave40 += importeARS;
      if (it.clave == 50) sumaClave50 += importeARS;
    });
    AppLog.debug(`🧮 Suma clave 40 (ARS) = ${sumaClave40}, Suma clave 50 (ARS) = ${sumaClave50}, TipoCambio=${tipoCambioVigente}`);
    const tipoAsiento = await tx.run(
      SELECT.one.from("com.carrefour.journal.TipoAsiento")
        .where({ ID: cab.tipoAsiento_ID })
    );
    if (!tipoAsiento) {
      return req.reject(400, "No existe el TipoAsiento indicado.");
    }
    const codigoTS = tipoAsiento.codigo;
    AppLog.debug(`📌 TipoAsiento.codigo = ${codigoTS}`);
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
      if (valido) {
        const st = await getSub("G");
        const esARS = !cab.moneda || cab.moneda.toUpperCase() === 'ARS';
        if (!esARS || sumaClave40 >= st.umbralMinimoAsiento) {
          return st.ID;
        } else {
          return req.reject(
            400,
            `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo G.`
          );
        };
      };
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
    if (codigoTS == "2") {
      const subA = solo(["GAS"]) && cuentasPorTipo.GAS.size === 1;
      const subB = solo(["GAS"]) && cuentasPorTipo.GAS.size > 1;
      const subC = solo(["GAS", "MAR"]) || solo(["MAR"]);
      const subD = solo(["GAS", "PAT"]);
      const subE = solo(["MAR", "PAT"]) || solo(["MAR", "GAS", "PAT"]);
      const subF = solo(["BAN"]);
      const subI = solo(["PAT"]) && cuentasPorTipo.PAT.size > 1;
      const subJ = solo(["PAC", "BAN"]);
      if (subA) return (await getSub("A")).ID;
      if (subB) return (await getSub("B")).ID;
      if (subC) return (await getSub("C")).ID;
      if (subD) {
        const st = await getSub("D");
        const esARS = !cab.moneda || cab.moneda.toUpperCase() === 'ARS';
        if (!esARS || sumaClave40 >= st.umbralMinimoAsiento) return st.ID;
        return req.reject(
          400,
          `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo D.`
        );
      }
      if (subE) {
        const st = await getSub("E");
        const esARS = !cab.moneda || cab.moneda.toUpperCase() === 'ARS';
        if (!esARS || sumaClave40 >= st.umbralMinimoAsiento) return st.ID;
        return req.reject(
          400,
          `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo E.`
        );
      }
      if (subF) return (await getSub("F")).ID;
      if (subI) {
        const st = await getSub("I");
        const esARS = !cab.moneda || cab.moneda.toUpperCase() === 'ARS';
        if (!esARS || sumaClave40 >= st.umbralMinimoAsiento) return st.ID;
        return req.reject(
          400,
          `El monto clave=40 (${sumaClave40}) no supera el umbral mínimo (${st.umbralMinimoAsiento}) para subtipo I.`
        );
      }
      if (subJ) return (await getSub("J")).ID;
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
    if (codigoTS == "3") {
      const tieneEXC = cuentasPorTipo.EXC?.size > 0;
      const tienePAT = cuentasPorTipo.PAT?.size > 0;
      const tieneBAN = cuentasPorTipo.BAN?.size > 0;
      const tieneGAS = cuentasPorTipo.GAS?.size > 0;
      if (
        (tieneEXC && tienePAT && solo(["EXC", "PAT"])) ||
        (tieneEXC && tieneBAN && solo(["EXC", "BAN"])) ||
        (tieneEXC && tienePAT && tieneBAN && solo(["EXC", "PAT", "BAN"])) ||
        (tieneEXC && tieneGAS && solo(["EXC", "GAS"])) ||
        (tieneEXC && tieneGAS && tienePAT && solo(["EXC", "GAS", "PAT"])) ||
        (tieneEXC && solo(["EXC"]))
      ) {
        return (await getSub("H")).ID;
      }
      return req.reject(400, {
        message:
          "El tipo de asiento solicitado (TipoAsiento=3) requiere al menos una cuenta EXC, opcionalmente combinada con cuentas PAT, BAN o GAS.",
        detalleCuentas: {
          totalCuentas: cuentasUnicas.size,
          cuentasPorTipo: Object.fromEntries(
            Object.entries(cuentasPorTipo).map(([k, v]) => [k, v.size])
          )
        }
      });
    }
    return req.reject(
      400,
      "El tipo de asiento solicitado no es compatible con las cuentas presentadas."
    );
  } catch (err) {
    AppLog.error("❌ [ObtenerIDSubtipoAsiento] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [ObtenerIDSubtipoAsiento] 🔴 Error interno:", err);
    return req.reject(500, "[ObtenerIDSubtipoAsiento] 🔴 Error interno");
  }
}

/**
 * Envía un asiento a SAP S/4HANA (modo test o real)
 * @param {Object} req - Request CAP con datos de CabeceraAsiento e items
 * @param {Boolean} testDataIndicator - true = test / false = contabilización real
 */
async function ValidaContabilizaAsiento(req, testDataIndicator) {
  AppLog.info('[ValidaContabilizaAsiento] ✅ Ingresando al método');
  AppLog.debug(`[ValidaContabilizaAsiento] 🧩 testDataIndicator = ${testDataIndicator}`);
  const Referencia = cds.entities.Referencia;
  const Cuenta = cds.entities.Cuenta;
  const TipoAsiento = cds.entities.TipoAsiento;
  const tx = req.tx;
  try {
    const remote = await cds.connect.to('S4HANA');
    const destinationName = remote.options.credentials.destination;
    const destination = await getDestination({ destinationName });
    const CabeceraAsiento = cds.entities.CabceraAsiento;
    if (!destination) throw new Error(`No se encontró el destino ${destinationName}`);
    AppLog.debug(`[ValidaContabilizaAsiento] 🌍 Usando destination: ${destinationName}`);
    const cabecera = req.data;
    let nombreReferencia = '';
    const numeroSol = !testDataIndicator ? cabecera.numeroSolicitud : '';
    const tipoCambioHeader = Number(cabecera.tipoCambio) || 1;
    const exchangeRateXml = (cabecera.moneda && cabecera.moneda.toUpperCase() !== 'ARS')
      ? `<ExchangeRate>${tipoCambioHeader}</ExchangeRate>`
      : '';
    const tipoAsiento = await SELECT.one.from(TipoAsiento).where({ ID: cabecera.tipoAsiento_ID });
    if (!tipoAsiento) {
      return req.reject(400, "No existe el TipoAsiento indicado.");
    }
    const codigoTS = tipoAsiento.codigo;
    let reversalDateValor = '';
    let reversalReasonValor = '';
    AppLog.debug(`📌 [ValidaContabilizaAsiento] TipoAsiento.codigo = ${codigoTS}`);
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
    const itemsXml = items.map(item => {
      const debitCreditCode = item.clave === 40 ? 'S' : 'H';
      const importe = item.clave === 50
        ? -Math.abs(Number(item.importe) || 0)
        : Math.abs(Number(item.importe) || 0);
      const importeARS = importe * tipoCambioHeader;
      var cuentaFinal = 0;
      if (!testDataIndicator) {
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
                      <AmountInCompanyCodeCurrency currencyCode="ARS">${importeARS}</AmountInCompanyCodeCurrency>
                    </Item>`;
    }).join('');
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
                            ${exchangeRateXml}
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
    AppLog.debug(`[ValidaContabilizaAsiento] 🚀 Enviando payload SOAP a SAP... ${xmlPayload}`);
    const response = await executeHttpRequest(destination, {
      method: 'POST',
      url: URL_S4_HANA_QAS,
      headers: { 'Content-Type': 'text/xml', 'Accept': 'text/xml' },
      data: xmlPayload
    });
    const xmlResponse = response.data;
    AppLog.info('[ValidaContabilizaAsiento] 📦 Respuesta recibida desde SAP');
    const parsed = await xml2js.parseStringPromise(xmlResponse, {
      explicitArray: false,
      ignoreAttrs: false
    });
    const confirmation = parsed?.['soap-env:Envelope']?.['soap-env:Body']?.['n0:JournalEntryBulkCreateConfirmation'];
    const responseDoc = confirmation?.JournalEntryCreateConfirmation?.JournalEntryCreateConfirmation;
    const log = confirmation?.JournalEntryCreateConfirmation?.Log;
    const maxSeverity = Number(log?.MaximumLogItemSeverityCode || 0);
    const logItems = Array.isArray(log?.Item)
      ? log.Item
      : log?.Item
        ? [log.Item]
        : [];
    const primeros10 = logItems.slice(0, 10);
    if (maxSeverity >= 2) {
      const errores = primeros10.map(e => ({
        codigo: e.TypeID,
        severidad: e.SeverityCode,
        mensaje: e.Note,
        link: e.WebURI
      }));
      return req.reject(400, `SAP devolvió errores en la validación/contabilización ${JSON.stringify(errores, null, 2)}`, {
        details: errores.map(e => ({
          code: e.codigo,
          message: e.mensaje,
          target: null
        }))
      });
    }
    if (!testDataIndicator) {
      const numeroDocumento = responseDoc?.AccountingDocument;
      const codigoEmpresa = responseDoc?.CompanyCode || cabecera.sociedad || null;
      const anioFiscal = responseDoc?.FiscalYear
        ? Number(responseDoc.FiscalYear)
        : new Date().getFullYear();
      const fechaContabilizacionSAP = safeDate(new Date());
      AppLog.info(`[ValidaContabilizaAsiento] 💾 Actualizando registro CAP → Documento=${numeroDocumento}`);
      const catalogService = await cds.connect.to('CatalogService');
      const estadoContabilizada = await catalogService.run(
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
    return {
      success: true,
      message: testDataIndicator
        ? 'Asiento validado correctamente (modo test)'
        : 'Asiento contabilizado correctamente',
      rawXML: xmlResponse,
      parsed
    };
  } catch (err) {
    AppLog.error("❌ [ValidaContabilizaAsiento] 🔴 Error detectado", err);
    if (err.code) {
      throw err;
    }
    AppLog.error("❌ [ValidaContabilizaAsiento] 🔴 Error interno:", err);
    return req.reject(500, "[ValidaContabilizaAsiento] 🔴 Error interno");
  }
}

module.exports = {
  safeUndef,
  safeDate,
  primerDiaMesSiguiente,
  AplicaConversionMoneda,
  ReemplazaMailSolicitantePorID,
  ReemplazaCuentaPorID,
  CompletaCamposCabecera,
  ObtenerIDSubtipoAsiento,
  ValidaContabilizaAsiento
};
