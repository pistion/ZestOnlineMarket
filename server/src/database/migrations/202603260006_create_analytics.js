function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

exports.up = async function up(knex) {
  await knex.schema.createTable("traffic_events", (table) => {
    identityColumn(knex, table);
    table.string("source", 64).nullable();
    table.string("session_id", 255).notNullable();
    table.text("user_agent").nullable();
    table.timestamp("timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("interaction_events", (table) => {
    identityColumn(knex, table);
    table.bigInteger("catalog_item_id").nullable().references("id").inTable("catalog_items").onDelete("SET NULL");
    table.string("event_type", 64).notNullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("conversion_events", (table) => {
    identityColumn(knex, table);
    table.string("funnel_stage", 64).notNullable();
    table.string("session_id", 255).nullable();
    table.bigInteger("order_id").nullable().references("id").inTable("orders").onDelete("SET NULL");
    table.timestamp("timestamp", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("analytics_summaries", (table) => {
    identityColumn(knex, table);
    table.bigInteger("store_id").nullable().references("id").inTable("stores").onDelete("SET NULL");
    table.integer("total_visits").notNullable().defaultTo(0);
    table.decimal("conversion_rate", 8, 4).notNullable().defaultTo(0);
    table.jsonb("best_selling_products").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.decimal("average_order_value", 12, 2).notNullable().defaultTo(0);
    table.decimal("repeat_customer_rate", 8, 4).notNullable().defaultTo(0);
    table.timestamp("generated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("analytics_summaries");
  await knex.schema.dropTableIfExists("conversion_events");
  await knex.schema.dropTableIfExists("interaction_events");
  await knex.schema.dropTableIfExists("traffic_events");
};
