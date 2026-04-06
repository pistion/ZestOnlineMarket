exports.up = async function up(knex) {
  await knex.schema.createTable("request_rate_limits", (table) => {
    table.increments("id").primary();
    table.string("scope", 80).notNullable();
    table.string("bucket_key", 255).notNullable();
    table.integer("request_count").notNullable().defaultTo(1);
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["scope", "bucket_key"], "request_rate_limits_scope_key_unique");
    table.index(["expires_at"], "request_rate_limits_expires_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("request_rate_limits");
};
