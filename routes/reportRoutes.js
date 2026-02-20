const express = require("express");
const reportController = require("../controllers/reportController");
const managerController = require("../controllers/managerController");

function createReportRoutes() {
  const router = express.Router();

  router.get("/reports/report1", managerController.requireAdminLogin, reportController.renderReport1);
  router.get("/reports/report2", managerController.requireAdminLogin, reportController.renderReport2);

  return router;
}

module.exports = createReportRoutes;
