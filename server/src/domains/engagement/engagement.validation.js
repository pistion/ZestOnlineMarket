const legacy = require("../../utils/validation/request-validation.legacy");

module.exports = {
  normalizeEngagementTargetType: legacy.normalizeEngagementTargetType,
  validateCommentPayload: legacy.validateCommentPayload,
  validateEngagementTargetPayload: legacy.validateEngagementTargetPayload,
  validateReactionPayload: legacy.validateReactionPayload,
  validateSharePayload: legacy.validateSharePayload,
};
