const { decrypt } = require('../utils/secretsCrypto');
const env = require('../config/env');
const logger = require('../config/logger');
const { buildInternalHeaders } = require('../middlewares/communicationContext');

const buildHeaders = (healthCheck, credentials) => {
  const headers = buildInternalHeaders({ serviceId: process.env.SERVICE_NAME || 'operaon-integration', context: {}, sourceSystem: 'integration', sourceId: String(healthCheck?.path || 'health-check'), eventType: 'integration.health.check' });
  if (healthCheck.serviceKeyField && healthCheck.serviceKeyHeader && credentials?.[healthCheck.serviceKeyField]) {
    headers[healthCheck.serviceKeyHeader] = credentials[healthCheck.serviceKeyField];
  }
  if (healthCheck.bearerField && credentials?.[healthCheck.bearerField]) {
    headers.Authorization = `Bearer ${credentials[healthCheck.bearerField]}`;
  }
  return headers;
};

const testHttp = async (integration) => {
  const provider = integration.provider;
  const healthCheck = provider?.healthCheck;
  if (!healthCheck || healthCheck.type !== 'http') return { success: false, message: 'Nenhum health check HTTP configurado para o provider' };
  const config = integration.config || {};
  const baseUrl = config.baseURL || config.baseUrl;
  if (!baseUrl) return { success: false, message: 'config.baseURL não configurado para o health check' };
  const url = new URL(healthCheck.path || '/health', baseUrl).toString();
  const credentials = decrypt(integration.credentialsEnvelope);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.healthCheck.timeoutMs);
  try {
    const response = await fetch(url, { method: healthCheck.method || 'GET', headers: buildHeaders(healthCheck, credentials), signal: controller.signal });
    const success = response.ok;
    return { success, message: success ? `HTTP ${response.status}` : `Provider respondeu HTTP ${response.status}`, statusCode: response.status };
  } catch (error) {
    logger.warn({ err: error, providerKey: integration.providerKey }, 'integration health check failed');
    return { success: false, message: error.name === 'AbortError' ? 'Health check expirou' : error.message };
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { testHttp };
