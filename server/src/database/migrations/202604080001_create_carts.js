function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("carts", (table) => {
    identityColumn(knex, table);
    table
      .bigInteger("customer_profile_id")
      .notNullable()
      .references("id")
      .inTable("customer_profiles")
      .onDelete("CASCADE");
    table.string("status", 32).notNullable().defaultTo("active");
    table.timestamp("checked_out_at", { useTz: true }).nullable();
    timestamps(table, knex);
  });

  await knex.raw(
    "CREATE UNIQUE INDEX carts_one_active_per_customer_idx ON carts (customer_profile_id) WHERE status = 'active'"
  );

  await knex.schema.createTable("cart_items", (table) => {
    identityColumn(knex, table);
    table.bigInteger("cart_id").notNullable().references("id").inTable("carts").onDelete("CASCADE");
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.bigInteger("catalog_item_id").notNullable().references("id").inTable("catalog_items").onDelete("CASCADE");
    table.bigInteger("variant_id").nullable().references("id").inTable("product_variants").onDelete("SET NULL");
    table.integer("quantity").notNullable().defaultTo(1);
    table.decimal("unit_price_snapshot", 12, 2).notNullable().defaultTo(0);
    table.decimal("shipping_amount_snapshot", 12, 2).notNullable().defaultTo(0);
    table.string("currency", 3).notNullable().defaultTo("PGK");
    table.string("title_snapshot", 255).notNullable();
    table.string("variant_label_snapshot", 255).nullable();
    table.string("variant_sku_snapshot", 120).nullable();
    table.text("image_url_snapshot").nullable();
    table.string("store_name_snapshot", 255).notNullable();
    table.string("store_handle_snapshot", 120).nullable();
    table.string("delivery_method_snapshot", 80).nullable();
    timestamps(table, knex);
    table.check("quantity > 0");
  });

  await knex.raw(
    "CREATE UNIQUE INDEX cart_items_cart_selection_idx ON cart_items (cart_id, catalog_item_id, COALESCE(variant_id, 0))"
  );
};

exports.down = async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS cart_items_cart_selection_idx");
  await knex.schema.dropTableIfExists("cart_items");
  await knex.raw("DROP INDEX IF EXISTS carts_one_active_per_customer_idx");
  await knex.schema.dropTableIfExists("carts");
};
