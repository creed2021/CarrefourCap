const { getDmsClient } = require("./dms-client");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination } = require('@sap-cloud-sdk/connectivity');

const REPO_ID = process.env.DMS_REPO_ID;

if (!REPO_ID) {
  throw new Error("Missing env var DMS_REPO_ID");
}
const BASE = `/browser/${REPO_ID}`;

const AppLog = require('../helpers/logging/app-log');

/**
 * Convierte path lógico (/AsientosAjuste/temp/x)
 * a path CMIS (/browser/<repo>/root/AsientosAjuste/temp/x)
 */
function toCmisPath(absPath) {
  const clean = String(absPath || "").replace(/^\/+/, "");

  // caso root
  if (!clean) {
    return `${BASE}/root/`;
  }

  return `${BASE}/root/${clean}`;
}



/**
 * Verifica existencia de carpeta por path
 */
async function folderExists(absPath, req) {


  try {

    const client = await getDmsClient();
    const cmisPath = toCmisPath(absPath) + "?cmisselector=object&succinct=true";
    
    const res = await client.tx(req).get(cmisPath);

    AppLog.debug(`[folderExists] 🧩 ***********res folder exists = ${JSON.stringify(res, null, 2)}`); 

    return true;

  } catch (err) {
    AppLog.debug(`[folderExists] 🧩 ***********errrrrrr = ${JSON.stringify(err, null, 2)}`); 
    // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
    if (err.reason.response.status == 404) {
      return false;
    }

    // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
    AppLog.error("❌ [folderExists] 🔴 Error interno:", err);

    // devolvemos un error 500 limpio
    return req.reject(500, "[folderExists] 🔴 Error interno");
  }
}

/**
 * Crea una carpeta hija
 */
async function createFolder(parentAbsPath, name, req) {
  const client = await getDmsClient();

  const parentCmis = toCmisPath(parentAbsPath);

  AppLog.debug(`[createFolder] 🧩 ***********parentAbsPath = ${JSON.stringify(parentAbsPath, null, 2)}`); 
  AppLog.debug(`[createFolder] 🧩 ***********parentCmis = ${JSON.stringify(parentCmis, null, 2)}`); 
  AppLog.debug(`[createFolder] 🧩 ***********name = ${name}`);

  const form = new URLSearchParams();
  form.append("cmisaction", "createFolder");
  form.append("propertyId[0]", "cmis:name");
  form.append("propertyValue[0]", name);
  form.append("propertyId[1]", "cmis:objectTypeId");
  form.append("propertyValue[1]", "cmis:folder");
  form.append("succinct", "true");

  let headers = { "Content-Type": "application/x-www-form-urlencoded" };

  const data = form.toString();

  await client.tx(req).post(parentCmis, 
                            data,
                            headers);

}

/**
 * Asegura la existencia de toda la jerarquía
 */
async function ensureFolder(absPath, req) {
  const parts = String(absPath || "").split("/").filter(Boolean);
  let current = "";

  for (const p of parts) {
    const next = `${current}/${p}`;
    const exists = await folderExists(next, req);
    if (!exists) {
      const parent = current === "" ? "/" : current;
      await createFolder(parent, p);
    }
    current = next;
  }
}

/**
 * Obtiene objectId de un path
 */
async function getObjectIdByPath(absPath, req) {
  const client = await getDmsClient();

  const cmisPath = toCmisPath(absPath) + "?cmisselector=object&succinct=true";

  AppLog.debug(`[getObjectIdByPath] cmisPath****** = ${cmisPath}`);

  const res = await client.tx(req).get(cmisPath);

  AppLog.debug("🟩 [getObjectIdByPath] Resultado busqueda carpeta", JSON.stringify(res, null, 2));

  return res?.succinctProperties?.["cmis:objectId"];
}

/**
 * Mueve una carpeta completa
 */
