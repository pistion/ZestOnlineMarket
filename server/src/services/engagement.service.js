const { findCatalogItemByPublicId } = require("../repositories/catalog.repository");
const {
  buildTargetKey,
  createContentReport,
  createCommentForTarget,
  listEngagementSnapshot,
  recordShareForTarget,
  setFeedReaction,
  toggleLikeForTarget,
} = require("../repositories/engagement.repository");
const { listPersistedFeedItems } = require("../repositories/feed.repository");
const { findStoreById } = require("../repositories/store.repository");
const { createHttpError } = require("../utils/api-response");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFeedItemTarget(item) {
  const feedItemId = toNumber(item.feedItemId || item.id, 0);
  if (feedItemId > 0 && item.source === "feed_item") {
    return {
      targetType: "feed_item",
      targetId: feedItemId,
    };
  }

  const catalogItemId = toNumber(item.catalogItemId, 0);
  if (catalogItemId > 0) {
    return {
      targetType: "catalog_item",
      targetId: catalogItemId,
    };
  }

  const storeId = toNumber(item.storeId, 0);
  if (storeId > 0) {
    return {
      targetType: "store",
      targetId: storeId,
    };
  }

  return null;
}

async function assertEngagementTargetExists(targetType, targetId, options = {}) {
  if (targetType === "feed_item") {
    const items = await listPersistedFeedItems({
      ...options,
      feedItemId: targetId,
      limit: 1,
    });
    if (!items.length) {
      throw createHttpError(404, "Feed item not found");
    }
    return;
  }

  if (targetType === "catalog_item") {
    const item = await findCatalogItemByPublicId(targetId, options);
    if (!item) {
      throw createHttpError(404, "Catalog item not found");
    }
    return;
  }

  if (targetType === "store") {
    const store = await findStoreById(targetId, options);
    if (!store) {
      throw createHttpError(404, "Store not found");
    }
    return;
  }

  throw createHttpError(400, "Unsupported engagement target");
}

async function hydrateFeedItemsWithEngagement(items = [], user = null, options = {}) {
  const targets = items
    .map((item) => resolveFeedItemTarget(item))
    .filter(Boolean);

  const snapshot = await listEngagementSnapshot(targets, user, options);

  return items.map((item) => {
    const target = resolveFeedItemTarget(item);
    if (!target) {
      return {
        ...item,
        targetType: "",
        targetId: null,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        viewerLiked: false,
        viewerReaction: "",
        reactionSummary: {},
        comments: [],
      };
    }

    const summary = snapshot.get(buildTargetKey(target.targetType, target.targetId)) || {
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      viewerLiked: false,
      viewerReaction: "",
      reactionSummary: {},
      comments: [],
    };

    return {
      ...item,
      targetType: target.targetType,
      targetId: target.targetId,
      likeCount: summary.likeCount,
      commentCount: summary.commentCount,
      shareCount: summary.shareCount,
      viewerLiked: summary.viewerLiked,
      viewerReaction: summary.viewerReaction,
      reactionSummary: summary.reactionSummary,
      comments: summary.comments,
    };
  });
}

async function toggleLikeWithSummary(payload, user, options = {}) {
  await assertEngagementTargetExists(payload.targetType, payload.targetId, options);
  const likeResult = await toggleLikeForTarget(
    {
      targetType: payload.targetType,
      targetId: payload.targetId,
      userId: user.id,
    },
    options
  );

  const snapshot = await listEngagementSnapshot([payload], user, options);
  return {
    liked: likeResult.liked,
    summary: snapshot.get(buildTargetKey(payload.targetType, payload.targetId)),
  };
}

async function createCommentWithSummary(payload, user, options = {}) {
  await assertEngagementTargetExists(payload.targetType, payload.targetId, options);
  const comment = await createCommentForTarget(
    {
      targetType: payload.targetType,
      targetId: payload.targetId,
      userId: user.id,
      body: payload.body,
    },
    options
  );

  const snapshot = await listEngagementSnapshot([payload], user, options);
  return {
    comment,
    summary: snapshot.get(buildTargetKey(payload.targetType, payload.targetId)),
  };
}

async function recordShareWithSummary(payload, user, options = {}) {
  await assertEngagementTargetExists(payload.targetType, payload.targetId, options);
  await recordShareForTarget(
    {
      targetType: payload.targetType,
      targetId: payload.targetId,
      userId: user.id,
      destination: payload.destination,
      method: payload.method,
    },
    options
  );

  const snapshot = await listEngagementSnapshot([payload], user, options);
  return {
    summary: snapshot.get(buildTargetKey(payload.targetType, payload.targetId)),
  };
}

async function reactToFeedItemWithSummary(payload, user, options = {}) {
  await assertEngagementTargetExists(payload.targetType, payload.targetId, options);
  const reactionResult = await setFeedReaction(
    {
      targetType: payload.targetType,
      targetId: payload.targetId,
      userId: user.id,
      reactionType: payload.reactionType,
    },
    options
  );

  const snapshot = await listEngagementSnapshot([payload], user, options);
  return {
    reactionType: reactionResult.reactionType,
    summary: snapshot.get(buildTargetKey(payload.targetType, payload.targetId)),
  };
}

async function submitContentReport(payload, user, options = {}) {
  if (!user || !user.id) {
    throw createHttpError(401, "Authentication required");
  }

  await assertEngagementTargetExists(payload.targetType, payload.targetId, options);

  return createContentReport(
    {
      targetType: payload.targetType,
      targetId: payload.targetId,
      reporterUserId: user.id,
      reason: payload.reason,
      details: payload.details,
      metadata: payload.metadata,
    },
    options
  );
}

module.exports = {
  createCommentWithSummary,
  hydrateFeedItemsWithEngagement,
  reactToFeedItemWithSummary,
  recordShareWithSummary,
  submitContentReport,
  toggleLikeWithSummary,
};
