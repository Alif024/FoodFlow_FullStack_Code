const { reseedAutoIncrement } = require("../services/sqliteSequenceService");

function createDiningTableModel(dbClient) {
  const ALLOWED_TABLE_STATUSES = new Set(["open", "occupied", "billing", "closed"]);

  async function create({ table_name, status = "open", created_at }) {
    const now = created_at || new Date().toISOString();
    const safeStatus = ALLOWED_TABLE_STATUSES.has(String(status || "").toLowerCase())
      ? String(status).toLowerCase()
      : "open";
    const result = await dbClient.run(
      "INSERT INTO DiningTable (table_name, status, created_at) VALUES (?, ?, ?)",
      [table_name || null, safeStatus, now],
    );
    const row = await findById(result.lastID);
    if (row && !row.table_name) {
      const fallbackName = `Table ${row.table_id}`;
      await dbClient.run("UPDATE DiningTable SET table_name = ? WHERE table_id = ?", [fallbackName, row.table_id]);
      return findById(row.table_id);
    }
    return row;
  }

  async function findById(id) {
    return dbClient.get("SELECT * FROM DiningTable WHERE table_id = ?", [id]);
  }

  async function listAll() {
    return dbClient.all("SELECT * FROM DiningTable ORDER BY table_id");
  }

  async function updateStatus(id, status) {
    const safeStatus = String(status || "").trim().toLowerCase();
    if (!ALLOWED_TABLE_STATUSES.has(safeStatus)) return null;
    await dbClient.run("UPDATE DiningTable SET status = ? WHERE table_id = ?", [safeStatus, id]);
    return findById(id);
  }

  async function removeById(id) {
    const result = await dbClient.run("DELETE FROM DiningTable WHERE table_id = ?", [id]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "DiningTable", "table_id");
    }
    return result.changes || 0;
  }

  return {
    create,
    findById,
    listAll,
    updateStatus,
    removeById,
  };
}

module.exports = {
  createDiningTableModel,
};
