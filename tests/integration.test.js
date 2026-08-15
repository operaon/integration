require('./env');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const { seedDefaultProviders } = require('../src/services/providerService');
const { Integration, IntegrationAuditEvent } = require('../src/models');

const token = ({ audience = process.env.JWT_AUDIENCE, tokenType = 'access', service = false, permissions = ['integration:read', 'integration:manage'] } = {}) => jwt.sign({
  sub: '11111111-1111-4111-8111-111111111111',
  tenantId: 'tenant-integration-test',
  tokenType,
  service,
  permissions,
}, process.env.JWT_SECRET, { issuer: process.env.JWT_ISSUER, audience, expiresIn: '10m' });

const auth = (agent, options = {}) => agent
  .set('X-Service-Key', options.serviceKey || process.env.SERVICE_API_KEY)
  .set('Authorization', `Bearer ${token(options)}`);

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

  test('rejects wrong audience, refresh tokens and invalid service keys', async () => {
    expect((await auth(request(app).get('/api/integrations'), { audience: 'operaon-api' })).status).toBe(401);
    expect((await auth(request(app).get('/api/integrations'), { tokenType: 'refresh' })).status).toBe(401);
    expect((await auth(request(app).get('/api/integrations'), { serviceKey: 'invalid-service-key' })).status).toBe(401);
  });

  test('does not grant an implicit permission bypass to service tokens', async () => {
    expect((await auth(request(app).get('/api/providers'), { service: true, permissions: [] })).status).toBe(403);
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
