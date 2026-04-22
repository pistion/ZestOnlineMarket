const {
  createNormalizedSchema,
  normalizeNumber,
  normalizePositiveInteger,
  normalizeText,
} = require("./shared.schema");

function normalizeReviewBodyPayload(body) {
  const payload = body || {};

  return {
    rating: normalizeNumber(payload.rating, "Rating", {
      minimum: 1,
      maximum: 5,
      fallback: 0,
    }),
    title: normalizeText(payload.title, 160, "Review title"),
    body: normalizeText(payload.body || payload.review, 1200, "Review", {
      required: true,
      minLength: 6,
    }),
  };
}

const reviewBodySchema = createNormalizedSchema(normalizeReviewBodyPayload);
const reviewProductParamsSchema = createNormalizedSchema((params) => ({
  productId: normalizePositiveInteger(params && params.productId, "Product id"),
}));
const reviewParamsSchema = createNormalizedSchema((params) => ({
  productId: normalizePositiveInteger(params && params.productId, "Product id"),
  reviewId: normalizePositiveInteger(params && params.reviewId, "Review id"),
}));

module.exports = {
  reviewBodySchema,
  reviewParamsSchema,
  reviewProductParamsSchema,
};
