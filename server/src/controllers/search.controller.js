const { sendSuccess } = require("../utils/api-response");
const { searchMarketplace } = require("../services/search.service");

async function getSearchResults(req, res, next) {
  try {
    const results = await searchMarketplace(req.query || {}, {
      user: req.user || null,
    });

    return sendSuccess(res, results, "Search results loaded");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSearchResults,
};
