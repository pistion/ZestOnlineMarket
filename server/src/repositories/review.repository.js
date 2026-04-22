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

function mapReviewRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0),
    productId: toNumber(row.catalog_item_id || row.product_id, 0),
    storeId: toNumber(row.store_id, 0),
    orderId: toNumber(row.order_id, 0) || null,
    rating: toNumber(row.rating, 0),
    title: String(row.title || "").trim(),
    body: String(row.body || "").trim(),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    reviewerName: String(row.reviewer_name || "Buyer").trim(),
    reviewerInitials: String(row.reviewer_initials || "").trim(),
    reviewerAvatarUrl: String(row.reviewer_avatar_url || "").trim(),
    isOwner: Boolean(row.is_owner),
  };
}

function buildRatingBreakdown(rows = []) {
  const breakdown = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  rows.forEach((row) => {
    const rating = toNumber(row.rating_value, 0);
    if (breakdown[rating] != null) {
      breakdown[rating] = toNumber(row.rating_count, 0);
    }
  });

  return breakdown;
}

async function listReviews(catalogItemId, pagination = {}, options = {}) {
  const knex = getPostgresExecutor(options);
  const page = Math.max(1, toNumber(pagination.page, 1));
  const limit = Math.max(1, Math.min(50, toNumber(pagination.limit, 12)));
  const offset = (page - 1) * limit;

  const rows = await knex("reviews as r")
    .leftJoin("customer_profiles as cp", "cp.id", "r.customer_profile_id")
    .leftJoin("users as u", "u.id", "cp.user_id")
    .select(
      "r.*",
      knex.raw("count(*) over() as total_count"),
      knex.raw(
        "coalesce(nullif(cp.full_name, ''), nullif(u.full_name, ''), split_part(coalesce(u.email, cp.email, 'buyer@example.com'), '@', 1), 'Buyer') as reviewer_name"
      ),
      knex.raw("coalesce(cp.avatar_url, u.avatar_media_url, '') as reviewer_avatar_url"),
      knex.raw(
        "upper(left(split_part(coalesce(nullif(cp.full_name, ''), nullif(u.full_name, ''), split_part(coalesce(u.email, cp.email, 'buyer@example.com'), '@', 1)), ' ', 1), 1) || left(split_part(regexp_replace(coalesce(nullif(cp.full_name, ''), nullif(u.full_name, ''), split_part(coalesce(u.email, cp.email, 'buyer@example.com'), '@', 1)), '^\\S+\\s*', ''), ' ', 1), 1)) as reviewer_initials"
      )
    )
    .where("r.catalog_item_id", catalogItemId)
    .orderBy("r.created_at", "desc")
    .limit(limit)
    .offset(offset);

  const total = rows[0] ? toNumber(rows[0].total_count, 0) : 0;
  return {
    items: rows.map(mapReviewRow),
    page,
    limit,
    total,
    totalPages: total ? Math.ceil(total / limit) : 0,
  };
}

async function getAverageRating(catalogItemId, options = {}) {
  const knex = getPostgresExecutor(options);
  const [summaryRow] = await knex("reviews")
    .where({ catalog_item_id: catalogItemId })
    .select(
      knex.raw("coalesce(avg(rating)::numeric(10, 2), 0) as average_rating"),
      knex.raw("count(*)::int as review_count")
    );

  const breakdownRows = await knex("reviews")
    .where({ catalog_item_id: catalogItemId })
    .select(knex.raw("rating as rating_value"), knex.raw("count(*)::int as rating_count"))
    .groupBy("rating")
    .orderBy("rating", "asc");

  return {
    averageRating: toMoney(summaryRow && summaryRow.average_rating, 0),
    reviewCount: toNumber(summaryRow && summaryRow.review_count, 0),
    breakdown: buildRatingBreakdown(breakdownRows),
  };
}

async function findReviewByCustomerProfileAndProductId(customerProfileId, catalogItemId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("reviews")
    .where({
      customer_profile_id: customerProfileId,
      catalog_item_id: catalogItemId,
    })
    .first();

  return mapReviewRow(row);
}

async function findDeliveredPurchaseForReview(customerProfileId, catalogItemId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("orders as o")
    .join("order_items as oi", "oi.order_id", "o.id")
    .select("o.id", "o.placed_at", "o.status")
    .where("o.customer_profile_id", customerProfileId)
    .where("oi.catalog_item_id", catalogItemId)
    .where("o.status", "delivered")
    .orderBy("o.placed_at", "desc")
    .first();

  return row
    ? {
        orderId: toNumber(row.id, 0),
        placedAt: row.placed_at || null,
        status: String(row.status || "").trim(),
      }
    : null;
}

async function createReview(input, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("reviews")
    .insert({
      customer_profile_id: input.customerProfileId,
      store_id: input.storeId,
      catalog_item_id: input.catalogItemId,
      order_id: input.orderId || null,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
    })
    .returning(["id"]);

  const createdId = toNumber(row && row.id, 0);
  const created = await knex("reviews").where({ id: createdId }).first();
  return mapReviewRow(created);
}

async function deleteReview(reviewId, customerProfileId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("reviews")
    .where({ id: reviewId, customer_profile_id: customerProfileId })
    .first();

  if (!row) {
    return null;
  }

  await knex("reviews").where({ id: reviewId }).del();
  return mapReviewRow(row);
}

async function deleteReviewById(reviewId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("reviews")
    .where({ id: reviewId })
    .first();

  if (!row) {
    return null;
  }

  await knex("reviews").where({ id: reviewId }).del();
  return mapReviewRow(row);
}

module.exports = {
  createReview,
  deleteReview,
  deleteReviewById,
  findDeliveredPurchaseForReview,
  findReviewByCustomerProfileAndProductId,
  getAverageRating,
  listReviews,
};
