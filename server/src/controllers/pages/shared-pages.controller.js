const legacy = require("./page.controller.legacy");

module.exports = {
  buildPage: legacy.buildPage,
  pageCatalog: legacy.pageCatalog,
  redirectLegacy: legacy.redirectLegacy,
  renderAuthPage: legacy.renderAuthPage,
  renderPage: legacy.renderPage,
};
