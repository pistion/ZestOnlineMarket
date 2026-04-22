const express = require("express");

const {
  sellerWriteRateLimitMax,
  sellerWriteRateLimitWindowMs,
  writeRateLimitMax,
  writeRateLimitWindowMs,
} = require("../config/env");
const {
  getSellerDiscounts,
  patchSellerDiscount,
  postDiscountValidate,
  postSellerDiscount,
} = require("../controllers/discount.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireBuyer } = require("../middleware/buyer.middleware");
const { requireSeller } = require("../middleware/seller.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { discountBodySchema, discountParamsSchema, discountValidateBodySchema } = require("../schemas/discount.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const discountWriteLimiter = createRateLimiter({
  scope: "seller-discount-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many discount updates. Please wait a moment and try again.",
});
const discountPreviewLimiter = createRateLimiter({
  scope: "buyer-discount-validate",
  windowMs: writeRateLimitWindowMs,
  max: writeRateLimitMax,
  message: "Too many discount previews. Please wait a moment and try again.",
});

router.post(
  "/validate",
  requireAuth,
  requireBuyer,
  discountPreviewLimiter,
  validate(discountValidateBodySchema),
  postDiscountValidate
);
router.get("/", requireAuth, requireSeller, getSellerDiscounts);
router.post("/", requireAuth, requireSeller, discountWriteLimiter, validate(discountBodySchema), postSellerDiscount);
router.patch(
  "/:discountId",
  requireAuth,
  requireSeller,
  discountWriteLimiter,
  validate({ body: discountBodySchema, params: discountParamsSchema }),
  patchSellerDiscount
);

module.exports = router;
