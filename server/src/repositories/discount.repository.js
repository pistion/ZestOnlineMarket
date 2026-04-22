const { getPostgresExecutor } = require("./repository-source");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapDiscountRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0),
    storeId: toNumber(row.store_id, 0),
    code: String(row.code || "").trim(),
    discountType: String(row.discount_type || "percentage").trim(),
    amount: toMoney(row.amount, 0),
    minOrderAmount: toMoney(row.min_order_amount, 0),
    maxUses: row.max_uses == null ? null : toNumber(row.max_uses, 0),
    useCount: toNumber(row.use_count, 0),
    active: Boolean(row.active),
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function findByCode(code, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("discounts")
    .whereRaw("lower(code) = lower(?)", [code])
    .first();

  return mapDiscountRow(row);
}

async function listByStore(storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("discounts")
    .where({ store_id: storeId })
    .orderBy("created_at", "desc");

  return rows.map(mapDiscountRow);
}

async function create(storeId, discount, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("discounts")
    .insert({
      store_id: storeId,
      code: discount.code,
      discount_type: discount.discountType,
      amount: discount.amount,
      min_order_amount: discount.minOrderAmount,
      max_uses: discount.maxUses,
      active: discount.active,
      title: discount.title || null,
      description: discount.description || null,
      starts_at: discount.startsAt || null,
      ends_at: discount.endsAt || null,
    })
    .returning(["id"]);

  return findByIdForStore(toNumber(row && row.id, 0), storeId, options);
}

async function findByIdForStore(discountId, storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("discounts")
    .where({
      id: discountId,
      store_id: storeId,
    })
    .first();

  return mapDiscountRow(row);
}

async function update(discountId, storeId, discount, options = {}) {
  const knex = getPostgresExecutor(options);
  await knex("discounts")
    .where({
      id: discountId,
      store_id: storeId,
    })
    .update({
      code: discount.code,
      discount_type: discount.discountType,
      amount: discount.amount,
      min_order_amount: discount.minOrderAmount,
      max_uses: discount.maxUses,
      active: discount.active,
      title: discount.title || null,
      description: discount.description || null,
      starts_at: discount.startsAt || null,
      ends_at: discount.endsAt || null,
      updated_at: knex.fn.now(),
    });

  return findByIdForStore(discountId, storeId, options);
}

async function incrementUseCount(discountId, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("discounts")
    .where({ id: discountId })
    .where((builder) => {
      builder.whereNull("max_uses").orWhereRaw("use_count < max_uses");
    })
    .update({
      use_count: knex.raw("use_count + 1"),
      updated_at: knex.fn.now(),
    })
    .returning(["id", "use_count"]);

  return row
    ? {
        id: toNumber(row.id, 0),
        useCount: toNumber(row.use_count, 0),
      }
    : null;
}

async function createOrderDiscountRecord(payload, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("order_discounts")
    .insert({
      order_id: payload.orderId,
      discount_id: payload.discountId || null,
      code_snapshot: payload.codeSnapshot,
      discount_type: payload.discountType,
      amount_applied: payload.amountApplied,
    })
    .returning(["id"]);

  return {
    id: toNumber(row && row.id, 0),
  };
}

module.exports = {
  create,
  createOrderDiscountRecord,
  findByCode,
  findByIdForStore,
  incrementUseCount,
  listByStore,
  update,
};
