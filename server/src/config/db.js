const postgres = require("../database/postgres/knex");
const { dbRunMigrationsOnStartup } = require("./env");

function legacySqliteUnavailable() {
  throw new Error("Legacy SQLite access has been moved to ops/db and is not available in the live runtime.");
}

async function initDb() {
  await postgres.initPostgresConnection({
    runMigrations: dbRunMigrationsOnStartup,
    validate: true,
  });
}

async function transaction(work) {
  return postgres.withPostgresTransaction(work);
}

module.exports = {
  all: legacySqliteUnavailable,
  get: legacySqliteUnavailable,
  getPostgresKnex: postgres.getPostgresKnex,
  initDb,
  run: legacySqliteUnavailable,
  transaction,
  withPostgresTransaction: postgres.withPostgresTransaction,
};
