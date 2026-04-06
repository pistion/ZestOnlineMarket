const legacy = require("../internal/catalog.repository.legacy");

module.exports = {
  createCatalogItem: legacy.createCatalogItem,
  createProduct: legacy.createProduct,
  deleteCatalogItem: legacy.deleteCatalogItem,
  findCatalogItemByPublicId: legacy.findCatalogItemByPublicId,
  findCatalogItemByPublicIdAndStoreId: legacy.findCatalogItemByPublicIdAndStoreId,
  find_catalog_item_by_public_id: legacy.find_catalog_item_by_public_id,
  findFirstCatalogItemByStoreId: legacy.findFirstCatalogItemByStoreId,
  listPublicCatalogItems: legacy.listPublicCatalogItems,
  listStoreCatalogItems: legacy.listStoreCatalogItems,
  list_store_catalog_items: legacy.list_store_catalog_items,
  updateCatalogItem: legacy.updateCatalogItem,
  updateProduct: legacy.updateProduct,
};
