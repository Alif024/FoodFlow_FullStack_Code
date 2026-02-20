const { reseedAutoIncrement } = require("../services/sqliteSequenceService");

function createOrderModel(dbClient) {
  const ACTIVE_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready", "served", "billing"];

  async function listAll() {
    return dbClient.all("SELECT * FROM Orders");
  }

  async function listKitchenQueue() {
    return dbClient.all(
      `SELECT * FROM Orders
       WHERE lower(coalesce(order_status, 'pending')) IN (${ACTIVE_ORDER_STATUSES.map(() => "?").join(",")})
         AND lower(coalesce(payment_status, 'unpaid')) != 'paid'
       ORDER BY datetime(order_date) ASC, order_id ASC`,
      ACTIVE_ORDER_STATUSES,
    );
  }

  async function findById(id) {
    return dbClient.get("SELECT * FROM Orders WHERE order_id = ?", [id]);
  }

  async function create(payload = {}) {
    const result = await dbClient.run(
      `INSERT INTO Orders
       (table_id, membership_id, order_date, total_price, order_status, payment_status, paid_at, receipt_no, service_charge, tax)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        payload.table_id ?? null,
        payload.membership_id ?? null,
        payload.order_date,
        payload.total_price || 0,
        payload.order_status || "pending",
        payload.payment_status || "unpaid",
        payload.paid_at || null,
        payload.receipt_no || null,
        Number(payload.service_charge) || 0,
        Number(payload.tax) || 0,
      ],
    );
    return findById(result.lastID);
  }

  async function update(id, payload = {}) {
    await dbClient.run(
      `UPDATE Orders
       SET table_id = ?,
           membership_id = ?,
           order_date = ?,
           order_status = ?,
           payment_status = ?,
           paid_at = ?,
           receipt_no = ?,
           service_charge = ?,
           tax = ?
       WHERE order_id = ?`,
      [
        payload.table_id,
        payload.membership_id,
        payload.order_date,
        payload.order_status,
        payload.payment_status || "unpaid",
        payload.paid_at || null,
        payload.receipt_no || null,
        Number(payload.service_charge) || 0,
        Number(payload.tax) || 0,
        id,
      ],
    );
    return findById(id);
  }

  async function updateTotalPrice(id, totalPrice) {
    await dbClient.run("UPDATE Orders SET total_price = ? WHERE order_id = ?", [totalPrice || 0, id]);
  }

  async function markPaid(id, payload = {}) {
    await dbClient.run(
      `UPDATE Orders
       SET payment_status = 'paid',
           paid_at = ?,
           receipt_no = ?,
           service_charge = ?,
           tax = ?,
           order_status = CASE
             WHEN lower(coalesce(order_status, '')) IN ('cancelled') THEN order_status
             ELSE 'paid'
           END
       WHERE order_id = ?`,
      [
        payload.paid_at || new Date().toISOString(),
        payload.receipt_no || null,
        Number(payload.service_charge) || 0,
        Number(payload.tax) || 0,
        id,
      ],
    );
    return findById(id);
  }

  async function getWorkflowSnapshotByTable(tableId) {
    return dbClient.get(
      `SELECT
         SUM(CASE WHEN lower(coalesce(order_status, 'pending')) != 'cancelled'
                   AND lower(coalesce(payment_status, 'unpaid')) != 'paid' THEN 1 ELSE 0 END) AS unpaid_open_count,
         SUM(CASE WHEN lower(coalesce(order_status, 'pending')) IN ('ready', 'served', 'billing')
                   AND lower(coalesce(payment_status, 'unpaid')) != 'paid' THEN 1 ELSE 0 END) AS billing_candidate_count
       FROM Orders
       WHERE table_id = ?`,
      [tableId],
    );
  }

  async function remove(id) {
    const result = await dbClient.run("DELETE FROM Orders WHERE order_id = ?", [id]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "Orders", "order_id");
      await reseedAutoIncrement(dbClient, "OrderDetail", "order_detail_id");
    }
    return result.changes;
  }

  return {
    listAll,
    listKitchenQueue,
    findById,
    create,
    update,
    updateTotalPrice,
    markPaid,
    getWorkflowSnapshotByTable,
    remove,
  };
}

module.exports = {
  createOrderModel,
};
