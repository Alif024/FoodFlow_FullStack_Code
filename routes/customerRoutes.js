const express = require("express");
const customerPageController = require("../controllers/customerPageController");
const { createCustomerProxyController } = require("../controllers/customerProxyController");
const { menuImageUpload } = require("../middlewares/menuImageUpload");

function createCustomerRoutes(MENUS_API, UPSTREAM_BASE) {
  const router = express.Router();
  const proxyController = createCustomerProxyController({ MENUS_API, UPSTREAM_BASE });
  const RESERVED_KEYS = new Set(["api", "member-login", "member-register", "admin-login", "dashboard", "logout"]);

  async function resolveTableNoByToken(token) {
    const safeToken = String(token || "").trim();
    if (!safeToken) return null;

    const upstream = await fetch(`${UPSTREAM_BASE}/api/tableqr/token/${encodeURIComponent(safeToken)}`);
    if (!upstream.ok) return null;
    const row = await upstream.json();
    return row && row.table_id ? row.table_id : null;
  }

  const menuUploadHandler = (req, res, next) => {
    menuImageUpload(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Image upload failed" });
      return next();
    });
  };

  // If a tableKey is provided as query param, resolve it and render homepage
  router.get("/", async (req, res) => {
    const token = (req.query.tableKey || "").trim();
    if (!token) return customerPageController.renderTableNotFound(res);

    try {
      const tableNo = await resolveTableNoByToken(token);
      if (!tableNo) return customerPageController.renderTableNotFound(res);
      return res.render('customer/index', {
        title: 'FoodFlow',
        stylesheet: '/css/index.css',
        script: '/js/index.js',
        tableNo,
        tableKey: token,
      });
    } catch (err) {
      console.error('Failed to resolve table token', err);
      return customerPageController.renderTableNotFound(res);
    }
  });

  // Keep a short token route for scanned QR that redirects to homepage with query
  router.get('/t/:token', (req, res) => {
    const { token } = req.params;
    return res.redirect(`/?tableKey=${encodeURIComponent(token)}`);
  });

  router.get("/member-login/:tableKey", async (req, res) => {
    const token = (req.params.tableKey || "").trim();
    try {
      const tableNo = await resolveTableNoByToken(token);
      if (!tableNo) return customerPageController.renderTableNotFound(res);
      return res.render("customer/member_login", {
        title: "Member Area",
        stylesheet: "/css/member.css",
        script: "/js/member.js",
        tableNo,
        tableKey: token,
      });
    } catch (err) {
      console.error("Failed to resolve table token for member login", err);
      return customerPageController.renderTableNotFound(res);
    }
  });

  router.get("/member-register/:tableKey", async (req, res) => {
    const token = (req.params.tableKey || "").trim();
    try {
      const tableNo = await resolveTableNoByToken(token);
      if (!tableNo) return customerPageController.renderTableNotFound(res);
      return res.render("customer/member_register", {
        title: "Member Area",
        stylesheet: "/css/member.css",
        script: "/js/member.js",
        tableNo,
        tableKey: token,
      });
    } catch (err) {
      console.error("Failed to resolve table token for member register", err);
      return customerPageController.renderTableNotFound(res);
    }
  });

  router.get("/:tableKey", async (req, res, next) => {
    const token = (req.params.tableKey || "").trim();
    if (RESERVED_KEYS.has(token)) return next();

    try {
      const tableNo = await resolveTableNoByToken(token);
      if (!tableNo) return customerPageController.renderTableNotFound(res);
      return res.render("customer/index", {
        title: "FoodFlow",
        stylesheet: "/css/index.css",
        script: "/js/index.js",
        tableNo,
        tableKey: token,
      });
    } catch (err) {
      console.error("Failed to resolve table token for dashboard", err);
      return customerPageController.renderTableNotFound(res);
    }
  });

  router.get("/api/menus", (req, res) => proxyController.proxyMenus(req, res));
  router.get("/api/menus/:id", (req, res) =>
    proxyController.proxyMenus(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.post("/api/menus", menuUploadHandler, (req, res) => proxyController.proxyMenus(req, res));
  router.put("/api/menus/:id", menuUploadHandler, (req, res) =>
    proxyController.proxyMenus(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.delete("/api/menus/:id", (req, res) =>
    proxyController.proxyMenus(req, res, `/${encodeURIComponent(req.params.id)}`),
  );

  router.get("/api/memberships", (req, res) => proxyController.proxyMembership(req, res));
  router.post("/api/memberships", (req, res) => proxyController.proxyMembership(req, res));
  router.get("/api/memberships/:id", (req, res) =>
    proxyController.proxyMembership(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.put("/api/memberships/:id", (req, res) =>
    proxyController.proxyMembership(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.delete("/api/memberships/:id", (req, res) =>
    proxyController.proxyMembership(req, res, `/${encodeURIComponent(req.params.id)}`),
  );

  router.get("/api/orders", (req, res) => proxyController.proxyOrders(req, res));
  router.get("/api/orders/kitchen/queue", (req, res) =>
    proxyController.proxyOrders(req, res, "/kitchen/queue"),
  );
  router.post("/api/orders/:id/pay", (req, res) =>
    proxyController.proxyOrders(req, res, `/${encodeURIComponent(req.params.id)}/pay`),
  );
  router.get("/api/orders/:id/receipt", (req, res) =>
    proxyController.proxyOrders(req, res, `/${encodeURIComponent(req.params.id)}/receipt`),
  );
  router.get("/api/orders/:id", (req, res) =>
    proxyController.proxyOrders(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.post("/api/orders", (req, res) => proxyController.proxyOrders(req, res));
  router.put("/api/orders/:id", (req, res) =>
    proxyController.proxyOrders(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.delete("/api/orders/:id", (req, res) =>
    proxyController.proxyOrders(req, res, `/${encodeURIComponent(req.params.id)}`),
  );
  router.post("/memberships", proxyController.proxyMembershipRegistration);
  router.post("/login", proxyController.proxyLogin);

  return router;
}

module.exports = createCustomerRoutes;
