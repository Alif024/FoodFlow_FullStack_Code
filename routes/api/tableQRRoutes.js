const express = require('express');

function createTableQRRoutes(tableQRController) {
  const router = express.Router();
  router.post('/api/tableqr/generate', tableQRController.generate);
  router.get('/api/tableqr/table/:tableId', tableQRController.getByTable);
  router.get('/api/tableqr/token/:token', tableQRController.getByToken);
  router.get('/api/tableqr', tableQRController.list);
  return router;
}

module.exports = createTableQRRoutes;
