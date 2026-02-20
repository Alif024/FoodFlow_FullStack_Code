require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const csrf = require("csurf");

const { createRequestLogger } = require("./middlewares/requestLogger");
const { logError, logInfo } = require("./utils/logger");

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 5000;
const MENUS_API = process.env.MENUS_API || "http://localhost:7000/menus";
const SESSION_SECRET = process.env.SESSION_SECRET || "FoodFlowSecret";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === "true"
  : IS_PRODUCTION;
const COOKIE_SAME_SITE = process.env.SESSION_COOKIE_SAMESITE || "lax";
const COOKIE_MAX_AGE_MS = Number(process.env.SESSION_COOKIE_MAX_AGE_MS) || 1000 * 60 * 60 * 8;

function resolveUpstreamOrigin(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.origin;
  } catch (_err) {
    return String(rawUrl || "").replace(/\/(api\/menus|menus|api)\/?$/i, "");
  }
}

function createFrontendApp() {
  const web = express();
  web.set("view engine", "ejs");
  web.set("views", path.join(__dirname, "views"));

  web.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  web.use(express.static(path.join(__dirname, "public")));
  web.use(express.json());
  web.use(express.urlencoded({ extended: true }));
  if (process.env.LOG_HTTP === "true") {
    web.use(createRequestLogger("frontend"));
  }

  web.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: COOKIE_SECURE,
        httpOnly: true,
        sameSite: COOKIE_SAME_SITE,
        maxAge: COOKIE_MAX_AGE_MS,
      },
    }),
  );

  // Protect non-API state-changing frontend routes (admin login/logout).
  const csrfProtection = csrf();
  web.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    return csrfProtection(req, res, next);
  });
  web.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (_err) {
      res.locals.csrfToken = "";
    }
    return next();
  });

  const UPSTREAM_ORIGIN = resolveUpstreamOrigin(MENUS_API);
  // Proxy dining table endpoints from the frontend to the upstream API server
  web.use('/api/tables', async (req, res) => {
    try {
      const pathPart = req.path && req.path !== "/" ? req.path : "";
      const queryIndex = req.originalUrl.indexOf("?");
      const queryPart = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
      const url = `${UPSTREAM_ORIGIN}/api/tables${pathPart}${queryPart}`;
      const opts = { method: req.method };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(req.body || {});
      }
      const upstream = await fetch(url, opts);
      const text = await upstream.text();
      res.status(upstream.status);
      // forward content-type and any useful headers from upstream
      try {
        upstream.headers.forEach((val, key) => res.setHeader(key, val));
      } catch (e) {
        // headers.forEach may not be supported in some Node versions; ignore
      }
      return res.send(text);
    } catch (err) {
      logError("proxy_tables_failed", { method: req.method, error: err.message });
      return res.status(502).json({ error: 'Failed to proxy tables' });
    }
  });

  // Proxy any request under /api/tableqr to the upstream API server
  web.use('/api/tableqr', async (req, res) => {
    try {
      const pathPart = req.path && req.path !== "/" ? req.path : "";
      const queryIndex = req.originalUrl.indexOf("?");
      const queryPart = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
      const url = `${UPSTREAM_ORIGIN}/api/tableqr${pathPart}${queryPart}`;
      const opts = { method: req.method };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(req.body || {});
      }
      const upstream = await fetch(url, opts);
      const text = await upstream.text();
      res.status(upstream.status);
      try {
        upstream.headers.forEach((val, key) => res.setHeader(key, val));
      } catch (e) {
        // ignore
      }
      return res.send(text);
    } catch (err) {
      logError("proxy_tableqr_failed", { method: req.method, error: err.message });
      return res.status(502).json({ error: 'Failed to proxy tableqr' });
    }
  });

  // Proxy order event stream (SSE) for real-time admin updates.
  web.get("/api/orders/stream", async (req, res) => {
    try {
      const upstream = await fetch(`${UPSTREAM_ORIGIN}/orders/stream`, {
        headers: { Accept: "text/event-stream" },
      });
      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status || 502).json({ error: "Failed to connect order stream" });
      }

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            res.write(Buffer.from(value));
          }
        }
        res.end();
      };

      req.on("close", async () => {
        try {
          await reader.cancel();
        } catch (_err) {
          // Ignore stream cancel errors.
        }
        res.end();
      });

      pump().catch((err) => {
        logError("orders_stream_proxy_failed", { error: err.message });
        res.end();
      });
    } catch (err) {
      logError("orders_stream_proxy_connect_failed", { error: err.message });
      return res.status(502).json({ error: "Failed to proxy order stream" });
    }
  });
  const managerRouter = require("./routes/managerRoutes")();
  const customerRouter = require("./routes/customerRoutes")(MENUS_API, UPSTREAM_ORIGIN);
  const reportRouter = require("./routes/reportRoutes")();
  web.use("/", managerRouter);
  web.use("/", reportRouter);
  web.use("/", customerRouter);

  web.use((err, _req, res, next) => {
    if (err && err.code === "EBADCSRFTOKEN") {
      return res.status(403).json({ error: "Invalid or missing CSRF token" });
    }
    return next(err);
  });

  return web;
}

function start() {
  const frontend = createFrontendApp();
  frontend.listen(FRONTEND_PORT, () => {
    logInfo("frontend_started", { url: `http://localhost:${FRONTEND_PORT}` });
  });
}

start();
