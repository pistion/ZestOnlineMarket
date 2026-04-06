const RENAMED_MIGRATIONS = [
  {
    oldName: "202604040001_expand_orders_for_commerce_engine.js",
    newName: "202604040002_expand_orders_for_commerce_engine.js",
  },
  {
    oldName: "202604040002_create_request_rate_limits.js",
    newName: "202604040003_create_request_rate_limits.js",
  },
];

async function repairMigrationHistory(knex) {
  const hasTable = await knex.schema.hasTable("knex_migrations");
  if (!hasTable) {
    return [];
  }

  const applied = await knex("knex_migrations").select("name");
  const appliedNames = new Set(applied.map((row) => row.name));
  const repaired = [];

  for (const rename of RENAMED_MIGRATIONS) {
    if (!appliedNames.has(rename.oldName) || appliedNames.has(rename.newName)) {
      continue;
    }

    await knex("knex_migrations").where({ name: rename.oldName }).update({ name: rename.newName });
    repaired.push(rename);
  }

  return repaired;
}

module.exports = {
  RENAMED_MIGRATIONS,
  repairMigrationHistory,
};
