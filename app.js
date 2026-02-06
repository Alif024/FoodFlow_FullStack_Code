require('dotenv').config()
const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", {
    title: "FoodFlow",
    stylesheet: "/css/index_style.css",
    script: "/js/index_script.js"
  });
});

// app.get("/about", (req, res) => {
//   res.render("about", {
//     title: "About FoodFlow",
//   });
// });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
