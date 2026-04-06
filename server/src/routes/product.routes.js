const express = require("express");

const { sellerWriteRateLimitMax, sellerWriteRateLimitWindowMs } = require("../config/env");
const {
  createSellerProduct,
  deleteSellerProduct,
  getProductDetail,
  listProducts,
  updateSellerProduct,
} = require("../controllers/product.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { requireSeller } = require("../middleware/seller.middleware");

const router = express.Router();
const sellerProductLimiter = createRateLimiter({
  scope: "seller-product-write",
  windowMs: sellerWriteRateLimitWindowMs,
  max: sellerWriteRateLimitMax,
  message: "Too many listing updates. Please wait a moment and try again.",
});

router.get("/", listProducts);
router.post("/", requireAuth, requireSeller, sellerProductLimiter, createSellerProduct);
router.get("/:productId", getProductDetail);
router.put("/:productId", requireAuth, requireSeller, sellerProductLimiter, updateSellerProduct);
router.delete("/:productId", requireAuth, requireSeller, sellerProductLimiter, deleteSellerProduct);

module.exports = router;
