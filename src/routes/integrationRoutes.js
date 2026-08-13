const express = require('express');
const controller = require('../controllers/integrationController');
const providerController = require('../controllers/providerController');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();
router.use(authenticate);

router.get('/providers', requirePermission('integration', 'read'), providerController.list);
router.post('/providers', requirePermission('integration', 'manage'), providerController.create);
router.patch('/providers/:key', requirePermission('integration', 'manage'), providerController.update);

router.get('/integrations', requirePermission('integration', 'read'), controller.list);
router.get('/integrations/:id', requirePermission('integration', 'read'), controller.get);
router.post('/integrations', requirePermission('integration', 'manage'), controller.create);
router.patch('/integrations/:id', requirePermission('integration', 'manage'), controller.update);
router.put('/integrations/:id', requirePermission('integration', 'manage'), controller.update);
router.delete('/integrations/:id', requirePermission('integration', 'manage'), controller.remove);
router.post('/integrations/:id/test', requirePermission('integration', 'manage'), controller.test);

router.get('/internal/integrations/:providerKey/active', requirePermission('integration', 'read'), controller.activePublic);
router.get('/internal/integrations/:providerKey/active/credentials', requirePermission('integration', 'read'), controller.activeCredentials);

module.exports = router;
