const { sendSuccess } = require("../utils/api-response");
const {
  createProductReview,
  deleteProductReview,
  listProductReviews,
} = require("../services/review.service");

async function getProductReviews(req, res, next) {
  try {
    const payload = await listProductReviews(req.params.productId, req.user || null, req.query || {});
    return sendSuccess(res, payload, "Product reviews loaded");
  } catch (error) {
    return next(error);
  }
}

async function postProductReview(req, res, next) {
  try {
    const review = await createProductReview(req.user, req.params.productId, req.body || {});
    return sendSuccess(res, { review }, "Review created", 201);
  } catch (error) {
    return next(error);
  }
}

async function destroyProductReview(req, res, next) {
  try {
    const review = await deleteProductReview(req.user, req.params.productId, req.params.reviewId);
    return sendSuccess(res, { review }, "Review removed");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  destroyProductReview,
  getProductReviews,
  postProductReview,
};
