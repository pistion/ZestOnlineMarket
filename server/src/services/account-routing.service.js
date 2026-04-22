const {
  ensureBuyerProfileByUserId,
  findBuyerProfileByUserId,
} = require("../repositories/buyer.repository");
const { findStoreByUserId, upsertStoreByUserId } = require("../repositories/store.repository");
const { normalizeInternalPath } = require("../utils/auth-session");
const {
  isValidTemplateKey,
  normalizeTemplateKey,
  resolveSellerTemplatePath,
} = require("../utils/store-template");

const APP_PATHS = Object.freeze({
  home: "/",
  marketplace: "/marketplace",
  buyerWizard: "/buyer/wizard-setup",
  buyerProfile: "/buyer/profile",
  buyerFeed: "/buyer/feed",
  buyerSettings: "/buyer/settings",
  buyerPurchases: "/buyer/purchases",
  buyerProductViewer: "/buyer/product-viewer",
  buyerCart: "/buyer/cart",
  buyerCheckout: "/buyer/checkout",
  globalFeed: "/feed",
  globalFeedLegacy: "/global-feed",
  sellerStore: "/seller/store",
  sellerStoreTemplate: "/seller/store/template",
  sellerStoreSettings: "/seller/store/settings",
  sellerOrders: "/seller/orders",
  sellerDashboard: "/seller/dashboard",
  sellerWizard: "/seller/wizard-setup",
  adminDashboard: "/admin/dashboard",
  authSignin: "/auth/signin",
});

const SHARED_PUBLIC_PATHS = new Set([
  APP_PATHS.home,
  APP_PATHS.marketplace,
  APP_PATHS.globalFeed,
  APP_PATHS.globalFeedLegacy,
]);

const SHARED_PUBLIC_PREFIXES = ["/stores/", "/products/"];

function normalizeRolePath(path) {
  const normalized = normalizeInternalPath(path, "");
  if (!normalized) {
    return "";
  }

  return normalized.split("#")[0].split("?")[0];
}

