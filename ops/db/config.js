const path = require("path");

const runtimeEnv = require("../../server/src/config/env");

const projectRoot = path.resolve(__dirname, "..", "..");
const legacySqlitePath = process.env.LEGACY_SQLITE_PATH
  ? path.resolve(projectRoot, process.env.LEGACY_SQLITE_PATH)
  : path.join(projectRoot, "reference", "sqlite", "users.db");
const snapshotRoot = process.env.SNAPSHOT_ROOT
  ? path.resolve(projectRoot, process.env.SNAPSHOT_ROOT)
  : path.join(projectRoot, "reference", "migration-snapshots");

const paths = {
  ...runtimeEnv.paths,
  projectRoot,
  legacySqlitePath,
  snapshotRoot,
  opsRoot: path.join(projectRoot, "ops"),
};

module.exports = {
  databaseUrl: runtimeEnv.databaseUrl,
  pgConfig: runtimeEnv.pgConfig,
  paths,
};
