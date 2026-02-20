const { ensureSchema } = require("./schema");
const { seedInitialData } = require("./seedData");

async function initializeDatabase(dbClient, options = {}) {
  const logger = options.logger || console;
  await ensureSchema(dbClient);
  await seedInitialData(dbClient);
  logger.log("Database initialization complete.");
}

module.exports = {
  initializeDatabase,
};
