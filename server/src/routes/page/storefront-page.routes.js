const express = require("express");
const { renderProductDetailPage, renderStorefront } = require("../../controllers/page.controller");

function registerStorefrontPageRoutes(router = express.Router()) {
  router.get("/stores/:handle", renderStorefront);
  router.get("/products/:productId", renderProductDetailPage);
  return router;
}

module.exports = {
  registerStorefrontPageRoutes,
};
