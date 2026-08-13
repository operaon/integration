const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IntegrationAuditEvent = sequelize.define('IntegrationAuditEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  integrationId: { type: DataTypes.UUID, allowNull: true },
  providerKey: { type: DataTypes.STRING(100), allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING(60), allowNull: false },
  oldValues: { type: DataTypes.JSONB, allowNull: true },
  newValues: { type: DataTypes.JSONB, allowNull: true },
  requestId: { type: DataTypes.STRING(120), allowNull: true },
  ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'integration_audit_events',
  timestamps: false,
  indexes: [{ fields: ['providerKey', 'createdAt'] }, { fields: ['integrationId', 'createdAt'] }, { fields: ['userId', 'createdAt'] }],
});

module.exports = IntegrationAuditEvent;
