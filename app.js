require('dotenv').config()
const path = require("path");
const express = require("express");
const { EventEmitter } = require('events');

const app = express();
const port = 7000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple index route
app.get("/", (req, res) => {
  res.render("index", {
    title: "FoodFlow",
    stylesheet: "/css/index_style.css",
    script: "/js/index_script.js"
  });
});

async function start() {
  // initialize DB schema & sample data
  try {
    const initDb = require('./database/seed');
    if (typeof initDb === 'function') await initDb();
  } catch (e) {
    console.error('Failed to initialize DB:', e.message);
  }

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
