const { sendSuccess } = require("../utils/api-response");
const {
  validateContentReportPayload,
  validateCommentPayload,
  validateEngagementTargetPayload,
  validateReactionPayload,
  validateSharePayload,
} = require("../utils/request-validation");
const {
  createCommentWithSummary,
  reactToFeedItemWithSummary,
  recordShareWithSummary,
  submitContentReport,
  toggleLikeWithSummary,
} = require("../services/engagement.service");

async function toggleLike(req, res, next) {
  try {
    const payload = validateEngagementTargetPayload(req.body);
    const result = await toggleLikeWithSummary(payload, req.user);
    return sendSuccess(res, result, result.liked ? "Liked" : "Unliked");
  } catch (error) {
    return next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const payload = validateCommentPayload(req.body);
    const result = await createCommentWithSummary(payload, req.user);
    return sendSuccess(res, result, "Comment posted");
  } catch (error) {
    return next(error);
  }
}

async function recordShare(req, res, next) {
  try {
    const payload = validateSharePayload(req.body);
    const result = await recordShareWithSummary(payload, req.user);
    return sendSuccess(res, result, "Share recorded");
  } catch (error) {
    return next(error);
  }
}

async function setReaction(req, res, next) {
  try {
    const payload = validateReactionPayload(req.body);
    const result = await reactToFeedItemWithSummary(payload, req.user);
    return sendSuccess(res, result, result.reactionType ? "Reaction saved" : "Reaction removed");
  } catch (error) {
    return next(error);
  }
}

async function createReport(req, res, next) {
  try {
    const payload = validateContentReportPayload(req.body);
    const report = await submitContentReport(payload, req.user);
    return sendSuccess(res, { report }, "Report submitted");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createComment,
  createReport,
  recordShare,
  setReaction,
  toggleLike,
};
