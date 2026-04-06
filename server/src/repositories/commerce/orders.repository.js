const legacy = require("../internal/commerce.repository.legacy");

module.exports = {
  createOrderRecord: legacy.createOrderRecord,
  findBuyerOrderByProfileId: legacy.findBuyerOrderByProfileId,
  findSellerOrderByStoreId: legacy.findSellerOrderByStoreId,
  listBuyerOrdersByProfileId: legacy.listBuyerOrdersByProfileId,
  listSellerOrdersByStoreId: legacy.listSellerOrdersByStoreId,
  updateOrderStatusByStoreId: legacy.updateOrderStatusByStoreId,
};
