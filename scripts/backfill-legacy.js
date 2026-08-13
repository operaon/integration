require('dotenv').config();
const crypto = require('crypto');
const { Sequelize, QueryTypes } = require('sequelize');
const env = require('../src/config/env');
const database = require('../src/config/database');
const { Integration, IntegrationProvider } = require('../src/models');
const { encrypt } = require('../src/utils/secretsCrypto');
const { DEFAULT_PROVIDERS } = require('../src/services/providerService');

const dryRun = String(process.env.BACKFILL_DRY_RUN ?? 'true').toLowerCase() !== 'false';
const legacyUrl = process.env.LEGACY_DATABASE_URL;

const getLegacyKey = () => {
  if (!process.env.ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) throw new Error('ENCRYPTION_KEY é obrigatório para descriptografar o banco legado');
  return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
};

const decryptLegacy = (value) => {
  if (!value) return {};
  const envelope = typeof value === 'string' ? JSON.parse(value) : value;
  if (!envelope.encrypted || !envelope.iv || !envelope.authTag) throw new Error('credencial legada não está em envelope AES-256-GCM reconhecido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getLegacyKey(), Buffer.from(envelope.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.encrypted, 'hex')), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext);
};

const sourceRows = async (legacy) => legacy.query(`
  SELECT id, provider, environment, label, credentials, config, "isActive", "lastTestedAt", "lastTestStatus", "createdByUserId"
  FROM integrations
  ORDER BY "createdAt" ASC
`, { type: QueryTypes.SELECT });

const ensureProvider = async (providerKey, row) => {
  const known = DEFAULT_PROVIDERS.find((item) => item.key === providerKey);
  if (known) return known;
  return {
    key: providerKey,
    displayName: row.label || providerKey,
    category: 'legacy',
    supportedEnvironments: [row.environment],
    credentialSchema: { type: 'object', additionalProperties: { type: 'string', secret: true } },
    configSchema: { type: 'object', additionalProperties: true },
    healthCheck: null,
    isActive: true,
  };
};

const validUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;

const run = async () => {
  if (!legacyUrl) throw new Error('LEGACY_DATABASE_URL deve ser configurada para executar o backfill');
  const legacy = new Sequelize(legacyUrl, { logging: false, dialectOptions: { ssl: String(process.env.LEGACY_DB_SSL).toLowerCase() === 'true' ? { require: true, rejectUnauthorized: false } : undefined } });
  let scanned = 0; let candidates = 0; let inserted = 0; let skipped = 0;
  try {
    const rows = await sourceRows(legacy);
    for (const row of rows) {
      scanned += 1;
      const providerKey = row.provider;
      const environment = row.environment;
      if (!providerKey || !environment) { skipped += 1; continue; }
      const exists = await Integration.findOne({ where: { providerKey, environment } });
      if (exists) { skipped += 1; continue; }
      candidates += 1;
      if (dryRun) continue;
      const provider = await ensureProvider(providerKey, row);
      await IntegrationProvider.findOrCreate({ where: { key: provider.key }, defaults: provider });
      const credentials = decryptLegacy(row.credentials);
      await Integration.create({
        providerKey,
        environment,
        label: row.label || `${providerKey}/${environment}`,
        credentialsEnvelope: encrypt(credentials),
        config: row.config || null,
        isActive: row.isActive !== false,
        lastTestedAt: row.lastTestedAt || null,
        lastTestStatus: row.lastTestStatus || null,
        createdByUserId: validUuid(row.createdByUserId),
      });
      inserted += 1;
    }
    console.log(JSON.stringify({ dryRun, scanned, candidates, inserted, skipped }));
  } finally {
    await legacy.close();
    await database.close();
  }
};

if (require.main === module) run().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = { run, decryptLegacy };
