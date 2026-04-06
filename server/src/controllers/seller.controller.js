const { renderPage, renderSellerWizardPage } = require("./page.controller");
const { sendSuccess } = require("../utils/api-response");
const { buildSellerWorkspaceSummary } = require("../services/seller.service");
const { resolveSellerTemplatePath } = require("../utils/store-template");

async function getSellerWorkspace(req, res, next) {
  try {
    const summary = await buildSellerWorkspaceSummary(req.user.id);
    return sendSuccess(res, summary, "Seller workspace loaded");
  } catch (error) {
    return next(error);
  }
}

function renderSellerTemplatePage(pageKey, templateKey) {
  return renderPage(pageKey, (req) => {
    const store = req.sellerStore || null;
    const handle = store && store.handle ? String(store.handle).trim() : "";
    const storePath = handle ? `/stores/${handle}` : "";
    const storeName = store && store.storeName ? String(store.storeName).trim() : "";
    const signInPath = `/auth/signin?role=buyer&returnTo=${encodeURIComponent(storePath || "/marketplace")}`;

    const overrides = {
      bodyAttrs: {
        "public-store": "0",
        "store-template-key": templateKey,
        "store-handle": handle,
        "store-path": storePath,
        "product-id": "",
        "product-path": "",
        "checkout-path": "/buyer/checkout",
        "store-api-endpoint": "/api/store/me",
        "store-feed-endpoint": "/api/feed/store/me",
        "viewer-authenticated": "1",
        "viewer-role": req.user && req.user.role ? String(req.user.role).trim().toLowerCase() : "seller",
        "signin-path": signInPath,
      },
    };

    if (storeName) {
      overrides.title = `${storeName} | Zest Store`;
    }

    return overrides;
  });
}

function renderSellerArtTemplatePage(req, res) {
  const store = req.sellerStore || null;
  const handle = store && store.handle ? String(store.handle).trim() : "";
  const storePath = handle ? `/stores/${handle}` : "";
  const storeName = store && store.storeName ? String(store.storeName).trim() : "";
  const signInPath = `/auth/signin?role=buyer&returnTo=${encodeURIComponent(storePath || "/marketplace")}`;

  const overrides = {
    bodyAttrs: {
      "public-store": "0",
      "store-template-key": "art",
      "store-handle": handle,
      "store-path": storePath,
      "product-id": "",
      "product-path": "",
      "checkout-path": "/buyer/checkout",
      "store-api-endpoint": "/api/art/store/me",
      "store-feed-endpoint": "/api/feed/store/me",
      "art-store-save-endpoint": "/api/art/store/me",
      "art-listings-endpoint": "/api/art/listings",
      "viewer-authenticated": "1",
      "viewer-role": req.user && req.user.role ? String(req.user.role).trim().toLowerCase() : "seller",
      "signin-path": signInPath,
    },
  };

  if (storeName) {
    overrides.title = `${storeName} | Zest Store`;
  }

  return renderPage("sellerTemplateArt", overrides)(req, res);
}

module.exports = {
  getSellerWorkspace,
  renderMarketplacePage: renderPage("sellerStoreHome"),
  renderSellerDashboardPage: renderPage("sellerDashboard"),
  renderSellerStoreRootPage: renderPage("sellerStoreRoot"),
  renderSellerStoreTemplatePage: (req, res) => {
    if (!req.sellerStore) {
      return res.redirect(302, "/seller/store");
    }
    return renderPage("sellerStoreTemplate")(req, res);
  },
  renderSellerStoreSettingsPage: renderPage("sellerStoreSettings"),
  renderSellerTemplateArtPage: renderSellerArtTemplatePage,
  renderSellerTemplateClassesPage: renderSellerTemplatePage("sellerTemplateClasses", "classes"),
  renderSellerTemplateMusicPage: renderSellerTemplatePage("sellerTemplateMusic", "music"),
  renderSellerTemplatePhotographyPage: renderSellerTemplatePage("sellerTemplatePhotography", "photography"),
  renderSellerTemplateProductsPage: renderSellerTemplatePage("sellerTemplateProducts", "products"),
  renderSellerTemplateProgrammerPage: renderSellerTemplatePage("sellerTemplateProgrammer", "programmer"),
  renderSellerWizardPage,
};
