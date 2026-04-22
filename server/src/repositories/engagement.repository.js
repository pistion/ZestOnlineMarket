const { all, get, run } = require("../config/db");
const { getPostgresExecutor, resolveCatalogSource } = require("./repository-source");
const { ensureBuyerProfileByUserId } = require("./buyer.repository");
const { createHttpError } = require("../utils/api-response");
const { normalizeEngagementTargetType } = require("../schemas/engagement.schema");

const COMMENT_PREVIEW_LIMIT = 3;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonValue(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function buildTargetKey(targetType, targetId) {
  return `${targetType}:${targetId}`;
}

function normalizeTarget(target = {}) {
  const targetType = normalizeEngagementTargetType(target.targetType);
  const targetId = toNumber(target.targetId, 0);
  if (!targetId) {
    throw createHttpError(400, "Target id is required");
  }

  return {
    targetType,
    targetId,
  };
}

function normalizeTargets(targets = []) {
  const seen = new Set();
  const normalizedTargets = [];

  targets.forEach((target) => {
    const normalized = normalizeTarget(target);
    const key = buildTargetKey(normalized.targetType, normalized.targetId);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    normalizedTargets.push(normalized);
  });

  return normalizedTargets;
}

function buildEmptySummary(target) {
  return {
    ...target,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    viewerLiked: false,
    viewerReaction: "",
    reactionSummary: {},
    comments: [],
  };
}

function buildSqliteTargetFilter(targets, typeColumn, idColumn) {
  if (!targets.length) {
    return {
      sql: "1 = 0",
      params: [],
    };
  }

  const clauses = [];
  const params = [];
  targets.forEach((target) => {
    clauses.push(`(${typeColumn} = ? AND ${idColumn} = ?)`);
    params.push(target.targetType, target.targetId);
  });

  return {
    sql: clauses.join(" OR "),
    params,
  };
}

function applyPostgresTargetFilter(query, targets, typeColumn, idColumn) {
  query.where(function whereTargets() {
    targets.forEach((target, index) => {
      const method = index === 0 ? "where" : "orWhere";
      this[method](function whereTarget() {
        this.where(typeColumn, target.targetType).andWhere(idColumn, target.targetId);
      });
    });
  });
}

function mapCommentRow(row) {
  const authorName =
    String(row.author_name || row.authorName || row.fullName || "").trim() ||
    String(row.email || "").trim().split("@")[0] ||
    "User";

  return {
    id: toNumber(row.id, 0) || null,
    targetType: String(row.target_type || row.targetType || "").trim(),
    targetId: toNumber(row.target_id || row.targetId, 0) || null,
    authorUserId: toNumber(row.author_user_id || row.authorUserId, 0) || null,
    authorName,
    body: String(row.body || "").trim(),
    text: String(row.body || "").trim(),
    createdAt: row.created_at || row.createdAt || null,
  };
}

function mapContentReportRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0) || null,
    targetType: String(row.target_type || row.targetType || "").trim(),
    targetId: toNumber(row.target_id || row.targetId, 0) || null,
    reporterUserId: toNumber(row.reporter_user_id || row.reporterUserId, 0) || null,
    reason: String(row.reason || "").trim(),
    details: String(row.details || "").trim(),
    status: String(row.status || "open").trim(),
    metadata: parseJsonValue(row.metadata, {}),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

