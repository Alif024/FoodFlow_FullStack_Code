const crypto = require("crypto");

async function seedDiningTables(dbClient) {
  const count = await dbClient.get("SELECT COUNT(*) as c FROM DiningTable");
  if (!count || count.c !== 0) return;

  const now = new Date().toISOString();
  await dbClient.run(
    "INSERT INTO DiningTable (table_id, table_name, status, created_at) VALUES (1, 'Table 1', 'open', ?)",
    [now],
  );
  await dbClient.run(
    "INSERT INTO DiningTable (table_id, table_name, status, created_at) VALUES (2, 'Table 2', 'open', ?)",
    [now],
  );
}

async function seedMenus(dbClient) {
  const count = await dbClient.get("SELECT COUNT(*) as c FROM Menu");
  if (!count || count.c !== 0) return;

  await dbClient.run(
    "INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)",
    ["Pad Thai", "Noodles", 60, "available"],
  );
  await dbClient.run(
    "INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)",
    ["Green Curry", "Curry", 80, "available"],
  );
  await dbClient.run(
    "INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)",
    ["Mango Sticky Rice", "Dessert", 50, "available"],
  );
}

async function seedMemberships(dbClient) {
  const count = await dbClient.get("SELECT COUNT(*) as c FROM Membership");
  if (!count || count.c !== 0) return;

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync("password123", salt, 100000, 64, "sha512").toString("hex");
  const now = new Date().toISOString();

  await dbClient.run(
    "INSERT INTO Membership (member_name, member_lastname, phone, email, password_hash, salt, created_at) VALUES (?,?,?,?,?,?,?)",
    ["Somchai", "Sukjai", "0812345678", "somchai@example.com", hash, salt, now],
  );
  await dbClient.run(
    "INSERT INTO Membership (member_name, member_lastname, phone, email, password_hash, salt, created_at) VALUES (?,?,?,?,?,?,?)",
    ["Suda", "Deejai", "0898765432", "suda@example.com", hash, salt, now],
  );
}

async function seedOrders(dbClient) {
  const count = await dbClient.get("SELECT COUNT(*) as c FROM Orders");
  if (!count || count.c !== 0) return;

  const now = new Date().toISOString();
  const orderRes = await dbClient.run(
    "INSERT INTO Orders (table_id, membership_id, order_date, total_price, order_status) VALUES (?,?,?,?,?)",
    [1, 1, now, 0, "confirmed"],
  );
  const orderId = orderRes.lastID;

  const pad = await dbClient.get("SELECT menu_id, price FROM Menu WHERE menu_name = ?", ["Pad Thai"]);
  const mango = await dbClient.get("SELECT menu_id, price FROM Menu WHERE menu_name = ?", ["Mango Sticky Rice"]);
  if (!pad || !mango) return;

  const sub1 = pad.price * 2;
  const sub2 = mango.price;
  await dbClient.run(
    "INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)",
    [orderId, pad.menu_id, 2, sub1],
  );
  await dbClient.run(
    "INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)",
    [orderId, mango.menu_id, 1, sub2],
  );
  await dbClient.run("UPDATE Orders SET total_price = ? WHERE order_id = ?", [sub1 + sub2, orderId]);
}

async function seedInitialData(dbClient) {
  await seedDiningTables(dbClient);
  await seedMenus(dbClient);
  await seedMemberships(dbClient);
  await seedOrders(dbClient);
}

module.exports = {
  seedInitialData,
};
