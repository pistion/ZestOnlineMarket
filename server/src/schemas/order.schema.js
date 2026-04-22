const {
  ORDER_STATUSES,
  createNormalizedSchema,
  normalizeChoice,
  normalizePositiveInteger,
  normalizeText,
} = require("./shared.schema");

function normalizeSellerOrderStatusPayload(body) {
  const payload = body || {};
  return {
    status: normalizeChoice(payload.status, ORDER_STATUSES, "Order status is invalid"),
    trackingNumber: normalizeText(payload.trackingNumber, 255, "Tracking number"),
    carrier: normalizeText(payload.carrier, 160, "Carrier"),
    deliveryEstimate: normalizeText(payload.deliveryEstimate, 120, "Delivery estimate"),
    refundReason: normalizeText(payload.refundReason, 300, "Refund reason"),
  };
}

const sellerOrderStatusBodySchema = createNormalizedSchema(normalizeSellerOrderStatusPayload);
const orderParamsSchema = createNormalizedSchema((params) => ({
  orderId: normalizePositiveInteger(params && params.orderId, "Order id"),
}));

module.exports = {
  orderParamsSchema,
  sellerOrderStatusBodySchema,
};
