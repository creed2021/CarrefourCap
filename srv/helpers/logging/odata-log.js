const { odata } = require('./index')
const LOG = odata()

module.exports = {
  request: (req) => {
    LOG._info && LOG.info({
      method: req.method,
      target: req.target?.name,
      user: req.user?.id
    })
  },

  failure: (req, err) => {
    LOG.error({
      target: req.target?.name,
      reason: err.message
    })
  }
}
