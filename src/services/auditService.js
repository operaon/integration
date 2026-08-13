const { IntegrationAuditEvent } = require('../models');
const logger = require('../config/logger');

const SECRET_KEYS = new Set(['credentials', 'credentialsEnvelope', 'password', 'secret', 'apiKey', 'clientSecret', 'accessToken', 'refreshToken', 'token', 'privateKey']);

const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (SECRET_KEYS.has(key) || /credential|secret|password|token/i.test(key)) acc[key] = '[REDACTED]';
    else acc[key] = sanitize(item);
    return acc;
  }, {});
};

const audit = async ({ integrationId = null, providerKey, action, userId = null, oldValues = null, newValues = null, req = null }) => {
  try {
    await IntegrationAuditEvent.create({
      integrationId,
      providerKey,
      userId,
      action,
      oldValues: sanitize(oldValues),
      newValues: sanitize(newValues),
      requestId: req?.requestId || null,
      ipAddress: req?.ip || null,
      userAgent: req?.get?.('user-agent') || null,
    });
  } catch (error) {
    logger.error({ err: error, providerKey, action }, 'integration audit write failed');
  }
};

const publicIntegration = (integration) => {
  if (!integration) return null;
  const value = integration.toJSON ? integration.toJSON() : { ...integration };
  delete value.credentialsEnvelope;
  value.credentialsConfigured = true;
  return value;
};

module.exports = { audit, sanitize, publicIntegration };
