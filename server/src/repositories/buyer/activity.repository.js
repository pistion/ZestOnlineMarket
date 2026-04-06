const legacy = require("../internal/buyer.repository.legacy");

module.exports = {
  listBuyerPurchases: legacy.listBuyerPurchases,
  listBuyerRecentlyViewed: legacy.listBuyerRecentlyViewed,
  listBuyerRecommendations: legacy.listBuyerRecommendations,
  recordBuyerPreferenceSignal: legacy.recordBuyerPreferenceSignal,
};
