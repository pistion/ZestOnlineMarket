function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("customer_addresses", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.string("address_type", 32).notNullable();
    table.text("address_line_1").notNullable();
    table.text("address_line_2").nullable();
    table.string("city", 120).nullable();
    table.string("region", 120).nullable();
    table.string("postal_code", 32).nullable();
    table.string("country_code", 3).nullable();
    timestamps(table, knex);
    table.check("address_type in ('billing', 'shipping')");
  });

  await knex.schema.createTable("customer_preferences", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().unique().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.jsonb("popular_categories").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("viewed_products").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb("interaction_summary").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    timestamps(table, knex);
  });

  await knex.schema.createTable("customer_followed_stores", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["customer_profile_id", "store_id"]);
  });

  await knex.schema.createTable("wishlists", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.bigInteger("catalog_item_id").notNullable().references("id").inTable("catalog_items").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["customer_profile_id", "catalog_item_id"]);
  });

  await knex.schema.createTable("complaints_refunds", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.bigInteger("order_id").nullable();
    table.text("description").notNullable();
    table.string("resolution_status", 32).notNullable().defaultTo("open");
    timestamps(table, knex);
    table.check("resolution_status in ('open', 'reviewing', 'resolved', 'rejected')");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("complaints_refunds");
  await knex.schema.dropTableIfExists("wishlists");
  await knex.schema.dropTableIfExists("customer_followed_stores");
  await knex.schema.dropTableIfExists("customer_preferences");
  await knex.schema.dropTableIfExists("customer_addresses");
};
