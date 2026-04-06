function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("catalog_items", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.string("item_type", 32).notNullable();
    table.string("title", 255).notNullable();
    table.text("description").nullable();
    table.string("status", 32).notNullable().defaultTo("published");
    table.string("visibility", 32).notNullable().defaultTo("public");
    table.decimal("price", 12, 2).notNullable().defaultTo(0);
    table.string("location", 160).nullable();
    table.text("delivery").nullable();
    table.decimal("transport_fee", 12, 2).notNullable().defaultTo(0);
    timestamps(table, knex);
    table.check("item_type in ('product', 'service', 'course', 'music', 'digital_good')");
    table.check("status in ('draft', 'published', 'archived')");
    table.check("visibility in ('public', 'unlisted', 'private')");
    table.index(["store_id", "status"]);
    table.index(["store_id", "created_at"]);
  });

  await knex.schema.createTable("catalog_media", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.bigInteger("catalog_item_id").notNullable().references("id").inTable("catalog_items").onDelete("CASCADE");
    table.text("media_url").notNullable();
    table.string("media_type", 32).notNullable().defaultTo("image");
    table.boolean("is_cover").notNullable().defaultTo(false);
    table.integer("sort_order").notNullable().defaultTo(0);
    timestamps(table, knex);
    table.index(["catalog_item_id", "sort_order"]);
  });

  await knex.schema.createTable("product_variants", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.bigInteger("catalog_item_id").notNullable().references("id").inTable("catalog_items").onDelete("CASCADE");
    table.string("sku", 120).nullable();
    table.jsonb("attributes").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.decimal("price_override", 12, 2).nullable();
    table.integer("stock_quantity").notNullable().defaultTo(0);
    timestamps(table, knex);
    table.unique(["catalog_item_id", "sku"]);
  });

  await knex.schema.createTable("inventory_items", (table) => {
    identityColumn(knex, table);
    table.bigInteger("catalog_item_id").notNullable().references("id").inTable("catalog_items").onDelete("CASCADE");
    table.bigInteger("variant_id").nullable().references("id").inTable("product_variants").onDelete("CASCADE");
    table.integer("total_on_hand").notNullable().defaultTo(0);
    table.string("location", 160).nullable();
    timestamps(table, knex);
    table.unique(["catalog_item_id", "variant_id"]);
  });

  await knex.schema.createTable("inventory_logs", (table) => {
    identityColumn(knex, table);
    table.bigInteger("inventory_item_id").notNullable().references("id").inTable("inventory_items").onDelete("CASCADE");
    table.string("adjustment_type", 32).notNullable();
    table.integer("quantity_change").notNullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.check("adjustment_type in ('sale', 'restock', 'refund', 'manual')");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("inventory_logs");
  await knex.schema.dropTableIfExists("inventory_items");
  await knex.schema.dropTableIfExists("product_variants");
  await knex.schema.dropTableIfExists("catalog_media");
  await knex.schema.dropTableIfExists("catalog_items");
};
