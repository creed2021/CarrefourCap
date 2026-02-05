const { app } = require('./index')
const LOG = app()

module.exports = function logBusinessError(reason, details = {}) {
  LOG.warn({
    message: 'Business validation failed',
    reason,
    details
  })
}
