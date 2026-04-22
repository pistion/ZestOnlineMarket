const jwt = require("jsonwebtoken");

const { isProduction, jwtSecret } = require("../config/env");

const AUTH_COOKIE_NAME = "zest_auth";
const CSRF_COOKIE_NAME = "zest_csrf";
const OAUTH_STATE_COOKIE_NAME = "zest_oauth_state";

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getAuthTokenFromRequest(req) {
  const authorization = req.headers.authorization;
  if (authorization) {
    const [scheme, token] = authorization.split(" ");
    if (token && scheme && scheme.toLowerCase() === "bearer") {
      return token;
    }
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[AUTH_COOKIE_NAME] || null;
}

function hasBearerAuthHeader(req) {
  const authorization = req && req.headers ? req.headers.authorization : "";
  if (!authorization) {
    return false;
  }

  const [scheme, token] = authorization.split(" ");
  return Boolean(token && scheme && scheme.toLowerCase() === "bearer");
}

function getCookieValue(req, cookieName) {
  const cookies = parseCookies((req && req.headers && req.headers.cookie) || "");
  return cookies[cookieName] || "";
}

function verifyRequestUser(req) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

function buildCookie(name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
  ];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.maxAgeSeconds != null) {
    parts.push(`Max-Age=${Number(options.maxAgeSeconds)}`);
  }

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearedCookie(name, options = {}) {
  const parts = [
    `${name}=`,
    "Path=/",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
  ];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildAuthCookie(token) {
  return buildCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
  });
}

function buildClearedAuthCookie() {
  return buildClearedCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
  });
}

function buildClearedCsrfCookie() {
  return buildClearedCookie(CSRF_COOKIE_NAME);
}

function buildCsrfCookie(token) {
  return buildCookie(CSRF_COOKIE_NAME, token);
}

function buildOAuthStateCookie(token) {
  return buildCookie(OAUTH_STATE_COOKIE_NAME, token, {
    httpOnly: true,
    maxAgeSeconds: 10 * 60,
  });
}

function buildClearedOAuthStateCookie() {
  return buildClearedCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
  });
}

function appendResponseCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }

  const nextCookies = Array.isArray(existing) ? existing.concat(cookieValue) : [existing, cookieValue];
  res.setHeader("Set-Cookie", nextCookies);
}

function normalizeInternalPath(value, fallback = "/") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }

  return trimmed;
}

module.exports = {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  appendResponseCookie,
  buildAuthCookie,
  buildClearedCsrfCookie,
  buildCsrfCookie,
  buildClearedAuthCookie,
  buildClearedOAuthStateCookie,
  buildOAuthStateCookie,
  getCookieValue,
  getAuthTokenFromRequest,
  hasBearerAuthHeader,
  normalizeInternalPath,
  parseCookies,
  verifyRequestUser,
};
