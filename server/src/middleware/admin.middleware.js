const { verifyRequestUser } = require("../utils/auth-session");

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin-only route",
    });
  }

  return next();
}

function requireAdminPage(req, res, next) {
  const user = verifyRequestUser(req);
  if (!user) {
    const returnTo = encodeURIComponent(req.originalUrl || "/admin/dashboard");
    return res.redirect(302, `/auth/signin?returnTo=${returnTo}`);
  }

  if (user.role !== "admin") {
    return res.redirect(302, "/errors/403");
  }

  req.user = user;
  res.locals.currentUser = user;
  return next();
}

module.exports = {
  requireAdmin,
  requireAdminPage,
};
