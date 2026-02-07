require('dotenv').config()
const path = require("path");
const express = require("express");
<<<<<<< HEAD
const cors = require("cors");
=======
const { EventEmitter } = require('events');
>>>>>>> ede1281dc2f014cbcde118b2fda96702580c6976

const app = express();
const port = 7000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
<<<<<<< HEAD
app.use(cors({ origin: "http://localhost:5000" }));
=======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
>>>>>>> ede1281dc2f014cbcde118b2fda96702580c6976

// simple index route
app.get("/", (req, res) => {
  res.render("index", {
    title: "FoodFlow",
    stylesheet: "/css/index_style.css",
    script: "/js/index_script.js"
  });
});

<<<<<<< HEAD
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
=======
async function start() {
  // initialize DB schema & sample data
  try {
    const initDb = require('./database/seed');
    if (typeof initDb === 'function') await initDb();
  } catch (e) {
    console.error('Failed to initialize DB:', e.message);
  }
>>>>>>> ede1281dc2f014cbcde118b2fda96702580c6976

  // create event emitter for real-time notifications
  const events = new EventEmitter();

  // mount backend-only routes (customer / manager)
  try { require('./routes/customer')(app, path.join(__dirname, 'database', 'database.sqlite'), events); } catch (e) { console.warn('customer route load failed:', e.message); }
  try { require('./routes/manager')(app, path.join(__dirname, 'database', 'database.sqlite'), events); } catch (e) { console.warn('manager route load failed:', e.message); }

  app.listen(port, () => {
    console.log(`App running. Frontend at http://localhost:${port} and backend routes mounted.`);
  });
}

start();
