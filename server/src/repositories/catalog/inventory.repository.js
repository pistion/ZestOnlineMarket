const legacy = require("../internal/catalog.repository.legacy");

module.exports = {
  listProductVariants: legacy.listProductVariants,
  replaceProductVariants: legacy.replaceProductVariants,
  upsertCatalogInventory: legacy.upsertCatalogInventory,
};
