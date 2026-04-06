const legacy = require("../internal/store.repository.legacy");

module.exports = {
  getSellerWorkspaceSummary: legacy.getSellerWorkspaceSummary,
  updateStoreVisibilityByUserId: legacy.updateStoreVisibilityByUserId,
  upsertStoreByUserId: legacy.upsertStoreByUserId,
  upsert_store: legacy.upsert_store,
};
