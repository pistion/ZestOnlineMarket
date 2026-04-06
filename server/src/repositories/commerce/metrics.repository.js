const legacy = require("../internal/commerce.repository.legacy");

module.exports = {
  findStoreOwnerRecordByUserId: legacy.findStoreOwnerRecordByUserId,
  getSellerOrderMetricsByStoreId: legacy.getSellerOrderMetricsByStoreId,
};
