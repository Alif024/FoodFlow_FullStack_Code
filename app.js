require('dotenv').config()
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(cors({ origin: "http://localhost:5000" }));

app.get("/", (req, res) => {
  res.render("index", {
    title: "FoodFlow",
    stylesheet: "/css/index_style.css",
    script: "/js/index_script.js"
  });
});

const MENUS_API = process.env.MENUS_API || "http://localhost:7000/menus";

app.get("/api/menus", async (_req, res) => {
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

// app.get("/about", (req, res) => {
//   res.render("about", {
//     title: "About FoodFlow",
//   });
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
