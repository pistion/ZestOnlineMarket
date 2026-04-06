const express = require("express");

const {
  orderRateLimitMax,
  orderRateLimitWindowMs,
  writeRateLimitMax,
  writeRateLimitWindowMs,
} = require("../config/env");
const {
  deleteBuyerFollowing,
  deleteBuyerWishlist,
  destroyBuyerAddress,
  getBuyerAddresses,
  getBuyerFeed,
  getBuyerFollowing,
  getBuyerMe,
  getBuyerPurchases,
  getBuyerRecentlyViewed,
  getBuyerSettings,
  getBuyerWishlist,
  patchBuyerAddress,
  patchBuyerSettings,
  postBuyerAddress,
  postBuyerFollowing,
  postBuyerInteraction,
  postBuyerWishlist,
  saveBuyerProfile,
} = require("../controllers/buyer.controller");
const {
  getBuyerCheckoutSummary,
  getBuyerOrderDetail,
  getBuyerOrders,
  postBuyerCheckoutOrder,
} = require("../controllers/commerce.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { attachBuyerProfile, requireBuyer } = require("../middleware/buyer.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");

const router = express.Router();
const buyerWriteLimiter = createRateLimiter({
  scope: "buyer-write",
  windowMs: writeRateLimitWindowMs,
  max: writeRateLimitMax,
  message: "Too many buyer updates. Please wait a moment and try again.",
});
const buyerInteractionLimiter = createRateLimiter({
  scope: "buyer-interaction",
  windowMs: writeRateLimitWindowMs,
  max: writeRateLimitMax,
  message: "Too many interaction events. Please slow down and try again.",
});
const buyerOrderLimiter = createRateLimiter({
  scope: "buyer-order",
  windowMs: orderRateLimitWindowMs,
  max: orderRateLimitMax,
  message: "Too many checkout attempts. Please wait a bit before placing another order.",
});

router.post("/interactions", buyerInteractionLimiter, postBuyerInteraction);
router.get("/me", requireAuth, requireBuyer, getBuyerMe);
router.get("/feed", requireAuth, requireBuyer, getBuyerFeed);
router.get("/following", requireAuth, requireBuyer, getBuyerFollowing);
router.get("/purchases", requireAuth, requireBuyer, getBuyerPurchases);
router.get("/settings", requireAuth, requireBuyer, getBuyerSettings);
router.patch("/settings", requireAuth, requireBuyer, buyerWriteLimiter, attachBuyerProfile, patchBuyerSettings);
router.get("/addresses", requireAuth, requireBuyer, getBuyerAddresses);
router.post("/addresses", requireAuth, requireBuyer, buyerWriteLimiter, postBuyerAddress);
router.patch("/addresses/:addressId", requireAuth, requireBuyer, buyerWriteLimiter, patchBuyerAddress);
router.delete("/addresses/:addressId", requireAuth, requireBuyer, buyerWriteLimiter, destroyBuyerAddress);
router.get("/wishlist", requireAuth, requireBuyer, getBuyerWishlist);
router.post("/wishlist", requireAuth, requireBuyer, buyerWriteLimiter, postBuyerWishlist);
router.delete("/wishlist/:productId", requireAuth, requireBuyer, buyerWriteLimiter, deleteBuyerWishlist);
router.get("/recently-viewed", requireAuth, requireBuyer, getBuyerRecentlyViewed);
router.get("/checkout/summary", requireAuth, requireBuyer, getBuyerCheckoutSummary);
router.post("/checkout/orders", requireAuth, requireBuyer, buyerOrderLimiter, postBuyerCheckoutOrder);
router.get("/orders", requireAuth, requireBuyer, getBuyerOrders);
router.get("/orders/:orderId", requireAuth, requireBuyer, getBuyerOrderDetail);
router.post("/profile", requireAuth, requireBuyer, buyerWriteLimiter, attachBuyerProfile, saveBuyerProfile);
router.post("/following/:handle", requireAuth, requireBuyer, buyerWriteLimiter, postBuyerFollowing);
router.delete("/following/:handle", requireAuth, requireBuyer, buyerWriteLimiter, deleteBuyerFollowing);

module.exports = router;
