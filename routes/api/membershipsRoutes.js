const express = require("express");

function createMembershipsRoutes(membershipsController) {
  const router = express.Router();
  router.get("/memberships", membershipsController.list);
  router.get("/memberships/:id", membershipsController.getById);
  router.post("/memberships", membershipsController.create);
  router.put("/memberships/:id", membershipsController.update);
  router.delete("/memberships/:id", membershipsController.remove);
  return router;
}

module.exports = createMembershipsRoutes;