async function listEngagementSnapshot(targets = [], user = null, options = {}) {
  const normalizedTargets = normalizeTargets(targets);
  const summaryMap = new Map(
    normalizedTargets.map((target) => [buildTargetKey(target.targetType, target.targetId), buildEmptySummary(target)])
  );

  if (!normalizedTargets.length) {
    return summaryMap;
  }

  const source = resolveCatalogSource(options);
  const userId = user && user.id ? toNumber(user.id, 0) : 0;
  let buyerProfileId = 0;

  if (userId > 0) {
    const buyerProfile = await ensureBuyerProfileByUserId(userId, options);
    buyerProfileId = buyerProfile && buyerProfile.id ? toNumber(buyerProfile.id, 0) : 0;
  }

  if (source === "sqlite") {
    const likeFilter = buildSqliteTargetFilter(normalizedTargets, "targetType", "targetId");
    const [likeRows, shareRows, commentCountRows, commentRows, viewerLikeRows] = await Promise.all([
      all(
        `SELECT targetType AS target_type, targetId AS target_id, COUNT(*) AS total
          FROM likes
          WHERE ${likeFilter.sql}
          GROUP BY targetType, targetId`,
        likeFilter.params
      ),
      all(
        `SELECT targetType AS target_type, targetId AS target_id, COUNT(*) AS total
          FROM shares
          WHERE ${likeFilter.sql}
          GROUP BY targetType, targetId`,
        likeFilter.params
      ),
      all(
        `SELECT targetType AS target_type, targetId AS target_id, COUNT(*) AS total
          FROM comments
          WHERE visibilityStatus = 'visible' AND (${likeFilter.sql})
          GROUP BY targetType, targetId`,
        likeFilter.params
      ),
      all(
        `SELECT
          c.id,
          c.targetType AS target_type,
          c.targetId AS target_id,
          c.authorUserId AS author_user_id,
          c.body,
          c.createdAt AS created_at,
          COALESCE(NULLIF(cp.fullName, ''), u.email) AS author_name,
          u.email
        FROM comments c
        JOIN users u ON u.id = c.authorUserId
        LEFT JOIN customer_profiles cp ON cp.userId = u.id
        WHERE c.visibilityStatus = 'visible' AND (${likeFilter.sql})
        ORDER BY datetime(c.createdAt) DESC, c.id DESC`,
        likeFilter.params
      ),
      userId > 0
        ? all(
            `SELECT targetType AS target_type, targetId AS target_id
              FROM likes
              WHERE userId = ? AND (${likeFilter.sql})`,
            [userId, ...likeFilter.params]
          )
        : Promise.resolve([]),
    ]);

    likeRows.forEach((row) => {
      const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
      if (summary) {
        summary.likeCount = toNumber(row.total, 0);
      }
    });

    shareRows.forEach((row) => {
      const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
      if (summary) {
        summary.shareCount = toNumber(row.total, 0);
      }
    });

    commentCountRows.forEach((row) => {
      const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
      if (summary) {
        summary.commentCount = toNumber(row.total, 0);
      }
    });

    viewerLikeRows.forEach((row) => {
      const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
      if (summary) {
        summary.viewerLiked = true;
      }
    });

    const commentBuckets = new Map();
    commentRows.forEach((row) => {
      const key = buildTargetKey(row.target_type, row.target_id);
      const bucket = commentBuckets.get(key) || [];
      if (bucket.length < COMMENT_PREVIEW_LIMIT) {
        bucket.push(mapCommentRow(row));
      }
      commentBuckets.set(key, bucket);
    });

    commentBuckets.forEach((comments, key) => {
      const summary = summaryMap.get(key);
      if (summary) {
        summary.comments = comments;
      }
    });

    const feedTargets = normalizedTargets.filter((target) => target.targetType === "feed_item");
    if (feedTargets.length) {
      const feedIds = feedTargets.map((target) => target.targetId);
      const placeholders = feedIds.map(() => "?").join(", ");
      const reactionRows = await all(
        `SELECT feedItemId AS feed_item_id, type, COUNT(*) AS total
          FROM feed_reactions
          WHERE feedItemId IN (${placeholders})
          GROUP BY feedItemId, type`,
        feedIds
      );

      reactionRows.forEach((row) => {
        const summary = summaryMap.get(buildTargetKey("feed_item", row.feed_item_id));
        if (summary) {
          summary.reactionSummary[row.type] = toNumber(row.total, 0);
        }
      });

      if (buyerProfileId > 0) {
        const viewerReactionRows = await all(
          `SELECT feedItemId AS feed_item_id, type
            FROM feed_reactions
            WHERE customerProfileId = ? AND feedItemId IN (${placeholders})
            ORDER BY createdAt DESC, id DESC`,
          [buyerProfileId, ...feedIds]
        );

        viewerReactionRows.forEach((row) => {
          const summary = summaryMap.get(buildTargetKey("feed_item", row.feed_item_id));
          if (summary && !summary.viewerReaction) {
            summary.viewerReaction = String(row.type || "").trim();
          }
        });
      }
    }

    return summaryMap;
  }

  const knex = getPostgresExecutor(options);
  const [likeRows, shareRows, commentCountRows, commentRows, viewerLikeRows] = await Promise.all([
    (() => {
      const query = knex("likes")
        .select("target_type", "target_id")
        .count("* as total")
        .groupBy("target_type", "target_id");
      applyPostgresTargetFilter(query, normalizedTargets, "target_type", "target_id");
      return query;
    })(),
    (() => {
      const query = knex("shares")
        .select("target_type", "target_id")
        .count("* as total")
        .groupBy("target_type", "target_id");
      applyPostgresTargetFilter(query, normalizedTargets, "target_type", "target_id");
      return query;
    })(),
    (() => {
      const query = knex("comments")
        .select("target_type", "target_id")
        .count("* as total")
        .where({ visibility_status: "visible" })
        .groupBy("target_type", "target_id");
      applyPostgresTargetFilter(query, normalizedTargets, "target_type", "target_id");
      return query;
    })(),
    (() => {
      const query = knex("comments as c")
        .join("users as u", "u.id", "c.author_user_id")
        .leftJoin("customer_profiles as cp", "cp.user_id", "u.id")
        .select(
          "c.id",
          "c.target_type",
          "c.target_id",
          "c.author_user_id",
          "c.body",
          "c.created_at",
          knex.raw("COALESCE(NULLIF(cp.full_name, ''), u.email) as author_name"),
          "u.email"
        )
        .where("c.visibility_status", "visible")
        .orderBy("c.created_at", "desc")
        .orderBy("c.id", "desc");
      applyPostgresTargetFilter(query, normalizedTargets, "c.target_type", "c.target_id");
      return query;
    })(),
    userId > 0
      ? (() => {
          const query = knex("likes")
            .select("target_type", "target_id")
            .where({ user_id: userId });
          applyPostgresTargetFilter(query, normalizedTargets, "target_type", "target_id");
          return query;
        })()
      : Promise.resolve([]),
  ]);

  likeRows.forEach((row) => {
    const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
    if (summary) {
      summary.likeCount = toNumber(row.total, 0);
    }
  });

  shareRows.forEach((row) => {
    const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
    if (summary) {
      summary.shareCount = toNumber(row.total, 0);
    }
  });

  commentCountRows.forEach((row) => {
    const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
    if (summary) {
      summary.commentCount = toNumber(row.total, 0);
    }
  });

  viewerLikeRows.forEach((row) => {
    const summary = summaryMap.get(buildTargetKey(row.target_type, row.target_id));
    if (summary) {
      summary.viewerLiked = true;
    }
  });

  const commentBuckets = new Map();
  commentRows.forEach((row) => {
    const key = buildTargetKey(row.target_type, row.target_id);
    const bucket = commentBuckets.get(key) || [];
    if (bucket.length < COMMENT_PREVIEW_LIMIT) {
      bucket.push(mapCommentRow(row));
    }
    commentBuckets.set(key, bucket);
  });

  commentBuckets.forEach((comments, key) => {
    const summary = summaryMap.get(key);
    if (summary) {
      summary.comments = comments;
    }
  });

  const feedTargets = normalizedTargets.filter((target) => target.targetType === "feed_item");
  if (feedTargets.length) {
    const feedIds = feedTargets.map((target) => target.targetId);
    const reactionRows = await knex("feed_reactions")
      .select("feed_item_id", "type")
      .count("* as total")
      .whereIn("feed_item_id", feedIds)
      .groupBy("feed_item_id", "type");

    reactionRows.forEach((row) => {
      const summary = summaryMap.get(buildTargetKey("feed_item", row.feed_item_id));
      if (summary) {
        summary.reactionSummary[row.type] = toNumber(row.total, 0);
      }
    });

    if (buyerProfileId > 0) {
      const viewerReactionRows = await knex("feed_reactions")
        .select("feed_item_id", "type")
        .where({ customer_profile_id: buyerProfileId })
        .whereIn("feed_item_id", feedIds)
        .orderBy("created_at", "desc")
        .orderBy("id", "desc");

      viewerReactionRows.forEach((row) => {
        const summary = summaryMap.get(buildTargetKey("feed_item", row.feed_item_id));
        if (summary && !summary.viewerReaction) {
          summary.viewerReaction = String(row.type || "").trim();
        }
      });
    }
  }

  return summaryMap;
}

