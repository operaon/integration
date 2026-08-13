const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Integration = sequelize.define('Integration', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  providerKey: { type: DataTypes.STRING(100), allowNull: false },
  environment: { type: DataTypes.STRING(40), allowNull: false },
  label: { type: DataTypes.STRING(160), allowNull: false },
  credentialsEnvelope: { type: DataTypes.JSONB, allowNull: false },
  config: { type: DataTypes.JSONB, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastTestedAt: { type: DataTypes.DATE, allowNull: true },
  lastTestStatus: { type: DataTypes.STRING(20), allowNull: true },
  lastTestMessage: { type: DataTypes.STRING(500), allowNull: true },
  createdByUserId: { type: DataTypes.UUID, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'integrations',
  timestamps: true,
  indexes: [
    { fields: ['providerKey', 'environment'], unique: true },
    { fields: ['providerKey', 'isActive'] },
    { fields: ['isActive'] },
  ],
});

module.exports = Integration;
