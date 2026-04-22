const { buildProductDetailPayload } = require("../product.controller");
const { findStoreByUserId } = require("../../repositories/store.repository");
const {
  APP_PATHS,
  resolveAuthenticatedAppState,
  resolveBuyerHomePath,
  resolveBuyerSetupPath,
  resolveSellerSetupPath,
} = require("../../services/account-routing.service");
const { resolveStorePayloadByHandle } = require("../../services/storefront.service");
const { normalizeInternalPath } = require("../../utils/auth-session");
const { normalizeHandle } = require("../../schemas/shared.schema");
const {
  isValidTemplateKey,
  normalizeTemplateKey,
  resolveTemplatePageKey,
  resolveSellerTemplatePath,
} = require("../../utils/store-template");

const DEFAULT_TITLE = "Zest Online Market";
const INTER_FONT =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
const MONTSERRAT_FONT =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&display=swap";
const PLAYFAIR_FONT =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap";
const MUSIC_FONTS =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&display=swap";
const CLASSES_FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap";
const PHOTOGRAPHY_FONTS =
  "https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
const PROGRAMMER_FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
const CHART_JS = "https://cdn.jsdelivr.net/npm/chart.js";
const BOOTSTRAP_CSS = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
const BOOTSTRAP_JS = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
const ART_STOREFRONT_STYLES = ["/assets/css/seller/template-art.css"];
const ART_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-art.js",
];
const SERVICE_STOREFRONT_STYLES = ["/assets/css/seller/template-service-storefront.css"];
const SERVICE_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-service-storefront.js",
];
const MUSIC_STOREFRONT_STYLES = ["/assets/css/seller/template-music.css"];
const MUSIC_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-music.js",
];
const CLASSES_STOREFRONT_STYLES = ["/assets/css/seller/template-classes.css"];
const CLASSES_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-classes.js",
];
const PHOTOGRAPHY_STOREFRONT_STYLES = ["/assets/css/seller/template-photography.css"];
const PHOTOGRAPHY_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-photography.js",
];
const PROGRAMMER_STOREFRONT_STYLES = ["/assets/css/seller/template-programmer.css"];
const PROGRAMMER_STOREFRONT_SCRIPTS = [
  "/assets/js/shared/template-navigation.js",
  "/assets/js/shared/store-following.js",
  "/assets/js/shared/buyer-interactions.js",
  "/assets/js/seller/template-programmer.js",
];

function buildStorefrontBodyAttrs(templateKey, storeApiEndpoint = "/api/store/me") {
  return {
    "public-store": "0",
    "store-template-key": templateKey,
    "store-handle": "",
    "store-path": "",
    "product-id": "",
    "product-path": "",
    "checkout-path": APP_PATHS.buyerCart,
    "store-api-endpoint": storeApiEndpoint,
    "store-feed-endpoint": "/api/feed/store/me",
    "marketplace-path": APP_PATHS.marketplace,
    "global-feed-path": APP_PATHS.globalFeed,
    "seller-dashboard-path": APP_PATHS.sellerDashboard,
    "seller-settings-path": APP_PATHS.sellerStoreSettings,
    "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
    "seller-products-path": resolveSellerTemplatePath("products"),
    "signin-path": APP_PATHS.authSignin,
  };
}

function buildStorefrontPageConfig({
  path,
  view,
  title,
  templateKey,
  styles,
  scripts,
  externalStyles = [],
  bodyClass,
  storeApiEndpoint,
}) {
  return {
    path,
    view,
    title,
    styles,
    scripts,
    externalStyles,
    bodyClass,
    bodyAttrs: buildStorefrontBodyAttrs(templateKey, storeApiEndpoint),
  };
}

function buildServiceStorefrontPageConfig({ path, view, title, templateKey }) {
  return buildStorefrontPageConfig({
    path,
    view,
    title,
    templateKey,
    styles: SERVICE_STOREFRONT_STYLES,
    scripts: SERVICE_STOREFRONT_SCRIPTS,
    bodyClass: `service-storefront-page service-storefront-page--${templateKey}`,
  });
}

