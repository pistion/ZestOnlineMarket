const legacy = require("../internal/catalog.repository.legacy");

module.exports = {
  findCatalogMedia: legacy.findCatalogMedia,
  find_catalog_media: legacy.find_catalog_media,
  replaceCatalogMedia: legacy.replaceCatalogMedia,
};
