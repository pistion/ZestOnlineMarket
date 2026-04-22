const { getPostgresExecutor } = require("./repository-source");

const CART_TAX_RATE = 0.1;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Number((Number(value || 0) || 0).toFixed(2));
}

function mapCartRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0),
    customerProfileId: toNumber(row.customer_profile_id || row.customerProfileId, 0) || null,
    status: String(row.status || "active").trim() || "active",
    checkedOutAt: row.checked_out_at || row.checkedOutAt || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function mapCartItem(row) {
  const quantity = Math.max(1, toNumber(row.quantity, 1));
  const unitPrice = roundMoney(row.unit_price_snapshot || row.unitPriceSnapshot);
  const shippingAmount = roundMoney(row.shipping_amount_snapshot || row.shippingAmountSnapshot);
  const lineSubtotal = roundMoney(unitPrice * quantity);
  const lineTax = roundMoney(lineSubtotal * CART_TAX_RATE);
  const lineTotal = roundMoney(lineSubtotal + lineTax + shippingAmount);

  return {
    id: toNumber(row.id, 0),
    cartId: toNumber(row.cart_id || row.cartId, 0) || null,
    storeId: toNumber(row.store_id || row.storeId, 0) || null,
    productId: toNumber(row.catalog_item_id || row.catalogItemId, 0) || null,
    variantId: toNumber(row.variant_id || row.variantId, 0) || null,
    quantity,
    unitPrice,
    shippingAmount,
    lineSubtotal,
    lineTax,
    lineTotal,
    currency: String(row.currency || "PGK").trim() || "PGK",
    title: String(row.title_snapshot || row.title || "Cart item").trim(),
    variantLabel: String(row.variant_label_snapshot || row.variantLabel || "").trim(),
    variantSku: String(row.variant_sku_snapshot || row.variantSku || "").trim(),
    imageUrl: String(row.image_url_snapshot || row.imageUrl || "").trim(),
    storeName: String(row.store_name_snapshot || row.store_name || row.storeName || "").trim(),
    storeHandle: String(row.store_handle_snapshot || row.handle || row.storeHandle || "").trim(),
    deliveryMethod: String(row.delivery_method_snapshot || row.deliveryMethod || "").trim(),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function summarizeCart(cart, items = []) {
  const totals = items.reduce(
    (summary, item) => ({
      subtotalAmount: roundMoney(summary.subtotalAmount + item.lineSubtotal),
      taxAmount: roundMoney(summary.taxAmount + item.lineTax),
      shippingAmount: roundMoney(summary.shippingAmount + item.shippingAmount),
      totalAmount: roundMoney(summary.totalAmount + item.lineTotal),
    }),
    {
      subtotalAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 0,
    }
  );

  return {
    ...cart,
    currency: items[0] ? items[0].currency : "PGK",
    itemCount: items.reduce((count, item) => count + Math.max(1, toNumber(item.quantity, 1)), 0),
    lineItemCount: items.length,
    subtotalAmount: totals.subtotalAmount,
    taxAmount: totals.taxAmount,
    shippingAmount: totals.shippingAmount,
    totalAmount: totals.totalAmount,
    items,
  };
}

async function getOrCreateCart(customerProfileId, options = {}) {
  const knex = getPostgresExecutor(options);
  const existing = await knex("carts")
    .select("id", "customer_profile_id", "status", "checked_out_at", "created_at", "updated_at")
    .where({
      customer_profile_id: customerProfileId,
      status: "active",
    })
    .first();

  if (existing) {
    return mapCartRow(existing);
  }

  const [created] = await knex("carts")
    .insert({
      customer_profile_id: customerProfileId,
      status: "active",
    })
    .returning(["id", "customer_profile_id", "status", "checked_out_at", "created_at", "updated_at"]);

  return mapCartRow(created);
}

async function findCartItem(cartId, itemId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("cart_items")
    .select("*")
    .where({
      cart_id: cartId,
      id: itemId,
    })
    .first();

  return row ? mapCartItem(row) : null;
}

async function findCartItemBySelection(cartId, productId, variantId, options = {}) {
  const knex = getPostgresExecutor(options);
  const query = knex("cart_items")
    .select("*")
    .where({
      cart_id: cartId,
      catalog_item_id: productId,
    });

  if (variantId) {
    query.andWhere({ variant_id: variantId });
  } else {
    query.whereNull("variant_id");
  }

  const row = await query.first();
  return row ? mapCartItem(row) : null;
}

async function addItem(cartId, payload, options = {}) {
  const knex = getPostgresExecutor(options);
  const [created] = await knex("cart_items")
    .insert({
      cart_id: cartId,
      store_id: payload.storeId,
      catalog_item_id: payload.productId,
      variant_id: payload.variantId || null,
      quantity: payload.quantity,
      unit_price_snapshot: payload.unitPrice,
      shipping_amount_snapshot: payload.shippingAmount,
      currency: payload.currency || "PGK",
      title_snapshot: payload.title,
      variant_label_snapshot: payload.variantLabel || null,
      variant_sku_snapshot: payload.variantSku || null,
      image_url_snapshot: payload.imageUrl || null,
      store_name_snapshot: payload.storeName,
      store_handle_snapshot: payload.storeHandle || null,
      delivery_method_snapshot: payload.deliveryMethod || null,
    })
    .returning(["id"]);

  return findCartItem(cartId, created && created.id, options);
}

async function updateItemQty(cartId, itemId, quantity, options = {}) {
  const knex = getPostgresExecutor(options);
  await knex("cart_items")
    .where({
      cart_id: cartId,
      id: itemId,
    })
    .update({
      quantity,
      updated_at: knex.fn.now(),
    });

  return findCartItem(cartId, itemId, options);
}

async function removeItem(cartId, itemId, options = {}) {
  const knex = getPostgresExecutor(options);
  const removed = await knex("cart_items")
    .where({
      cart_id: cartId,
      id: itemId,
    })
    .del();

  return removed > 0;
}

async function removeItems(cartId, itemIds = [], options = {}) {
  const normalizedIds = [...new Set(itemIds.map((value) => toNumber(value, 0)).filter(Boolean))];
  if (!normalizedIds.length) {
    return 0;
  }

  const knex = getPostgresExecutor(options);
  return knex("cart_items")
    .where({ cart_id: cartId })
    .whereIn("id", normalizedIds)
    .del();
}

async function clearCart(cartId, options = {}) {
  const knex = getPostgresExecutor(options);
  return knex("cart_items")
    .where({ cart_id: cartId })
    .del();
}

async function getCartWithTotals(customerProfileId, options = {}) {
  const knex = getPostgresExecutor(options);
  const cart = await getOrCreateCart(customerProfileId, options);
  const rows = await knex("cart_items as ci")
    .leftJoin("stores as s", "s.id", "ci.store_id")
    .select(
      "ci.id",
      "ci.cart_id",
      "ci.store_id",
      "ci.catalog_item_id",
      "ci.variant_id",
      "ci.quantity",
      "ci.unit_price_snapshot",
      "ci.shipping_amount_snapshot",
      "ci.currency",
      "ci.title_snapshot",
      "ci.variant_label_snapshot",
      "ci.variant_sku_snapshot",
      "ci.image_url_snapshot",
      "ci.store_name_snapshot",
      "ci.store_handle_snapshot",
      "ci.delivery_method_snapshot",
      "ci.created_at",
      "ci.updated_at",
      "s.store_name",
      "s.handle"
    )
    .where("ci.cart_id", cart.id)
    .orderBy("ci.created_at", "asc")
    .orderBy("ci.id", "asc");

  const items = rows.map((row) => mapCartItem(row));
  return summarizeCart(cart, items);
}

module.exports = {
  addItem,
  clearCart,
  findCartItem,
  findCartItemBySelection,
  getCartWithTotals,
  getOrCreateCart,
  removeItem,
  removeItems,
  updateItemQty,
};
