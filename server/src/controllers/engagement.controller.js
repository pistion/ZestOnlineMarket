const { sendSuccess } = require("../utils/api-response");
const {
  createCommentWithSummary,
  reactToFeedItemWithSummary,
  recordShareWithSummary,
  submitContentReport,
  toggleLikeWithSummary,
} = require("../services/engagement.service");

async function toggleLike(req, res, next) {
  try {
    const result = await toggleLikeWithSummary(req.body, req.user);
    return sendSuccess(res, result, result.liked ? "Liked" : "Unliked");
  } catch (error) {
    return next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const result = await createCommentWithSummary(req.body, req.user);
    return sendSuccess(res, result, "Comment posted");
  } catch (error) {
    return next(error);
  }
}

async function recordShare(req, res, next) {
  try {
    const result = await recordShareWithSummary(req.body, req.user);
    return sendSuccess(res, result, "Share recorded");
  } catch (error) {
    return next(error);
  }
}

async function setReaction(req, res, next) {
  try {
    const result = await reactToFeedItemWithSummary(req.body, req.user);
    return sendSuccess(res, result, result.reactionType ? "Reaction saved" : "Reaction removed");
  } catch (error) {
    return next(error);
  }
}

async function createReport(req, res, next) {
  try {
    const report = await submitContentReport(req.body, req.user);
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
