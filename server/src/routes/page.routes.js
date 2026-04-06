const express = require("express");

const { registerAuthPageRoutes } = require("./page/auth-page.routes");
const { registerBuyerPageRoutes } = require("./page/buyer-page.routes");
const { registerErrorRoutes } = require("./page/error.routes");
const { registerHomeRoutes } = require("./page/home.routes");
const { registerLegacyRedirectRoutes } = require("./page/legacy-redirect.routes");
const { registerSellerPageRoutes } = require("./page/seller-page.routes");
const { registerStorefrontPageRoutes } = require("./page/storefront-page.routes");

const router = express.Router();

registerHomeRoutes(router);
registerAuthPageRoutes(router);
registerBuyerPageRoutes(router);
registerSellerPageRoutes(router);
registerStorefrontPageRoutes(router);
registerErrorRoutes(router);
registerLegacyRedirectRoutes(router);

module.exports = router;
