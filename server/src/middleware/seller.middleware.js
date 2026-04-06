function requireSeller(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
  }

  if (req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Seller-only route",
    });
  }

  return next();
}

function requireSellerPage(req, res, next) {
  if (!req.user) {
    const returnTo = encodeURIComponent(req.originalUrl || "/seller/store");
    return res.redirect(302, `/auth/signin?role=seller&returnTo=${returnTo}`);
  }

  if (req.user.role !== "seller") {
    return res.redirect(302, "/errors/403");
  }

  return next();
}

module.exports = {
  requireSeller,
  requireSellerPage,
};
