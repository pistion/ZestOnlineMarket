const crypto = require("crypto");

const { csrfEnabled, csrfHeaderName } = require("../config/env");
const {
  CSRF_COOKIE_NAME,
  appendResponseCookie,
  buildCsrfCookie,
  getCookieValue,
  hasBearerAuthHeader,
} = require("../utils/auth-session");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function wantsJsonResponse(req) {
  const accepts = req.accepts(["html", "json"]);
  return (
    req.path.startsWith("/api/") ||
    (req.path.startsWith("/auth/") && req.method !== "GET") ||
    accepts === "json"
  );
}

function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function resolveRequestToken(req) {
  const headerToken = req.headers[String(csrfHeaderName || "x-csrf-token").toLowerCase()];
  if (headerToken) {
    return String(headerToken).trim();
  }

  if (req.body && typeof req.body === "object" && req.body._csrf) {
    return String(req.body._csrf).trim();
  }

  if (req.query && req.query._csrf) {
    return String(req.query._csrf).trim();
  }

  return "";
}

function attachCsrfProtection(req, res, next) {
  if (!csrfEnabled) {
    res.locals.csrfToken = "";
    return next();
  }

  let csrfToken = getCookieValue(req, CSRF_COOKIE_NAME);
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    appendResponseCookie(res, buildCsrfCookie(csrfToken));
  }

  req.csrfToken = csrfToken;
  res.locals.csrfToken = csrfToken;

  if (SAFE_METHODS.has(String(req.method || "").toUpperCase()) || hasBearerAuthHeader(req)) {
    return next();
  }

  const requestToken = resolveRequestToken(req);
  if (requestToken && requestToken === csrfToken) {
    return next();
  }

  const message = "Security token missing or invalid";
  if (wantsJsonResponse(req)) {
    return res.status(403).json({
      success: false,
      message,
      requestId: req.requestId || "",
    });
  }

  return res.redirect(302, "/errors/403");
}

module.exports = {
  attachCsrfProtection,
};
