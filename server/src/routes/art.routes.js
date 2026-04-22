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
const {
  artListingBodySchema,
  artListingParamsSchema,
  artStoreHandleParamsSchema,
  artStoreSettingsBodySchema,
} = require("../schemas/art.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const sellerArtLimiter = createRateLimiter({
  scope: "seller-art-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many art studio updates. Please wait a moment and try again.",
});

router.get("/store/me", requireAuth, requireSeller, getSellerArtStore);
router.put(
  "/store/me",
  requireAuth,
  requireSeller,
  sellerArtLimiter,
  validate(artStoreSettingsBodySchema),
  saveSellerArtSettings
);
router.post(
  "/listings",
  requireAuth,
  requireSeller,
  sellerArtLimiter,
  validate(artListingBodySchema),
  createSellerArtListing
);
router.put(
  "/listings/:artListingId",
  requireAuth,
  requireSeller,
  sellerArtLimiter,
  validate({ body: artListingBodySchema, params: artListingParamsSchema }),
  updateSellerArtListing
);
router.delete(
  "/listings/:artListingId",
  requireAuth,
  requireSeller,
  sellerArtLimiter,
  validate({ params: artListingParamsSchema }),
  deleteSellerArtListing
);
router.get("/store/:handle", validate({ params: artStoreHandleParamsSchema }), getPublicArtStore);

module.exports = router;
