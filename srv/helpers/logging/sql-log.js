const { sql } = require('./index')
const LOG = sql()

module.exports = {
  query: (query, params) => {
    LOG._debug && LOG.debug({ query, params })
  },

  error: (query, err) => {
    LOG.error({
      query,
      reason: err.message
    })
  }
}
