function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("orders", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.string("status", 32).notNullable().defaultTo("pending");
    table.decimal("total_amount", 12, 2).notNullable().defaultTo(0);
    timestamps(table, knex);
    table.check("status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')");
  });

  await knex.schema.createTable("order_items", (table) => {
    identityColumn(knex, table);
    table.bigInteger("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.bigInteger("catalog_item_id").nullable().references("id").inTable("catalog_items").onDelete("SET NULL");
    table.bigInteger("variant_id").nullable().references("id").inTable("product_variants").onDelete("SET NULL");
    table.integer("quantity").notNullable().defaultTo(1);
    table.decimal("unit_price_snapshot", 12, 2).notNullable().defaultTo(0);
    timestamps(table, knex);
  });

  await knex.schema.createTable("order_payments", (table) => {
    identityColumn(knex, table);
    table.bigInteger("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.string("provider", 64).notNullable();
    table.string("transaction_reference", 255).nullable();
    table.decimal("amount", 12, 2).notNullable().defaultTo(0);
    table.string("currency", 3).notNullable().defaultTo("PGK");
    table.string("status", 32).notNullable().defaultTo("pending");
    timestamps(table, knex);
  });

  await knex.schema.createTable("refunds", (table) => {
    identityColumn(knex, table);
    table.bigInteger("order_payment_id").notNullable().references("id").inTable("order_payments").onDelete("CASCADE");
    table.decimal("refund_amount", 12, 2).notNullable().defaultTo(0);
    table.text("reason").nullable();
    table.string("payment_reference", 255).nullable();
    table.string("status", 32).notNullable().defaultTo("pending");
    timestamps(table, knex);
  });

  await knex.schema.createTable("order_shipments", (table) => {
    identityColumn(knex, table);
    table.bigInteger("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.string("tracking_number", 255).nullable();
    table.string("carrier", 160).nullable();
    table.timestamp("shipped_at", { useTz: true }).nullable();
    table.timestamp("delivery_estimate", { useTz: true }).nullable();
    timestamps(table, knex);
  });

  await knex.schema.createTable("sales_transactions", (table) => {
    identityColumn(knex, table);
    table.bigInteger("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.decimal("gross_amount", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("revenue_reports", (table) => {
    identityColumn(knex, table);
    table.string("period", 32).notNullable();
    table.decimal("gross_sales", 12, 2).notNullable().defaultTo(0);
    table.decimal("net_sales", 12, 2).notNullable().defaultTo(0);
    table.decimal("refunds", 12, 2).notNullable().defaultTo(0);
    table.decimal("profit_estimate", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("debts", (table) => {
    identityColumn(knex, table);
    table.bigInteger("customer_profile_id").notNullable().references("id").inTable("customer_profiles").onDelete("CASCADE");
    table.decimal("principal_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("interest_rate", 8, 4).notNullable().defaultTo(0);
    table.string("status", 32).notNullable().defaultTo("open");
    timestamps(table, knex);
  });

  await knex.schema.createTable("debt_payments", (table) => {
    identityColumn(knex, table);
    table.bigInteger("debt_id").notNullable().references("id").inTable("debts").onDelete("CASCADE");
    table.decimal("amount", 12, 2).notNullable().defaultTo(0);
    table.timestamp("paid_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string("method", 120).nullable();
    timestamps(table, knex);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("debt_payments");
  await knex.schema.dropTableIfExists("debts");
  await knex.schema.dropTableIfExists("revenue_reports");
  await knex.schema.dropTableIfExists("sales_transactions");
  await knex.schema.dropTableIfExists("order_shipments");
  await knex.schema.dropTableIfExists("refunds");
  await knex.schema.dropTableIfExists("order_payments");
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
};
