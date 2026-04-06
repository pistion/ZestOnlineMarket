const legacy = require("../internal/feed.repository.legacy");

module.exports = {
  createStoreFeedItem: legacy.createStoreFeedItem,
  deleteFeedItemById: legacy.deleteFeedItemById,
  findStoreFeedItemByIdAndStoreId: legacy.findStoreFeedItemByIdAndStoreId,
  listStoreFeedItemsByStoreId: legacy.listStoreFeedItemsByStoreId,
};
