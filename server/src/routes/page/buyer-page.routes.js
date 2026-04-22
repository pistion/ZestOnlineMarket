const express = require("express");

const { requirePageAuth } = require("../../middleware/auth.middleware");
const {
  attachBuyerProfile,
  redirectCompletedBuyerSetup,
  requireBuyerPage,
  requireBuyerSetupEntry,
} = require("../../middleware/buyer.middleware");
const {
  renderBuyerCartPage,
  renderBuyerCheckoutPage,
  renderBuyerCompatibilityProductViewer,
  renderBuyerProfilePage,
  renderBuyerSettingsPage,
  renderBuyerWizardPage,
} = require("../../controllers/buyer.controller");
const {
  renderBuyerOrderDetailPage,
  renderBuyerOrdersPage,
} = require("../../controllers/commerce.controller");
const { renderBuyerFeedPage } = require("../../controllers/feed.controller");
const { redirectLegacy } = require("../../controllers/page.controller");

function registerBuyerPageRoutes(router = express.Router()) {
  router.get(
    "/buyer/feed",
    requirePageAuth("buyer"),
    requireBuyerPage,
    attachBuyerProfile,
    renderBuyerFeedPage
  );
  router.get(
    "/buyer/wizard-setup",
    requireBuyerSetupEntry,
    requireBuyerPage,
    attachBuyerProfile,
    redirectCompletedBuyerSetup,
    renderBuyerWizardPage
  );
  router.get(
    "/buyer/profile",
    requirePageAuth("buyer"),
    requireBuyerPage,
    attachBuyerProfile,
    renderBuyerProfilePage
  );
  router.get(
    "/buyer/settings",
    requirePageAuth("buyer"),
    requireBuyerPage,
    attachBuyerProfile,
    renderBuyerSettingsPage
  );
  router.get(
    "/buyer/purchases",
    requirePageAuth("buyer"),
    requireBuyerPage,
    attachBuyerProfile,
    renderBuyerOrdersPage
  );
  router.get(
    "/buyer/purchases/:orderId",
    requirePageAuth("buyer"),
    requireBuyerPage,
    attachBuyerProfile,
    renderBuyerOrderDetailPage
  );
  router.get("/buyer/customer-profile", redirectLegacy("buyerProfile"));
  router.get("/buyer/product-viewer", renderBuyerCompatibilityProductViewer);
  router.get("/buyer/cart", requirePageAuth("buyer"), requireBuyerPage, renderBuyerCartPage);
  router.get("/buyer/checkout", requirePageAuth("buyer"), requireBuyerPage, renderBuyerCheckoutPage);
  return router;
}

module.exports = {
  registerBuyerPageRoutes,
};
