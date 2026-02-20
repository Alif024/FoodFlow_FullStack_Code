const { reseedAutoIncrement } = require("../services/sqliteSequenceService");

function createOrderDetailModel(dbClient) {
  async function listAll() {
    return dbClient.all("SELECT * FROM OrderDetail");
  }

  async function findById(id) {
    return dbClient.get("SELECT * FROM OrderDetail WHERE order_detail_id = ?", [id]);
  }

  async function listByOrderIdWithMenu(orderId) {
    return dbClient.all(
      `SELECT od.*, m.menu_name, m.price
       FROM OrderDetail od
       LEFT JOIN Menu m ON od.menu_id = m.menu_id
       WHERE od.order_id = ?`,
      [orderId],
    );
  }

  async function create(payload = {}) {
    const result = await dbClient.run(
      "INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)",
      [payload.order_id, payload.menu_id, payload.quantity || 1, payload.sub_total || 0],
    );
    return findById(result.lastID);
  }

  async function update(id, payload = {}) {
    await dbClient.run(
      "UPDATE OrderDetail SET menu_id=?, quantity=?, sub_total=? WHERE order_detail_id = ?",
      [payload.menu_id, payload.quantity || 1, payload.sub_total || 0, id],
    );
    return findById(id);
  }

  async function remove(id) {
    const result = await dbClient.run("DELETE FROM OrderDetail WHERE order_detail_id = ?", [id]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "OrderDetail", "order_detail_id");
    }
    return result.changes;
  }

  async function removeByOrderId(orderId) {
    const result = await dbClient.run("DELETE FROM OrderDetail WHERE order_id = ?", [orderId]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "OrderDetail", "order_detail_id");
    }
    return result.changes;
  }

  async function sumByOrderId(orderId) {
    const result = await dbClient.get("SELECT IFNULL(SUM(sub_total),0) as s FROM OrderDetail WHERE order_id = ?", [
      orderId,
    ]);
    return result ? result.s : 0;
  }

  return {
    listAll,
    findById,
    listByOrderIdWithMenu,
    create,
    update,
    remove,
    removeByOrderId,
    sumByOrderId,
  };
}

module.exports = {
  createOrderDetailModel,
};