function buildMusicStorefrontPageConfig({ path, view, title }) {
  return buildStorefrontPageConfig({
    path,
    view,
    title,
    templateKey: "music",
    styles: MUSIC_STOREFRONT_STYLES,
    scripts: MUSIC_STOREFRONT_SCRIPTS,
    externalStyles: [MUSIC_FONTS],
    bodyClass: "pulse-storefront-page",
  });
}

function buildClassesStorefrontPageConfig({ path, view, title }) {
  return buildStorefrontPageConfig({
    path,
    view,
    title,
    templateKey: "classes",
    styles: CLASSES_STOREFRONT_STYLES,
    scripts: CLASSES_STOREFRONT_SCRIPTS,
    externalStyles: [CLASSES_FONTS],
    bodyClass: "academy-storefront-page",
  });
}

function buildPhotographyStorefrontPageConfig({ path, view, title }) {
  return buildStorefrontPageConfig({
    path,
    view,
    title,
    templateKey: "photography",
    styles: PHOTOGRAPHY_STOREFRONT_STYLES,
    scripts: PHOTOGRAPHY_STOREFRONT_SCRIPTS,
    externalStyles: [PHOTOGRAPHY_FONTS],
    bodyClass: "photography-storefront-page",
  });
}

function buildProgrammerStorefrontPageConfig({ path, view, title }) {
  return buildStorefrontPageConfig({
    path,
    view,
    title,
    templateKey: "programmer",
    styles: PROGRAMMER_STOREFRONT_STYLES,
    scripts: PROGRAMMER_STOREFRONT_SCRIPTS,
    externalStyles: [PROGRAMMER_FONTS],
    bodyClass: "programmer-storefront-page",
  });
}

function buildArtStorefrontPageConfig({ path, view, title }) {
  return {
    path,
    view,
    title,
    styles: ART_STOREFRONT_STYLES,
    scripts: ART_STOREFRONT_SCRIPTS,
    externalStyles: [PLAYFAIR_FONT],
    bodyClass: "atelier-storefront-page",
    bodyAttrs: {
      "public-store": "0",
      "store-template-key": "art",
      "store-handle": "",
      "store-path": "",
      "product-id": "",
      "product-path": "",
      "checkout-path": APP_PATHS.buyerCart,
      "store-api-endpoint": "/api/art/store/me",
      "store-feed-endpoint": "/api/feed/store/me",
      "art-store-save-endpoint": "/api/art/store/me",
      "art-listings-endpoint": "/api/art/listings",
      "marketplace-path": APP_PATHS.marketplace,
      "global-feed-path": APP_PATHS.globalFeed,
      "seller-dashboard-path": APP_PATHS.sellerDashboard,
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
      "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
      "viewer-authenticated": "",
      "viewer-role": "",
      "signin-path": APP_PATHS.authSignin,
    },
  };
}

