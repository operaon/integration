require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const requiredInProduction = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (isProduction && !value) throw new Error(`${name} é obrigatório em produção`);
  return value;
};

const parseList = (value, fallback = []) => {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4720);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('PORT inválida');

const jwtAlgorithm = process.env.JWT_ALGORITHM || 'HS256';
if (!['HS256', 'RS256', 'EdDSA'].includes(jwtAlgorithm)) throw new Error('JWT_ALGORITHM deve ser HS256, RS256 ou EdDSA');

const jwtSecret = requiredInProduction('JWT_SECRET', isTest ? 'integration-test-jwt-secret-change-me' : 'integration-development-jwt-secret-change-me');
if (jwtAlgorithm === 'HS256' && isProduction && jwtSecret.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres em produção');
const normalizeKey = (value) => (value ? value.replace(/\\n/g, '\n') : undefined);

module.exports = {
  nodeEnv,
  isProduction,
  isTest,
  host,
  port,
  serviceName: process.env.SERVICE_NAME || 'operaon_integration',
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 1),
  serviceApiKey: requiredInProduction('SERVICE_API_KEY', isTest ? 'integration-test-service-key' : 'integration-development-service-key'),
  jwt: {
    algorithm: jwtAlgorithm,
    secret: jwtSecret,
    publicKey: normalizeKey(process.env.JWT_PUBLIC_KEY),
    issuer: process.env.JWT_ISSUER || 'operaon-identity',
    audience: parseList(process.env.JWT_AUDIENCE, ['operaon-integration']),
  },
  database: {
    url: process.env.DATABASE_URL,
    name: process.env.DB_NAME || 'operaon_integration',
    user: process.env.DB_USER || 'dbadmin',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    ssl: process.env.DB_SSL === 'true',
  },
  legacyDatabase: {
    url: process.env.LEGACY_DATABASE_URL,
    name: process.env.LEGACY_DB_NAME || 'velyon_api',
    user: process.env.LEGACY_DB_USER || 'dbadmin',
    password: process.env.LEGACY_DB_PASSWORD || '',
    host: process.env.LEGACY_DB_HOST || 'localhost',
    port: Number(process.env.LEGACY_DB_PORT || 5432),
  },
  cors: { origin: process.env.CORS_ORIGIN || (isProduction ? '' : '*') },
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 5000),
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    timeoutMs: Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 5000),
  },
};
