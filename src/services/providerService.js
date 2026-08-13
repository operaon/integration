const { IntegrationProvider } = require('../models');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

const DEFAULT_PROVIDERS = [
  ['stripe', 'Stripe', 'payments', 'sandbox production'],
  ['zoom', 'Zoom', 'telemedicine', 'sandbox production'],
  ['clarity', 'Microsoft Clarity', 'analytics', 'production'],
  ['chat', 'Chat', 'communication', 'production'],
  ['catalog', 'Catalog', 'standalone', 'production'],
  ['billing', 'Billing', 'standalone', 'production'],
  ['identity', 'Identity', 'standalone', 'production'],
  ['clinical', 'Clinical', 'standalone', 'production'],
  ['notification', 'Notification & Delivery', 'standalone', 'production'],
].map(([key, displayName, category, envs]) => ({
  key,
  displayName,
  category,
  supportedEnvironments: envs.split(' '),
  credentialSchema: { type: 'object', additionalProperties: { type: 'string', secret: true } },
  configSchema: { type: 'object', additionalProperties: true },
  healthCheck: category === 'standalone' ? { type: 'http', path: '/health', serviceKeyField: 'serviceApiKey', serviceKeyHeader: 'X-Service-Key' } : null,
  isActive: true,
}));

const safeProvider = (provider) => provider ? provider.toJSON ? provider.toJSON() : provider : null;

const getProvider = async (key, activeOnly = true) => {
  const where = { key };
  if (activeOnly) where.isActive = true;
  const provider = await IntegrationProvider.findOne({ where });
  if (!provider) throw new NotFoundError(`Provider '${key}' não encontrado`);
  return provider;
};

const validateEnvironment = (provider, environment) => {
  if (!provider.supportedEnvironments.includes(environment)) {
    throw new ValidationError(`Environment '${environment}' não é suportado pelo provider '${provider.key}'`);
  }
};

const seedDefaultProviders = async () => {
  let created = 0;
  for (const definition of DEFAULT_PROVIDERS) {
    const [, wasCreated] = await IntegrationProvider.findOrCreate({ where: { key: definition.key }, defaults: definition });
    if (wasCreated) created += 1;
  }
  return created;
};

const listProviders = async ({ activeOnly = true, limit = 100, offset = 0 } = {}) => {
  const where = activeOnly ? { isActive: true } : {};
  const { rows, count } = await IntegrationProvider.findAndCountAll({ where, limit, offset, order: [['displayName', 'ASC']] });
  return { data: rows.map(safeProvider), pagination: { count, limit, offset } };
};

const createProvider = async (payload, userId) => {
  const existing = await IntegrationProvider.findOne({ where: { key: payload.key } });
  if (existing) throw new ConflictError(`Provider '${payload.key}' já existe`);
  return IntegrationProvider.create({ ...payload, createdByUserId: userId });
};

const updateProvider = async (key, payload) => {
  const provider = await getProvider(key, false);
  await provider.update(payload);
  return provider;
};

module.exports = { DEFAULT_PROVIDERS, getProvider, validateEnvironment, seedDefaultProviders, listProviders, createProvider, updateProvider, safeProvider };