function isSharedPublicPath(path) {
  const normalized = normalizeRolePath(path);
  if (!normalized) {
    return false;
  }

  if (SHARED_PUBLIC_PATHS.has(normalized)) {
    return true;
  }

  return SHARED_PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isRoleAccessiblePath(role, path) {
  const normalized = normalizeRolePath(path);
  if (!normalized) {
    return false;
  }

  if (isSharedPublicPath(normalized)) {
    return true;
  }

  if (role === "buyer") {
    return normalized.startsWith("/buyer/");
  }

  if (role === "seller") {
    return normalized.startsWith("/seller/");
  }

  if (role === "admin") {
    return normalized.startsWith("/admin/");
  }

  return false;
}

function resolveRoleAwareReturnPath(role, returnTo, fallbackPath) {
  const safeReturnTo = normalizeInternalPath(returnTo, "");
  if (safeReturnTo && isRoleAccessiblePath(role, safeReturnTo)) {
    return safeReturnTo;
  }

  return fallbackPath;
}

function resolveBuyerHomePath() {
  return APP_PATHS.buyerProfile;
}

function resolveBuyerSetupPath() {
  return APP_PATHS.buyerWizard;
}

function resolveBuyerAppPath(profile) {
  return resolveBuyerHomePath();
}

function resolveBuyerFeedPath() {
  return APP_PATHS.buyerFeed;
}

function resolveGlobalFeedPath() {
  return APP_PATHS.globalFeed;
}

function resolveMarketplacePath() {
  return APP_PATHS.marketplace;
}

function resolveSellerSetupPath(store) {
  if (!store) {
    return APP_PATHS.sellerStore;
  }

  const templateKey = normalizeTemplateKey(store.templateKey || "products");
  if (!isValidTemplateKey(templateKey)) {
    return APP_PATHS.sellerStore;
  }

  return `${APP_PATHS.sellerWizard}?template=${templateKey}`;
}

function resolveSellerSettingsPath() {
  return APP_PATHS.sellerStoreSettings;
}

function resolveSellerTemplateManagerPath() {
  return APP_PATHS.sellerStoreTemplate;
}

function resolveSellerAppPath(store) {
  if (!store) {
    return APP_PATHS.sellerStore;
  }

  if (!store.profileCompleted) {
    return resolveSellerSetupPath(store);
  }

  return resolveSellerTemplatePath(store.templateKey);
}

function buildSellerBootstrapSeed(userId) {
  return {
    userId,
    storeName: `Draft seller store ${userId}`,
    handle: `draft-seller-${userId}`,
    templateKey: "products",
    tagline: "",
    about: "",
    accentColor: "#2563eb",
    avatarUrl: "",
    coverUrl: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    xhandle: "",
    profileCompleted: false,
    visibilityStatus: "draft",
    setupStep: 1,
    setupState: {
      templateKey: "products",
      setupStep: 1,
      store: {
        storeName: "",
        handle: "",
        tagline: "",
        about: "",
        accentColor: "#2563eb",
        avatarUrl: "",
        coverUrl: "",
        socials: {
          instagram: "",
          facebook: "",
          tiktok: "",
          xhandle: "",
        },
      },
      product: {
        name: "",
        description: "",
        price: 0,
        delivery: "",
        location: "",
        transportFee: 0,
        images: [],
      },
    },
  };
}

async function ensureSellerStoreByUserId(userId, options = {}) {
  const existingStore = await findStoreByUserId(userId, options);
  if (existingStore) {
    return existingStore;
  }

  await upsertStoreByUserId(buildSellerBootstrapSeed(userId), options);
  return findStoreByUserId(userId, options);
}

async function resolveAuthenticatedAppState(user, options = {}) {
  if (!user) {
    return {
      role: "",
      redirectTo: "/",
      profileCompleted: false,
      buyerProfileCompleted: false,
      sellerProfileCompleted: false,
      buyerProfile: null,
      sellerStore: null,
    };
  }

  if (user.role === "seller") {
    const sellerStore = await ensureSellerStoreByUserId(user.id, options);
    const sellerProfileCompleted = Boolean(sellerStore && sellerStore.profileCompleted);

    return {
      role: "seller",
      redirectTo: resolveSellerAppPath(sellerStore),
      profileCompleted: sellerProfileCompleted,
      buyerProfileCompleted: false,
      sellerProfileCompleted,
      buyerProfile: null,
      sellerStore,
    };
  }

  if (user.role === "admin") {
    return {
      role: "admin",
      redirectTo: APP_PATHS.adminDashboard,
      profileCompleted: true,
      buyerProfileCompleted: false,
      sellerProfileCompleted: false,
      buyerProfile: null,
      sellerStore: null,
    };
  }

  await ensureBuyerProfileByUserId(user.id, options);
  const buyerProfile = await findBuyerProfileByUserId(user.id, options);
  const buyerProfileCompleted = Boolean(buyerProfile && buyerProfile.profileCompleted);

  return {
    role: "buyer",
    redirectTo: resolveBuyerAppPath(buyerProfile),
    profileCompleted: buyerProfileCompleted,
    buyerProfileCompleted,
    sellerProfileCompleted: false,
    buyerProfile,
    sellerStore: null,
  };
}

module.exports = {
  APP_PATHS,
  isRoleAccessiblePath,
  resolveAuthenticatedAppState,
  resolveBuyerAppPath,
  resolveBuyerHomePath,
  resolveBuyerFeedPath,
  resolveBuyerSetupPath,
  resolveGlobalFeedPath,
  resolveMarketplacePath,
  resolveRoleAwareReturnPath,
  resolveSellerAppPath,
  ensureSellerStoreByUserId,
  resolveSellerSettingsPath,
  resolveSellerSetupPath,
  resolveSellerTemplateManagerPath,
};
