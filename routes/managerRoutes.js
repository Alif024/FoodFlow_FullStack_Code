const express = require("express");
const { rateLimit } = require("express-rate-limit");
const managerController = require("../controllers/managerController");

const adminLoginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

function createManagerRoutes() {
  const router = express.Router();

  router.get("/", (req, res, next) => {
    const tableKey = String(req.query?.tableKey || "").trim();
    if (tableKey) return next();
    return managerController.renderOriginSelection(req, res);
  });

  router.get("/admin-login", managerController.renderAdminLogin);
  router.post("/admin-login", adminLoginLimiter, managerController.handleAdminLogin);
  router.get("/dashboard", managerController.requireAdminLogin, managerController.renderDashboard);
  router.post("/logout", managerController.logout);

  return router;
}

module.exports = createManagerRoutes;
