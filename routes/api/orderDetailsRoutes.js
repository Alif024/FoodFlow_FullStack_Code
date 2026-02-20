const express = require("express");

function createOrderDetailsRoutes(orderDetailsController) {
  const router = express.Router();
  router.get("/order-details", orderDetailsController.list);
  router.get("/order-details/:id", orderDetailsController.getById);
  router.post("/order-details", orderDetailsController.create);
  router.put("/order-details/:id", orderDetailsController.update);
  router.delete("/order-details/:id", orderDetailsController.remove);
  return router;
}

module.exports = createOrderDetailsRoutes;
