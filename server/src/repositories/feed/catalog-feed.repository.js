const legacy = require("../internal/feed.repository.legacy");

module.exports = {
  deleteFeedItemsByCatalogItemId: legacy.deleteFeedItemsByCatalogItemId,
  listCatalogFallbackFeedItems: legacy.listCatalogFallbackFeedItems,
  listFeedItemsByCatalogItemId: legacy.listFeedItemsByCatalogItemId,
  listFeedSourceItems: legacy.listFeedSourceItems,
  listPersistedFeedItems: legacy.listPersistedFeedItems,
  publishCatalogFeedItem: legacy.publishCatalogFeedItem,
};
