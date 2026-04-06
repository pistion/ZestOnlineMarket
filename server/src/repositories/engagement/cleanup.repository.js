const legacy = require("../internal/engagement.repository.legacy");

module.exports = {
  createContentReport: legacy.createContentReport,
  deleteEngagementForTarget: legacy.deleteEngagementForTarget,
  deleteFeedReactionsForFeedItem: legacy.deleteFeedReactionsForFeedItem,
};
