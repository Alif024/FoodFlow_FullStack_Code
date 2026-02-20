const { createApiApp } = require("./createApiApp");

function startApiServer(dbClient, options = {}) {
  const port = Number(options.port) || 7000;
  const app = createApiApp(dbClient);
  const server = app.listen(port, () => {
    console.log(`CRUD API running on http://localhost:${port}`);
  });
  return { app, server, port };
}

module.exports = {
  startApiServer,
};
