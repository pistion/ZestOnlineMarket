function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

exports.up = async function up(knex) {
  await knex.schema.createTable("feed_items", (table) => {
    identityColumn(knex, table);
    table.string("type", 32).notNullable();
    table.bigInteger("catalog_item_id").nullable().references("id").inTable("catalog_items").onDelete("SET NULL");
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.jsonb("payload").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check("type in ('product_published', 'announcement', 'promo')");
  });

  await knex.schema.createTable("feed_reactions", (table) => {
    identityColumn(knex, table);
    table.bigInteger("feed_item_id").notNullable().references("id").inTable("feed_items").onDelete("CASCADE");
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.string("type", 32).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["feed_item_id", "customer_profile_id", "type"]);
  });

  await knex.schema.createTable("comments", (table) => {
    identityColumn(knex, table);
    table.string("target_type", 32).notNullable();
    table.bigInteger("target_id").notNullable();
    table.bigInteger("author_user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.bigInteger("parent_comment_id").nullable().references("id").inTable("comments").onDelete("CASCADE");
    table.text("body").notNullable();
    table.string("visibility_status", 32).notNullable().defaultTo("visible");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("likes", (table) => {
    identityColumn(knex, table);
    table.string("target_type", 32).notNullable();
    table.bigInteger("target_id").notNullable();
    table.bigInteger("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["target_type", "target_id", "user_id"]);
  });

  await knex.schema.createTable("shares", (table) => {
    identityColumn(knex, table);
    table.string("target_type", 32).notNullable();
    table.bigInteger("target_id").notNullable();
    table.bigInteger("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("destination", 120).nullable();
    table.string("method", 120).nullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("shares");
  await knex.schema.dropTableIfExists("likes");
  await knex.schema.dropTableIfExists("comments");
  await knex.schema.dropTableIfExists("feed_reactions");
  await knex.schema.dropTableIfExists("feed_items");
};
