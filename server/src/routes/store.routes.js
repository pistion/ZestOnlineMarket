const express = require("express");

const { sellerWriteRateLimitMax, sellerWriteRateLimitWindowMs } = require("../config/env");
const { getMyStore, getStoreByHandle, saveStore } = require("../controllers/store.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");
const { storeBodySchema, storeHandleParamsSchema } = require("../schemas/store.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const sellerStoreLimiter = createRateLimiter({
  scope: "seller-store-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many store updates. Please wait a moment and try again.",
});

router.post("/", requireAuth, requireSeller, sellerStoreLimiter, validate(storeBodySchema), saveStore);
router.get("/me", requireAuth, requireSeller, getMyStore);
router.get("/:handle", validate({ params: storeHandleParamsSchema }), getStoreByHandle);

module.exports = router;