async function toggleLikeForTarget({ targetType, targetId, userId }, options = {}) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const normalizedUserId = toNumber(userId, 0);
  const source = resolveCatalogSource(options);

  if (!normalizedUserId) {
    throw createHttpError(401, "Authentication required");
  }

  if (source === "sqlite") {
    const existing = await get(
      "SELECT id FROM likes WHERE targetType = ? AND targetId = ? AND userId = ?",
      [normalizedTarget.targetType, normalizedTarget.targetId, normalizedUserId]
    );

    if (existing) {
      await run("DELETE FROM likes WHERE id = ?", [existing.id]);
      return { liked: false };
    }

    await run(
      "INSERT INTO likes (targetType, targetId, userId, createdAt) VALUES (?, ?, ?, datetime('now'))",
      [normalizedTarget.targetType, normalizedTarget.targetId, normalizedUserId]
    );
    return { liked: true };
  }

  const knex = getPostgresExecutor(options);
  const existing = await knex("likes")
    .where({
      target_type: normalizedTarget.targetType,
      target_id: normalizedTarget.targetId,
      user_id: normalizedUserId,
    })
    .first();

  if (existing) {
    await knex("likes").where({ id: existing.id }).del();
    return { liked: false };
  }

  await knex("likes").insert({
    target_type: normalizedTarget.targetType,
    target_id: normalizedTarget.targetId,
    user_id: normalizedUserId,
  });
  return { liked: true };
}

