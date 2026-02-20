const path = require("path");
const os = require("os");
const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { createDatabaseClient } = require("../database/sqliteClient");
const { initializeDatabase } = require("../database/initDatabase");
const { createApiApp } = require("../server/createApiApp");

let dbFilePath = "";
let dbClient;
let app;

test.before(async () => {
  dbFilePath = path.join(os.tmpdir(), `foodflow-test-${Date.now()}.sqlite`);
  dbClient = createDatabaseClient(dbFilePath);
  await initializeDatabase(dbClient, { logger: { log: () => {} } });
  app = createApiApp(dbClient);
});

test.after(async () => {
  if (dbClient) {
    await dbClient.close();
  }
  if (dbFilePath && fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
  }
});

test("POST /login returns success for valid seeded credentials", async () => {
  const response = await request(app)
    .post("/login")
    .send({ email: "somchai@example.com", password: "password123" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.membership_id);
});

test("POST /api/tables creates a new table", async () => {
  const response = await request(app)
    .post("/api/tables")
    .send({ table_name: "VIP A", status: "open" });

  assert.equal(response.status, 201);
  assert.equal(response.body.table_name, "VIP A");
});

test("POST /orders creates an order with valid menu details", async () => {
  const response = await request(app)
    .post("/orders")
    .send({
      table_id: 1,
      order_status: "pending",
      details: [{ menu_id: 1, quantity: 2 }],
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.order_id);
  assert.equal(response.body.order_status, "pending");
});

test("POST /orders/:id/pay marks order paid and adds receipt", async () => {
  const created = await request(app)
    .post("/orders")
    .send({
      table_id: 2,
      order_status: "ready",
      details: [{ menu_id: 1, quantity: 1 }],
    });
  assert.equal(created.status, 201);
  const orderId = created.body.order_id;

  const paid = await request(app).post(`/orders/${orderId}/pay`).send({ service_charge: 10, tax: 5 });
  assert.equal(paid.status, 200);
  assert.equal(String(paid.body.payment_status).toLowerCase(), "paid");
  assert.ok(paid.body.receipt_no);

  const receipt = await request(app).get(`/orders/${orderId}/receipt`);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.body.order_id, orderId);
  assert.ok(receipt.body.grand_total >= receipt.body.subtotal);
});

test("DELETE /api/tables/:tableId blocks active unpaid table", async () => {
  const response = await request(app).delete("/api/tables/1");
  assert.equal(response.status, 409);
  assert.match(String(response.body.error || ""), /active unpaid orders/i);
});

test("POST /api/tableqr/generate replaces old QR token for same table", async () => {
  const first = await request(app).post("/api/tableqr/generate").send({ table_id: 2 });
  assert.equal(first.status, 201);
  const firstToken = first.body?.qr?.token;
  assert.ok(firstToken);

  const second = await request(app).post("/api/tableqr/generate").send({ table_id: 2 });
  assert.equal(second.status, 201);
  const secondToken = second.body?.qr?.token;
  assert.ok(secondToken);
  assert.notEqual(secondToken, firstToken);

  const firstLookup = await request(app).get(`/api/tableqr/token/${encodeURIComponent(firstToken)}`);
  assert.equal(firstLookup.status, 404);

  const rowsRes = await request(app).get("/api/tableqr");
  assert.equal(rowsRes.status, 200);
  const rows = Array.isArray(rowsRes.body) ? rowsRes.body : [];
  const table2Rows = rows.filter((row) => Number(row.table_id) === 2);
  assert.equal(table2Rows.length, 1);
  assert.equal(table2Rows[0].token, secondToken);
});
