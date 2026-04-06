const { normalizeInternalPath, verifyRequestUser } = require("../utils/auth-session");

function requireAuth(req, res, next) {
  const user = verifyRequestUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Missing or invalid authentication",
    });
  }

  req.user = user;
  return next();
}

function attachOptionalUser(req, res, next) {
  req.user = verifyRequestUser(req);
  res.locals.currentUser = req.user || null;
  return next();
}

function buildSignInRedirect(req, role = "buyer") {
  const returnTo = normalizeInternalPath(req.originalUrl, "/");
  return `/auth/signin?role=${encodeURIComponent(role)}&returnTo=${encodeURIComponent(returnTo)}`;
}

function enforcePageAuth(req, res, next, role = "buyer") {
  const user = verifyRequestUser(req);
  if (!user) {
    return res.redirect(302, buildSignInRedirect(req, role));
  }

  req.user = user;
  res.locals.currentUser = user;
  return next();
}

function requirePageAuth(roleOrReq, res, next) {
  if (typeof roleOrReq === "string") {
    return (req, response, done) => enforcePageAuth(req, response, done, roleOrReq);
  }

  return enforcePageAuth(roleOrReq, res, next, "buyer");
}

module.exports = {
  attachOptionalUser,
  buildSignInRedirect,
  requireAuth,
  requirePageAuth,
};
