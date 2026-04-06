const { ensureBuyerProfileByUserId } = require("../repositories/buyer.repository");
const { normalizeInternalPath, verifyRequestUser } = require("../utils/auth-session");
const {
  resolveBuyerAppPath,
  resolveBuyerSetupPath,
} = require("../services/account-routing.service");

function requireBuyer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated",
    });
  }

  if (req.user.role !== "buyer") {
    return res.status(403).json({
      success: false,
      message: "Buyer-only route",
    });
  }

  return next();
}

function requireBuyerPage(req, res, next) {
  if (!req.user) {
    const returnTo = encodeURIComponent(req.originalUrl || "/buyer/profile");
    return res.redirect(302, `/auth/signin?role=buyer&returnTo=${returnTo}`);
  }

  if (req.user.role !== "buyer") {
    return res.redirect(302, "/errors/403");
  }

  return next();
}

function requireBuyerSetupEntry(req, res, next) {
  const user = verifyRequestUser(req);
  if (!user) {
    const returnTo = normalizeInternalPath(req.originalUrl || resolveBuyerSetupPath(), resolveBuyerSetupPath());
    return res.redirect(
      302,
      `/auth/signup?role=buyer&returnTo=${encodeURIComponent(returnTo)}`
    );
  }

  req.user = user;
  res.locals.currentUser = user;
  return next();
}

async function attachBuyerProfile(req, res, next) {
  if (!req.user || req.user.role !== "buyer") {
    return next();
  }

  try {
    req.buyerProfile = await ensureBuyerProfileByUserId(req.user.id);
    return next();
  } catch (error) {
    return next(error);
  }
}

function redirectIncompleteBuyerProfile(req, res, next) {
  return next();
}

function redirectCompletedBuyerSetup(req, res, next) {
  if (!req.user || req.user.role !== "buyer") {
    return next();
  }

  if (req.buyerProfile && req.buyerProfile.profileCompleted) {
    return res.redirect(302, resolveBuyerAppPath(req.buyerProfile));
  }

  return next();
}

module.exports = {
  attachBuyerProfile,
  requireBuyerSetupEntry,
  redirectCompletedBuyerSetup,
  redirectIncompleteBuyerProfile,
  requireBuyer,
  requireBuyerPage,
};
