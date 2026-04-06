const crypto = require("crypto");

const { requestLoggingEnabled } = require("../config/env");
const { logInfo } = require("../utils/logger");

function shouldSkipRequestLogging(req) {
  return (
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/uploads/") ||
    req.path === "/favicon.ico"
  );
}

function resolveRemoteAddress(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.ip ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

function attachRequestContext(req, res, next) {
  const requestId = String(req.headers["x-request-id"] || "").trim() || crypto.randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  req.requestStartedAt = startedAt;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  if (requestLoggingEnabled && !shouldSkipRequestLogging(req)) {
    res.once("finish", () => {
      logInfo("request.complete", {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        userId: req.user && req.user.id ? Number(req.user.id) : null,
        role: req.user && req.user.role ? req.user.role : "",
        remoteAddress: resolveRemoteAddress(req),
      });
    });
  }

  next();
}

module.exports = {
  attachRequestContext,
};
