const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const backupsRoot = path.join(projectRoot, "backups");
const skipNames = new Set(["node_modules", ".git", "backups"]);

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function pathExists(target) {
  try {
    await fs.promises.access(target);
    return true;
  } catch (_err) {
    return false;
  }
}

async function copyProjectSnapshot(destination) {
  await fs.promises.mkdir(destination, { recursive: true });
  const entries = await fs.promises.readdir(projectRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const src = path.join(projectRoot, entry.name);
    const dest = path.join(destination, entry.name);
    await fs.promises.cp(src, dest, { recursive: true, force: true });
  }
}

async function writeManifest(destination) {
  const manifest = {
    createdAt: new Date().toISOString(),
    sourceRoot: projectRoot,
    excludes: Array.from(skipNames),
  };
  const manifestPath = path.join(destination, "backup-manifest.json");
  await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

async function backupAll() {
  const snapshotName = `project-${timestampLabel()}`;
  const destination = path.join(backupsRoot, snapshotName);

  await fs.promises.mkdir(backupsRoot, { recursive: true });
  await copyProjectSnapshot(destination);
  await writeManifest(destination);

  const dbPath = path.join(projectRoot, "database", "database.sqlite");
  const dbInBackup = path.join(destination, "database", "database.sqlite");
  const dbCopied = (await pathExists(dbPath)) && (await pathExists(dbInBackup));

  console.log(`Full backup created: ${destination}`);
  console.log(`Database included: ${dbCopied ? "yes" : "no"}`);
}

backupAll().catch((err) => {
  console.error("Full backup failed:", err);
  process.exitCode = 1;
});