const pageCatalog = {
  landingHome: {
    path: APP_PATHS.home,
    view: "pages/home/landing",
    title: "Zest - Empowering SMEs, One Stall At A Time",
    styles: ["/assets/css/home/landing.css"],
    scripts: ["/assets/js/home/landing.js"],
    externalStyles: [MONTSERRAT_FONT],
    bodyClass: "landing-home",
  },
  buyerFeed: {
    path: APP_PATHS.buyerFeed,
    view: "pages/home/feed",
    title: "Your Buyer Feed",
    styles: ["/assets/css/home/feed.css"],
    scripts: [
      "/assets/js/shared/store-following.js",
      "/assets/js/shared/buyer-interactions.js",
      "/assets/js/home/feed.js",
    ],
    bodyClass: "feed-page",
    feedMode: "buyer",
    bodyAttrs: {
      "feed-mode": "buyer",
      "feed-api-endpoint": "/api/buyer/feed",
    },
  },
  globalFeed: {
    path: APP_PATHS.globalFeed,
    view: "pages/home/feed",
    title: "Global Feed",
    styles: ["/assets/css/home/feed.css"],
    scripts: [
      "/assets/js/shared/store-following.js",
      "/assets/js/shared/buyer-interactions.js",
      "/assets/js/home/feed.js",
    ],
    bodyClass: "feed-page",
    feedMode: "global",
    bodyAttrs: {
      "feed-mode": "global",
      "feed-api-endpoint": "/api/feed",
    },
  },
  signin: {
    path: APP_PATHS.authSignin,
    view: "pages/auth/auth",
    title: "Zest | Sign In",
    styles: ["/assets/css/auth/auth.css"],
    scripts: ["/assets/js/auth/auth.js"],
    bodyAttrs: {
      authMode: "signin",
    },
  },
  signup: {
    path: "/auth/signup",
    view: "pages/auth/auth",
    title: "Zest | Sign Up",
    styles: ["/assets/css/auth/auth.css"],
    scripts: ["/assets/js/auth/auth.js"],
    bodyAttrs: {
      authMode: "signup",
    },
  },
  buyerProfile: {
    path: APP_PATHS.buyerProfile,
    view: "pages/buyer/customer-profile",
    title: "Zest Marketplace Profile",
    styles: ["/assets/css/buyer/customer-profile.css"],
    scripts: ["/assets/js/shared/buyer-wishlist.js", "/assets/js/buyer/customer-profile.js"],
    bodyAttrs: {
      "buyer-profile-endpoint": "/api/buyer/me",
    },
  },
  buyerSettings: {
    path: APP_PATHS.buyerSettings,
    view: "pages/buyer/settings",
    title: "Buyer Settings",
    styles: ["/assets/css/buyer/settings.css"],
    scripts: ["/assets/js/buyer/settings.js"],
    bodyAttrs: {
      "buyer-settings-endpoint": "/api/buyer/settings",
      "buyer-settings-save-endpoint": "/api/buyer/settings",
      "buyer-addresses-endpoint": "/api/buyer/addresses",
    },
  },
  buyerWizard: {
    path: APP_PATHS.buyerWizard,
    view: "pages/buyer/wizard-setup",
    title: "Buyer Setup Wizard",
    styles: ["/assets/css/buyer/wizard-setup.css"],
    scripts: ["/assets/js/buyer/wizard-setup.js"],
    bodyClass: "buyer-wizard-page",
    bodyAttrs: {
      "buyer-profile-endpoint": "/api/buyer/me",
      "buyer-setup-endpoint": "/api/buyer/profile",
      "buyer-profile-path": APP_PATHS.buyerProfile,
      "buyer-feed-path": APP_PATHS.buyerFeed,
      "buyer-marketplace-path": APP_PATHS.marketplace,
      "buyer-global-feed-path": APP_PATHS.globalFeed,
    },
  },
  sandboxBuyerProfile: {
    path: "/sandbox/buyer-profile",
    view: "pages/sandbox/buyer-profile",
    title: "Buyer Profile Sandbox",
    styles: [
      "/assets/css/buyer/customer-profile.css",
      "/assets/css/sandbox/buyer-profile-sandbox.css",
    ],
    scripts: [
      "/assets/js/buyer/customer-profile.js",
      "/assets/js/sandbox/buyer-profile-sandbox.js",
    ],
    bodyClass: "buyer-profile-sandbox-page",
    bodyAttrs: {
      "buyer-profile-endpoint": "/api/sandbox/buyer-profile",
      "sandbox-mode": "buyer-profile",
    },
  },
  buyerProductViewer: {
    path: APP_PATHS.buyerProductViewer,
    view: "pages/buyer/product-viewer",
    title: "Product View",
    styles: ["/assets/css/buyer/product-viewer.css"],
    scripts: [
      "/assets/js/shared/buyer-interactions.js",
      "/assets/js/shared/buyer-wishlist.js",
      "/assets/js/buyer/product-viewer.js",
    ],
  },
  buyerCart: {
    path: APP_PATHS.buyerCart,
    view: "pages/buyer/cart",
    title: "Your cart",
    styles: ["/assets/css/buyer/cart.css"],
    scripts: ["/assets/js/buyer/cart.js"],
    bodyAttrs: {
      "cart-api-endpoint": "/api/cart",
      "checkout-page-path": APP_PATHS.buyerCheckout,
    },
  },
  buyerCheckout: {
    path: APP_PATHS.buyerCheckout,
    view: "pages/buyer/checkout",
    title: "Checkout",
    styles: ["/assets/css/buyer/checkout.css"],
    scripts: ["/assets/js/buyer/checkout.js"],
    bodyAttrs: {
      "cart-api-endpoint": "/api/cart",
      "checkout-summary-endpoint": "/api/buyer/checkout/summary",
      "checkout-order-endpoint": "/api/buyer/checkout/orders",
      "buyer-cart-path": APP_PATHS.buyerCart,
      "buyer-orders-path": "/buyer/purchases",
    },
  },
  buyerOrders: {
    path: "/buyer/purchases",
    view: "pages/buyer/orders",
    title: "Your Orders",
    styles: ["/assets/css/buyer/orders.css"],
    scripts: ["/assets/js/buyer/orders.js"],
    bodyAttrs: {
      "buyer-orders-endpoint": "/api/buyer/orders",
    },
  },
  buyerOrderDetail: {
    path: "/buyer/purchases/:orderId",
    view: "pages/buyer/order-detail",
    title: "Order detail",
    styles: ["/assets/css/buyer/order-detail.css"],
    scripts: ["/assets/js/buyer/order-detail.js"],
  },
  buyerSearch: {
    path: "/search",
    view: "pages/buyer/search",
    title: "Search",
    styles: ["/assets/css/buyer/search.css"],
    layoutHeader: true,
    bodyClass: "buyer-search-page",
    bodyAttrs: {
      "search-endpoint": "/api/search",
      "search-marketplace-path": APP_PATHS.marketplace,
      "search-feed-path": APP_PATHS.globalFeed,
    },
  },
  sellerDashboard: {
    path: APP_PATHS.sellerDashboard,
    view: "pages/seller/dashboard",
    title: "Store Dashboard",
    styles: ["/assets/css/seller/dashboard.css"],
    scripts: ["/assets/js/seller/dashboard.js"],
    externalScripts: [CHART_JS],
    bodyAttrs: {
      "seller-overview-endpoint": "/api/seller/me",
      "seller-discount-endpoint": "/api/discounts",
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
    },
  },
  sellerOrders: {
    path: "/seller/orders",
    view: "pages/seller/orders",
    title: "Store Orders",
    styles: ["/assets/css/seller/orders.css"],
    scripts: ["/assets/js/seller/orders.js"],
    bodyAttrs: {
      "seller-orders-endpoint": "/api/seller/orders",
    },
  },
  sellerStoreHome: {
    path: APP_PATHS.marketplace,
    view: "pages/seller/store-home",
    title: "Zest Marketplace",
    styles: ["/assets/css/seller/store-home.css"],
    scripts: [
      "/assets/js/shared/store-following.js",
      "/assets/js/shared/buyer-interactions.js",
      "/assets/js/seller/store-home.js",
    ],
    externalStyles: [BOOTSTRAP_CSS],
    externalScripts: [BOOTSTRAP_JS],
    bodyClass: "marketplace-page",
  },
  sellerStoreRoot: {
    path: APP_PATHS.sellerStore,
    view: "pages/seller/store-root",
    title: "Choose Your Store",
    styles: ["/assets/css/seller/store-root.css"],
    scripts: ["/assets/js/seller/store-root.js"],
    bodyAttrs: {
      "seller-template-flow-mode": "onboarding",
      "seller-store-endpoint": "/api/store/me",
      "seller-wizard-path": APP_PATHS.sellerWizard,
      "seller-dashboard-path": APP_PATHS.sellerDashboard,
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
      "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
    },
  },
  sellerStoreTemplate: {
    path: APP_PATHS.sellerStoreTemplate,
    view: "pages/seller/store-root",
    title: "Choose Store Template",
    styles: ["/assets/css/seller/store-root.css"],
    scripts: ["/assets/js/seller/store-root.js"],
    bodyAttrs: {
      "seller-template-flow-mode": "settings",
      "seller-store-endpoint": "/api/store/me",
      "seller-wizard-path": APP_PATHS.sellerWizard,
      "seller-dashboard-path": APP_PATHS.sellerDashboard,
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
      "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
    },
  },
  sellerWizard: {
    path: APP_PATHS.sellerWizard,
    view: "pages/seller/wizard-setup",
    title: "Store Wizard",
    styles: ["/assets/css/seller/wizard-setup.css"],
    scripts: ["/assets/js/seller/wizard-setup.js"],
    bodyAttrs: {
      "seller-flow-mode": "onboarding",
      "seller-store-endpoint": "/api/store/me",
      "seller-draft-endpoint": "/api/seller/store/draft",
      "seller-settings-endpoint": "/api/store",
      "seller-visibility-endpoint": "/api/seller/store/visibility",
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
      "seller-dashboard-path": APP_PATHS.sellerDashboard,
      "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
    },
  },
  sellerStoreSettings: {
    path: APP_PATHS.sellerStoreSettings,
    view: "pages/seller/wizard-setup",
    title: "Store Settings",
    styles: ["/assets/css/seller/wizard-setup.css"],
    scripts: ["/assets/js/seller/wizard-setup.js"],
    bodyAttrs: {
      "seller-flow-mode": "settings",
      "seller-store-endpoint": "/api/store/me",
      "seller-draft-endpoint": "/api/seller/store/draft",
      "seller-settings-endpoint": "/api/store",
      "seller-visibility-endpoint": "/api/seller/store/visibility",
      "seller-settings-path": APP_PATHS.sellerStoreSettings,
      "seller-dashboard-path": APP_PATHS.sellerDashboard,
      "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
    },
  },
  sellerTemplateProducts: {
    path: "/seller/templates/products",
    view: "pages/seller/template-products",
    title: "Products Store",
    styles: ["/assets/css/seller/template-products.css"],
    scripts: [
      "/assets/js/shared/template-navigation.js",
      "/assets/js/shared/buyer-interactions.js",
      "/assets/js/shared/public-storefront.js",
      "/assets/js/shared/store-following.js",
      "/assets/js/seller/template-products.js",
    ],
  },
  sellerTemplateArt: buildArtStorefrontPageConfig({
    path: "/seller/templates/art",
    view: "pages/seller/template-art",
    title: "Artists Studio",
  }),
  sellerTemplateMusic: buildMusicStorefrontPageConfig({
    path: "/seller/templates/music",
    view: "pages/seller/template-music",
    title: "Music Studio",
  }),
  sellerTemplatePhotography: buildPhotographyStorefrontPageConfig({
    path: "/seller/templates/photography",
    view: "pages/seller/template-photography",
    title: "Photography Studio",
  }),
  sellerTemplateProgrammer: buildProgrammerStorefrontPageConfig({
    path: "/seller/templates/programmer",
    view: "pages/seller/template-programmer",
    title: "Developer Profile",
  }),
  sellerTemplateClasses: buildClassesStorefrontPageConfig({
    path: "/seller/templates/classes",
    view: "pages/seller/template-classes",
    title: "Classes Studio",
  }),
  error400: {
    path: "/errors/400",
    view: "pages/errors/400",
    title: "Zest 400 Error",
    styles: ["/assets/css/errors/400.css"],
    scripts: ["/assets/js/errors/400.js"],
  },
  error401: {
    path: "/errors/401",
    view: "pages/errors/401",
    title: "Zest 401 Error",
    styles: ["/assets/css/errors/401.css"],
    scripts: ["/assets/js/errors/401.js"],
  },
  error403: {
    path: "/errors/403",
    view: "pages/errors/403",
    title: "Zest 403 Error",
    styles: ["/assets/css/errors/403.css"],
    scripts: ["/assets/js/errors/403.js"],
  },
  error404: {
    path: "/errors/404",
    view: "pages/errors/404",
    title: "Zest 404 Error",
    styles: ["/assets/css/errors/404.css"],
    scripts: ["/assets/js/errors/404.js"],
  },
  error429: {
    path: "/errors/429",
    view: "pages/errors/429",
    title: "Zest 429 Error",
    styles: ["/assets/css/errors/429.css"],
    scripts: ["/assets/js/errors/429.js"],
  },
  error500: {
    path: "/errors/500",
    view: "pages/errors/500",
    title: "Zest 500 Error",
    styles: ["/assets/css/errors/500.css"],
    scripts: ["/assets/js/errors/500.js"],
  },
  error502: {
    path: "/errors/502",
    view: "pages/errors/502",
    title: "Zest 502 Error",
    styles: ["/assets/css/errors/502.css"],
    scripts: ["/assets/js/errors/502.js"],
  },
  error503: {
    path: "/errors/503",
    view: "pages/errors/503",
    title: "Zest 503 Error",
    styles: ["/assets/css/errors/503.css"],
    scripts: ["/assets/js/errors/503.js"],
  },
  error504: {
    path: "/errors/504",
    view: "pages/errors/504",
    title: "Zest 504 Error",
    styles: ["/assets/css/errors/504.css"],
    scripts: ["/assets/js/errors/504.js"],
  },
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function buildPage(key, overrides = {}) {
  const config = pageCatalog[key];
  if (!config) {
    throw new Error(`Unknown page config: ${key}`);
  }

  return {
    title: DEFAULT_TITLE,
    externalStyles: [INTER_FONT, FONT_AWESOME],
    styles: ["/assets/css/global.css", "/assets/css/shared/ui.css"],
    externalScripts: [],
    scripts: [],
    bodyAttrs: {},
    layoutHeader: false,
    layoutFooter: false,
    ...config,
    ...overrides,
    externalStyles: unique([
      INTER_FONT,
      FONT_AWESOME,
      ...(config.externalStyles || []),
      ...(overrides.externalStyles || []),
    ]),
    styles: unique([
      "/assets/css/global.css",
      "/assets/css/shared/ui.css",
      ...(config.styles || []),
      ...(overrides.styles || []),
    ]),
    externalScripts: unique([
      ...(config.externalScripts || []),
      ...(overrides.externalScripts || []),
    ]),
    scripts: unique([...(config.scripts || []), ...(overrides.scripts || [])]),
    bodyAttrs: {
      ...(config.bodyAttrs || {}),
      ...(overrides.bodyAttrs || {}),
    },
  };
}

function renderPage(key, overrides) {
  return (req, res) => {
    const resolvedOverrides =
      typeof overrides === "function" ? overrides(req, res) || {} : overrides || {};

    return renderLayout(res, key, resolvedOverrides);
  };
}

function renderLayout(res, key, overrides = {}) {
  return res.render("layout", {
    page: buildPage(key, overrides),
    flash: res.locals.flash,
  });
}

async function buildAuthPageOverrides(req, mode) {
  const currentUser = req.user || null;
  const signedOut = req.query.signedOut === "1";
  const shouldExposeActiveSession = mode === "signin" && !signedOut && Boolean(currentUser);
  let currentSessionHomePath = "";
  if (shouldExposeActiveSession) {
    const appState = await resolveAuthenticatedAppState(currentUser);
    currentSessionHomePath = appState.redirectTo || "";
  }

  return {
    bodyAttrs: {
      "auth-mode": mode,
      "auth-role": req.query.role === "seller" ? "seller" : "buyer",
      "return-to": normalizeInternalPath(req.query.returnTo, ""),
      "auth-signed-out": signedOut ? "1" : "0",
      "auth-session-active": shouldExposeActiveSession ? "1" : "0",
      "auth-session-email": shouldExposeActiveSession ? currentUser.email || "" : "",
      "auth-session-role": shouldExposeActiveSession ? currentUser.role || "" : "",
      "auth-session-home-path": currentSessionHomePath,
      "auth-session-expiry":
        shouldExposeActiveSession && Number.isFinite(Number(currentUser.exp))
          ? String(Number(currentUser.exp) * 1000)
          : "",
      "buyer-home-path": resolveBuyerHomePath(),
      "buyer-setup-path": resolveBuyerSetupPath(),
      "seller-home-path": APP_PATHS.sellerStore,
    },
  };
}

function renderAuthPage(key, mode) {
  return async (req, res, next) => {
    try {
      const overrides = await buildAuthPageOverrides(req, mode);
      return renderLayout(res, key, overrides);
    } catch (error) {
      return next(error);
    }
  };
}

async function renderSellerWizardPage(req, res, next) {
  try {
    const storeRow = req.sellerStore || (await findStoreByUserId(req.user.id));
    const requestedTemplate = String(req.query.template || "").trim().toLowerCase();
    const savedTemplate = storeRow && storeRow.templateKey ? String(storeRow.templateKey).trim().toLowerCase() : "";

    if (storeRow && storeRow.profileCompleted && (!requestedTemplate || requestedTemplate === savedTemplate)) {
      return res.redirect(302, resolveSellerTemplatePath(savedTemplate || storeRow.templateKey));
    }

    if (requestedTemplate && !isValidTemplateKey(requestedTemplate)) {
      return res.redirect(302, "/seller/store");
    }

    if (!requestedTemplate && savedTemplate && !isValidTemplateKey(savedTemplate)) {
      return res.redirect(302, "/seller/store");
    }

    const templateSource = requestedTemplate || savedTemplate;
    if (!templateSource) {
      return res.redirect(302, resolveSellerSetupPath(storeRow));
    }

    const templateKey = normalizeTemplateKey(templateSource);

    return renderLayout(res, "sellerWizard", {
      bodyAttrs: {
        "selected-template": templateKey,
      },
    });
  } catch (error) {
    return next(error);
  }
}

function renderCartPage(req, res) {
  const productId = Number(req.query.productId);
  const variantId = Number(req.query.variantId);
  const bodyAttrs = {
    "cart-product-id":
      Number.isInteger(productId) && productId > 0 ? String(productId) : "",
    "cart-variant-id":
      Number.isInteger(variantId) && variantId > 0 ? String(variantId) : "",
  };

  return renderLayout(res, "buyerCart", { bodyAttrs });
}

function renderCheckoutPage(req, res) {
  const productId = Number(req.query.productId);
  const variantId = Number(req.query.variantId);
  const bodyAttrs = {
    "checkout-product-id":
      Number.isInteger(productId) && productId > 0 ? String(productId) : "",
    "checkout-variant-id":
      Number.isInteger(variantId) && variantId > 0 ? String(variantId) : "",
  };

  return renderLayout(res, "buyerCheckout", { bodyAttrs });
}

function renderCompatibilityProductViewer(req, res) {
  const productId = Number(req.query.productId);
  if (Number.isInteger(productId) && productId > 0) {
    return res.redirect(302, `/products/${productId}`);
  }

  return res.redirect(302, "/marketplace");
}

async function renderStorefront(req, res, next) {
  try {
    const handle = normalizeHandle(req.params.handle);
    const payload = await resolveStorePayloadByHandle(handle);
    if (!payload || !payload.store) {
      return renderErrorPage(req, res, 404, new Error("Store not found"));
    }

    const store = payload.store;
    const product = payload.product;
    const templateKey = normalizeTemplateKey(store && store.templateKey);
    const storefrontTemplateKey = templateKey === "consultations" ? "classes" : templateKey;
    const pageKey = resolveTemplatePageKey(templateKey);
    const productId = Number(product && product.id);
    const hasPublicProduct = Number.isInteger(productId) && productId > 0;
    const viewer = req.user || null;
    const storePath = `/stores/${store.handle || handle}`;
    const signInPath = `/auth/signin?role=buyer&returnTo=${encodeURIComponent(storePath)}`;

    return renderLayout(res, pageKey, {
      path: storePath,
      title: store.storeName ? `${store.storeName} | Zest Store` : "Zest Store",
      bodyAttrs: {
        "public-store": "1",
        "store-handle": store.handle || "",
        "store-path": storePath,
        "store-template-key": storefrontTemplateKey,
        "product-id": hasPublicProduct ? String(productId) : "",
        "product-path": hasPublicProduct ? `/products/${productId}` : "",
        "checkout-path": hasPublicProduct ? `${APP_PATHS.buyerCart}?productId=${productId}` : "",
        "store-api-endpoint":
          storefrontTemplateKey === "art"
            ? `/api/art/store/${encodeURIComponent(store.handle || handle)}`
            : `/api/store/${encodeURIComponent(store.handle || handle)}`,
        "store-feed-endpoint": `/api/feed/store/${encodeURIComponent(store.handle || handle)}`,
        "art-store-save-endpoint": "",
        "art-listings-endpoint": "",
        "marketplace-path": APP_PATHS.marketplace,
        "global-feed-path": APP_PATHS.globalFeed,
        "seller-dashboard-path": APP_PATHS.sellerDashboard,
        "seller-settings-path": APP_PATHS.sellerStoreSettings,
        "seller-template-manager-path": APP_PATHS.sellerStoreTemplate,
        "viewer-authenticated": viewer ? "1" : "",
        "viewer-role": viewer && viewer.role ? String(viewer.role).trim().toLowerCase() : "",
        "signin-path": signInPath,
        "demo-store": payload.meta && payload.meta.isDemo ? "1" : "",
      },
    });
  } catch (error) {
    if (error.status === 400) {
      return renderErrorPage(req, res, 404, new Error("Store not found"));
    }
    return next(error);
  }
}

async function renderProductDetailPage(req, res, next) {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return renderErrorPage(req, res, 404, new Error("Product not found"));
  }

  try {
    const payload = await buildProductDetailPayload(productId);
    if (!payload || !payload.product || !payload.store) {
      return renderErrorPage(req, res, 404, new Error("Product not found"));
    }

    return renderLayout(res, "buyerProductViewer", {
      title: payload.product.title
        ? `${payload.product.title} | ${payload.store.storeName || "Zest"}`
        : "Product View",
      bodyAttrs: {
        "product-id": String(payload.product.id),
        "store-handle": payload.store.handle || "",
        "store-path": `/stores/${payload.store.handle || ""}`,
        "checkout-path": `${APP_PATHS.buyerCart}?productId=${payload.product.id}`,
      },
    });
  } catch (error) {
    return next(error);
  }
}

function redirectLegacy(target) {
  return (req, res) => {
    const location = pageCatalog[target] ? pageCatalog[target].path : target;
    return res.redirect(302, location);
  };
}

function renderErrorPage(req, res, statusCode, error) {
  const safeStatus = pageCatalog[`error${statusCode}`] ? statusCode : 500;

  return res.status(safeStatus).render("layout", {
    page: buildPage(`error${safeStatus}`, {
      errorMessage: error && error.message ? error.message : null,
    }),
    flash: res.locals.flash,
  });
}

module.exports = {
  buildPage,
  pageCatalog,
  redirectLegacy,
  renderAuthPage,
  renderCartPage,
  renderErrorPage,
  renderCheckoutPage,
  renderCompatibilityProductViewer,
  renderPage,
  renderProductDetailPage,
  renderSellerWizardPage,
  renderStorefront,
};