async function createCommentForTarget({ targetType, targetId, userId, body }, options = {}) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const normalizedUserId = toNumber(userId, 0);
  const source = resolveCatalogSource(options);

  if (!normalizedUserId) {
    throw createHttpError(401, "Authentication required");
  }

  if (source === "sqlite") {
    const result = await run(
      `INSERT INTO comments (
        targetType, targetId, authorUserId, body, visibilityStatus, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'visible', datetime('now'), datetime('now'))`,
      [normalizedTarget.targetType, normalizedTarget.targetId, normalizedUserId, body]
    );

    const row = await get(
      `SELECT
        c.id,
        c.targetType AS target_type,
        c.targetId AS target_id,
        c.authorUserId AS author_user_id,
        c.body,
        c.createdAt AS created_at,
        COALESCE(NULLIF(cp.fullName, ''), u.email) AS author_name,
        u.email
      FROM comments c
      JOIN users u ON u.id = c.authorUserId
      LEFT JOIN customer_profiles cp ON cp.userId = u.id
      WHERE c.id = ?`,
      [result.lastID]
    );

    return mapCommentRow(row);
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("comments")
    .insert({
      target_type: normalizedTarget.targetType,
      target_id: normalizedTarget.targetId,
      author_user_id: normalizedUserId,
      body,
      visibility_status: "visible",
    })
    .returning(["id"]);

  const commentRow = await knex("comments as c")
    .join("users as u", "u.id", "c.author_user_id")
    .leftJoin("customer_profiles as cp", "cp.user_id", "u.id")
    .select(
      "c.id",
      "c.target_type",
      "c.target_id",
      "c.author_user_id",
      "c.body",
      "c.created_at",
      knex.raw("COALESCE(NULLIF(cp.full_name, ''), u.email) as author_name"),
      "u.email"
    )
    .where("c.id", row.id)
    .first();

  return mapCommentRow(commentRow);
}

