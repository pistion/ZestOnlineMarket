const {
  createNormalizedSchema,
  normalizeBooleanFlag,
  normalizeChoice,
  normalizeNumber,
  normalizePositiveInteger,
  normalizeText,
} = require("./shared.schema");

const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"];

function normalizeCode(value) {
  return normalizeText(value, 64, "Discount code", {
    required: true,
    minLength: 3,
  })
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function normalizeDiscountPayload(body) {
  const payload = body || {};

  return {
    code: normalizeCode(payload.code),
    discountType: normalizeChoice(
      payload.discountType || payload.discount_type || payload.type || "percentage",
      DISCOUNT_TYPES,
      "Discount type is invalid",
      { fallback: "percentage" }
    ),
    amount: normalizeNumber(payload.amount, "Discount amount", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    minOrderAmount: normalizeNumber(payload.minOrderAmount || payload.min_order_amount, "Minimum order amount", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    maxUses:
      payload.maxUses == null || payload.maxUses === "" || payload.max_uses == null || payload.max_uses === ""
        ? null
        : normalizeNumber(payload.maxUses || payload.max_uses, "Maximum uses", {
            minimum: 1,
            maximum: 1_000_000,
            fallback: 1,
          }),
    active: normalizeBooleanFlag(payload.active, true),
    title: normalizeText(payload.title, 120, "Discount title"),
    description: normalizeText(payload.description, 400, "Discount description"),
    startsAt: normalizeText(payload.startsAt || payload.starts_at, 64, "Start date"),
    endsAt: normalizeText(payload.endsAt || payload.ends_at, 64, "End date"),
  };
}

const discountBodySchema = createNormalizedSchema(normalizeDiscountPayload);
const discountValidateBodySchema = createNormalizedSchema((body) => ({
  code: normalizeCode(body && body.code),
}));
const discountParamsSchema = createNormalizedSchema((params) => ({
  discountId: normalizePositiveInteger(params && params.discountId, "Discount id"),
}));

module.exports = {
  discountBodySchema,
  discountParamsSchema,
  discountValidateBodySchema,
};
