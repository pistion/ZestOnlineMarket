const fs = require("fs");
const path = require("path");

const {
  createReadOnlyLegacySqliteClient,
} = require("../../legacy/runtime-legacy/sqlite-client");
const { getPostgresKnex, initPostgresConnection } = require("../../../../server/src/database/postgres/knex");
const { paths } = require("../../config");

function nowIso() {
  return new Date().toISOString();
}

function toJson(value, fallback = {}) {
  try {
    return JSON.stringify(value == null ? fallback : value);
  } catch (error) {
    return JSON.stringify(fallback);
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, "\"\"")}"`;
}

function resolveColumnList(data) {
  return Object.keys(data).filter((key) => data[key] !== undefined);
}

async function openLegacyReader() {
  return createReadOnlyLegacySqliteClient(paths.legacySqlitePath);
}

async function closeReader(reader) {
  if (reader && typeof reader.close === "function") {
    await reader.close();
  }
}

async function openPostgres() {
  await initPostgresConnection();
  return getPostgresKnex();
}

async function createMigrationRun(knex, { name, stage, metadata = {} }) {
  const [row] = await knex("migration_runs")
    .insert({
      name,
      stage,
      status: "running",
      metadata,
    })
    .returning(["id"]);

  return toNumber(row.id);
}

async function completeMigrationRun(knex, runId, { status = "completed", metadata = {} } = {}) {
  await knex("migration_runs")
    .where({ id: runId })
    .update({
      status,
      metadata,
      completed_at: knex.fn.now(),
    });
}

async function recordMigrationMapping(knex, runId, entityType, legacyId, newId, naturalKey = null) {
  await knex("migration_mappings").insert({
    run_id: runId,
    entity_type: entityType,
    legacy_id: legacyId == null ? null : toNumber(legacyId, legacyId),
    new_id: newId == null ? null : toNumber(newId, newId),
    natural_key: naturalKey,
  });
}

async function recordMigrationFailure(knex, runId, entityType, legacyId, stage, message, payload = {}) {
  await knex("migration_failures").insert({
    run_id: runId,
    entity_type: entityType,
    legacy_id: legacyId == null ? null : toNumber(legacyId, legacyId),
    stage,
    message: String(message || "Unknown migration failure"),
    payload,
  });
}

function buildUpsertSql(tableName, data, conflictColumns, updateColumns) {
  const columns = resolveColumnList(data);
  const placeholders = columns.map(() => "?").join(", ");
  const quotedColumns = columns.map(quoteIdentifier).join(", ");
  const conflictClause = conflictColumns.map(quoteIdentifier).join(", ");
  const assignments = updateColumns.length
    ? updateColumns
        .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
        .join(", ")
    : null;

  const sql =
    `insert into ${quoteIdentifier(tableName)} (${quotedColumns}) overriding system value values (${placeholders}) ` +
    `on conflict (${conflictClause}) do ${assignments ? `update set ${assignments}` : "nothing"}`;

  return {
    sql,
    bindings: columns.map((column) => data[column]),
  };
}

async function upsertLegacyIdentityRow(knex, tableName, data, conflictColumns, options = {}) {
  const columns = resolveColumnList(data);
  const updateColumns = (options.updateColumns || columns).filter(
    (column) => !["id", "created_at", ...conflictColumns].includes(column)
  );
  const { sql, bindings } = buildUpsertSql(tableName, data, conflictColumns, updateColumns);
  await knex.raw(sql, bindings);
}

async function insertRow(knex, tableName, data) {
  return knex(tableName).insert(data);
}

async function syncIdentitySequence(knex, tableName, columnName = "id") {
  await knex.raw(
    `select setval(
      pg_get_serial_sequence(?, ?),
      coalesce((select max(${quoteIdentifier(columnName)}) from ${quoteIdentifier(tableName)}), 1),
      exists(select 1 from ${quoteIdentifier(tableName)})
    )`,
    [tableName, columnName]
  );
}

function sanitizeSnapshotSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildSnapshotDirectory(rootDir = paths.snapshotRoot) {
  const stamp = sanitizeSnapshotSegment(nowIso().replace(/[:.]/g, "-")) || "snapshot";
  return path.join(rootDir, stamp);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

module.exports = {
  buildSnapshotDirectory,
  closeReader,
  completeMigrationRun,
  createMigrationRun,
  ensureDirectory,
  insertRow,
  nowIso,
  openLegacyReader,
  openPostgres,
  recordMigrationFailure,
  recordMigrationMapping,
  syncIdentitySequence,
  toJson,
  toNumber,
  upsertLegacyIdentityRow,
};
