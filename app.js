require('dotenv').config();
const path = require("path");
const express = require("express");

const FRONTEND_PORT = 5000;
const MENUS_API = process.env.MENUS_API || "http://localhost:7000/menus";

function createFrontendApp() {
  const web = express();
  web.set("view engine", "ejs");
  web.set("views", path.join(__dirname, "views"));

  web.use(express.static(path.join(__dirname, "public")));
  web.use(express.json());
  web.use(express.urlencoded({ extended: true }));

  web.get("/", (req, res) => {
    res.render("index", {
      title: "FoodFlow",
      stylesheet: "/css/index_style.css",
      script: "/js/index_script.js",
    });
  });

  // Proxy menu API to avoid browser CORS issues
  web.get("/api/menus", async (_req, res) => {
    try {
      const upstream = await fetch(MENUS_API);
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).send(text);
      }
      const data = await upstream.json();
      res.set("Cache-Control", "no-store");
      return res.json(data);
    } catch (err) {
      console.error("Menu proxy failed", err);
      return res.status(502).json({ error: "Failed to fetch menus" });
    }
  });

  return web;
}

function start() {
  const frontend = createFrontendApp();
  frontend.listen(FRONTEND_PORT, () => {
    console.log(`Frontend running at http://localhost:${FRONTEND_PORT}`);
  });
}

start();
