const providerService = require('../services/providerService');
const { providerCreateSchema, providerPatchSchema, paginationSchema, parse } = require('../validators');

const list = async (req, res, next) => {
  try { res.json({ success: true, ...(await providerService.listProviders(parse(paginationSchema, req.query))) }); } catch (error) { next(error); }
};
const create = async (req, res, next) => {
  try { const payload = parse(providerCreateSchema, req.body); res.status(201).json({ success: true, data: await providerService.createProvider(payload, req.context.userId) }); } catch (error) { next(error); }
};
const update = async (req, res, next) => {
  try { const payload = parse(providerPatchSchema, req.body); res.json({ success: true, data: await providerService.updateProvider(req.params.key, payload) }); } catch (error) { next(error); }
};

module.exports = { list, create, update };
