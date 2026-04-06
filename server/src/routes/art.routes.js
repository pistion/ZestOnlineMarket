const express = require("express");

const {
  sellerWriteRateLimitMax,
  sellerWriteRateLimitWindowMs,
} = require("../config/env");
const {
  createSellerArtListing,
  deleteSellerArtListing,
  getPublicArtStore,
  getSellerArtStore,
  saveSellerArtSettings,
  updateSellerArtListing,
} = require("../controllers/art.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");

const router = express.Router();
const sellerArtLimiter = createRateLimiter({
  scope: "seller-art-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many art studio updates. Please wait a moment and try again.",
});

router.get("/store/me", requireAuth, requireSeller, getSellerArtStore);
router.put("/store/me", requireAuth, requireSeller, sellerArtLimiter, saveSellerArtSettings);
router.post("/listings", requireAuth, requireSeller, sellerArtLimiter, createSellerArtListing);
router.put("/listings/:artListingId", requireAuth, requireSeller, sellerArtLimiter, updateSellerArtListing);
router.delete("/listings/:artListingId", requireAuth, requireSeller, sellerArtLimiter, deleteSellerArtListing);
router.get("/store/:handle", getPublicArtStore);

module.exports = router;
