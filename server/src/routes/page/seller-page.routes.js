const express = require("express");

const { requirePageAuth } = require("../../middleware/auth.middleware");
const { requireSellerPage } = require("../../middleware/seller.middleware");
const {
  attachSellerStore,
  redirectSellerWithStore,
  requireSellerStorePage,
} = require("../../middleware/seller-store.middleware");
const {
  renderSellerOrdersPage,
} = require("../../controllers/commerce.controller");
const {
  renderSellerDashboardPage,
  renderSellerStoreRootPage,
  renderSellerStoreTemplatePage,
  renderSellerStoreSettingsPage,
  renderSellerTemplateArtPage,
  renderSellerTemplateClassesPage,
  renderSellerTemplateMusicPage,
  renderSellerTemplatePhotographyPage,
  renderSellerTemplateProductsPage,
  renderSellerTemplateProgrammerPage,
  renderSellerWizardPage,
} = require("../../controllers/seller.controller");

function registerSellerPageRoutes(router = express.Router()) {
  router.get(
    "/seller/orders",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerOrdersPage
  );
  router.get(
    "/seller/dashboard",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerDashboardPage
  );
  router.get(
    "/seller/store",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    redirectSellerWithStore,
    renderSellerStoreRootPage
  );
  router.get(
    "/seller/store/settings",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerStoreSettingsPage
  );
  router.get(
    "/seller/store/template",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    renderSellerStoreTemplatePage
  );
  router.get(
    "/seller/wizard-setup",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    renderSellerWizardPage
  );
  router.get(
    "/seller/templates/products",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplateProductsPage
  );
  router.get(
    "/seller/templates/art",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplateArtPage
  );
  router.get(
    "/seller/templates/music",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplateMusicPage
  );
  router.get(
    "/seller/templates/photography",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplatePhotographyPage
  );
  router.get(
    "/seller/templates/programmer",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplateProgrammerPage
  );
  router.get(
    "/seller/templates/classes",
    requirePageAuth("seller"),
    requireSellerPage,
    attachSellerStore,
    requireSellerStorePage,
    renderSellerTemplateClassesPage
  );
  return router;
}

module.exports = {
  registerSellerPageRoutes,
};
