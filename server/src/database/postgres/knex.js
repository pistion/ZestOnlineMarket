const path = require("path");

const { dbConnectRetries, dbConnectRetryDelayMs } = require("../../config/env");
const { logInfo, logWarn } = require("../../utils/logger");
const {
  buildConnectionConfig,
  buildPoolConfig,
  resolveKnexEnvironment,
} = require("./connection");

let knexInstance = null;
const migrationsDirectory = path.join(__dirname, "..", "migrations");
const seedsDirectory = path.join(__dirname, "..", "seeds");
const projectRoot = path.resolve(__dirname, "..", "..", "..", "..");

function requireKnexRuntime() {
  try {
    return require("knex");
  } catch (error) {
    throw new Error(
      "PostgreSQL tooling is not installed. Run `npm install` in the project root to add `knex` and `pg`."
    );
  }
}

function buildMigrationConfig() {
  return {
    directory: migrationsDirectory,
    tableName: "knex_migrations",
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function repairMigrationHistoryIfNeeded(knex) {
  try {
    const repairModule = require(path.join(projectRoot, "ops", "db", "repair-migration-history"));
    if (!repairModule || typeof repairModule.repairMigrationHistory !== "function") {
      return [];
    }

    return repairModule.repairMigrationHistory(knex);
  } catch (error) {
    logWarn("db.migration_history_repair_skipped", {
      message: error && error.message ? error.message : String(error),
    });
    return [];
  }
}

async function runPendingMigrations(knex) {
  const repaired = await repairMigrationHistoryIfNeeded(knex);
  const envName = resolveKnexEnvironment();
  const [batchNo, migrations] = await knex.migrate.latest(buildMigrationConfig());

  logInfo("db.migrations_ready", {
    env: envName,
    batchNo,
    repaired: repaired.length,
    applied: migrations.length,
  });

  return {
    batchNo,
    migrations,
    repaired,
  };
}

function createKnexInstance() {
  const knex = requireKnexRuntime();
  return knex({
    client: "pg",
    connection: buildConnectionConfig(),
    pool: buildPoolConfig(),
    migrations: buildMigrationConfig(),
    seeds: {
      directory: seedsDirectory,
    },
  });
}

function getPostgresKnex() {
  if (!knexInstance) {
    knexInstance = createKnexInstance();
  }

  return knexInstance;
}

async function initPostgresConnection(options = {}) {
  const knex = getPostgresKnex();

  const validate = options.validate !== false;
  const runMigrations = options.runMigrations === true;
  const retries = Number.isInteger(options.retries) ? options.retries : dbConnectRetries;
  const retryDelayMs = Number.isInteger(options.retryDelayMs)
    ? options.retryDelayMs
    : dbConnectRetryDelayMs;

  let attempt = 0;
  while (true) {
    try {
      if (validate) {
        await knex.raw("select 1");
      }
      if (runMigrations) {
        await runPendingMigrations(knex);
      }

      return knex;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }

      attempt += 1;
      logWarn("db.connection_retry", {
        attempt,
        retries,
        retryDelayMs,
        message: error && error.message ? error.message : String(error),
      });
      await wait(retryDelayMs);
    }
  }
}

async function destroyPostgresKnex() {
  if (!knexInstance) {
    return;
  }

  await knexInstance.destroy();
  knexInstance = null;
}

async function withPostgresTransaction(work) {
  const knex = await initPostgresConnection();
  return knex.transaction(async (trx) => work({ provider: "postgres", trx }));
}

module.exports = {
  destroyPostgresKnex,
  getPostgresKnex,
  initPostgresConnection,
  runPendingMigrations,
  withPostgresTransaction,
};
