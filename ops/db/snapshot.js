const fs = require("fs");
const path = require("path");

const { buildSnapshotDirectory, ensureDirectory, nowIso } = require("./etl/runtime-etl/helpers");
const { paths } = require("./config");

function copyEntry(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  ensureDirectory(path.dirname(targetPath));
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
  return true;
}

function buildManifest(snapshotDir) {
  return {
    createdAt: nowIso(),
    snapshotDir,
    sources: {
      sqlite: paths.legacySqlitePath,
      uploads: paths.uploadsDir,
      demoFixtures: path.join(paths.fixturesDir, "marketplace-stalls.js"),
    },
  };
}

function run() {
  const snapshotDir = ensureDirectory(buildSnapshotDirectory());
  const copied = {
    sqlite: copyEntry(paths.legacySqlitePath, path.join(snapshotDir, "users.db")),
    uploads: copyEntry(paths.uploadsDir, path.join(snapshotDir, "uploads")),
    demoFixtures: copyEntry(
      path.join(paths.fixturesDir, "marketplace-stalls.js"),
      path.join(snapshotDir, "fixtures", "marketplace-stalls.js")
    ),
  };

  const manifest = {
    ...buildManifest(snapshotDir),
    copied,
  };

  fs.writeFileSync(
    path.join(snapshotDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  console.log(JSON.stringify(manifest, null, 2));
}

try {
  run();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
