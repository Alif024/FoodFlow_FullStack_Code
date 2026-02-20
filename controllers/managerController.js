const crypto = require("crypto");
const { logError } = require("../utils/logger");

const ADMIN_USER = process.env.ADMIN_USER || "admin@foodflow.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "adminpass";

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdminLogin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect("/admin-login");
}

function renderAdminLogin(_req, res) {
  res.render("manager/admin_login", {
    title: "Admin Login",
    stylesheet: "/css/member.css",
    script: "/js/admin.js",
  });
}

function renderOriginSelection(_req, res) {
  return res.render("home", {
    title: "FoodFlow",
    stylesheet: "/css/member.css",
    script: "/js/main.js",
  });
}

function handleAdminLogin(req, res) {
  const { email, password } = req.body || {};
  if (safeCompare(email, ADMIN_USER) && safeCompare(password, ADMIN_PASS)) {
    req.session.isAdmin = true;
    return res.redirect("/dashboard");
  }

  return res.render("manager/admin_login", {
    title: "Admin Login",
    stylesheet: "/css/member.css",
    script: "/js/admin.js",
    error: "Invalid credentials",
  });
}

function renderDashboard(_req, res) {
  res.render("manager/admin", {
    title: "Admin Dashboard",
    stylesheet: "/css/admin.css",
    script: "/js/admin.js",
  });
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      logError("session_destroy_failed", { error: err.message });
      return res.status(500).json({ error: "Failed to logout" });
    }
    return res.status(200).json({ message: "Logged out successfully" });
  });
}

module.exports = {
  renderOriginSelection,
  requireAdminLogin,
  renderAdminLogin,
  handleAdminLogin,
  renderDashboard,
  logout,
};
