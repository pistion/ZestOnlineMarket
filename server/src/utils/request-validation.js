const { loginBodySchema, registerBodySchema } = require("../schemas/auth.schema");
const {
  artListingBodySchema,
  artListingParamsSchema,
  artStoreHandleParamsSchema,
  artStoreSettingsBodySchema,
} = require("../schemas/art.schema");
const {
  buyerAddressBodySchema,
  buyerAddressParamsSchema,
  buyerCheckoutBodySchema,
  buyerFollowingParamsSchema,
  buyerInteractionBodySchema,
  buyerProfileBodySchema,
  buyerSettingsBodySchema,
  buyerWishlistBodySchema,
  buyerWishlistParamsSchema,
} = require("../schemas/buyer.schema");
const {
  engagementCommentBodySchema,
  engagementReactionBodySchema,
  engagementReportBodySchema,
  engagementShareBodySchema,
  engagementTargetBodySchema,
  normalizeEngagementTargetType,
} = require("../schemas/engagement.schema");
const {
  feedItemParamsSchema,
  feedQuerySchema,
  feedStoreHandleParamsSchema,
  storeFeedPostBodySchema,
} = require("../schemas/feed.schema");
const { orderParamsSchema, sellerOrderStatusBodySchema } = require("../schemas/order.schema");
const { adminReportParamsSchema, adminReportStatusBodySchema, adminUserParamsSchema, adminUserStatusBodySchema } = require("../schemas/admin.schema");
const { discountBodySchema, discountParamsSchema, discountValidateBodySchema } = require("../schemas/discount.schema");
const { productBodySchema, productParamsSchema } = require("../schemas/product.schema");
const { reviewBodySchema, reviewParamsSchema, reviewProductParamsSchema } = require("../schemas/review.schema");
const { searchQuerySchema } = require("../schemas/search.schema");
const { normalizeHandle } = require("../schemas/shared.schema");
const {
  sellerStoreDraftBodySchema,
  storeBodySchema,
  storeHandleParamsSchema,
  storeVisibilityBodySchema,
} = require("../schemas/store.schema");
const { parseSchema } = require("./schema-parser");

const authSchemas = {
  loginBodySchema,
  registerBodySchema,
};

const artSchemas = {
  artListingBodySchema,
  artListingParamsSchema,
  artStoreHandleParamsSchema,
  artStoreSettingsBodySchema,
};

const buyerSchemas = {
  addressBodySchema: buyerAddressBodySchema,
  addressParamsSchema: buyerAddressParamsSchema,
  checkoutBodySchema: buyerCheckoutBodySchema,
  followingParamsSchema: buyerFollowingParamsSchema,
  interactionBodySchema: buyerInteractionBodySchema,
  profileBodySchema: buyerProfileBodySchema,
  settingsBodySchema: buyerSettingsBodySchema,
  wishlistBodySchema: buyerWishlistBodySchema,
  wishlistParamsSchema: buyerWishlistParamsSchema,
};

const engagementSchemas = {
  commentBodySchema: engagementCommentBodySchema,
  reactionBodySchema: engagementReactionBodySchema,
  shareBodySchema: engagementShareBodySchema,
  targetBodySchema: engagementTargetBodySchema,
};

const feedSchemas = {
  feedItemParamsSchema,
  feedQuerySchema,
  storeFeedHandleParamsSchema: feedStoreHandleParamsSchema,
  storeFeedPostBodySchema,
};

const reportingSchemas = {
  contentReportBodySchema: engagementReportBodySchema,
};

const orderSchemas = {
  orderParamsSchema,
  sellerOrderStatusBodySchema,
};

const reviewSchemas = {
  reviewBodySchema,
  reviewParamsSchema,
  reviewProductParamsSchema,
};

const searchSchemas = {
  searchQuerySchema,
};

const discountSchemas = {
  discountBodySchema,
  discountParamsSchema,
  discountValidateBodySchema,
};

const adminSchemas = {
  adminReportParamsSchema,
  adminReportStatusBodySchema,
  adminUserParamsSchema,
  adminUserStatusBodySchema,
};

const productSchemas = {
  productBodySchema,
  productParamsSchema,
};

const storeSchemas = {
  sellerStoreDraftBodySchema,
  storeBodySchema,
  storeHandleParamsSchema,
  storeVisibilityBodySchema,
};

module.exports = {
  artSchemas,
  authSchemas,
  buyerSchemas,
  engagementSchemas,
  feedSchemas,
  normalizeEngagementTargetType,
  normalizeHandle,
  adminSchemas,
  discountSchemas,
  orderSchemas,
  productSchemas,
  reviewSchemas,
  reportingSchemas,
  searchSchemas,
  storeSchemas,
  validateArtListingPayload(body) {
    return parseSchema(artListingBodySchema, body || {});
  },
  validateArtStoreSettingsPayload(body) {
    return parseSchema(artStoreSettingsBodySchema, body || {});
  },
  validateAuthPayload(body, mode) {
    return parseSchema(mode === "register" ? registerBodySchema : loginBodySchema, body || {});
  },
  validateBuyerAddressPayload(body) {
    return parseSchema(buyerAddressBodySchema, body || {});
  },
  validateBuyerCheckoutPayload(body) {
    return parseSchema(buyerCheckoutBodySchema, body || {});
  },
  validateBuyerInteractionPayload(body) {
    return parseSchema(buyerInteractionBodySchema, body || {});
  },
  validateBuyerProfilePayload(body) {
    return parseSchema(buyerProfileBodySchema, body || {});
  },
  validateBuyerSettingsPayload(body) {
    return parseSchema(buyerSettingsBodySchema, body || {});
  },
  validateBuyerWishlistPayload(body) {
    return parseSchema(buyerWishlistBodySchema, body || {});
  },
  validateCommentPayload(body) {
    return parseSchema(engagementCommentBodySchema, body || {});
  },
  validateContentReportPayload(body) {
    return parseSchema(engagementReportBodySchema, body || {});
  },
  validateEngagementTargetPayload(body) {
    return parseSchema(engagementTargetBodySchema, body || {});
  },
  validateFeedQueryPayload(query) {
    return parseSchema(feedQuerySchema, query || {});
  },
  validateProductPayload(body) {
    return parseSchema(productBodySchema, body || {});
  },
  validateReviewPayload(body) {
    return parseSchema(reviewBodySchema, body || {});
  },
  validateReactionPayload(body) {
    return parseSchema(engagementReactionBodySchema, body || {});
  },
  validateSearchQueryPayload(query) {
    return parseSchema(searchQuerySchema, query || {});
  },
  validateSellerOrderStatusPayload(body) {
    return parseSchema(sellerOrderStatusBodySchema, body || {});
  },
  validateSellerStoreDraftPayload(body) {
    return parseSchema(sellerStoreDraftBodySchema, body || {});
  },
  validateSharePayload(body) {
    return parseSchema(engagementShareBodySchema, body || {});
  },
  validateStoreFeedPostPayload(body) {
    return parseSchema(storeFeedPostBodySchema, body || {});
  },
  validateStorePayload(body) {
    return parseSchema(storeBodySchema, body || {});
  },
  validateStoreVisibilityPayload(body) {
    return parseSchema(storeVisibilityBodySchema, body || {});
  },
};
