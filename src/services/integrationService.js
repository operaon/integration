const { Integration, IntegrationProvider } = require('../models');
const { encrypt, decrypt } = require('../utils/secretsCrypto');
const { audit, publicIntegration } = require('./auditService');
const { getProvider, validateEnvironment } = require('./providerService');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

const safeValues = (integration) => {
  if (!integration) return null;
  const value = integration.toJSON ? integration.toJSON() : { ...integration };
  delete value.credentialsEnvelope;
  return value;
};

const parseLimit = (value, fallback = 100) => Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), 100);

const findById = async (id) => {
  const integration = await Integration.findByPk(id, { include: [{ model: IntegrationProvider, as: 'provider', attributes: ['key', 'displayName', 'category', 'isActive'] }] });
  if (!integration) throw new NotFoundError(`Integração ${id} não encontrada`);
  return integration;
};

const listIntegrations = async ({ limit = 100, offset = 0, activeOnly = false } = {}) => {
  const where = activeOnly ? { isActive: true } : {};
  const result = await Integration.findAndCountAll({
    where,
    limit: parseLimit(limit),
    offset: Math.max(Number.parseInt(offset, 10) || 0, 0),
    include: [{ model: IntegrationProvider, as: 'provider', attributes: ['key', 'displayName', 'category', 'isActive'] }],
    order: [['createdAt', 'DESC']],
  });
  return { data: result.rows.map(publicIntegration), pagination: { count: result.count, limit: parseLimit(limit), offset: Math.max(Number.parseInt(offset, 10) || 0, 0) } };
};

const getIntegration = async (id) => publicIntegration(await findById(id));

const createIntegration = async (payload, userId, req = null) => {
  if (!payload?.providerKey || !payload?.environment || !payload?.label || !payload?.credentials) {
    throw new ValidationError('providerKey, environment, label e credentials são obrigatórios');
  }
  const provider = await getProvider(payload.providerKey);
  validateEnvironment(provider, payload.environment);
  const existing = await Integration.findOne({ where: { providerKey: payload.providerKey, environment: payload.environment } });
  if (existing) throw new ConflictError(`Já existe uma integração para provider='${payload.providerKey}' e environment='${payload.environment}'`);

  const integration = await Integration.create({
    providerKey: payload.providerKey,
    environment: payload.environment,
    label: payload.label,
    credentialsEnvelope: encrypt(payload.credentials),
    config: payload.config || null,
    isActive: payload.isActive !== false,
    createdByUserId: userId || null,
  });
  await audit({ integrationId: integration.id, providerKey: integration.providerKey, action: 'create', userId, newValues: safeValues(integration), req });
  return publicIntegration(integration);
};

const updateIntegration = async (id, payload, userId, req = null) => {
  const integration = await findById(id);
  const oldValues = safeValues(integration);
  const nextProviderKey = payload.providerKey || integration.providerKey;
  const nextEnvironment = payload.environment || integration.environment;
  const provider = await getProvider(nextProviderKey, false);
  if (!provider.isActive) throw new ValidationError(`Provider '${nextProviderKey}' está inativo`);
  validateEnvironment(provider, nextEnvironment);

  if (nextProviderKey !== integration.providerKey || nextEnvironment !== integration.environment) {
    const conflict = await Integration.findOne({ where: { providerKey: nextProviderKey, environment: nextEnvironment } });
    if (conflict && conflict.id !== integration.id) throw new ConflictError(`Já existe uma integração para provider='${nextProviderKey}' e environment='${nextEnvironment}'`);
  }
  const updateData = { providerKey: nextProviderKey, environment: nextEnvironment };
  if (payload.label !== undefined) updateData.label = payload.label;
  if (payload.config !== undefined) updateData.config = payload.config;
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
  if (payload.credentials !== undefined) updateData.credentialsEnvelope = encrypt(payload.credentials);
  await integration.update(updateData);
  await audit({ integrationId: integration.id, providerKey: integration.providerKey, action: 'update', userId, oldValues, newValues: safeValues(integration), req });
  return publicIntegration(integration);
};

const removeIntegration = async (id, userId, req = null) => {
  const integration = await findById(id);
  const oldValues = safeValues(integration);
  await integration.destroy();
  await audit({ integrationId: id, providerKey: integration.providerKey, action: 'delete', userId, oldValues, req });
};

const resolveActive = async (providerKey, environment = null) => {
  const provider = await getProvider(providerKey);
  const where = { providerKey, isActive: true };
  if (environment) {
    validateEnvironment(provider, environment);
    where.environment = environment;
  }
  const active = await Integration.findAll({ where, order: [['updatedAt', 'DESC']] });
  if (active.length === 0) throw new NotFoundError(`Nenhuma integração ativa encontrada para provider='${providerKey}'${environment ? `/${environment}` : ''}`);
  if (!environment && active.length > 1) throw new ValidationError(`Existe mais de uma integração ativa para provider='${providerKey}' (${active.map((item) => item.environment).join(', ')}); desative uma delas`);
  return active[0];
};

const getActivePublic = async (providerKey, environment = null) => publicIntegration(await resolveActive(providerKey, environment));

const getActiveCredentials = async (providerKey, environment = null) => {
  const integration = await resolveActive(providerKey, environment);
  return {
    providerKey: integration.providerKey,
    environment: integration.environment,
    config: integration.config || null,
    credentials: decrypt(integration.credentialsEnvelope),
  };
};

const testConnection = async (id, userId, req = null, healthTester) => {
  const integration = await findById(id);
  const result = await healthTester(integration);
  const oldValues = safeValues(integration);
  await integration.update({ lastTestedAt: new Date(), lastTestStatus: result.success ? 'success' : 'failed', lastTestMessage: result.message || null });
  await audit({ integrationId: id, providerKey: integration.providerKey, action: 'health_check', userId, oldValues, newValues: safeValues(integration), req });
  return { ...result, lastTestStatus: integration.lastTestStatus, lastTestedAt: integration.lastTestedAt };
};

module.exports = { findById, listIntegrations, getIntegration, createIntegration, updateIntegration, removeIntegration, resolveActive, getActivePublic, getActiveCredentials, testConnection };
