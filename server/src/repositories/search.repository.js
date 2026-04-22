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

function mapProductResult(row) {
  return {
    kind: "product",
    id: toNumber(row.id, 0),
    storeId: toNumber(row.store_id, 0),
    title: String(row.title || "").trim(),
    description: String(row.description || "").trim(),
    price: toMoney(row.price, 0),
    delivery: String(row.delivery || "").trim(),
    location: String(row.location || "").trim(),
    itemType: String(row.item_type || "product").trim(),
    templateKey: String(row.template_key || "products").trim(),
    storeName: String(row.store_name || "").trim(),
    storeHandle: String(row.handle || "").trim(),
    storePath: row.handle ? `/stores/${encodeURIComponent(String(row.handle).trim())}` : "",
    productPath: `/products/${toNumber(row.id, 0)}`,
    imageUrl: String(row.image_url || "").trim(),
    averageRating: toMoney(row.average_rating, 0),
    reviewCount: toNumber(row.review_count, 0),
    searchRank: toMoney(row.search_rank, 0),
  };
}

function mapStoreResult(row) {
  const handle = String(row.handle || "").trim();
  return {
    kind: "store",
    id: toNumber(row.id, 0),
    title: String(row.store_name || "").trim(),
    handle,
    path: handle ? `/stores/${encodeURIComponent(handle)}` : "",
    tagline: String(row.tagline || "").trim(),
    description: String(row.description || "").trim(),
    templateKey: String(row.template_key || "products").trim(),
    coverUrl: String(row.cover_media_url || row.image_url || "").trim(),
    logoUrl: String(row.logo_media_url || "").trim(),
    followerCount: toNumber(row.follower_count, 0),
    productCount: toNumber(row.product_count, 0),
    averageRating: toMoney(row.average_rating, 0),
    reviewCount: toNumber(row.review_count, 0),
    searchRank: toMoney(row.search_rank, 0),
  };
}

function getPagination(filters = {}) {
  const page = Math.max(1, toNumber(filters.page, 1));
  const limit = Math.max(1, Math.min(24, toNumber(filters.limit, 12)));
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function buildProductQuery(knex, filters = {}) {
  const { page, limit, offset } = getPagination(filters);
  const hasTsQuery = Boolean(filters.tsQuery);
  const query = knex("catalog_items as ci")
    .join("stores as s", "s.id", "ci.store_id")
    .leftJoin(
      knex("reviews as r")
        .select(
          "r.catalog_item_id",
          knex.raw("avg(r.rating)::numeric(10, 2) as average_rating"),
          knex.raw("count(*)::int as review_count")
        )
        .groupBy("r.catalog_item_id")
        .as("review_summary"),
      "review_summary.catalog_item_id",
      "ci.id"
    )
    .select(
      "ci.id",
      "ci.store_id",
      "ci.title",
      "ci.description",
      "ci.price",
      "ci.delivery",
      "ci.location",
      "ci.item_type",
      "s.store_name",
      "s.handle",
      "s.template_key",
      knex.raw(
        "(select cm.media_url from catalog_media cm where cm.catalog_item_id = ci.id order by cm.sort_order asc, cm.id asc limit 1) as image_url"
      ),
      knex.raw("coalesce(review_summary.average_rating, 0) as average_rating"),
      knex.raw("coalesce(review_summary.review_count, 0) as review_count"),
      knex.raw(hasTsQuery ? "ts_rank(ci.search_vector, to_tsquery('simple', ?)) as search_rank" : "0 as search_rank", hasTsQuery ? [filters.tsQuery] : []),
      knex.raw("count(*) over() as total_count")
    )
    .where("ci.status", "published")
    .where("ci.visibility", "public")
    .whereRaw(
      "coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'"
    );

  if (hasTsQuery) {
    query.whereRaw("ci.search_vector @@ to_tsquery('simple', ?)", [filters.tsQuery]);
  }
  if (filters.category) {
    query.andWhere((builder) => {
      builder
        .whereRaw("lower(ci.item_type) = ?", [filters.category])
        .orWhereRaw("lower(s.template_key) = ?", [filters.category]);
    });
  }
  if (filters.storeHandle) {
    query.whereRaw("lower(s.handle) = ?", [filters.storeHandle]);
  }
  if (filters.minPrice > 0) {
    query.where("ci.price", ">=", filters.minPrice);
  }
  if (filters.maxPrice > 0) {
    query.where("ci.price", "<=", filters.maxPrice);
  }
  if (filters.rating > 0) {
    query.whereRaw("coalesce(review_summary.average_rating, 0) >= ?", [filters.rating]);
  }

  return query
    .orderBy("search_rank", "desc")
    .orderBy("ci.created_at", "desc")
    .limit(limit)
    .offset(offset)
    .then((rows) => ({
      items: rows.map(mapProductResult),
      total: rows[0] ? toNumber(rows[0].total_count, 0) : 0,
      page,
      limit,
    }));
}

function buildStoreQuery(knex, filters = {}) {
  const { page, limit, offset } = getPagination(filters);
  const hasTsQuery = Boolean(filters.tsQuery);
  const query = knex("stores as s")
    .leftJoin(
      knex("reviews as r")
        .select(
          "r.store_id",
          knex.raw("avg(r.rating)::numeric(10, 2) as average_rating"),
          knex.raw("count(*)::int as review_count")
        )
        .groupBy("r.store_id")
        .as("review_summary"),
      "review_summary.store_id",
      "s.id"
    )
    .select(
      "s.id",
      "s.store_name",
      "s.handle",
      "s.tagline",
      "s.description",
      "s.template_key",
      "s.cover_media_url",
      "s.logo_media_url",
      knex.raw(
        "(select count(*) from customer_followed_stores cfs where cfs.store_id = s.id) as follower_count"
      ),
      knex.raw(
        "(select count(*) from catalog_items ci where ci.store_id = s.id and ci.status = 'published' and ci.visibility = 'public') as product_count"
      ),
      knex.raw("coalesce(review_summary.average_rating, 0) as average_rating"),
      knex.raw("coalesce(review_summary.review_count, 0) as review_count"),
      knex.raw(hasTsQuery ? "ts_rank(s.search_vector, to_tsquery('simple', ?)) as search_rank" : "0 as search_rank", hasTsQuery ? [filters.tsQuery] : []),
      knex.raw("count(*) over() as total_count")
    )
    .whereRaw(
      "coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'"
    );

  if (hasTsQuery) {
    query.whereRaw("s.search_vector @@ to_tsquery('simple', ?)", [filters.tsQuery]);
  }
  if (filters.category) {
    query.whereRaw("lower(s.template_key) = ?", [filters.category]);
  }
  if (filters.storeHandle) {
    query.whereRaw("lower(s.handle) = ?", [filters.storeHandle]);
  }
  if (filters.rating > 0) {
    query.whereRaw("coalesce(review_summary.average_rating, 0) >= ?", [filters.rating]);
  }

  return query
    .orderBy("search_rank", "desc")
    .orderBy("s.published_at", "desc")
    .limit(limit)
    .offset(offset)
    .then((rows) => ({
      items: rows.map(mapStoreResult),
      total: rows[0] ? toNumber(rows[0].total_count, 0) : 0,
      page,
      limit,
    }));
}

async function searchProducts(filters = {}, options = {}) {
  const knex = getPostgresExecutor(options);
  return buildProductQuery(knex, filters);
}

async function searchStores(filters = {}, options = {}) {
  const knex = getPostgresExecutor(options);
  return buildStoreQuery(knex, filters);
}

module.exports = {
  searchProducts,
  searchStores,
};
