const { findStoreByUserId } = require("../repositories/store.repository");
const {
  resolveSellerAppPath,
  resolveSellerSetupPath,
} = require("../services/account-routing.service");

async function attachSellerStore(req, res, next) {
  if (!req.user || req.user.role !== "seller") {
    req.sellerStore = null;
    return next();
  }

  try {
    const store = await findStoreByUserId(req.user.id);
    req.sellerStore = store || null;
    res.locals.sellerStore = store || null;
    return next();
  } catch (error) {
    return next(error);
  }
}

function redirectSellerWithStore(req, res, next) {
  if (!req.sellerStore) {
    return next();
  }

  return res.redirect(302, resolveSellerAppPath(req.sellerStore));
}

function requireSellerStorePage(req, res, next) {
  if (req.sellerStore) {
    if (!req.sellerStore.profileCompleted) {
      return res.redirect(302, resolveSellerSetupPath(req.sellerStore));
    }

    return next();
  }

  return res.redirect(302, "/seller/store");
}

module.exports = {
  attachSellerStore,
  redirectSellerWithStore,
  requireSellerStorePage,
};
