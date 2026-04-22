const {
  CONTENT_REPORT_REASONS,
  ENGAGEMENT_TARGET_TYPES,
  FEED_REACTION_TYPES,
  assertModeratedPublicText,
  createNormalizedSchema,
  normalizeChoice,
  normalizeMetadataObject,
  normalizeNumber,
  normalizeText,
} = require("./shared.schema");

function normalizeEngagementTargetType(value) {
  return normalizeChoice(
    value,
    ENGAGEMENT_TARGET_TYPES,
    "Target type must be feed_item, catalog_item, or store"
  );
}

function normalizeEngagementTargetPayload(body) {
  const payload = body || {};
  const targetType = normalizeEngagementTargetType(payload.targetType);
  const targetId = normalizeNumber(payload.targetId, "Target id", {
    minimum: 1,
    fallback: 0,
  });

  if (!targetId) {
    throw new Error("Target id is required");
  }

  return {
    targetType,
    targetId,
  };
}

function normalizeCommentPayload(body) {
  const target = normalizeEngagementTargetPayload(body);
  const commentBody = normalizeText(body && body.body, 300, "Comment", {
    required: true,
    minLength: 1,
  });

  return {
    ...target,
    body: assertModeratedPublicText(commentBody, "Comment", {
      maxLinks: 1,
    }),
  };
}

function normalizeSharePayload(body) {
  const target = normalizeEngagementTargetPayload(body);

  return {
    ...target,
    destination: normalizeText(body && body.destination, 120, "Share destination"),
    method: normalizeText(body && body.method, 120, "Share method"),
  };
}

function normalizeReactionPayload(body) {
  const target = normalizeEngagementTargetPayload(body);
  if (target.targetType !== "feed_item") {
    throw new Error("Reactions currently support feed items only");
  }

  const reactionType = normalizeChoice(
    body && body.reactionType,
    FEED_REACTION_TYPES,
    "Reaction must be love, fire, or celebrate"
  );

  return {
    ...target,
    reactionType,
  };
}

function normalizeContentReportPayload(body) {
  const target = normalizeEngagementTargetPayload(body);
  const reason = normalizeChoice(
    body && body.reason,
    CONTENT_REPORT_REASONS,
    "Report reason must be spam, abuse, impersonation, misleading, or other"
  );

  return {
    ...target,
    reason,
    details: normalizeText(body && body.details, 800, "Report details", {
      required: true,
      minLength: 6,
    }),
    metadata: normalizeMetadataObject(body && body.metadata),
  };
}

const engagementTargetBodySchema = createNormalizedSchema(normalizeEngagementTargetPayload);
const engagementCommentBodySchema = createNormalizedSchema(normalizeCommentPayload);
const engagementShareBodySchema = createNormalizedSchema(normalizeSharePayload);
const engagementReactionBodySchema = createNormalizedSchema(normalizeReactionPayload);
const engagementReportBodySchema = createNormalizedSchema(normalizeContentReportPayload);

module.exports = {
  engagementCommentBodySchema,
  engagementReactionBodySchema,
  engagementReportBodySchema,
  engagementShareBodySchema,
  engagementTargetBodySchema,
  normalizeEngagementTargetType,
};
