const axios = require("axios");
const cds = require("@sap/cds");
const { getDestination } = require('@sap-cloud-sdk/connectivity');

let _client; // singleton

async function getDmsClient() {
  if (this._client) {
    return this._client;
  }

  this._client = await cds.connect.to("dmsdev");

  return this._client;
}

module.exports = {
  getDmsClient
};
