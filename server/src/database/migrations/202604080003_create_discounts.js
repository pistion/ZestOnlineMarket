function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("discounts", (table) => {
    identityColumn(knex, table);
    table
      .bigInteger("store_id")
      .notNullable()
      .references("id")
      .inTable("stores")
      .onDelete("CASCADE");
    table.string("code", 64).notNullable();
    table.string("discount_type", 32).notNullable().defaultTo("percentage");
    table.decimal("amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("min_order_amount", 12, 2).notNullable().defaultTo(0);
    table.integer("max_uses").nullable();
    table.integer("use_count").notNullable().defaultTo(0);
    table.boolean("active").notNullable().defaultTo(true);
    table.string("title", 120).nullable();
    table.text("description").nullable();
    table.timestamp("starts_at", { useTz: true }).nullable();
    table.timestamp("ends_at", { useTz: true }).nullable();
    timestamps(table, knex);

    table.index(["store_id", "active"], "discounts_store_active_idx");
    table.check("discount_type in ('percentage', 'fixed', 'free_shipping')");
    table.check("amount >= 0");
    table.check("min_order_amount >= 0");
    table.check("max_uses is null or max_uses >= 1");
    table.check("use_count >= 0");
  });

  await knex.raw("CREATE UNIQUE INDEX discounts_code_unique_idx ON discounts (lower(code))");

  await knex.schema.createTable("order_discounts", (table) => {
    identityColumn(knex, table);
    table
      .bigInteger("order_id")
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");
    table
      .bigInteger("discount_id")
      .nullable()
      .references("id")
      .inTable("discounts")
      .onDelete("SET NULL");
    table.string("code_snapshot", 64).notNullable();
    table.string("discount_type", 32).notNullable();
    table.decimal("amount_applied", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["order_id"], "order_discounts_order_idx");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("order_discounts");
  await knex.raw("DROP INDEX IF EXISTS discounts_code_unique_idx");
  await knex.schema.dropTableIfExists("discounts");
};
