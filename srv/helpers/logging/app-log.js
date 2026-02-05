const { app } = require('./index')
const LOG = app()

module.exports = {
  info:  (...args) => LOG.info (...args),
  warn:  (...args) => LOG.warn (...args),
  error: (...args) => LOG.error(...args),

  debug: (...args) => {
    if (LOG._debug) LOG.debug(...args)
  },

  trace: (...args) => {
    if (LOG._trace) LOG.trace(...args)
  }
}
