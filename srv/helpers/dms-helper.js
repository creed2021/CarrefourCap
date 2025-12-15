const { getDmsClient } = require("./dms-client");
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const { getDestination } = require('@sap-cloud-sdk/connectivity');

// 🔴 Ajustar a tu repository real
const REPO_ID = "59ec1b8c-cf7c-465c-bd5b-460bcb6ca9a4";
const BASE = `/apidms/browser/${REPO_ID}`;

/**
 * Convierte path lógico (/AsientosAjuste/temp/x)
 * a path CMIS (/browser/<repo>/root/AsientosAjuste/temp/x)
 */
function toCmisPath(absPath) {
  const clean = String(absPath || "").replace(/^\/+/, "");
  return `${BASE}/root/${clean}`;
}

/**
 * Verifica existencia de carpeta por path
 */
async function folderExists(absPath, req) {


  try {
    // const remote = await cds.connect.to('dest_dms_dev');
    // const destinationName = remote.options.credentials.destination;
    // const destination = await getDestination({ destinationName });
    

    // if (!destination) throw new Error(`No se encontró el destino ${destinationName}`);
    
    // console.info(`[folderExists] 🌍 Usando destination: ${destinationName}`);

    // await client.get(cmisPath, {                                
    //   params: { cmisselector: "object", succinct: "true" }
    // });
       
    // const response = await executeHttpRequest(destination, {
    //   method: 'GET',
    //   url: cmisPath,
    //   params: { cmisselector: "object", succinct: "true" }
    // });
    const client = await getDmsClient();
    const cmisPath = toCmisPath(absPath) + "?cmisselector=object&succinct=true";

    await client.tx(req).get(cmisPath);

    return true;
  } catch (e) {
    if (e?.response?.status === 404) return false;
    throw e;
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

  await client.tx(req).post(parentCmis, 
                            form,
                            headers);

  // await client.post(parentCmis, form, {
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" }
  // });
  // const response = await executeHttpRequest(destination, {
  //   method: 'POST',
  //   url: parentCmis,
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   data: form
  // });

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

  // const remote = await cds.connect.to('dest_dms_dev');
  // const destinationName = remote.options.credentials.destination;
  // const destination = await getDestination({ destinationName });

  const cmisPath = toCmisPath(absPath) + "?cmisselector=object&succinct=true";

  // const res = await client.get(cmisPath, {
  //   params: { cmisselector: "object", succinct: "true" }
  // });

  // const res = await executeHttpRequest(destination, {
  //   method: 'GET',
  //   url: cmisPath,
  //   params: { cmisselector: "object", succinct: "true" }
  // });



  const res = await client.tx(req).get(cmisPath);

  return res?.data?.succinctProperties?.["cmis:objectId"];
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
  if (!sourceId) {
    throw new Error(`No se encontró carpeta origen: ${sourceAbsPath}`);
  }

  const targetId = await getObjectIdByPath(targetAbsPath, req);
  if (!targetId) {
    throw new Error(`No se encontró carpeta destino: ${targetAbsPath}`);
  }

  let headers= { "Content-Type": "application/x-www-form-urlencoded" };

  const form = new URLSearchParams();
  form.append("cmisaction", "move");
  form.append("objectId", sourceId);
  form.append("targetFolderId", targetId);
  form.append("succinct", "true");

    await client.tx(req).post(`${BASE}`, 
                            form,
                            headers);

  // await client.post(`${BASE}`, form, {
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" }
  // });
  // const response = await executeHttpRequest(destination, {
  //   method: 'POST',
  //   url: `${BASE}`,
  //   headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   data: form
  // });

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

module.exports = {
  folderExists,
  createFolder,
  ensureFolder,
  getObjectIdByPath,
  moveFolder,
  deleteTree
};
