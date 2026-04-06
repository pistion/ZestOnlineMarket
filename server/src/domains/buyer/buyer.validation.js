const legacy = require("../../utils/validation/request-validation.legacy");

module.exports = {
  validateBuyerAddressPayload: legacy.validateBuyerAddressPayload,
  validateBuyerCheckoutPayload: legacy.validateBuyerCheckoutPayload,
  validateBuyerInteractionPayload: legacy.validateBuyerInteractionPayload,
  validateBuyerProfilePayload: legacy.validateBuyerProfilePayload,
  validateBuyerSettingsPayload: legacy.validateBuyerSettingsPayload,
  validateBuyerWishlistPayload: legacy.validateBuyerWishlistPayload,
};
