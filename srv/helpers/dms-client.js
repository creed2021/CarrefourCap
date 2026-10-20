const cds = require("@sap/cds");

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
