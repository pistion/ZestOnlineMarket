const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateBuyerInteractionPayload,
  validateBuyerWishlistPayload,
  validateContentReportPayload,
} = require("../../server/src/utils/request-validation");

test("validateBuyerInteractionPayload normalizes safe interaction input", () => {
  const payload = validateBuyerInteractionPayload({
    action: "View Product",
    source: "Marketplace Card",
    storeHandle: "@Test-Store",
    templateKey: "products",
    itemType: "Product",
    catalogItemId: 12,
  });

  assert.equal(payload.action, "view_product");
  assert.equal(payload.source, "marketplace-card");
  assert.equal(payload.storeHandle, "test-store");
  assert.equal(payload.templateKey, "products");
  assert.equal(payload.itemType, "product");
  assert.equal(payload.catalogItemId, 12);
});

test("validateContentReportPayload rejects unsupported reasons", () => {
  assert.throws(
    () =>
      validateContentReportPayload({
        targetType: "store",
        targetId: 5,
        reason: "fake",
        details: "This should not pass validation.",
      }),
    /Report reason/
  );
});

test("validateBuyerWishlistPayload requires a positive product id", () => {
  const payload = validateBuyerWishlistPayload({ productId: 42 });
  assert.equal(payload.productId, 42);
});
