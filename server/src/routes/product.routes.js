const express = require("express");

const { featureReviewsEnabled, sellerWriteRateLimitMax, sellerWriteRateLimitWindowMs } = require("../config/env");
const {
  createSellerProduct,
  deleteSellerProduct,
  getProductDetail,
  listProducts,
  updateSellerProduct,
} = require("../controllers/product.controller");
const { destroyProductReview, getProductReviews, postProductReview } = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireBuyer } = require("../middleware/buyer.middleware");
const { requireSeller } = require("../middleware/seller.middleware");
const { productBodySchema, productParamsSchema } = require("../schemas/product.schema");
const { reviewBodySchema, reviewParamsSchema, reviewProductParamsSchema } = require("../schemas/review.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const sellerProductLimiter = createRateLimiter({
  scope: "seller-product-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many listing updates. Please wait a moment and try again.",
});
const reviewWriteLimiter = createRateLimiter({
  scope: "buyer-review-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many review updates. Please wait a moment and try again.",
});
const reviewFeatureMiddleware = featureReviewsEnabled
  ? [(req, res, next) => next()]
  : [
      (_req, _res, next) => {
        next(Object.assign(new Error("Reviews are disabled"), { status: 404 }));
      },
    ];

router.get("/", listProducts);
router.post("/", requireAuth, requireSeller, sellerProductLimiter, validate(productBodySchema), createSellerProduct);
router.get(
  "/:productId/reviews",
  ...reviewFeatureMiddleware,
  validate({ params: reviewProductParamsSchema }),
  getProductReviews
);
router.post(
  "/:productId/reviews",
  ...reviewFeatureMiddleware,
  requireAuth,
  requireBuyer,
  reviewWriteLimiter,
  validate({ body: reviewBodySchema, params: reviewProductParamsSchema }),
  postProductReview
);
router.delete(
  "/:productId/reviews/:reviewId",
  ...reviewFeatureMiddleware,
  requireAuth,
  reviewWriteLimiter,
  validate({ params: reviewParamsSchema }),
  destroyProductReview
);
router.get("/:productId", validate({ params: productParamsSchema }), getProductDetail);
router.put(
  "/:productId",
  requireAuth,
  requireSeller,
  sellerProductLimiter,
  validate({ body: productBodySchema, params: productParamsSchema }),
  updateSellerProduct
);
router.delete(
  "/:productId",
  requireAuth,
  requireSeller,
  sellerProductLimiter,
  validate({ params: productParamsSchema }),
  deleteSellerProduct
);

module.exports = router;
