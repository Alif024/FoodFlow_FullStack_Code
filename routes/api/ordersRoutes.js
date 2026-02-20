const express = require("express");

function createOrdersRoutes(ordersController) {
  const router = express.Router();
  router.get("/orders/stream", ordersController.stream);
  router.get("/orders/kitchen/queue", ordersController.kitchenQueue);
  router.post("/orders/:id/pay", ordersController.markPaid);
  router.get("/orders/:id/receipt", ordersController.getReceipt);
  router.get("/orders", ordersController.list);
  router.get("/orders/:id", ordersController.getById);
  router.post("/orders", ordersController.create);
  router.put("/orders/:id", ordersController.update);
  router.delete("/orders/:id", ordersController.remove);
  return router;
}

module.exports = createOrdersRoutes;
