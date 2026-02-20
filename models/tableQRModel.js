function createTableQRModel(dbClient) {
  async function create({ token, table_id, created_at, expires_at, used = 0 }) {
    await dbClient.run(
      `INSERT INTO TableQR (token, table_id, created_at, expires_at, used) VALUES (?, ?, ?, ?, ?)`,
      [token, table_id, created_at || null, expires_at || null, used]
    );
    return findByToken(token);
  }

  async function findByToken(token) {
    return dbClient.get("SELECT * FROM TableQR WHERE token = ?", [token]);
  }

  async function findByTableId(table_id) {
    return dbClient.get("SELECT * FROM TableQR WHERE table_id = ?", [table_id]);
  }

  async function removeByToken(token) {
    const res = await dbClient.run("DELETE FROM TableQR WHERE token = ?", [token]);
    return res.changes || 0;
  }

  async function removeByTableId(table_id) {
    const res = await dbClient.run("DELETE FROM TableQR WHERE table_id = ?", [table_id]);
    return res.changes || 0;
  }

  async function listAll() {
    return dbClient.all("SELECT * FROM TableQR ORDER BY created_at DESC");
  }

  return {
    create,
    findByToken,
    findByTableId,
    removeByToken,
    removeByTableId,
    listAll,
  };
}

module.exports = {
  createTableQRModel,
};
