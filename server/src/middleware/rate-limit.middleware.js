const { getPostgresKnex } = require("../config/db");

function resolveRemoteAddress(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
}

function buildDefaultKey(req) {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }

  return `ip:${resolveRemoteAddress(req)}`;
}

function maybePruneExpiredRows(knex) {
  if (Math.random() > 0.02) {
    return;
  }

  knex("request_rate_limits")
    .where("expires_at", "<=", knex.fn.now())
    .del()
    .catch(() => null);
}

function createRateLimiter({ scope, windowMs, max, message, keyGenerator }) {
  return async (req, res, next) => {
    try {
      const resolvedScope = String(scope || req.path || "request").trim().toLowerCase();
      const resolvedKey = String(
        (typeof keyGenerator === "function" ? keyGenerator(req) : buildDefaultKey(req)) || ""
      ).trim();

      if (!resolvedScope || !resolvedKey || !Number.isFinite(windowMs) || !Number.isFinite(max)) {
        return next();
      }

      const knex = getPostgresKnex();
      const expiresAtExpression = knex.raw("now() + (? * interval '1 millisecond')", [windowMs]);

      const rows = await knex("request_rate_limits")
        .insert({
          scope: resolvedScope,
          bucket_key: resolvedKey,
          request_count: 1,
          expires_at: expiresAtExpression,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        })
        .onConflict(["scope", "bucket_key"])
        .merge({
          request_count: knex.raw(
            "case when request_rate_limits.expires_at <= now() then 1 else request_rate_limits.request_count + 1 end"
          ),
          expires_at: knex.raw(
            "case when request_rate_limits.expires_at <= now() then now() + (? * interval '1 millisecond') else request_rate_limits.expires_at end",
            [windowMs]
          ),
          updated_at: knex.fn.now(),
        })
        .returning(["request_count", "expires_at"]);

      maybePruneExpiredRows(knex);

      const row = rows && rows[0] ? rows[0] : {};
      const requestCount = Number(row.request_count || 0);
      if (requestCount <= max) {
        return next();
      }

      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const retryAfterSeconds = expiresAt
        ? Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
        : Math.max(1, Math.ceil(windowMs / 1000));

      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
        requestId: req.requestId || "",
      });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createRateLimiter,
};
