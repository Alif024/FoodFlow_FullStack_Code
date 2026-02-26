const dbFile = require("./dbFile"); // file path for SQLite database
const { createDatabaseClient } = require("./sqliteClient");
const { initializeDatabase } = require("./initDatabase");
const { startApiServer } = require("../server/startApiServer");

const dbClient = createDatabaseClient(dbFile);
let serverRef = null;

async function init() {
  try {
    await initializeDatabase(dbClient, { logger: console });
    console.log("DB file:", dbFile);
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

function startServer() {
  if (serverRef) return serverRef;
  const { server } = startApiServer(dbClient, {
    port: Number(process.env.API_PORT) || 7000,
  });
  serverRef = server;
  return serverRef;
}

async function closeResources() {
  if (serverRef) {
    await new Promise((resolve) => {
      serverRef.close(() => resolve());
    });
    serverRef = null;
  }
  await dbClient.close();
}

if (require.main === module) {
  (async () => {
    await init();
    startServer();

    async function shutdown() {
      console.log("Shutting down server and closing DB");
      try {
        await closeResources();
      } finally {
        process.exit();
      }
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })();
}

module.exports = {
  dbFile,
  dbClient,
  init,
  startServer,
  closeResources,
};
