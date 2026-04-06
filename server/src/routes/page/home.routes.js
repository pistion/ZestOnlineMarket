const { renderPage, redirectLegacy } = require("../../controllers/page.controller");
const { renderBuyerFeedPage, renderGlobalFeedPage } = require("../../controllers/feed.controller");
const express = require("express");

function registerHomeRoutes(router = express.Router()) {
  router.get("/", renderPage("landingHome"));
  router.get("/feed", renderGlobalFeedPage);
  router.get("/global-feed", redirectLegacy("globalFeed"));
  router.get("/marketplace", require("../../controllers/seller.controller").renderMarketplacePage);
  router.get("/seller/store-home", redirectLegacy("sellerStoreHome"));
  return router;
}

module.exports = {
  registerHomeRoutes,
};
