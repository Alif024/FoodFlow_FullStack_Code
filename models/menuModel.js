const { reseedAutoIncrement } = require("../services/sqliteSequenceService");

function createMenuModel(dbClient) {
  async function listAll() {
    return dbClient.all("SELECT * FROM Menu");
  }

  async function findById(id) {
    return dbClient.get("SELECT * FROM Menu WHERE menu_id = ?", [id]);
  }

  async function create(payload = {}) {
    const result = await dbClient.run(
      "INSERT INTO Menu (menu_name, category_name, price, status, image_path) VALUES (?,?,?,?,?)",
      [
        payload.menu_name,
        payload.category_name,
        payload.price || 0,
        payload.status || "available",
        payload.image_path || null,
      ],
    );
    return findById(result.lastID);
  }

  async function update(id, payload = {}) {
    await dbClient.run(
      "UPDATE Menu SET menu_name=?, category_name=?, price=?, status=?, image_path=? WHERE menu_id = ?",
      [
        payload.menu_name,
        payload.category_name,
        payload.price || 0,
        payload.status || "available",
        payload.image_path || null,
        id,
      ],
    );
    return findById(id);
  }

  async function remove(id) {
    const result = await dbClient.run("DELETE FROM Menu WHERE menu_id = ?", [id]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "Menu", "menu_id");
    }
    return result.changes;
  }

  return {
    listAll,
    findById,
    create,
    update,
    remove,
  };
}

module.exports = {
  createMenuModel,
};
