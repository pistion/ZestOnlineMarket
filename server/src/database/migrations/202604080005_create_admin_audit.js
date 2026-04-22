function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

exports.up = async function up(knex) {
  await knex.schema.createTable("admin_actions", (table) => {
    identityColumn(knex, table);
    table
      .bigInteger("admin_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("action_type", 64).notNullable();
    table.string("target_type", 64).notNullable();
    table.bigInteger("target_id").nullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["admin_user_id", "created_at"], "admin_actions_admin_created_idx");
    table.index(["target_type", "target_id"], "admin_actions_target_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("admin_actions");
};
