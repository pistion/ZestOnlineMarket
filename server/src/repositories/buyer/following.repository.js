const legacy = require("../internal/buyer.repository.legacy");

module.exports = {
  followStore: legacy.followStore,
  listBuyerFollowedStores: legacy.listBuyerFollowedStores,
  unfollowStore: legacy.unfollowStore,
};