async function recordShareForTarget({ targetType, targetId, userId, destination = "", method = "" }, options = {}) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const normalizedUserId = toNumber(userId, 0);
  const source = resolveCatalogSource(options);

  if (!normalizedUserId) {
    throw createHttpError(401, "Authentication required");
  }

  if (source === "sqlite") {
    await run(
      `INSERT INTO shares (
        targetType, targetId, userId, destination, method, metadata, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        normalizedTarget.targetType,
        normalizedTarget.targetId,
        normalizedUserId,
        destination,
        method,
        JSON.stringify({}),
      ]
    );

    return true;
  }

  const knex = getPostgresExecutor(options);
  await knex("shares").insert({
    target_type: normalizedTarget.targetType,
    target_id: normalizedTarget.targetId,
    user_id: normalizedUserId,
    destination,
    method,
    metadata: {},
  });

  return true;
}

async function setFeedReaction({ targetType, targetId, userId, reactionType }, options = {}) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const normalizedUserId = toNumber(userId, 0);
  if (normalizedTarget.targetType !== "feed_item") {
    throw createHttpError(400, "Reactions currently support feed items only");
  }

  const buyerProfile = await ensureBuyerProfileByUserId(normalizedUserId, options);
  if (!buyerProfile || !buyerProfile.id) {
    throw createHttpError(403, "Buyer profile required for feed reactions");
  }

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    const existingRows = await all(
      "SELECT id, type FROM feed_reactions WHERE feedItemId = ? AND customerProfileId = ?",
      [normalizedTarget.targetId, buyerProfile.id]
    );
    const alreadySelected = existingRows.some((row) => row.type === reactionType);

    if (existingRows.length) {
      await run("DELETE FROM feed_reactions WHERE feedItemId = ? AND customerProfileId = ?", [
        normalizedTarget.targetId,
        buyerProfile.id,
      ]);
    }

    if (!alreadySelected) {
      await run(
        "INSERT INTO feed_reactions (feedItemId, customerProfileId, type, createdAt) VALUES (?, ?, ?, datetime('now'))",
        [normalizedTarget.targetId, buyerProfile.id, reactionType]
      );
      return { reactionType };
    }

    return { reactionType: "" };
  }

  const knex = getPostgresExecutor(options);
  const existingRows = await knex("feed_reactions")
    .where({
      feed_item_id: normalizedTarget.targetId,
      customer_profile_id: buyerProfile.id,
    })
    .select("id", "type");
  const alreadySelected = existingRows.some((row) => row.type === reactionType);

  if (existingRows.length) {
    await knex("feed_reactions")
      .where({
        feed_item_id: normalizedTarget.targetId,
        customer_profile_id: buyerProfile.id,
      })
      .del();
  }

  if (!alreadySelected) {
    await knex("feed_reactions").insert({
      feed_item_id: normalizedTarget.targetId,
      customer_profile_id: buyerProfile.id,
      type: reactionType,
    });
    return { reactionType };
  }

  return { reactionType: "" };
}

async function createContentReport(
  { targetType, targetId, reporterUserId, reason, details, metadata = {} },
  options = {}
) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const normalizedReporterUserId = toNumber(reporterUserId, 0);
  if (!normalizedReporterUserId) {
    throw createHttpError(401, "Authentication required");
  }

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    throw createHttpError(503, "Report storage is unavailable in legacy mode");
  }

  const knex = getPostgresExecutor(options);
  const existing = await knex("content_reports")
    .where({
      target_type: normalizedTarget.targetType,
      target_id: normalizedTarget.targetId,
      reporter_user_id: normalizedReporterUserId,
      status: "open",
    })
    .orderBy("id", "desc")
    .first();

  if (existing) {
    const nextMetadata = {
      ...(parseJsonValue(existing.metadata, {}) || {}),
      ...(metadata && typeof metadata === "object" ? metadata : {}),
    };

    const [updated] = await knex("content_reports")
      .where({ id: existing.id })
      .update({
        reason,
        details,
        metadata: nextMetadata,
        updated_at: knex.fn.now(),
      })
      .returning([
        "id",
        "target_type",
        "target_id",
        "reporter_user_id",
        "reason",
        "details",
        "status",
        "metadata",
        "created_at",
        "updated_at",
      ]);

    return mapContentReportRow(updated);
  }

  const [row] = await knex("content_reports")
    .insert({
      target_type: normalizedTarget.targetType,
      target_id: normalizedTarget.targetId,
      reporter_user_id: normalizedReporterUserId,
      reason,
      details,
      status: "open",
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    })
    .returning([
      "id",
      "target_type",
      "target_id",
      "reporter_user_id",
      "reason",
      "details",
      "status",
      "metadata",
      "created_at",
      "updated_at",
    ]);

  return mapContentReportRow(row);
}

async function deleteEngagementForTarget(targetType, targetId, options = {}) {
  const normalizedTarget = normalizeTarget({ targetType, targetId });
  const source = resolveCatalogSource(options);

  if (source === "sqlite") {
    await Promise.all([
      run("DELETE FROM likes WHERE targetType = ? AND targetId = ?", [
        normalizedTarget.targetType,
        normalizedTarget.targetId,
      ]),
      run("DELETE FROM comments WHERE targetType = ? AND targetId = ?", [
        normalizedTarget.targetType,
        normalizedTarget.targetId,
      ]),
      run("DELETE FROM shares WHERE targetType = ? AND targetId = ?", [
        normalizedTarget.targetType,
        normalizedTarget.targetId,
      ]),
    ]);
    return;
  }

  const knex = getPostgresExecutor(options);
  await Promise.all([
    knex("likes")
      .where({
        target_type: normalizedTarget.targetType,
        target_id: normalizedTarget.targetId,
      })
      .del(),
    knex("comments")
      .where({
        target_type: normalizedTarget.targetType,
        target_id: normalizedTarget.targetId,
      })
      .del(),
    knex("shares")
      .where({
        target_type: normalizedTarget.targetType,
        target_id: normalizedTarget.targetId,
      })
      .del(),
  ]);
}

async function deleteFeedReactionsForFeedItem(feedItemId, options = {}) {
  const normalizedFeedItemId = toNumber(feedItemId, 0);
  if (!normalizedFeedItemId) {
    return;
  }

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    await run("DELETE FROM feed_reactions WHERE feedItemId = ?", [normalizedFeedItemId]);
    return;
  }

  const knex = getPostgresExecutor(options);
  await knex("feed_reactions").where({ feed_item_id: normalizedFeedItemId }).del();
}

module.exports = {
  buildTargetKey,
  createContentReport,
  createCommentForTarget,
  deleteEngagementForTarget,
  deleteFeedReactionsForFeedItem,
  listEngagementSnapshot,
  recordShareForTarget,
  setFeedReaction,
  toggleLikeForTarget,
};
