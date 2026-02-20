const express = require("express");

function createMenusRoutes(menusController) {
  const router = express.Router();
  router.get("/menus", menusController.list);
  router.get("/menus/:id", menusController.getById);
  router.post("/menus", menusController.create);
  router.put("/menus/:id", menusController.update);
  router.delete("/menus/:id", menusController.remove);
  return router;
}

module.exports = createMenusRoutes;
