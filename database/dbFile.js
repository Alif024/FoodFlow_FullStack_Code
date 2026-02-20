const path = require("path");

const dbPathFromEnv = (process.env.DB_FILE || "").trim();

module.exports = dbPathFromEnv
  ? path.resolve(process.cwd(), dbPathFromEnv)
  : path.join(__dirname, "database.sqlite");
