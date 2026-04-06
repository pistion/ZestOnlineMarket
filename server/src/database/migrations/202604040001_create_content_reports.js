exports.up = async function up(knex) {
  await knex.schema.createTable("content_reports", (table) => {
    table.increments("id").primary();
    table.string("target_type", 32).notNullable();
    table.integer("target_id").notNullable();
    table
      .integer("reporter_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("reason", 32).notNullable();
    table.text("details").notNullable();
    table.string("status", 24).notNullable().defaultTo("open");
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["target_type", "target_id"], "content_reports_target_idx");
    table.index(["reporter_user_id", "status"], "content_reports_reporter_status_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("content_reports");
};
