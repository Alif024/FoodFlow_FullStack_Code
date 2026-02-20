const fs = require("fs");
const path = require("path");

const dbFile = require("../database/dbFile");

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backup() {
  const source = path.resolve(dbFile);
  const backupDir = path.join(process.cwd(), "backups");
  const backupFile = path.join(backupDir, `database-${timestampLabel()}.sqlite`);

  if (!fs.existsSync(source)) {
    console.error(`Database file not found: ${source}`);
    process.exitCode = 1;
    return;
  }

  await fs.promises.mkdir(backupDir, { recursive: true });
  await fs.promises.copyFile(source, backupFile);
  console.log(`Backup created: ${backupFile}`);
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exitCode = 1;
});
