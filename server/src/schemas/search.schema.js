const {
  createNormalizedSchema,
  normalizeChoice,
  normalizeHandle,
  normalizeNumber,
  normalizeText,
} = require("./shared.schema");

const SEARCH_TYPES = ["products", "stores", "all"];

function normalizeSearchQueryPayload(query) {
  const payload = query || {};
  const normalizedQuery = normalizeText(payload.q || payload.query, 120, "Search query");

  return {
    q: normalizedQuery,
    type: normalizeChoice(payload.type || "all", SEARCH_TYPES, "Search type is invalid", {
      fallback: "all",
    }),
    page: normalizeNumber(payload.page, "Page", {
      minimum: 1,
      maximum: 500,
      fallback: 1,
    }),
    limit: normalizeNumber(payload.limit, "Limit", {
      minimum: 1,
      maximum: 24,
      fallback: 12,
    }),
    category: normalizeText(payload.category, 64, "Category")
      .toLowerCase()
      .replace(/\s+/g, "_"),
    store: payload.store ? normalizeHandle(payload.store) : "",
    minPrice: normalizeNumber(payload.min_price || payload.minPrice, "Minimum price", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    maxPrice: normalizeNumber(payload.max_price || payload.maxPrice, "Maximum price", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    rating: normalizeNumber(payload.rating, "Minimum rating", {
      minimum: 0,
      maximum: 5,
      fallback: 0,
    }),
  };
}

const searchQuerySchema = createNormalizedSchema(normalizeSearchQueryPayload);

module.exports = {
  searchQuerySchema,
};
