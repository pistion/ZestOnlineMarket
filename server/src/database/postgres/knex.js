const path = require("path");

const { databaseUrl, pgConfig } = require("../../config/env");

let knexInstance = null;

function requireKnexRuntime() {
  try {
    return require("knex");
  } catch (error) {
    throw new Error(
      "PostgreSQL tooling is not installed. Run `npm install` in the project root to add `knex` and `pg`."
    );
  }
}

function buildConnectionConfig() {
  if (databaseUrl) {
    return databaseUrl;
  }

  return {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
    password: pgConfig.password,
  };
}

function createKnexInstance() {
  const knex = requireKnexRuntime();
  return knex({
    client: "pg",
    connection: buildConnectionConfig(),
    pool: {
      min: 0,
      max: 10,
    },
    migrations: {
      directory: path.join(__dirname, "..", "migrations"),
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(__dirname, "..", "seeds"),
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
  if (options.validate !== false) {
    await knex.raw("select 1");
  }

  return knex;
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
  withPostgresTransaction,
};
