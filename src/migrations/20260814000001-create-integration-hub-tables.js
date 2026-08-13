'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integration_providers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      displayName: { type: Sequelize.STRING(160), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      category: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'external' },
      supportedEnvironments: { type: Sequelize.JSONB, allowNull: false, defaultValue: ['sandbox', 'production'] },
      credentialSchema: { type: Sequelize.JSONB, allowNull: true },
      configSchema: { type: Sequelize.JSONB, allowNull: true },
      healthCheck: { type: Sequelize.JSONB, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdByUserId: { type: Sequelize.UUID, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('integrations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      providerKey: {
        type: Sequelize.STRING(100), allowNull: false,
        references: { model: 'integration_providers', key: 'key' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      environment: { type: Sequelize.STRING(40), allowNull: false },
      label: { type: Sequelize.STRING(160), allowNull: false },
      credentialsEnvelope: { type: Sequelize.JSONB, allowNull: false },
      config: { type: Sequelize.JSONB, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      lastTestedAt: { type: Sequelize.DATE, allowNull: true },
      lastTestStatus: { type: Sequelize.STRING(20), allowNull: true },
      lastTestMessage: { type: Sequelize.STRING(500), allowNull: true },
      createdByUserId: { type: Sequelize.UUID, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.createTable('integration_audit_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      integrationId: { type: Sequelize.UUID, allowNull: true, references: { model: 'integrations', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      providerKey: { type: Sequelize.STRING(100), allowNull: false },
      userId: { type: Sequelize.UUID, allowNull: true },
      action: { type: Sequelize.STRING(60), allowNull: false },
      oldValues: { type: Sequelize.JSONB, allowNull: true },
      newValues: { type: Sequelize.JSONB, allowNull: true },
      requestId: { type: Sequelize.STRING(120), allowNull: true },
      ipAddress: { type: Sequelize.STRING(64), allowNull: true },
      userAgent: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('integrations', ['providerKey', 'environment'], { unique: true, name: 'integration_provider_environment_unique' });
    await queryInterface.addIndex('integrations', ['providerKey', 'isActive'], { name: 'integration_integration_provider_active_idx' });
    await queryInterface.addIndex('integrations', ['isActive'], { name: 'integration_integration_active_idx' });
    await queryInterface.addIndex('integration_providers', ['isActive'], { name: 'integration_provider_active_idx' });
    await queryInterface.addIndex('integration_providers', ['category'], { name: 'integration_provider_category_idx' });
    await queryInterface.addIndex('integration_audit_events', ['providerKey', 'createdAt'], { name: 'integration_audit_provider_created_idx' });
    await queryInterface.addIndex('integration_audit_events', ['integrationId', 'createdAt'], { name: 'integration_audit_integration_created_idx' });
    await queryInterface.addIndex('integration_audit_events', ['userId', 'createdAt'], { name: 'integration_audit_user_created_idx' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('integration_audit_events');
    await queryInterface.dropTable('integrations');
    await queryInterface.dropTable('integration_providers');
  },
};
