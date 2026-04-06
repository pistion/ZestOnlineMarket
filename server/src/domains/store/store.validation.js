const legacy = require("../../utils/validation/request-validation.legacy");

module.exports = {
  normalizeHandle: legacy.normalizeHandle,
  validateSellerStoreDraftPayload: legacy.validateSellerStoreDraftPayload,
  validateStorePayload: legacy.validateStorePayload,
  validateStoreVisibilityPayload: legacy.validateStoreVisibilityPayload,
};
