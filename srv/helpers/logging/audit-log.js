const cds = require('@sap/cds')
const LOG = cds.log('audit-log')

module.exports = {
  access: (req, action) => {
    LOG.info({
      message: 'User action',
      action,
      user: req.user?.id,
      tenant: cds.context?.tenant,
      target: req.target?.name
    })
  },

  change: (entity, before, after) => {
    LOG.info({
      message: 'Entity changed',
      entity,
      fields: Object.keys(after)
    })
  }
}
