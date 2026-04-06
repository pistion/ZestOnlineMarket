const legacy = require("../internal/store.repository.legacy");

module.exports = {
  findStoreByHandle: legacy.findStoreByHandle,
  find_store_by_handle: legacy.find_store_by_handle,
  findStoreById: legacy.findStoreById,
  findStoreByUserId: legacy.findStoreByUserId,
  find_store_by_user_id: legacy.find_store_by_user_id,
  listMarketplaceStalls: legacy.listMarketplaceStalls,
  list_marketplace_stalls: legacy.list_marketplace_stalls,
};
