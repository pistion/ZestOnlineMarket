const path = require("path");

const { databaseUrl, dbPoolMax, dbPoolMin, pgConfig } = require("./server/src/config/env");

function buildConnection() {
  if (databaseUrl) {
    const isRender = databaseUrl.includes("render.com");
    return {
      connectionString: databaseUrl,
      ssl: isRender ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
    password: pgConfig.password,
  };
}

function buildEnvironmentConfig() {
  return {
    client: "pg",
    connection: buildConnection(),
    pool: {
      min: dbPoolMin,
      max: dbPoolMax,
    },
    migrations: {
      directory: path.join(__dirname, "server", "src", "database", "migrations"),
      tableName: "knex_migrations",
    },
    seeds: {
      directory: path.join(__dirname, "server", "src", "database", "seeds"),
    },
  };
}

module.exports = {
  development: buildEnvironmentConfig(),
  staging: buildEnvironmentConfig(),
  production: buildEnvironmentConfig(),
  migration: buildEnvironmentConfig(),
};
