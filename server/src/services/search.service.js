const { searchProducts, searchStores } = require("../repositories/search.repository");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeSearchQuery(value) {
  const tokens = String(value || "")
    .trim()
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!tokens || !tokens.length) {
    return "";
  }

  return [...new Set(tokens)].slice(0, 8).map((token) => `${token}:*`).join(" & ");
}

function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.category ||
      filters.store ||
      toNumber(filters.minPrice || filters.min_price, 0) > 0 ||
      toNumber(filters.maxPrice || filters.max_price, 0) > 0 ||
      toNumber(filters.rating, 0) > 0
  );
}

function emptyBucket(page, limit) {
  return {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
  };
}

function withPages(bucket) {
  return {
    ...bucket,
    totalPages: bucket.total ? Math.ceil(bucket.total / bucket.limit) : 0,
  };
}

function buildSuggestions(products = [], stores = [], limit = 5) {
  const combined = [
    ...products.map((item) => ({
      kind: "product",
      id: item.id,
      title: item.title,
      subtitle: item.storeName,
      path: item.productPath,
      imageUrl: item.imageUrl,
      rank: item.searchRank || 0,
    })),
    ...stores.map((item) => ({
      kind: "store",
      id: item.id,
      title: item.title,
      subtitle: item.tagline || item.handle,
      path: item.path,
      imageUrl: item.logoUrl || item.coverUrl,
      rank: item.searchRank || 0,
    })),
  ];

  return combined
    .sort((left, right) => Number(right.rank || 0) - Number(left.rank || 0))
    .slice(0, Math.max(1, limit));
}

async function searchMarketplace(filters = {}, options = {}) {
  const page = Math.max(1, toNumber(filters.page, 1));
  const limit = Math.max(1, Math.min(24, toNumber(filters.limit, 12)));
  const normalizedQuery = String(filters.q || "").trim();
  const tsQuery = sanitizeSearchQuery(normalizedQuery);
  const activeFilters = hasActiveFilters(filters);
  const type = ["products", "stores", "all"].includes(filters.type) ? filters.type : "all";

  if (!tsQuery && !activeFilters) {
    const empty = emptyBucket(page, limit);
    return {
      query: normalizedQuery,
      type,
      suggestions: [],
      meta: {
        hasQuery: false,
        hasActiveFilters: false,
        shortQuery: normalizedQuery.length > 0 && normalizedQuery.length < 2,
      },
      products: empty,
      stores: empty,
      totalResults: 0,
    };
  }

  const effectiveFilters = {
    ...filters,
    minPrice: toNumber(filters.minPrice || filters.min_price, 0),
    maxPrice: toNumber(filters.maxPrice || filters.max_price, 0),
    rating: toNumber(filters.rating, 0),
    storeHandle: filters.store || "",
    tsQuery,
  };

  const [products, stores] = await Promise.all([
    type === "stores" ? Promise.resolve(emptyBucket(page, limit)) : searchProducts(effectiveFilters, options),
    type === "products" ? Promise.resolve(emptyBucket(page, limit)) : searchStores(effectiveFilters, options),
  ]);

  const productBucket = withPages(products);
  const storeBucket = withPages(stores);

  return {
    query: normalizedQuery,
    type,
    suggestions: buildSuggestions(productBucket.items, storeBucket.items, Math.min(limit, 5)),
    meta: {
      hasQuery: Boolean(tsQuery),
      hasActiveFilters: activeFilters,
      shortQuery: normalizedQuery.length > 0 && normalizedQuery.length < 2 && !tsQuery,
    },
    products: productBucket,
    stores: storeBucket,
    totalResults: (productBucket.total || 0) + (storeBucket.total || 0),
  };
}

module.exports = {
  searchMarketplace,
  sanitizeSearchQuery,
};
