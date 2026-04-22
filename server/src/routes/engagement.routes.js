const express = require("express");

const {
  reportRateLimitMax,
  reportRateLimitWindowMs,
  writeRateLimitMax,
  writeRateLimitWindowMs,
} = require("../config/env");
const {
  createComment,
  createReport,
  recordShare,
  setReaction,
  toggleLike,
} = require("../controllers/engagement.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const {
  engagementCommentBodySchema,
  engagementReactionBodySchema,
  engagementReportBodySchema,
  engagementShareBodySchema,
  engagementTargetBodySchema,
} = require("../schemas/engagement.schema");
const { validate } = require("../utils/validate");

const router = express.Router();
const engagementWriteLimiter = createRateLimiter({
  scope: "engagement-write",
  windowMs: writeRateLimitWindowMs,
  max: writeRateLimitMax,
  message: "Too many engagement actions. Please wait a moment and try again.",
});
const reportWriteLimiter = createRateLimiter({
  scope: "engagement-report-write",
  windowMs: reportRateLimitWindowMs,
  max: reportRateLimitMax,
  message: "Too many reports were submitted. Please wait before sending another one.",
});

router.post(
  "/likes/toggle",
  requireAuth,
  engagementWriteLimiter,
  validate(engagementTargetBodySchema),
  toggleLike
);
router.post(
  "/comments",
  requireAuth,
  engagementWriteLimiter,
  validate(engagementCommentBodySchema),
  createComment
);
router.post(
  "/reports",
  requireAuth,
  reportWriteLimiter,
  validate(engagementReportBodySchema),
  createReport
);
router.post(
  "/shares",
  requireAuth,
  engagementWriteLimiter,
  validate(engagementShareBodySchema),
  recordShare
);
router.post(
  "/reactions",
  requireAuth,
  engagementWriteLimiter,
  validate(engagementReactionBodySchema),
  setReaction
);

module.exports = router;
