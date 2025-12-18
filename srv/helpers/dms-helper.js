const { getDmsClient } = require("./dms-client");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination } = require('@sap-cloud-sdk/connectivity');

// 🔴 Ajustar a tu repository real
const REPO_ID = "59ec1b8c-cf7c-465c-bd5b-460bcb6ca9a4";
const BASE = `/browser/${REPO_ID}`;

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

    console.info(`[folderExists] 🧩 ***********res folder exists = ${JSON.stringify(res, null, 2)}`); 

    return true;

  } catch (err) {
    //console.error("❌ [folderExists] 🔴 Error detectado", err);
    console.info(`[folderExists] 🧩 ***********errrrrrr = ${JSON.stringify(err, null, 2)}`); 
    // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
    if (err.reason.response.status == 404) {
      return false;
    }

    // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
    console.error("❌ [folderExists] 🔴 Error interno:", err);

    // devolvemos un error 500 limpio
    return req.reject(500, "[folderExists] 🔴 Error interno");
  }
}

/**
 * Crea una carpeta hija
 */
async function createFolder(parentAbsPath, name, req) {
  const client = await getDmsClient();
  // const remote = await cds.connect.to('dest_dms_dev');
  // const destinationName = remote.options.credentials.destination;
  // const destination = await getDestination({ destinationName });

  const parentCmis = toCmisPath(parentAbsPath);

  console.info(`[createFolder] 🧩 ***********parentAbsPath = ${JSON.stringify(parentAbsPath, null, 2)}`); 
  console.info(`[createFolder] 🧩 ***********parentCmis = ${JSON.stringify(parentCmis, null, 2)}`); 
  console.info(`[createFolder] 🧩 ***********name = ${name}`);

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

// async function getFolderObjectId(parentAbsPath, folderName) {
//   const client = await getDmsClient();
//   const parentCmis = toCmisPath(parentAbsPath);

//   const res = await client.get(parentCmis, {
//     params: {
//       cmisselector: "children",
//       succinct: "true"
//     }
//   });

//   const children = res?.data?.objects || [];

//   const folder = children.find(o =>
//     o?.object?.succinctProperties?.["cmis:name"] === folderName &&
//     o?.object?.succinctProperties?.["cmis:baseTypeId"] === "cmis:folder"
//   );

//   return folder?.object?.succinctProperties?.["cmis:objectId"];
// }

// async function moveFolder(sourceAbsPath, targetAbsPath) {
//   const client = await getDmsClient();

//   // separar parent y nombre
//   const parts = sourceAbsPath.split("/").filter(Boolean);
//   const folderName = parts.pop();
//   const parentAbs = "/" + parts.join("/");

//   const sourceId = await getFolderObjectId(parentAbs, folderName);
//   if (!sourceId) {
//     throw new Error(`No se encontró carpeta origen: ${sourceAbsPath}`);
//   }

//   const targetId = await getObjectIdByPath(targetAbsPath);
//   if (!targetId) {
//     throw new Error(`No se encontró carpeta destino: ${targetAbsPath}`);
//   }

//   const form = new URLSearchParams();
//   form.append("cmisaction", "move");
//   form.append("objectId", sourceId);
//   form.append("targetFolderId", targetId);

//   await client.post(`${BASE}`, form, {
//     headers: { "Content-Type": "application/x-www-form-urlencoded" }
//   });
// }



/**
 * Obtiene objectId de un path
 */
async function getObjectIdByPath(absPath, req) {
  const client = await getDmsClient();

  const cmisPath = toCmisPath(absPath) + "?cmisselector=object&succinct=true";

  console.info(`[getObjectIdByPath] cmisPath****** = ${cmisPath}`);

  const res = await client.tx(req).get(cmisPath);

  console.info("🟩 [getObjectIdByPath] Resultado busqueda carpeta", JSON.stringify(res, null, 2));

  return res?.succinctProperties?.["cmis:objectId"];
}

/**
 * Mueve una carpeta completa
 */
async function moveFolder(sourceAbsPath, targetAbsPath, req) {
  const client = await getDmsClient();

  // const remote = await cds.connect.to('dest_dms_dev');
  // const destinationName = remote.options.credentials.destination;
  // const destination = await getDestination({ destinationName });

  const sourceId = await getObjectIdByPath(sourceAbsPath, req);

  console.info("🟩 [moveFolder] SOURCEID RESULTADO", JSON.stringify(sourceId, null, 2));

  if (!sourceId) {
    throw new Error(`No se encontró carpeta origen: ${sourceAbsPath}`);
  }

  const targetId = await getObjectIdByPath(targetAbsPath, req);
  if (!targetId) {
    throw new Error(`No se encontró carpeta destino: ${targetAbsPath}`);
  }

  const cmisPath = toCmisPath(`${BASE}/root/`) + `?cmisselector=children&objectId=${sourceId}&succinct=true`;
  
  const res = await client.tx(req).get(cmisPath);

  console.info(`[moveFolder] 🧩 ***********res folder exists = ${JSON.stringify(res, null, 2)}`); 


  let headers= { "Content-Type": "application/x-www-form-urlencoded" };

  for (const it of res.objects) {

        const hijo = it?.object?.succinctProperties?.["cmis:objectId"];

        console.info(`[moveFolder] 🧩 **********hijo ${JSON.stringify(hijo, null, 2)}`); 

        const form = new URLSearchParams();
        form.append("cmisaction", "move");
        form.append("objectId", hijo);
        form.append("targetFolderId", targetId);
        form.append("sourceFolderId", sourceId);
        //form.append("succinct", "true");

        const data = form.toString();

        console.info(`[moveFolder] 🧩 **********FORM ${JSON.stringify(data, null, 2)}`);

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

  // const remote = await cds.connect.to('dest_dms_dev');
  // const destinationName = remote.options.credentials.destination;
  // const destination = await getDestination({ destinationName });

  const cmisPath = toCmisPath(absPath) + "?cmisaction=deleteTree&allVersions=true&continueOnFailure=true";

  try {
    // await client.post(cmisPath, null, {
    //   params: {
    //     cmisaction: "deleteTree",
    //     allVersions: "true",
    //     continueOnFailure: "true"
    //   }
    // });

    // const response = await executeHttpRequest(destination, {
    //   method: 'POST',
    //   url: cmisPath,
    //   params: { cmisaction: "deleteTree", allVersions: "true", continueOnFailure: "true" }
    // });
    await client.tx(req).post(cmisPath);

  } catch (e) {
    if (e?.response?.status === 404) return;
    throw e;
  }
}

async function confirmAdjuntos(req) {
      const AdjuntoSolicitud = cds.entities.AdjuntoSolicitud;
      const CabeceraAsiento = cds.entities.CabeceraAsiento;

      try{
            // const { sessionId } = req.data;

            // const tx = cds.tx(req);

            // const adjuntos = await tx.run(
            //   SELECT.from(AdjuntoSolicitud).where({ sessionId: sessionId })
            // );
             // console.info("🟩 [confirmAdjuntos] reqqqqqq", JSON.stringify(req, null, 2));

            const cab = req.data;
            const adjuntos = cab.adjuntosSolicitud;


            console.info("🟩 [confirmAdjuntos] adjuntos", JSON.stringify(adjuntos, null, 2));

            if (!adjuntos && adjuntos.length == 0){
                console.info("📊 [confirmAdjuntos] No hay adjuntos");
                return;
            };

            // const solicitudId = adjuntos[0].solicitud_ID;
            // const solicitud = await tx.run(
            //   SELECT.one.from(CabeceraAsiento).where({ ID: solicitudId })
            // );

            const destino = `/solicitud-asientos-adjuntos/solicitudes/${cab.numeroSolicitud}`;
            await ensureFolder(destino, req);
            await moveFolder(`/solicitud-asientos-adjuntos/temp/${adjuntos[0].sessionId}`, destino, req);

      } catch (err) {
        console.error("❌ [confirmAdjuntos] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [confirmAdjuntos] 🔴 Error interno:", err);

        // devolvemos un error 500 limpio
        return req.reject(500, "[confirmAdjuntos] 🔴 Error interno");
      }

}

async function rollbackAdjuntos(req) {

      try{

            const { sessionId } = req.data;
            await deleteFolder(`/solicitud-asientos-adjuntos/temp/${sessionId}`, req);

      } catch (err) {
        console.error("❌ [rollbackAdjuntos] 🔴 Error detectado", err);
        // 👉 Si el error ES de CAP (proviene de req.reject), lo re-lanzamos tal cual
        if (err.code) {
          throw err; // ⚡ sigue para arriba sin cambios
        }

        // 👉 Si es un error inesperado, lo logueamos sin tumbar el servidor
        console.error("❌ [rollbackAdjuntos] 🔴 Error interno:", err);

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
