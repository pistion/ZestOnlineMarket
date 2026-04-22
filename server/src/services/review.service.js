const { ensureBuyerProfileByUserId } = require("../repositories/buyer.repository");
const { findCatalogItemByPublicId } = require("../repositories/catalog.repository");
const {
  createReview,
  deleteReview,
  deleteReviewById,
  findDeliveredPurchaseForReview,
  findReviewByCustomerProfileAndProductId,
  getAverageRating,
  listReviews,
} = require("../repositories/review.repository");
const { createHttpError } = require("../utils/api-response");

async function resolveReviewViewer(user, catalogItemId, options = {}) {
  if (!user || user.role !== "buyer") {
    return {
      signedIn: Boolean(user),
      role: user && user.role ? user.role : "",
      canReview: false,
      hasDeliveredPurchase: false,
      hasReviewed: false,
      reviewId: null,
    };
  }

  const profile = await ensureBuyerProfileByUserId(user.id, options);
  if (!profile || !profile.id) {
    return {
      signedIn: true,
      role: "buyer",
      canReview: false,
      hasDeliveredPurchase: false,
      hasReviewed: false,
      reviewId: null,
    };
  }

  const [purchase, existingReview] = await Promise.all([
    findDeliveredPurchaseForReview(profile.id, catalogItemId, options),
    findReviewByCustomerProfileAndProductId(profile.id, catalogItemId, options),
  ]);

  return {
    signedIn: true,
    role: "buyer",
    canReview: Boolean(purchase) && !existingReview,
    hasDeliveredPurchase: Boolean(purchase),
    hasReviewed: Boolean(existingReview),
    reviewId: existingReview && existingReview.id ? existingReview.id : null,
  };
}

async function listProductReviews(catalogItemId, viewer, pagination = {}, options = {}) {
  const product = await findCatalogItemByPublicId(catalogItemId, {
    ...options,
    publicOnly: true,
  });
  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  const [reviews, summary, viewerState] = await Promise.all([
    listReviews(catalogItemId, pagination, options),
    getAverageRating(catalogItemId, options),
    resolveReviewViewer(viewer, catalogItemId, options),
  ]);

  return {
    productId: catalogItemId,
    summary,
    reviews: reviews.items.map((review) => ({
      ...review,
      isOwner: Boolean(viewerState.reviewId) && Number(viewerState.reviewId) === Number(review.id),
    })),
    pagination: {
      page: reviews.page,
      limit: reviews.limit,
      total: reviews.total,
      totalPages: reviews.totalPages,
    },
    viewer: viewerState,
  };
}

async function createProductReview(user, catalogItemId, body = {}, options = {}) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer-only route");
  }

  const product = await findCatalogItemByPublicId(catalogItemId, {
    ...options,
    publicOnly: true,
  });
  if (!product) {
    throw createHttpError(404, "Product not found");
  }

  const profile = await ensureBuyerProfileByUserId(user.id, options);
  if (!profile || !profile.id) {
    throw createHttpError(400, "Finish your buyer profile before leaving reviews");
  }

  const existingReview = await findReviewByCustomerProfileAndProductId(profile.id, catalogItemId, options);
  if (existingReview) {
    throw createHttpError(409, "You have already reviewed this product");
  }

  const purchase = await findDeliveredPurchaseForReview(profile.id, catalogItemId, options);
  if (!purchase || !purchase.orderId) {
    throw createHttpError(403, "Only delivered purchases can be reviewed");
  }

  return createReview(
    {
      customerProfileId: profile.id,
      storeId: product.storeId,
      catalogItemId,
      orderId: purchase.orderId,
      rating: body.rating,
      title: body.title,
      body: body.body,
    },
    options
  );
}

async function deleteProductReview(user, catalogItemId, reviewId, options = {}) {
  if (!user || !["buyer", "admin"].includes(user.role)) {
    throw createHttpError(403, "Buyer or admin route");
  }

  if (user.role === "admin") {
    const removedByAdmin = await deleteReviewById(reviewId, options);
    if (!removedByAdmin || Number(removedByAdmin.productId || 0) !== Number(catalogItemId || 0)) {
      throw createHttpError(404, "Review not found");
    }

    return removedByAdmin;
  }

  const profile = await ensureBuyerProfileByUserId(user.id, options);
  if (!profile || !profile.id) {
    throw createHttpError(400, "Finish your buyer profile before managing reviews");
  }

  const removed = await deleteReview(reviewId, profile.id, options);
  if (!removed || Number(removed.productId || 0) !== Number(catalogItemId || 0)) {
    throw createHttpError(404, "Review not found");
  }

  return removed;
}

module.exports = {
  createProductReview,
  deleteProductReview,
  listProductReviews,
  resolveReviewViewer,
};
