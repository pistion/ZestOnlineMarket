const { renderPage } = require("./page.controller");
const { sendSuccess } = require("../utils/api-response");
const createBuyerProfileSandboxPayload = require("../../../fixtures/buyer-profile-sandbox");

const renderSandboxBuyerProfilePage = renderPage("sandboxBuyerProfile");

async function getSandboxBuyerProfile(req, res, next) {
  try {
    return sendSuccess(
      res,
      createBuyerProfileSandboxPayload(),
      "Sandbox buyer profile loaded"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSandboxBuyerProfile,
  renderSandboxBuyerProfilePage,
};
