const { getPostgresKnex } = require("../database/postgres/knex");

function getPostgresExecutor(options = {}) {
  if (options.transaction && options.transaction.trx) {
    return options.transaction.trx;
  }

  return getPostgresKnex();
}

function resolveIdentitySource() {
  return "postgres";
}

function resolveCatalogSource() {
  return "postgres";
}

function resolveStoreWriteSource() {
  return "postgres";
}

module.exports = {
  getPostgresExecutor,
  resolveCatalogSource,
  resolveIdentitySource,
  resolveStoreWriteSource,
};
