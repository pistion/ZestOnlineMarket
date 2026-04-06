const express = require("express");

const { sellerWriteRateLimitMax, sellerWriteRateLimitWindowMs } = require("../config/env");
const { getMyStore, getStoreByHandle, saveStore } = require("../controllers/store.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");

const router = express.Router();
const sellerStoreLimiter = createRateLimiter({
  scope: "seller-store-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many store updates. Please wait a moment and try again.",
});

router.post("/", requireAuth, requireSeller, sellerStoreLimiter, saveStore);
router.get("/me", requireAuth, requireSeller, getMyStore);
router.get("/:handle", getStoreByHandle);

module.exports = router;
