const sequelize = require('../config/database');
const IntegrationProvider = require('./IntegrationProvider');
const Integration = require('./Integration');
const IntegrationAuditEvent = require('./IntegrationAuditEvent');

Integration.belongsTo(IntegrationProvider, { foreignKey: 'providerKey', targetKey: 'key', as: 'provider' });
IntegrationProvider.hasMany(Integration, { foreignKey: 'providerKey', sourceKey: 'key', as: 'integrations' });
IntegrationAuditEvent.belongsTo(Integration, { foreignKey: 'integrationId', as: 'integration' });
Integration.hasMany(IntegrationAuditEvent, { foreignKey: 'integrationId', as: 'auditEvents' });

module.exports = {
  sequelize,
  IntegrationProvider,
  Integration,
  IntegrationAuditEvent,
};
