const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IntegrationProvider = sequelize.define('IntegrationProvider', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  displayName: { type: DataTypes.STRING(160), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'external' },
  supportedEnvironments: { type: DataTypes.JSONB, allowNull: false, defaultValue: ['sandbox', 'production'] },
  credentialSchema: { type: DataTypes.JSONB, allowNull: true },
  configSchema: { type: DataTypes.JSONB, allowNull: true },
  healthCheck: { type: DataTypes.JSONB, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdByUserId: { type: DataTypes.UUID, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'integration_providers',
  timestamps: true,
  indexes: [{ fields: ['isActive'] }, { fields: ['category'] }],
});

module.exports = IntegrationProvider;
