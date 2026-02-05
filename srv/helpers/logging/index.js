const cds = require('@sap/cds')

function createLogger(id, options = {}) {
  return cds.log(id, options)
}

module.exports = {
  app:   () => createLogger('app'),
  sql:   () => createLogger('sql'),
  odata: () => createLogger('odata'),
  auth:  () => createLogger('auth'),
  audit: () => createLogger('audit-log'),
}
