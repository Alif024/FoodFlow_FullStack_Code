function assertSafeIdentifier(identifier, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid ${label}`);
  }
}

async function reseedAutoIncrement(dbClient, tableName, idColumn) {
  assertSafeIdentifier(tableName, "table name");
  assertSafeIdentifier(idColumn, "column name");

  const row = await dbClient.get(`SELECT COALESCE(MAX(${idColumn}), 0) AS max_id FROM ${tableName}`);
  const maxId = Number(row?.max_id) || 0;
  const existing = await dbClient.get("SELECT name FROM sqlite_sequence WHERE name = ?", [tableName]);

  if (maxId <= 0) {
    await dbClient.run("DELETE FROM sqlite_sequence WHERE name = ?", [tableName]);
    return;
  }

  if (existing) {
    await dbClient.run("UPDATE sqlite_sequence SET seq = ? WHERE name = ?", [maxId, tableName]);
    return;
  }

  await dbClient.run("INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)", [tableName, maxId]);
}

module.exports = {
  reseedAutoIncrement,
};
