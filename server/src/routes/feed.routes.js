const express = require("express");

const { sellerWriteRateLimitMax, sellerWriteRateLimitWindowMs } = require("../config/env");
const {
  createSellerFeedPost,
  deleteSellerFeedPost,
  getFeed,
  getMyStoreFeed,
  getStoreFeedByHandle,
} = require("../controllers/feed.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");

const router = express.Router();
const sellerPostLimiter = createRateLimiter({
  scope: "seller-feed-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many store post updates. Please wait a moment and try again.",
});

router.get("/", getFeed);
router.get("/store/me", requireAuth, requireSeller, getMyStoreFeed);
router.get("/store/:handle", getStoreFeedByHandle);
router.post("/store-posts", requireAuth, requireSeller, sellerPostLimiter, createSellerFeedPost);
router.delete("/store-posts/:feedItemId", requireAuth, requireSeller, sellerPostLimiter, deleteSellerFeedPost);

module.exports = router;
