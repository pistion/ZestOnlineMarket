const {
  FEED_SCOPES,
  assertModeratedPublicText,
  createNormalizedSchema,
  normalizeChoice,
  normalizeFeedPostImages,
  normalizeHandle,
  normalizeNumber,
  normalizePositiveInteger,
  normalizeText,
} = require("./shared.schema");

function normalizeFeedQueryPayload(query) {
  const payload = query || {};
  const scope = normalizeChoice(payload.scope, FEED_SCOPES, "", {
    fallback: "all",
  });

  return {
    page: normalizeNumber(payload.page, "Feed page", {
      minimum: 1,
      maximum: 200,
      fallback: 1,
    }),
    limit: normalizeNumber(payload.limit, "Feed limit", {
      minimum: 1,
      maximum: 12,
      fallback: 6,
    }),
    scope,
    query: normalizeText(payload.q || payload.query, 120, "Feed search"),
  };
}

function deriveFeedPostTitle(title, description) {
  const normalizedTitle = normalizeText(title, 120, "Update headline");
  if (normalizedTitle) {
    return {
      title: normalizedTitle,
      hasExplicitTitle: true,
    };
  }

  const compactDescription = String(description || "").replace(/\s+/g, " ").trim();
  const derivedTitle =
    compactDescription.length > 72
      ? `${compactDescription.slice(0, 69).trimEnd()}...`
      : compactDescription;

  return {
    title: derivedTitle || "Store update",
    hasExplicitTitle: false,
  };
}

function normalizeStoreFeedPostPayload(body) {
  const payload = body || {};
  const type = normalizeChoice(
    payload.type,
    ["announcement", "promo", "live_drop"],
    "Update type must be announcement, promo, or live drop"
  );
  const description = normalizeText(payload.description, 600, "Update details", {
    required: true,
    minLength: 3,
  });
  const derived = deriveFeedPostTitle(payload.title, description);

  return {
    type,
    title: assertModeratedPublicText(derived.title, "Update headline"),
    hasExplicitTitle: derived.hasExplicitTitle,
    description: assertModeratedPublicText(description, "Update details", {
      maxLinks: 2,
    }),
    catalogItemId: normalizeNumber(payload.catalogItemId || payload.productId, "Linked listing id", {
      minimum: 0,
      fallback: 0,
    }),
    images: normalizeFeedPostImages(payload.images),
  };
}

const feedQuerySchema = createNormalizedSchema(normalizeFeedQueryPayload);
const storeFeedPostBodySchema = createNormalizedSchema(normalizeStoreFeedPostPayload);
const feedStoreHandleParamsSchema = createNormalizedSchema((params) => ({
  handle: normalizeHandle(params && params.handle),
}));
const feedItemParamsSchema = createNormalizedSchema((params) => ({
  feedItemId: normalizePositiveInteger(params && params.feedItemId, "Store update id"),
}));

module.exports = {
  feedItemParamsSchema,
  feedQuerySchema,
  feedStoreHandleParamsSchema,
  normalizeFeedQueryPayload,
  normalizeStoreFeedPostPayload,
  storeFeedPostBodySchema,
};
