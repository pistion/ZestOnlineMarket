function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("reviews", (table) => {
    identityColumn(knex, table);
    table
      .bigInteger("customer_profile_id")
      .notNullable()
      .references("id")
      .inTable("customer_profiles")
      .onDelete("CASCADE");
    table
      .bigInteger("store_id")
      .notNullable()
      .references("id")
      .inTable("stores")
      .onDelete("CASCADE");
    table
      .bigInteger("catalog_item_id")
      .notNullable()
      .references("id")
      .inTable("catalog_items")
      .onDelete("CASCADE");
    table
      .bigInteger("order_id")
      .nullable()
      .references("id")
      .inTable("orders")
      .onDelete("SET NULL");
    table.integer("rating").notNullable();
    table.string("title", 160).nullable();
    table.text("body").notNullable();
    timestamps(table, knex);

    table.unique(["customer_profile_id", "catalog_item_id"]);
    table.index(["catalog_item_id", "created_at"], "reviews_catalog_item_created_idx");
    table.index(["store_id", "created_at"], "reviews_store_created_idx");
    table.check("rating between 1 and 5");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("reviews");
};
