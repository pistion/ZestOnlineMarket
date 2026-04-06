exports.up = async function up(knex) {
  await knex.schema.alterTable("orders", (table) => {
    table.string("order_number", 64).unique().nullable();
    table.string("currency", 3).notNullable().defaultTo("PGK");
    table.decimal("subtotal_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("tax_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("shipping_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("refund_amount", 12, 2).notNullable().defaultTo(0);
    table.string("payment_status", 32).notNullable().defaultTo("pending");
    table.string("payment_provider", 64).nullable();
    table.string("payment_reference", 255).nullable();
    table.string("customer_name", 160).nullable();
    table.string("customer_email", 160).nullable();
    table.string("customer_phone", 60).nullable();
    table.string("delivery_method", 80).nullable();
    table.text("delivery_address").nullable();
    table.string("delivery_city", 120).nullable();
    table.text("delivery_notes").nullable();
    table.timestamp("placed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable("order_items", (table) => {
    table.string("title_snapshot", 255).nullable();
    table.string("variant_label_snapshot", 255).nullable();
    table.string("variant_sku_snapshot", 120).nullable();
    table.decimal("line_total_amount", 12, 2).notNullable().defaultTo(0);
  });

  await knex.schema.alterTable("order_shipments", (table) => {
    table.timestamp("delivered_at", { useTz: true }).nullable();
  });

  await knex.raw("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
  await knex.raw(
    "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status in ('pending', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled'))"
  );
};

exports.down = async function down(knex) {
  await knex.raw("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
  await knex.raw(
    "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled'))"
  );

  await knex.schema.alterTable("order_shipments", (table) => {
    table.dropColumn("delivered_at");
  });

  await knex.schema.alterTable("order_items", (table) => {
    table.dropColumn("title_snapshot");
    table.dropColumn("variant_label_snapshot");
    table.dropColumn("variant_sku_snapshot");
    table.dropColumn("line_total_amount");
  });

  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("order_number");
    table.dropColumn("currency");
    table.dropColumn("subtotal_amount");
    table.dropColumn("tax_amount");
    table.dropColumn("shipping_amount");
    table.dropColumn("refund_amount");
    table.dropColumn("payment_status");
    table.dropColumn("payment_provider");
    table.dropColumn("payment_reference");
    table.dropColumn("customer_name");
    table.dropColumn("customer_email");
    table.dropColumn("customer_phone");
    table.dropColumn("delivery_method");
    table.dropColumn("delivery_address");
    table.dropColumn("delivery_city");
    table.dropColumn("delivery_notes");
    table.dropColumn("placed_at");
  });
};
