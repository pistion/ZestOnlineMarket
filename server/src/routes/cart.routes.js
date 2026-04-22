const express = require("express");

const {
  writeRateLimitMax,
  writeRateLimitWindowMs,
} = require("../config/env");
const {
  destroyCart,
  destroyCartItem,
  getCart,
  patchCartItem,
  postCartItem,
} = require("../controllers/cart.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireBuyer } = require("../middleware/buyer.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const {
  buyerCartItemBodySchema,
  buyerCartItemParamsSchema,
  buyerCartItemQuantityBodySchema,
} = require("../schemas/buyer.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const cartWriteLimiter = createRateLimiter({
  scope: "buyer-cart-write",
  windowMs: writeRateLimitWindowMs,
  max: writeRateLimitMax,
  message: "Too many cart updates. Please wait a moment and try again.",
});

router.get("/", requireAuth, requireBuyer, getCart);
router.post(
  "/items",
  requireAuth,
  requireBuyer,
  cartWriteLimiter,
  validate(buyerCartItemBodySchema),
  postCartItem
);
router.patch(
  "/items/:itemId",
  requireAuth,
  requireBuyer,
  cartWriteLimiter,
  validate({
    body: buyerCartItemQuantityBodySchema,
    params: buyerCartItemParamsSchema,
  }),
  patchCartItem
);
router.delete(
  "/items/:itemId",
  requireAuth,
  requireBuyer,
  cartWriteLimiter,
  validate({ params: buyerCartItemParamsSchema }),
  destroyCartItem
);
router.delete("/", requireAuth, requireBuyer, cartWriteLimiter, destroyCart);

module.exports = router;