async function moveFolder(sourceAbsPath, targetAbsPath, req) {
  const client = await getDmsClient();

  const sourceId = await getObjectIdByPath(sourceAbsPath, req);

  AppLog.debug("🟩 [moveFolder] SOURCEID RESULTADO", JSON.stringify(sourceId, null, 2));

  if (!sourceId) {
    throw new Error(`No se encontró carpeta origen: ${sourceAbsPath}`);
  }

  const targetId = await getObjectIdByPath(targetAbsPath, req);
  if (!targetId) {
    throw new Error(`No se encontró carpeta destino: ${targetAbsPath}`);
  }

  const cmisPath = toCmisPath(`${BASE}/root/`) + `?cmisselector=children&objectId=${sourceId}&succinct=true`;
  
  const res = await client.tx(req).get(cmisPath);

  AppLog.debug(`[moveFolder] 🧩 ***********res folder exists = ${JSON.stringify(res, null, 2)}`); 


  let headers= { "Content-Type": "application/x-www-form-urlencoded" };

  for (const it of res.objects) {

        const hijo = it?.object?.succinctProperties?.["cmis:objectId"];

        AppLog.debug(`[moveFolder] 🧩 **********hijo ${JSON.stringify(hijo, null, 2)}`); 

        const form = new URLSearchParams();
        form.append("cmisaction", "move");
        form.append("objectId", hijo);
        form.append("targetFolderId", targetId);
        form.append("sourceFolderId", sourceId);
        //form.append("succinct", "true");

        const data = form.toString();

        AppLog.debug(`[moveFolder] 🧩 **********FORM ${JSON.stringify(data, null, 2)}`);

          await client.tx(req).post(`${BASE}/root/`, 
                                  data,
                                  headers);
  }

}

/**
 * Elimina carpeta completa (rollback)
 */
async function deleteTree(absPath, req) {
  const client = await getDmsClient();

  const cmisPath = toCmisPath(absPath) + "?cmisaction=deleteTree&allVersions=true&continueOnFailure=true";

  try {

    await client.tx(req).post(cmisPath);

  } catch (e) {
    if (e?.response?.status === 404) return;
    throw e;
  }
}

async function confirmAdjuntos(req) {
      // const AdjuntoSolicitud = cds.entities.AdjuntoSolicitud;
      // const CabeceraAsiento = cds.entities.CabeceraAsiento;

      try{

            const cab = req.data;
            const adjuntos = cab.adjuntosSolicitud;


            AppLog.debug("🟩 [confirmAdjuntos] adjuntos", JSON.stringify(adjuntos, null, 2));

            if(adjuntos) {
              if (adjuntos.length == 0){
                  AppLog.info("📊 [confirmAdjuntos] No hay adjuntos");
                  return;
              };
            } else{
                  AppLog.info("📊 [confirmAdjuntos] No hay adjuntos");
                  return;              
            }

            const destino = `/solicitud-asientos-adjuntos/solicitudes/${cab.numeroSolicitud}`;
            await ensureFolder(destino, req);
            await moveFolder(`/solicitud-asientos-adjuntos/temp/${adjuntos[0].sessionId}`, destino, req);

      } catch (err) {
        AppLog.error("❌ [confirmAdjuntos] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        AppLog.error("❌ [confirmAdjuntos] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[confirmAdjuntos] 🔴 Error interno");
      }

}

async function rollbackAdjuntos(req) {

      try{

            const { sessionId } = req.data;
            await deleteTree(`/solicitud-asientos-adjuntos/temp/${sessionId}`, req);

      } catch (err) {
        AppLog.error("❌ [rollbackAdjuntos] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        AppLog.error("❌ [rollbackAdjuntos] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[rollbackAdjuntos] 🔴 Error interno");
      }

}

module.exports = {
  folderExists,
  createFolder,
  ensureFolder,
  getObjectIdByPath,
  moveFolder,
  deleteTree,
  confirmAdjuntos,
  rollbackAdjuntos
};
