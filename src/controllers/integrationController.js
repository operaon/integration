const integrationService = require('../services/integrationService');
const healthService = require('../services/healthService');
const { integrationCreateSchema, integrationPatchSchema, paginationSchema, internalParamsSchema, parse } = require('../validators');

const list = async (req, res, next) => {
  try { res.json({ success: true, ...(await integrationService.listIntegrations(parse(paginationSchema, req.query))) }); } catch (error) { next(error); }
};
const get = async (req, res, next) => {
  try { res.json({ success: true, data: await integrationService.getIntegration(req.params.id) }); } catch (error) { next(error); }
};
const create = async (req, res, next) => {
  try { const payload = parse(integrationCreateSchema, req.body); res.status(201).json({ success: true, data: await integrationService.createIntegration(payload, req.context.userId, req) }); } catch (error) { next(error); }
};
const update = async (req, res, next) => {
  try { const payload = parse(integrationPatchSchema, req.body); res.json({ success: true, data: await integrationService.updateIntegration(req.params.id, payload, req.context.userId, req) }); } catch (error) { next(error); }
};
const remove = async (req, res, next) => {
  try { await integrationService.removeIntegration(req.params.id, req.context.userId, req); res.json({ success: true, message: 'Integração removida com sucesso' }); } catch (error) { next(error); }
};
const test = async (req, res, next) => {
  try { res.json({ success: true, data: await integrationService.testConnection(req.params.id, req.context.userId, req, healthService.testHttp) }); } catch (error) { next(error); }
};
const activePublic = async (req, res, next) => {
  try { const { providerKey } = parse(internalParamsSchema, req.params); res.json({ success: true, data: await integrationService.getActivePublic(providerKey, req.query.environment || null) }); } catch (error) { next(error); }
};
const activeCredentials = async (req, res, next) => {
  try { const { providerKey } = parse(internalParamsSchema, req.params); res.json({ success: true, data: await integrationService.getActiveCredentials(providerKey, req.query.environment || null) }); } catch (error) { next(error); }
};

module.exports = { list, get, create, update, remove, test, activePublic, activeCredentials };
