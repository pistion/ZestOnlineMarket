const express = require("express");

const {
  orderRateLimitMax,
  orderRateLimitWindowMs,
  sellerWriteRateLimitMax,
  sellerWriteRateLimitWindowMs,
} = require("../config/env");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");
const { getSellerWorkspace } = require("../controllers/seller.controller");
const {
  getSellerOrderDetail,
  getSellerOrders,
  patchSellerOrder,
} = require("../controllers/commerce.controller");
const { saveStoreDraft, updateStoreVisibility } = require("../controllers/store.controller");

const router = express.Router();
const sellerWriteLimiter = createRateLimiter({
  scope: "seller-workspace-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many seller workspace updates. Please wait a moment and try again.",
});
const sellerOrderLimiter = createRateLimiter({
  scope: "seller-order-write",
  windowMs: orderRateLimitWindowMs,
  max: orderRateLimitMax,
  message: "Too many order updates. Please wait a moment and try again.",
});

router.get("/me", requireAuth, requireSeller, getSellerWorkspace);
router.get("/orders", requireAuth, requireSeller, getSellerOrders);
router.get("/orders/:orderId", requireAuth, requireSeller, getSellerOrderDetail);
router.patch("/orders/:orderId", requireAuth, requireSeller, sellerOrderLimiter, patchSellerOrder);
router.put("/store/draft", requireAuth, requireSeller, sellerWriteLimiter, saveStoreDraft);
router.patch("/store/visibility", requireAuth, requireSeller, sellerWriteLimiter, updateStoreVisibility);

module.exports = router;
