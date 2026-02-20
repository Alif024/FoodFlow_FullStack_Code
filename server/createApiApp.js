const express = require("express");
const EventEmitter = require("events");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const { createModels } = require("../models");
const { createMenusController } = require("../controllers/api/menusController");
const { createMembershipsController } = require("../controllers/api/membershipsController");
const { createOrdersController } = require("../controllers/api/ordersController");
const { createOrderDetailsController } = require("../controllers/api/orderDetailsController");
const { createAuthController } = require("../controllers/api/authController");
const { createTableQRController } = require("../controllers/api/tableQRController");
const passwordService = require("../services/passwordService");

const createMenusRoutes = require("../routes/api/menusRoutes");
const createMembershipsRoutes = require("../routes/api/membershipsRoutes");
const createOrdersRoutes = require("../routes/api/ordersRoutes");
const createOrderDetailsRoutes = require("../routes/api/orderDetailsRoutes");
const createAuthRoutes = require("../routes/api/authRoutes");
const createTableQRRoutes = require("../routes/api/tableQRRoutes");
const { createRequestLogger } = require("../middlewares/requestLogger");
const { logError } = require("../utils/logger");

function createApiApp(dbClient) {
  const app = express();
  const orderEvents = new EventEmitter();
  orderEvents.setMaxListeners(100);

  function publishOrderEvent(event, payload = {}) {
    orderEvents.emit("order-event", event, {
      ...payload,
      ts: new Date().toISOString(),
    });
  }

  function subscribeOrderEvents(listener) {
    if (typeof listener !== "function") return () => {};
    const handler = (event, payload) => listener(event, payload);
    orderEvents.on("order-event", handler);
    return () => orderEvents.off("order-event", handler);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.LOG_HTTP === "true") {
    app.use(createRequestLogger("api"));
  }

  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "FoodFlow API running on port 7000" });
  });

  const models = createModels(dbClient);
  const menusController = createMenusController({ menuModel: models.menuModel });
  const membershipsController = createMembershipsController({
    membershipModel: models.membershipModel,
    passwordService,
  });
  const ordersController = createOrdersController({
    orderModel: models.orderModel,
    orderDetailModel: models.orderDetailModel,
    diningTableModel: models.diningTableModel,
    membershipModel: models.membershipModel,
    menuModel: models.menuModel,
    onOrderEvent: publishOrderEvent,
    subscribeOrderEvents,
  });
  const orderDetailsController = createOrderDetailsController({
    orderDetailModel: models.orderDetailModel,
    orderModel: models.orderModel,
    menuModel: models.menuModel,
  });
  const authController = createAuthController({
    membershipModel: models.membershipModel,
    passwordService,
  });
  const tableQRController = createTableQRController({ tableQRModel: models.tableQRModel, diningTableModel: models.diningTableModel });

  const apiLoginLimiter = rateLimit({
    windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." },
  });

  app.use("/", createMenusRoutes(menusController));
  app.use("/", createMembershipsRoutes(membershipsController));
  app.use("/", createOrdersRoutes(ordersController));
  app.use("/", createOrderDetailsRoutes(orderDetailsController));
  app.use("/login", apiLoginLimiter);
  app.use("/", createAuthRoutes(authController));
  app.use("/", createTableQRRoutes(tableQRController));

  // Simple endpoint to list dining tables for admin UI
  app.get('/api/tables', async (_req, res) => {
    try {
      const rows = await models.diningTableModel.listAll();
      return res.json(rows);
    } catch (err) {
      logError("list_tables_failed", { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tables', async (req, res) => {
    try {
      const payload = req.body || {};
      const rawName = typeof payload.table_name === "string" ? payload.table_name.trim() : "";
      const status = typeof payload.status === "string" && payload.status.trim()
        ? payload.status.trim()
        : "open";

      if (rawName.length > 100) {
        return res.status(400).json({ error: "table_name must be 100 characters or less" });
      }

      const row = await models.diningTableModel.create({
        table_name: rawName || null,
        status,
        created_at: new Date().toISOString(),
      });
      return res.status(201).json(row);
    } catch (err) {
      logError("create_table_failed", { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tables/:tableId', async (req, res) => {
    try {
      const tableId = Number(req.params.tableId);
      if (!Number.isFinite(tableId) || tableId <= 0) {
        return res.status(400).json({ error: "invalid table id" });
      }

      const existing = await models.diningTableModel.findById(tableId);
      if (!existing) {
        return res.status(404).json({ error: "Table not found" });
      }

      const snapshot = await models.orderModel.getWorkflowSnapshotByTable(tableId);
      const unpaidOpen = Number(snapshot?.unpaid_open_count) || 0;
      if (unpaidOpen > 0) {
        return res.status(409).json({ error: "Cannot drop table with active unpaid orders" });
      }

      await models.tableQRModel.removeByTableId(tableId);
      const removed = await models.diningTableModel.removeById(tableId);
      if (!removed) {
        return res.status(500).json({ error: "Failed to remove table" });
      }
      publishOrderEvent("table_deleted", { table_id: tableId });

      return res.json({ deleted: true, table_id: tableId });
    } catch (err) {
      logError("delete_table_failed", { error: err.message, table_id: req.params.tableId });
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/tables/:tableId/status', async (req, res) => {
    try {
      const tableId = Number(req.params.tableId);
      if (!Number.isFinite(tableId) || tableId <= 0) {
        return res.status(400).json({ error: "invalid table id" });
      }
      const table = await models.diningTableModel.findById(tableId);
      if (!table) return res.status(404).json({ error: "Table not found" });

      const nextStatus = String(req.body?.status || "").trim().toLowerCase();
      const snapshot = await models.orderModel.getWorkflowSnapshotByTable(tableId);
      const unpaidOpen = Number(snapshot?.unpaid_open_count) || 0;
      if (nextStatus === "closed" && unpaidOpen > 0) {
        return res.status(409).json({ error: "Cannot close table with active unpaid orders" });
      }

      const updated = await models.diningTableModel.updateStatus(tableId, nextStatus);
      if (!updated) return res.status(400).json({ error: "invalid table status" });
      publishOrderEvent("table_status_changed", { table: updated });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return app;
}

module.exports = {
  createApiApp,
};
