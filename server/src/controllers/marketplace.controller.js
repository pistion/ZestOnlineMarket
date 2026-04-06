const { sendSuccess } = require("../utils/api-response");
const { listMarketplaceStalls } = require("../services/storefront.service");

async function getMarketplaceStalls(req, res, next) {
  try {
    const stalls = await listMarketplaceStalls();
    return sendSuccess(res, { stalls }, "Marketplace stalls loaded");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMarketplaceStalls,
};
