const request = require('supertest');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.test') });
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4720';
process.env.SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'integration-test-service-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-jwt-secret';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'operaon-identity';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'operaon-integration';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'operaon_integration_test';
process.env.DB_USER = process.env.DB_USER || 'dbadmin';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'SenhaForte2026';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const app = require('../src/app');
const sequelize = require('../src/config/database');
const { seedDefaultProviders } = require('../src/services/providerService');
const { Integration, IntegrationAuditEvent } = require('../src/models');

const token = (overrides = {}) => jwt.sign({
  sub: '11111111-1111-4111-8111-111111111111',
  tenantId: 'tenant-integration-test',
  tokenType: 'access',
  permissions: ['integration:read', 'integration:manage'],
  ...overrides,
}, process.env.JWT_SECRET, { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: '10m' });

const auth = (agent, overrides = {}) => agent.set('X-Service-Key', process.env.SERVICE_API_KEY).set('Authorization', `Bearer ${token(overrides)}`);

describe('Integration Hub contract', () => {
  beforeAll(async () => { await sequelize.authenticate(); await seedDefaultProviders(); });
  beforeEach(async () => { await IntegrationAuditEvent.destroy({ where: {}, truncate: true, cascade: true }); await Integration.destroy({ where: {}, truncate: true, cascade: true }); });
  afterAll(async () => { await sequelize.close(); });

  test('exposes health and readiness', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
  });

  test('rejects protected routes without dual authentication', async () => {
    expect((await request(app).get('/api/integrations')).status).toBe(401);
    expect((await request(app).get('/api/integrations').set('X-Service-Key', process.env.SERVICE_API_KEY)).status).toBe(401);
  });

  test('lists dynamic providers without fixed code-only allowlist', async () => {
    const response = await auth(request(app).get('/api/providers'));
    expect(response.status).toBe(200);
    expect(response.body.data.some((provider) => provider.key === 'clinical')).toBe(true);
    expect(response.body.data.some((provider) => provider.key === 'notification')).toBe(true);
  });

  test('creates integration, encrypts credentials and never returns them publicly', async () => {
    const response = await auth(request(app).post('/api/integrations')).send({
      providerKey: 'clinical', environment: 'production', label: 'Clinical local',
      credentials: { serviceApiKey: 'secret-service-key' }, config: { baseURL: 'http://localhost:4710' },
    });
    expect(response.status).toBe(201);
    expect(response.body.data.credentialsEnvelope).toBeUndefined();
    expect(response.body.data.credentials).toBeUndefined();
    expect(response.body.data.credentialsConfigured).toBe(true);
  });

  test('resolves active credentials only through the internal authenticated endpoint', async () => {
    await auth(request(app).post('/api/integrations')).send({ providerKey: 'identity', environment: 'production', label: 'Identity', credentials: { serviceApiKey: 'secret' }, config: { baseURL: 'http://localhost:4700' } });
    const publicResponse = await auth(request(app).get('/api/internal/integrations/identity/active'));
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data.credentials).toBeUndefined();
    const internalResponse = await auth(request(app).get('/api/internal/integrations/identity/active/credentials'));
    expect(internalResponse.status).toBe(200);
    expect(internalResponse.body.data.credentials).toEqual({ serviceApiKey: 'secret' });
  });

  test('rejects ambiguous active resolution and records redacted audit', async () => {
    await auth(request(app).post('/api/integrations')).send({ providerKey: 'stripe', environment: 'sandbox', label: 'Stripe sandbox', credentials: { secretKey: 'sandbox-secret' } });
    await auth(request(app).post('/api/integrations')).send({ providerKey: 'stripe', environment: 'production', label: 'Stripe production', credentials: { secretKey: 'production-secret' } });
    const response = await auth(request(app).get('/api/internal/integrations/stripe/active'));
    expect(response.status).toBe(422);
    const events = await IntegrationAuditEvent.findAll();
    expect(events.length).toBe(2);
    expect(JSON.stringify(events)).not.toContain('sandbox-secret');
    expect(JSON.stringify(events)).not.toContain('production-secret');
  });
});
