const CREATE_TABLES_SQL = [
  `
    CREATE TABLE IF NOT EXISTS Menu (
      menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_name TEXT NOT NULL,
      category_name TEXT,
      price REAL NOT NULL,
      stock INTEGER,
      tags TEXT,
      status TEXT DEFAULT 'available',
      image_path TEXT
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS DiningTable (
      table_id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS Membership (
      membership_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_name TEXT,
      member_lastname TEXT,
      phone TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      salt TEXT,
      tier TEXT DEFAULT 'basic',
      points INTEGER DEFAULT 0,
      created_at TEXT,
      active INTEGER DEFAULT 1
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS Orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      membership_id INTEGER,
      order_date TEXT,
      total_price REAL DEFAULT 0,
      order_status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      receipt_no TEXT,
      service_charge REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      FOREIGN KEY(table_id) REFERENCES DiningTable(table_id) ON DELETE SET NULL,
      FOREIGN KEY(membership_id) REFERENCES Membership(membership_id) ON DELETE SET NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS OrderDetail (
      order_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      menu_id INTEGER,
      quantity INTEGER DEFAULT 1,
      sub_total REAL DEFAULT 0,
      FOREIGN KEY(order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY(menu_id) REFERENCES Menu(menu_id) ON DELETE SET NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS TableQR (
      token TEXT PRIMARY KEY,
      table_id INTEGER,
      created_at TEXT,
      expires_at TEXT,
      used INTEGER DEFAULT 0
    );
  `,
];

async function ensureSchema(dbClient) {
  await dbClient.run("PRAGMA foreign_keys = ON;");
  for (const sql of CREATE_TABLES_SQL) {
    await dbClient.run(sql);
  }

  const columns = await dbClient.all("PRAGMA table_info(Menu)");
  const hasImagePath = Array.isArray(columns) && columns.some((col) => col && col.name === "image_path");
  if (!hasImagePath) {
    await dbClient.run("ALTER TABLE Menu ADD COLUMN image_path TEXT");
  }

  const orderColumns = await dbClient.all("PRAGMA table_info(Orders)");
  const orderColumnSet = new Set((orderColumns || []).map((col) => col && col.name));
  if (!orderColumnSet.has("payment_status")) {
    await dbClient.run("ALTER TABLE Orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  }
  if (!orderColumnSet.has("paid_at")) {
    await dbClient.run("ALTER TABLE Orders ADD COLUMN paid_at TEXT");
  }
  if (!orderColumnSet.has("receipt_no")) {
    await dbClient.run("ALTER TABLE Orders ADD COLUMN receipt_no TEXT");
  }
  if (!orderColumnSet.has("service_charge")) {
    await dbClient.run("ALTER TABLE Orders ADD COLUMN service_charge REAL DEFAULT 0");
  }
  if (!orderColumnSet.has("tax")) {
    await dbClient.run("ALTER TABLE Orders ADD COLUMN tax REAL DEFAULT 0");
  }
}

module.exports = {
  ensureSchema,
};
