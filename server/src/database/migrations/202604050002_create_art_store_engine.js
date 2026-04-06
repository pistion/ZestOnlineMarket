exports.up = async function up(knex) {
  await knex.schema.createTable("art_store_settings", (table) => {
    table.increments("id").primary();
    table
      .integer("store_id")
      .notNullable()
      .references("id")
      .inTable("stores")
      .onDelete("CASCADE")
      .unique();
    table.string("studio_headline", 255).nullable();
    table.text("artist_statement").nullable();
    table.jsonb("featured_mediums").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.text("commission_policy").nullable();
    table.string("contact_email", 160).nullable();
    table.boolean("commission_open").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("art_listings", (table) => {
    table.increments("id").primary();
    table
      .integer("store_id")
      .notNullable()
      .references("id")
      .inTable("stores")
      .onDelete("CASCADE");
    table
      .integer("catalog_item_id")
      .nullable()
      .references("id")
      .inTable("catalog_items")
      .onDelete("CASCADE")
      .unique();
    table.string("medium", 80).nullable();
    table.string("art_category", 80).nullable();
    table.string("collection_name", 120).nullable();
    table.boolean("featured").notNullable().defaultTo(false);
    table.boolean("commission_open").notNullable().defaultTo(false);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["store_id"], "art_listings_store_id_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("art_listings");
  await knex.schema.dropTableIfExists("art_store_settings");
};
