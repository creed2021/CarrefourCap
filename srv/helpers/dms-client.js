const axios = require("axios");
const cds = require("@sap/cds");
const { getDestination } = require('@sap-cloud-sdk/connectivity');

let _client = null; // singleton

async function getDmsClient() {
  if (_client) {
    return _client;
  }

  const _client = await cds.connect.to("dest_dms_dev");
  // 1️⃣ Resolver destination
//   const remote = await cds.connect.to("dest_dms_dev");

//   const destinationName = remote.options.credentials.destination;

//   const destination = await getDestination({ destinationName });

//   if (!destination) throw new Error(`No se encontró el destino ${destinationName}`);

//  console.info(`[getDmsClient] 🌍 Usando destinationName: ${destinationName}`);

//   console.info(`[getDmsClient] 🧩 ***********destination = ${JSON.stringify(destination, null, 2)}`); 

//   const baseURL = "https://api-sdm-di.cfapps.us30.hana.ondemand.com";
//   console.info(`[getDmsClient] 🧩 ***********baseURL = ${baseURL}`); 

  // 3️⃣ Crear cliente axios
  // _client = axios.create({
  //   baseURL,
  //   timeout: 30000,
  //   headers: {
  //     "Accept": "application/json"
  //   }
  // });

  return _client;
}

module.exports = {
  getDmsClient
};
