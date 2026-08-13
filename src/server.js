require('dotenv').config();
const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');
const logger = require('./config/logger');
const { seedDefaultProviders } = require('./services/providerService');

let server;

const start = async () => {
  await sequelize.authenticate();
  const createdProviders = await seedDefaultProviders();
  if (createdProviders) logger.info({ createdProviders }, 'default integration providers seeded');
  server = app.listen(env.port, () => logger.info({ port: env.port }, 'Integration Hub listening'));
  return server;
};

const shutdown = async (signal) => {
  logger.info({ signal }, 'Integration Hub shutdown requested');
  if (server) await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
  process.exit(0);
};

if (require.main === module) {
  start().catch((error) => { logger.error({ err: error }, 'Integration Hub failed to start'); process.exit(1); });
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { start, shutdown };
