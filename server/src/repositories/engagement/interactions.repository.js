const legacy = require("../internal/engagement.repository.legacy");

module.exports = {
  buildTargetKey: legacy.buildTargetKey,
  createCommentForTarget: legacy.createCommentForTarget,
  listEngagementSnapshot: legacy.listEngagementSnapshot,
  recordShareForTarget: legacy.recordShareForTarget,
  setFeedReaction: legacy.setFeedReaction,
  toggleLikeForTarget: legacy.toggleLikeForTarget,
};
