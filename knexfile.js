const path = require("path");

const {
  buildConnectionConfig,
  buildPoolConfig,
} = require("./server/src/database/postgres/connection");

function buildEnvironmentConfig() {
  return {
    client: "pg",
    connection: buildConnectionConfig(),
    pool: buildPoolConfig(),
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
