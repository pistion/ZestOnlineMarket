const legacy = require("../internal/commerce.repository.legacy");

module.exports = {
  adjustInventoryForSale: legacy.adjustInventoryForSale,
  restoreInventoryForRefund: legacy.restoreInventoryForRefund,
};
