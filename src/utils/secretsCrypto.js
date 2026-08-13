const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const VERSION = 1;

const getKey = (key = process.env.ENCRYPTION_KEY) => {
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY deve conter 64 caracteres hexadecimais');
  }
  return Buffer.from(key, 'hex');
};

const encrypt = (data, key) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(key), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    version: VERSION,
    algorithm: ALGORITHM,
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
};

const decrypt = (payload, key) => {
  if (!payload || payload.algorithm !== ALGORITHM || Number(payload.version) !== VERSION) {
    throw new Error('Envelope de credencial inválido ou versão não suportada');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(key), Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

const isEnvelope = (value) => Boolean(value && typeof value === 'object' && value.encrypted && value.iv && value.authTag);

module.exports = { encrypt, decrypt, isEnvelope, ALGORITHM, VERSION };
