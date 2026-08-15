const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: process.env.TEST_ENV_FILE || path.resolve('/tmp/integration-test.env') });

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4720';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'operaon_integration_test';
process.env.DB_USER = process.env.DB_USER || 'dbadmin';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_SSL = process.env.DB_SSL || 'false';
process.env.SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'integration-test-service-key';
process.env.JWT_ALGORITHM = 'HS256';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-jwt-secret-change-me';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'operaon-identity';
process.env.JWT_AUDIENCE = 'operaon-integration';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

module.exports = process.env;
