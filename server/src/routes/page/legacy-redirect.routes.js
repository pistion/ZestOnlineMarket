const express = require("express");
const { redirectLegacy } = require("../../controllers/page.controller");

function registerLegacyRedirectRoutes(router = express.Router()) {
  router.get("/index.html", redirectLegacy("landingHome"));
  router.get("/html/SignIN/signin.html", redirectLegacy("signin"));
  router.get("/html/extended/SignIN/signin.html", redirectLegacy("signin"));
  router.get("/html/Buyer-View/customer_profile.html", redirectLegacy("buyerProfile"));
  router.get("/html/extended/Customer_profile/customer_profile.html", redirectLegacy("buyerProfile"));
  router.get("/html/Buyer-View/product-viewr-page/product-page.html", redirectLegacy("buyerProductViewer"));
  router.get("/html/Buyer-View/Prdt Viewer/index.html", redirectLegacy("buyerProductViewer"));
  router.get("/html/CheckOut/CheckOutPageGrok.html", redirectLegacy("buyerCheckout"));
  router.get("/html/extended/DashboardGrok/index.html", redirectLegacy("sellerDashboard"));
  router.get("/html/extended/Main-Hub_store/index.html", redirectLegacy("sellerStoreHome"));
  router.get("/html/extended/World_Feed/world_feed_clean.html", redirectLegacy("globalFeed"));
  router.get("/html/extended/Store/index.html", redirectLegacy("sellerStoreRoot"));
  router.get("/html/extended/Store/root-template.html", redirectLegacy("sellerStoreRoot"));
  router.get("/html/extended/Wizerd_setup/Wizerd_setup_clean.html", redirectLegacy("sellerWizard"));
  router.get("/html/Error/error-400/index.html", redirectLegacy("error400"));
  router.get("/html/Error/error-401/index.html", redirectLegacy("error401"));
  router.get("/html/Error/error-403/index.html", redirectLegacy("error403"));
  router.get("/html/Error/error-404/index.html", redirectLegacy("error404"));
  router.get("/html/Error/error-429/index.html", redirectLegacy("error429"));
  router.get("/html/Error/error-500/index.html", redirectLegacy("error500"));
  router.get("/html/Error/error-502/index.html", redirectLegacy("error502"));
  router.get("/html/Error/error-503/index.html", redirectLegacy("error503"));
  router.get("/html/Error/error-504/index.html", redirectLegacy("error504"));

  router.get(
    /^\/html\/extended\/Store\/Template-A \(Products\)\/template_products\.html$/,
    redirectLegacy("sellerTemplateProducts")
  );
  router.get(
    /^\/html\/extended\/Store\/Template-B \(Skills\)\/Art\/index\.html$/,
    redirectLegacy("sellerTemplateArt")
  );
  router.get(
    /^\/html\/extended\/Store\/Template-B \(Skills\)\/Music\/music-store-v2\.html$/,
    redirectLegacy("sellerTemplateMusic")
  );
  router.get(
    /^\/html\/extended\/Store\/Template-B \(Skills\)\/Photography\/Zip\/template-photography\.html$/,
    redirectLegacy("sellerTemplatePhotography")
  );
  router.get(
    /^\/html\/extended\/Store\/Template-B \(Skills\)\/Programmer\/template-coder\.html$/,
    redirectLegacy("sellerTemplateProgrammer")
  );
  router.get(
    /^\/html\/extended\/Store\/Template-C \(Educational\)\/Classes\/ocean_teaching_mod\.html$/,
    redirectLegacy("sellerTemplateClasses")
  );
  return router;
}

module.exports = {
  registerLegacyRedirectRoutes,
};
