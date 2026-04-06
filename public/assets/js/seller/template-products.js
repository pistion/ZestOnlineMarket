const PRODUCT_RECENT_DAYS = 45;
const MAX_IMAGES = 6;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const DEFAULT_ACCENT = "#0ea5e9";

const state = {
  isPublic: document.body.dataset.publicStore === "1",
  isDemoStore: document.body.dataset.demoStore === "1",
  store: null,
  products: [],
  storeUpdates: [],
  view: "grid",
  filters: {
    query: "",
    status: "all",
    delivery: "all",
    sort: "newest",
  },
  modalStep: 1,
  modalProductId: 0,
  modalFiles: [],
  modalExistingImages: [],
  modalVariants: [],
  pendingDelete: null,
  updateFiles: [],
  viewerImages: [],
  viewerIndex: 0,
};

const elements = {
  yearFooter: document.querySelector("#yearFooter"),
  storeBrand: document.querySelector("#storeBrand"),
  storeBrandLabel: document.querySelector("#storeBrandLabel"),
  storeBanner: document.querySelector("#storeBanner"),
  storeAvatar: document.querySelector("#storeAvatar"),
  storeEyebrow: document.querySelector("#storeEyebrow"),
  storeName: document.querySelector("#storeName"),
  storeHandle: document.querySelector("#storeHandle"),
  storeAbout: document.querySelector("#storeAbout"),
  storePills: document.querySelector("#storePills"),
  featureOneTitle: document.querySelector("#featureOneTitle"),
  featureOneText: document.querySelector("#featureOneText"),
  featureOneTag: document.querySelector("#featureOneTag"),
  featureTwoTitle: document.querySelector("#featureTwoTitle"),
  featureTwoText: document.querySelector("#featureTwoText"),
  featureTwoTag: document.querySelector("#featureTwoTag"),
  featureThreeTitle: document.querySelector("#featureThreeTitle"),
  featureThreeText: document.querySelector("#featureThreeText"),
  featureThreeTag: document.querySelector("#featureThreeTag"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryText: document.querySelector("#summaryText"),
  summaryChips: document.querySelector("#summaryChips"),
  updatesSection: document.querySelector("#updatesSection"),
  updatesSubhead: document.querySelector("#updatesSubhead"),
  updatesList: document.querySelector("#updatesList"),
  updatesEmpty: document.querySelector("#updatesEmpty"),
  updatesEmptyTitle: document.querySelector("#updatesEmptyTitle"),
  updatesEmptyText: document.querySelector("#updatesEmptyText"),
  toggleUpdateComposer: document.querySelector("#toggleUpdateComposer"),
  updatesComposer: document.querySelector("#updatesComposer"),
  cancelUpdateComposer: document.querySelector("#cancelUpdateComposer"),
  updateComposerForm: document.querySelector("#updateComposerForm"),
  updateType: document.querySelector("#updateType"),
  updateTitle: document.querySelector("#updateTitle"),
  updateDescription: document.querySelector("#updateDescription"),
  updateLinkedProduct: document.querySelector("#updateLinkedProduct"),
  updateImages: document.querySelector("#updateImages"),
  updateImagePreviewGrid: document.querySelector("#updateImagePreviewGrid"),
  updateWarning: document.querySelector("#updateWarning"),
  submitUpdatePost: document.querySelector("#submitUpdatePost"),
  navToggle: document.querySelector("[data-nav-toggle]"),
  nav: document.querySelector("[data-nav]"),
  productsSection: document.querySelector("#productsSection"),
  productsSubhead: document.querySelector("#productsSubhead"),
  recentGrid: document.querySelector("#recentGrid"),
  prevGrid: document.querySelector("#prevGrid"),
  recentCount: document.querySelector("#recentCount"),
  prevCount: document.querySelector("#prevCount"),
  archiveSection: document.querySelector("#archiveSection"),
  emptyState: document.querySelector("#emptyState"),
  emptyTitle: document.querySelector("#emptyTitle"),
  emptyText: document.querySelector("#emptyText"),
  emptyAction: document.querySelector("#emptyAction"),
  gridViewBtn: document.querySelector("#gridViewBtn"),
  listViewBtn: document.querySelector("#listViewBtn"),
  searchInput: document.querySelector("#searchInput"),
  productStatusFilter: document.querySelector("#productStatusFilter"),
  deliveryFilter: document.querySelector("#deliveryFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  followBtn: document.querySelector("#followBtn"),
  shareStoreBtn: document.querySelector("#shareStoreBtn"),
  socialInstagram: document.querySelector("#socialInstagram"),
  socialFacebook: document.querySelector("#socialFacebook"),
  socialTiktok: document.querySelector("#socialTiktok"),
  socialX: document.querySelector("#socialX"),
  settingsBtn: document.querySelector("#settingsBtn"),
  closeSettings: document.querySelector("#closeSettings"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsOverlay: document.querySelector("#settingsOverlay"),
  settingsTabs: Array.from(document.querySelectorAll("#settingsPanel .tab")),
  tabScreens: Array.from(document.querySelectorAll("#settingsPanel .tab-screen")),
  panelStoreName: document.querySelector("#panelStoreName"),
  panelStoreHandle: document.querySelector("#panelStoreHandle"),
  panelStoreTagline: document.querySelector("#panelStoreTagline"),
  panelStoreAbout: document.querySelector("#panelStoreAbout"),
  panelNotes: document.querySelector("#panelNotes"),
  themePreview: document.querySelector("#themePreview"),
  createTop: document.querySelector("#createTop"),
  createFab: document.querySelector("#createFab"),
  createSectionBtn: document.querySelector("#createSectionBtn"),
  createModal: document.querySelector("#createModal"),
  modalClose: document.querySelector("#createModal .modal-close"),
  modalBackdrop: document.querySelector("#createModal .modal-backdrop"),
  modalTitle: document.querySelector("#modalTitle"),
  modalCopy: document.querySelector("#modalCopy"),
  createProductForm: document.querySelector("#createProductForm"),
  modalSubmit: document.querySelector("#createProductForm .btn-primary"),
  deleteConfirmModal: document.querySelector("#deleteConfirmModal"),
  deleteConfirmClose: document.querySelector("#deleteConfirmModal .modal-close"),
  deleteConfirmBackdrop: document.querySelector("#deleteConfirmModal .modal-backdrop"),
  deleteConfirmTitle: document.querySelector("#deleteConfirmTitle"),
  deleteConfirmCopy: document.querySelector("#deleteConfirmCopy"),
  deleteConfirmWarning: document.querySelector("#deleteConfirmWarning"),
  cancelDeleteAction: document.querySelector("#cancelDeleteAction"),
  confirmDeleteAction: document.querySelector("#confirmDeleteAction"),
  wizardSteps: Array.from(document.querySelectorAll("#createModal .wizard-step")),
  wizardScreens: Array.from(document.querySelectorAll("#createModal .wizard-screen")),
  nextButtons: Array.from(document.querySelectorAll("#createModal .btn-next")),
  backButtons: Array.from(document.querySelectorAll("#createModal .btn-back")),
  productName: document.querySelector("#productName"),
  productDescription: document.querySelector("#productDescription"),
  productPrice: document.querySelector("#productPrice"),
  productStock: document.querySelector("#productStock"),
  transportFee: document.querySelector("#transportFee"),
  productStatus: document.querySelector("#productStatus"),
  productVisibility: document.querySelector("#productVisibility"),
  deliveryInfo: document.querySelector("#deliveryInfo"),
  businessLocation: document.querySelector("#businessLocation"),
  addVariantBtn: document.querySelector("#addVariantBtn"),
  variantList: document.querySelector("#variantList"),
  variantEmpty: document.querySelector("#variantEmpty"),
  productImages: document.querySelector("#productImages"),
  clearProductImages: document.querySelector("#clearProductImages"),
  productImagePreviewGrid: document.querySelector("#productImagePreviewGrid"),
  imgWarning: document.querySelector("#imgWarning"),
  summaryName: document.querySelector("#summaryName"),
  summaryPrice: document.querySelector("#summaryPrice"),
  summaryStock: document.querySelector("#summaryStock"),
  summaryStatus: document.querySelector("#summaryStatus"),
  imageViewer: document.querySelector("#imageViewer"),
  imageViewerImage: document.querySelector("#iv-image"),
  imageViewerPrev: document.querySelector("#iv-prev"),
  imageViewerNext: document.querySelector("#iv-next"),
  imageViewerDots: document.querySelector("#iv-dots"),
  imageViewerClose: document.querySelector("#iv-close"),
  imageViewerBackdrop: document.querySelector("#imageViewer .iv-backdrop"),
};

function formatCurrency(value) {
  return `K${Number(value || 0).toFixed(2)}`;
}

function formatProductStatus(status) {
  const normalized = String(status || "published").trim().toLowerCase();
  if (normalized === "draft") {
    return "Draft";
  }
  if (normalized === "archived") {
    return "Archived";
  }
  return "Published";
}

function formatProductVisibility(visibility) {
  const normalized = String(visibility || "public").trim().toLowerCase();
  if (normalized === "private") {
    return "Private";
  }
  if (normalized === "unlisted") {
    return "Unlisted";
  }
  return "Public";
}

function isLiveProduct(product) {
  return (
    String(product && product.status || "").trim().toLowerCase() === "published" &&
    String(product && product.visibility || "").trim().toLowerCase() === "public"
  );
}

function getStockTone(product) {
  const stockQuantity = Number(product && product.stockQuantity || 0);
  if (stockQuantity <= 0) {
    return "out";
  }
  if (stockQuantity <= 5) {
    return "low";
  }
  return "good";
}

function formatStockLabel(product) {
  const stockQuantity = Number(product && product.stockQuantity || 0);
  if (stockQuantity <= 0) {
    return "Out of stock";
  }
  if (stockQuantity === 1) {
    return "1 in stock";
  }
  return `${stockQuantity} in stock`;
}

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function getInitials(value) {
  const letters = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return letters || "S";
}

function getStorePath(store = state.store) {
  if (document.body.dataset.storePath) {
    return document.body.dataset.storePath;
  }

  if (store && store.handle) {
    return `/stores/${store.handle}`;
  }

  return "/marketplace";
}

function getProductPath(product) {
  if (product && product.id) {
    return `/products/${product.id}`;
  }

  return document.body.dataset.productPath || "";
}

function getCheckoutPath(product) {
  if (product && product.id) {
    return `/buyer/checkout?productId=${product.id}`;
  }

  return document.body.dataset.checkoutPath || "";
}

function clampStep(step) {
  return Math.min(4, Math.max(1, Number(step) || 1));
}

function followingApi() {
  return window.ZestStoreFollowing || null;
}

function buyerInteractionApi() {
  return window.ZestBuyerInteractions || null;
}

function trackBuyerSignal(payload, options = {}) {
  const api = buyerInteractionApi();
  if (!api || typeof api.track !== "function") {
    return;
  }

  api.track(payload, options);
}

function buildStore(payload = {}) {
  const store = payload.store || {};
  const socials = store.socials || {};

  return {
    storeName: String(store.storeName || "").trim(),
    handle: String(store.handle || "").trim().replace(/^@+/, ""),
    templateKey: String(store.templateKey || "products").trim() || "products",
    tagline: String(store.tagline || "").trim(),
    about: String(store.about || "").trim(),
    accentColor: String(store.accentColor || DEFAULT_ACCENT).trim() || DEFAULT_ACCENT,
    avatarUrl: String(store.avatarUrl || "").trim(),
    coverUrl: String(store.coverUrl || "").trim(),
    socials: {
      instagram: String(socials.instagram || store.instagram || "").trim(),
      facebook: String(socials.facebook || store.facebook || "").trim(),
      tiktok: String(socials.tiktok || store.tiktok || "").trim(),
      xhandle: String(socials.xhandle || store.xhandle || "").trim(),
    },
  };
}

function createVariantDraft(rawVariant = {}) {
  const stockQuantity = Number(rawVariant.stockQuantity || 0);
  const priceOverride =
    rawVariant.priceOverride === null || rawVariant.priceOverride === undefined || rawVariant.priceOverride === ""
      ? ""
      : String(Number(rawVariant.priceOverride || 0));

  return {
    id: Number(rawVariant.id || 0) || 0,
    clientId:
      rawVariant.clientId ||
      rawVariant.id ||
      `variant-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label: String(rawVariant.label || rawVariant.name || "").trim(),
    sku: String(rawVariant.sku || "").trim(),
    priceOverride,
    stockQuantity: Number.isFinite(stockQuantity) ? Math.max(stockQuantity, 0) : 0,
  };
}

function getVariantTotalStock(variants = state.modalVariants) {
  return (Array.isArray(variants) ? variants : []).reduce(
    (total, variant) => total + (Number((variant && variant.stockQuantity) || 0) || 0),
    0
  );
}

function normalizeProduct(rawProduct, rawImages) {
  if (!rawProduct) {
    return null;
  }

  const resolvedImages = Array.isArray(rawImages || rawProduct.images) ? rawImages || rawProduct.images : [];
  const images = resolvedImages
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      return image && (image.url || image.src || "");
    })
    .filter(Boolean);
  const variants = Array.isArray(rawProduct.variants) ? rawProduct.variants.map((variant) => createVariantDraft(variant)) : [];
  const fallbackStockQuantity = Number(rawProduct.stockQuantity || 0) || 0;
  const totalVariantStock = getVariantTotalStock(variants);

  return {
    id: Number(rawProduct.id) || 0,
    name: String(rawProduct.name || rawProduct.title || "").trim() || "Featured listing",
    description: String(rawProduct.description || "").trim(),
    status: String(rawProduct.status || "published").trim().toLowerCase() || "published",
    visibility: String(rawProduct.visibility || "public").trim().toLowerCase() || "public",
    price: Number(rawProduct.price || 0),
    delivery: String(rawProduct.delivery || "").trim(),
    location: String(rawProduct.location || "").trim(),
    transportFee: Number(rawProduct.transportFee || 0),
    stockQuantity: variants.length ? totalVariantStock : fallbackStockQuantity,
    variantCount: Number(rawProduct.variantCount || variants.length || 0) || 0,
    variants,
    createdAt: rawProduct.createdAt || Date.now(),
    images,
  };
}

function buildProducts(payload = {}) {
  const products = Array.isArray(payload.products)
    ? payload.products.map((product) => normalizeProduct(product, product && product.images)).filter(Boolean)
    : [];

  if (products.length) {
    return products.sort(
      (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
    );
  }

  const product = normalizeProduct(payload.product, payload.images);
  return product ? [product] : [];
}

function normalizeStoreUpdate(rawUpdate) {
  if (!rawUpdate) {
    return null;
  }

  const images = (Array.isArray(rawUpdate.images) ? rawUpdate.images : [])
    .map((image) => {
      if (typeof image === "string") {
        return image;
      }

      return image && (image.url || image.src || "");
    })
    .filter(Boolean);

  const description =
    String(rawUpdate.description || "").trim() || "The seller shared a fresh update for buyers browsing the stall.";
  const title = String(rawUpdate.title || "Store update").trim() || "Store update";

  return {
    id: Number(rawUpdate.id || rawUpdate.feedItemId || 0) || 0,
    type: String(rawUpdate.type || "announcement").trim().toLowerCase() || "announcement",
    title,
    description,
    hasExplicitTitle: Boolean(rawUpdate.hasExplicitTitle),
    createdAt: rawUpdate.createdAt || Date.now(),
    feedTag: String(rawUpdate.feedTag || "Store update").trim() || "Store update",
    images,
    storeName: String(rawUpdate.storeName || state.store?.storeName || "").trim() || "Store",
    storeHandle: String(rawUpdate.storeHandle || state.store?.handle || "").trim().replace(/^@+/, ""),
    avatarUrl: String(rawUpdate.avatarUrl || state.store?.avatarUrl || "").trim(),
    storePath: String(rawUpdate.storePath || getStorePath()).trim() || getStorePath(),
    productPath: String(rawUpdate.productPath || "").trim(),
    itemType: String(rawUpdate.itemType || "product").trim() || "product",
  };
}

function buildStoreUpdates(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items
    .map((item) => normalizeStoreUpdate(item))
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

function buildBannerBackground(store) {
  const accent = (store && store.accentColor) || DEFAULT_ACCENT;
  const coverUrl = (store && store.coverUrl) || "";
  if (coverUrl) {
    const safeUrl = coverUrl.replace(/"/g, '\\"');
    return `linear-gradient(135deg, rgba(14, 165, 233, 0.78), rgba(16, 185, 129, 0.62)), url("${safeUrl}")`;
  }

  return `linear-gradient(135deg, ${accent}, #10b981)`;
}

function buildSocialUrl(platform, value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  const handle = input.replace(/^@+/, "");
  const baseMap = {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    tiktok: "https://www.tiktok.com/@",
    xhandle: "https://x.com/",
  };

  return baseMap[platform] ? `${baseMap[platform]}${handle}` : "";
}

function applySocialLink(element, href) {
  if (!element) {
    return;
  }

  if (!href) {
    element.classList.add("is-disabled");
    element.setAttribute("aria-disabled", "true");
    element.removeAttribute("href");
    element.setAttribute("tabindex", "-1");
    return;
  }

  element.classList.remove("is-disabled");
  element.removeAttribute("aria-disabled");
  element.removeAttribute("tabindex");
  element.setAttribute("href", href);
}

async function fetchJson(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error((data && data.message) || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data || {};
}

async function fetchStorePayload() {
  if (state.isPublic) {
    const handle = String(document.body.dataset.storeHandle || "").trim();
    if (!handle) {
      throw new Error("Store handle missing");
    }

    return fetchJson(`/api/store/${encodeURIComponent(handle)}`);
  }

  return fetchJson("/api/store/me");
}

async function fetchStoreUpdates() {
  if (state.isPublic) {
    const handle = String(document.body.dataset.storeHandle || state.store?.handle || "").trim();
    if (!handle) {
      throw new Error("Store handle missing");
    }

    return fetchJson(`/api/feed/store/${encodeURIComponent(handle)}`);
  }

  return fetchJson("/api/feed/store/me");
}

function createPill(iconClass, text) {
  const span = document.createElement("span");
  span.className = "pill";
  span.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(text)}</span>`;
  return span;
}

function createStatusChip(text, modifier) {
  const span = document.createElement("span");
  span.className = modifier ? `status-chip ${modifier}` : "status-chip";
  span.textContent = text;
  return span;
}

function getProductBadgeModifier(product) {
  const normalizedStatus = String(product && product.status || "published").trim().toLowerCase();
  const normalizedVisibility = String(product && product.visibility || "public").trim().toLowerCase();

  if (normalizedStatus === "archived") {
    return "product-card__badge--archived";
  }

  if (normalizedStatus === "draft") {
    return "product-card__badge--draft";
  }

  if (normalizedVisibility === "private") {
    return "product-card__badge--private";
  }

  if (normalizedVisibility === "unlisted") {
    return "product-card__badge--unlisted";
  }

  return "product-card__badge--live";
}

function setEmptyState(title, text, actionLabel, actionHref, actionType) {
  if (elements.emptyTitle) {
    elements.emptyTitle.textContent = title;
  }

  if (elements.emptyText) {
    elements.emptyText.textContent = text;
  }

  if (elements.emptyAction) {
    elements.emptyAction.textContent = actionLabel;
    elements.emptyAction.setAttribute("href", actionHref);
    elements.emptyAction.dataset.action = actionType || "";
  }
}

function updateFollowButton() {
  if (!elements.followBtn) {
    return;
  }

  if (!state.isPublic) {
    elements.followBtn.textContent = "Preview mode";
    elements.followBtn.disabled = true;
    elements.followBtn.classList.remove("is-following");
    elements.followBtn.setAttribute("aria-pressed", "false");
    return;
  }

  if (state.isDemoStore) {
    elements.followBtn.textContent = "Demo showcase";
    elements.followBtn.disabled = true;
    elements.followBtn.classList.remove("is-following");
    elements.followBtn.setAttribute("aria-pressed", "false");
    return;
  }

  const handle = state.store && state.store.handle ? state.store.handle : "";
  const api = followingApi();
  const following = Boolean(api && handle && api.isFollowing(handle));

  elements.followBtn.textContent = following ? "Following" : "Follow";
  elements.followBtn.disabled = !handle;
  elements.followBtn.classList.toggle("is-following", following);
  elements.followBtn.setAttribute("aria-pressed", following ? "true" : "false");
}

async function toggleStoreFollow() {
  const api = followingApi();
  const handle = state.store && state.store.handle ? state.store.handle : "";
  if (!api || !handle) {
    return;
  }

  const result = await api.toggle(handle);
  if (result && result.error) {
    return;
  }

  updateFollowButton();
}

function renderHeader() {
  const store = state.store || buildStore();
  const product = state.products[0] || null;
  const productCount = state.products.length;
  const storeName = store.storeName || "Products Store";
  const storeTagline = store.tagline || "Clean product-led storefront";
  const storeAbout =
    store.about ||
    "A polished storefront for products, curated offers, and everyday items your buyers can trust.";

  if (elements.storeBrand) {
    elements.storeBrand.setAttribute("href", state.isPublic ? getStorePath(store) : "/seller/templates/products");
  }

  if (elements.storeBrandLabel) {
    elements.storeBrandLabel.textContent = storeName;
  }

  if (elements.storeBanner) {
    elements.storeBanner.style.backgroundImage = buildBannerBackground(store);
  }

  if (elements.storeAvatar) {
    if (store.avatarUrl) {
      elements.storeAvatar.style.backgroundImage = `url("${store.avatarUrl.replace(/"/g, '\\"')}")`;
      elements.storeAvatar.textContent = "";
    } else {
      elements.storeAvatar.style.backgroundImage = "";
      elements.storeAvatar.textContent = getInitials(storeName);
    }
  }

  if (elements.storeEyebrow) {
    elements.storeEyebrow.textContent = `Template A - ${storeTagline}`;
  }

  if (elements.storeName) {
    elements.storeName.textContent = storeName;
  }

  if (elements.storeHandle) {
    elements.storeHandle.textContent = store.handle ? `@${store.handle}` : "@store";
  }

  if (elements.storeAbout) {
    elements.storeAbout.textContent = storeAbout;
  }

  if (elements.followBtn) {
    updateFollowButton();
  }

  if (elements.shareStoreBtn) {
    const label = elements.shareStoreBtn.querySelector("span");
    if (label) {
      label.textContent = state.isPublic ? "Share" : "Copy link";
    }
  }

  if (elements.storePills) {
    const pills = [];
    pills.push(createPill("fa-solid fa-store", store.handle ? `@${store.handle}` : "Storefront ready"));
    pills.push(
      createPill(
        "fa-solid fa-box",
        productCount > 1
          ? `${productCount} listings live`
          : product && product.name
            ? truncate(product.name, 34)
            : "Catalog ready for uploads"
      )
    );
    pills.push(
      createPill(
        "fa-solid fa-location-dot",
        product && product.location ? product.location : "Location updates on listing"
      )
    );

    elements.storePills.innerHTML = "";
    pills.forEach((pill) => elements.storePills.appendChild(pill));
  }

  applySocialLink(elements.socialInstagram, buildSocialUrl("instagram", store.socials.instagram));
  applySocialLink(elements.socialFacebook, buildSocialUrl("facebook", store.socials.facebook));
  applySocialLink(elements.socialTiktok, buildSocialUrl("tiktok", store.socials.tiktok));
  applySocialLink(elements.socialX, buildSocialUrl("xhandle", store.socials.xhandle));
}

function renderFeatureCards() {
  const product = state.products[0] || null;
  const store = state.store || buildStore();

  if (elements.featureOneTitle) {
    elements.featureOneTitle.textContent = product && product.delivery ? "Delivery and transport" : "Store logistics";
  }
  if (elements.featureOneText) {
    elements.featureOneText.textContent =
      product && product.delivery
        ? `${truncate(product.delivery, 110)}${product.transportFee > 0 ? ` Transport fee ${formatCurrency(product.transportFee)}.` : ""}`
        : "Shipping and delivery details appear here when a product is available.";
  }
  if (elements.featureOneTag) {
    elements.featureOneTag.textContent = product && product.delivery ? "Delivery detail" : "Store detail";
  }

  if (elements.featureTwoTitle) {
    elements.featureTwoTitle.textContent = product && product.name ? product.name : "Featured offer";
  }
  if (elements.featureTwoText) {
    elements.featureTwoText.textContent =
      product && product.description
        ? truncate(product.description, 120)
        : "Your main product summary and price are surfaced here for quick scanning.";
  }
  if (elements.featureTwoTag) {
    elements.featureTwoTag.textContent = product ? formatCurrency(product.price) : "Main listing";
  }

  if (elements.featureThreeTitle) {
    elements.featureThreeTitle.textContent = "Store confidence";
  }
  if (elements.featureThreeText) {
    elements.featureThreeText.textContent =
      store.about || "Use this area to reinforce trust, responsiveness, and storefront clarity.";
  }
  if (elements.featureThreeTag) {
    elements.featureThreeTag.textContent = state.isPublic ? "Buyer ready" : "Preview mode";
  }
}

function renderSummary() {
  const store = state.store || buildStore();
  const product = state.products[0] || null;
  const productCount = state.products.length;
  const updateCount = state.storeUpdates.length;
  const liveCount = state.products.filter((item) => isLiveProduct(item)).length;
  const draftCount = state.products.filter((item) => item.status === "draft").length;
  const archivedCount = state.products.filter((item) => item.status === "archived").length;
  const storeName = store.storeName || "this store";

  if (elements.summaryTitle) {
    elements.summaryTitle.textContent = productCount
      ? `Browse ${productCount} listing${productCount === 1 ? "" : "s"} from ${storeName}`
      : state.isPublic
        ? `Explore ${storeName}`
        : "Build your store catalog";
  }

  if (elements.summaryText) {
    elements.summaryText.textContent = productCount
      ? truncate(
          product.description ||
            `${liveCount} live listing${liveCount === 1 ? "" : "s"} are buyer-ready, while the rest stay private until you publish them.`,
          180
        )
      : state.isPublic
        ? "This storefront is ready, but the seller has not published any listings yet."
        : "Add multiple products over time and keep delivery details obvious so buyers can browse your stall with confidence.";
  }

  if (elements.summaryChips) {
    const chips = [
      createStatusChip("Products Store"),
      createStatusChip(productCount ? `${productCount} Listing${productCount === 1 ? "" : "s"}` : "Store Setup"),
      createStatusChip(state.isPublic ? "Live Store" : "Seller Preview", "status-chip--good"),
    ];

    if (updateCount > 0) {
      chips.push(createStatusChip(`${updateCount} Update${updateCount === 1 ? "" : "s"}`));
    }

    if (!state.isPublic && draftCount > 0) {
      chips.push(createStatusChip(`${draftCount} Draft${draftCount === 1 ? "" : "s"}`, "status-chip--warn"));
    }

    if (!state.isPublic && archivedCount > 0) {
      chips.push(createStatusChip(`${archivedCount} Archived`, "status-chip--muted"));
    }

    if (product && product.location) {
      chips.push(createStatusChip(product.location));
    }

    if (product && product.variantCount > 0) {
      chips.push(createStatusChip(`${product.variantCount} Variant${product.variantCount === 1 ? "" : "s"}`));
    }

    elements.summaryChips.innerHTML = "";
    chips.forEach((chip) => elements.summaryChips.appendChild(chip));
  }

  if (elements.productsSubhead) {
    elements.productsSubhead.textContent = productCount
      ? `Browse ${storeName}'s current product catalog.`
      : state.isPublic
        ? "This store has not published any listings yet."
        : "Use the editor to add products, publish new uploads, and see them appear here instantly.";
  }
}

function getUpdateMetricLabel(update) {
  if (update.type === "live_drop") {
    return "Live drop";
  }

  if (update.type === "promo") {
    return "Promo post";
  }

  return "Store update";
}

function getStoreUpdateInitials(update) {
  const identity = update.storeName || update.storeHandle || "Store";
  return getInitials(identity);
}

function getStoreUpdateAvatarMarkup(update) {
  if (update.avatarUrl) {
    return `<img src="${escapeHtml(update.avatarUrl)}" alt="${escapeHtml(update.storeName || "Store")}">`;
  }

  return `<span>${escapeHtml(getStoreUpdateInitials(update))}</span>`;
}

function showUpdateWarning(message) {
  if (!elements.updateWarning) {
    return;
  }

  elements.updateWarning.hidden = false;
  elements.updateWarning.textContent = message;
}

function clearDeleteWarning() {
  if (!elements.deleteConfirmWarning) {
    return;
  }

  elements.deleteConfirmWarning.hidden = true;
  elements.deleteConfirmWarning.textContent = "";
}

function showDeleteWarning(message) {
  if (!elements.deleteConfirmWarning) {
    return;
  }

  elements.deleteConfirmWarning.hidden = false;
  elements.deleteConfirmWarning.textContent = message;
}

function closeDeleteModal() {
  if (!elements.deleteConfirmModal) {
    return;
  }

  elements.deleteConfirmModal.classList.remove("open");
  elements.deleteConfirmModal.setAttribute("aria-hidden", "true");
  state.pendingDelete = null;
  clearDeleteWarning();

  if (elements.confirmDeleteAction) {
    elements.confirmDeleteAction.disabled = false;
    const label = elements.confirmDeleteAction.querySelector("span");
    if (label) {
      label.textContent = "Delete";
    }
  }
}

function openDeleteModal(config = {}) {
  if (!elements.deleteConfirmModal || state.isPublic) {
    return;
  }

  state.pendingDelete = config;
  clearDeleteWarning();

  if (elements.deleteConfirmTitle) {
    elements.deleteConfirmTitle.textContent = config.title || "Delete item";
  }

  if (elements.deleteConfirmCopy) {
    elements.deleteConfirmCopy.textContent = config.message || "This action cannot be undone.";
  }

  if (elements.confirmDeleteAction) {
    const label = elements.confirmDeleteAction.querySelector("span");
    if (label) {
      label.textContent = config.confirmLabel || "Delete";
    }
  }

  elements.deleteConfirmModal.classList.add("open");
  elements.deleteConfirmModal.setAttribute("aria-hidden", "false");
  elements.confirmDeleteAction?.focus();
}

async function confirmDeleteModalAction() {
  if (!state.pendingDelete || !elements.confirmDeleteAction) {
    return;
  }

  const { request } = state.pendingDelete;
  if (typeof request !== "function") {
    closeDeleteModal();
    return;
  }

  const button = elements.confirmDeleteAction;
  const label = button.querySelector("span");
  const originalLabel = label ? label.textContent : "";

  try {
    clearDeleteWarning();
    button.disabled = true;
    if (label) {
      label.textContent = "Deleting...";
    }

    await request();
    closeDeleteModal();
  } catch (error) {
    showDeleteWarning(error.message || "Unable to delete this item.");
    button.disabled = false;
    if (label) {
      label.textContent = originalLabel || "Delete";
    }
  }
}

function clearUpdateWarning() {
  if (!elements.updateWarning) {
    return;
  }

  elements.updateWarning.hidden = true;
  elements.updateWarning.textContent = "";
}

function renderUpdateImagePreview() {
  if (!elements.updateImagePreviewGrid) {
    return;
  }

  elements.updateImagePreviewGrid.innerHTML = "";

  if (!state.updateFiles.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-thumb preview-thumb--soft";
    placeholder.innerHTML = '<div class="product-card__placeholder"><i class="fa-regular fa-images"></i></div>';
    elements.updateImagePreviewGrid.appendChild(placeholder);
    return;
  }

  state.updateFiles.forEach((file) => {
    const previewUrl = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "preview-thumb";
    card.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="Update preview image">`;
    elements.updateImagePreviewGrid.appendChild(card);
  });
}

function handleUpdateImageInput() {
  const files = Array.from(elements.updateImages?.files || []);
  const acceptedFiles = [];
  const warnings = [];

  files.forEach((file) => {
    if (acceptedFiles.length >= MAX_IMAGES) {
      warnings.push(`Only the first ${MAX_IMAGES} images were kept.`);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      warnings.push(`${file.name} is larger than 5MB and was skipped.`);
      return;
    }

    acceptedFiles.push(file);
  });

  state.updateFiles = acceptedFiles;
  if (warnings.length) {
    showUpdateWarning(warnings.join(" "));
  } else {
    clearUpdateWarning();
  }

  renderUpdateImagePreview();
}

function setUpdateComposerOpen(isOpen) {
  if (!elements.updatesComposer || state.isPublic) {
    return;
  }

  elements.updatesComposer.hidden = !isOpen;
  if (elements.toggleUpdateComposer) {
    elements.toggleUpdateComposer.classList.toggle("is-active", isOpen);
    elements.toggleUpdateComposer.setAttribute("aria-expanded", String(isOpen));
  }
}

function resetUpdateComposer() {
  if (elements.updateComposerForm) {
    elements.updateComposerForm.reset();
  }

  if (elements.updateType) {
    elements.updateType.value = "announcement";
  }
  if (elements.updateLinkedProduct) {
    elements.updateLinkedProduct.value = "";
  }

  state.updateFiles = [];
  if (elements.updateImages) {
    elements.updateImages.value = "";
  }

  clearUpdateWarning();
  renderUpdateImagePreview();
}

function renderUpdateLinkedProductOptions() {
  if (!elements.updateLinkedProduct) {
    return;
  }

  const liveProducts = state.products.filter((product) => isLiveProduct(product));
  const currentValue = elements.updateLinkedProduct.value || "";

  elements.updateLinkedProduct.innerHTML = `
    <option value="">No linked listing</option>
    ${liveProducts
      .map(
        (product) =>
          `<option value="${escapeHtml(String(product.id || ""))}">${escapeHtml(product.name)} · ${escapeHtml(
            formatCurrency(product.price)
          )}</option>`
      )
      .join("")}
  `;

  if (liveProducts.some((product) => String(product.id) === currentValue)) {
    elements.updateLinkedProduct.value = currentValue;
  } else {
    elements.updateLinkedProduct.value = "";
  }

  elements.updateLinkedProduct.disabled = liveProducts.length === 0;
}

function createStoreUpdateCard(update) {
  const article = document.createElement("article");
  const hasImages = update.images.length > 0;
  const hasExplicitTitle = Boolean(update.hasExplicitTitle && update.title);
  const descriptionClass = hasExplicitTitle
    ? "store-update-card__description"
    : "store-update-card__description store-update-card__description--lead";

  article.className = [
    "store-update-card",
    hasImages ? "store-update-card--with-media" : "store-update-card--text-only",
    hasExplicitTitle ? "store-update-card--titled" : "store-update-card--caption-only",
  ].join(" ");
  article.dataset.updateId = String(update.id || "");
  article.setAttribute("role", "article");
  article.setAttribute(
    "aria-label",
    `${update.storeName || "Store"} update from ${formatDate(update.createdAt)}`
  );

  const imageMarkup = hasImages
    ? `
        <div class="store-update-card__gallery store-update-card__gallery--${Math.min(update.images.length, 4)}">
          ${update.images
            .slice(0, 4)
            .map(
              (image, index) => `
                <button
                  class="store-update-card__gallery-item${index === 0 ? " is-primary" : ""}"
                  type="button"
                  data-update-gallery="${escapeHtml(String(update.id || ""))}"
                  data-update-index="${index}"
                  aria-label="Open update image ${index + 1}"
                >
                  <img src="${escapeHtml(image)}" alt="${escapeHtml(update.title || update.description || "Store update")}">
                  ${
                    index === 3 && update.images.length > 4
                      ? `<span class="store-update-card__gallery-count">+${update.images.length - 3}</span>`
                      : ""
                  }
                </button>
              `
            )
            .join("")}
        </div>
      `
    : "";
  const hasListingPath = Boolean(update.productPath);
  const identityLine = update.storeHandle
    ? `@${escapeHtml(update.storeHandle)} · ${escapeHtml(formatDate(update.createdAt))}`
    : escapeHtml(formatDate(update.createdAt));
  const headlineMarkup =
    hasExplicitTitle
      ? `<h3 class="store-update-card__title">${escapeHtml(update.title)}</h3>`
      : "";
  const displayIdentityLine = update.storeHandle
    ? `@${escapeHtml(update.storeHandle)} &middot; ${escapeHtml(formatDate(update.createdAt))}`
    : escapeHtml(formatDate(update.createdAt));
  const footerMarkup = hasListingPath
    ? `
        <div class="store-update-card__footer">
          <div class="store-update-card__actions">
            <a class="store-update-link store-update-link--primary" href="${escapeHtml(update.productPath)}" data-update-product="${escapeHtml(update.productPath)}">
              <i class="fa-solid fa-box-open"></i>
              <span>View linked listing</span>
            </a>
            ${
              !state.isPublic
                ? `<button class="store-update-link store-update-link--danger" type="button" data-delete-update="${escapeHtml(String(update.id || ""))}">
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Delete post</span>
                  </button>`
                : ""
            }
          </div>
        </div>
      `
    : !state.isPublic
      ? `
          <div class="store-update-card__footer">
            <div class="store-update-card__actions">
              <button class="store-update-link store-update-link--danger" type="button" data-delete-update="${escapeHtml(String(update.id || ""))}">
                <i class="fa-solid fa-trash-can"></i>
                <span>Delete post</span>
              </button>
            </div>
          </div>
        `
      : "";

  article.innerHTML = `
    <div class="store-update-card__header">
      <div class="store-update-card__identity">
        <div class="store-update-card__avatar">${getStoreUpdateAvatarMarkup(update)}</div>
        <div class="store-update-card__identity-copy">
          <strong>${escapeHtml(update.storeName || "Store")}</strong>
          <span>${displayIdentityLine}</span>
        </div>
      </div>
      <span class="store-update-card__tag">${escapeHtml(update.feedTag || getUpdateMetricLabel(update))}</span>
    </div>
    <div class="store-update-card__body">
      <div class="store-update-card__content">
        <div class="store-update-card__meta">
          <span>${escapeHtml(getUpdateMetricLabel(update))}</span>
          <span>${escapeHtml(update.images.length ? `${update.images.length} photo${update.images.length === 1 ? "" : "s"}` : "Text post")}</span>
        </div>
        <div class="store-update-card__story">
          ${headlineMarkup}
          <p class="${descriptionClass}">${escapeHtml(update.description)}</p>
        </div>
      </div>
      ${imageMarkup ? `<div class="store-update-card__media">${imageMarkup}</div>` : ""}
      ${footerMarkup}
    </div>
  `;

  return article;
}

function renderStoreUpdates() {
  if (!elements.updatesList || !elements.updatesEmpty || !elements.updatesSubhead) {
    return;
  }

  const updateCount = state.storeUpdates.length;
  elements.updatesSubhead.textContent = updateCount
    ? updateCount === 1
      ? "One recent update is live here, giving buyers a quick read on what this stall is sharing right now."
      : `${updateCount} recent updates are live here, mixing announcements, promos, and drops into one running story for buyers.`
    : state.isPublic
      ? "This stall has not shared any public updates yet."
      : "Share short announcements, promo drops, or live moments so buyers see more than just product listings.";

  elements.updatesList.innerHTML = "";
  state.storeUpdates.forEach((update) => {
    elements.updatesList.appendChild(createStoreUpdateCard(update));
  });

  elements.updatesEmpty.hidden = updateCount > 0;
  elements.updatesList.hidden = updateCount === 0;

  if (elements.updatesEmptyTitle) {
    elements.updatesEmptyTitle.textContent = state.isPublic ? "No store updates yet" : "No updates published yet";
  }

  if (elements.updatesEmptyText) {
    elements.updatesEmptyText.textContent = state.isPublic
      ? "Check back here when the seller starts sharing announcements, promos, or live moments."
      : "Use this space for quick captions, promo drops, and behind-the-scenes moments that keep the stall feeling active.";
  }
}

function renderSettingsPanel() {
  const store = state.store || buildStore();
  const product = state.products[0] || null;
  const productCount = state.products.length;
  const liveCount = state.products.filter((item) => isLiveProduct(item)).length;
  const hiddenCount = state.products.filter((item) => !isLiveProduct(item)).length;
  const lowStockCount = state.products.filter(
    (item) => String(item.status || "").toLowerCase() === "published" && Number(item.stockQuantity || 0) <= 5
  ).length;

  if (elements.panelStoreName) {
    elements.panelStoreName.textContent = store.storeName || "Products Store";
  }

  if (elements.panelStoreHandle) {
    elements.panelStoreHandle.textContent = store.handle ? `@${store.handle}` : "@store";
  }

  if (elements.panelStoreTagline) {
    elements.panelStoreTagline.textContent = store.tagline || "No tagline yet";
  }

  if (elements.panelStoreAbout) {
    elements.panelStoreAbout.textContent = store.about || "Store details will appear here.";
  }

  if (elements.themePreview) {
    const accent = store.accentColor || DEFAULT_ACCENT;
    elements.themePreview.style.background = `linear-gradient(135deg, ${accent}, #10b981)`;
  }

  if (elements.panelNotes) {
    const notes = [];
    notes.push(
      productCount
        ? `Catalog currently shows ${productCount} listing${productCount === 1 ? "" : "s"} for buyers to browse.`
        : "Add your first listing to turn this store preview into a shoppable catalog."
    );
    notes.push(
      liveCount
        ? `${liveCount} listing${liveCount === 1 ? "" : "s"} are public right now${hiddenCount ? `, with ${hiddenCount} still hidden from buyers.` : "."}`
        : "No listings are public yet. Publish at least one listing to make the storefront shoppable."
    );
    notes.push(
      product && product.images.length
        ? `Lead listing includes ${product.images.length} photo${product.images.length > 1 ? "s" : ""}.`
        : "Add crisp product photos for a stronger first impression."
    );
    notes.push(
      product && product.variantCount > 0
        ? `Lead listing has ${product.variantCount} variant option${product.variantCount === 1 ? "" : "s"} with tracked stock.`
        : "Use variants when you need size, color, or option-specific stock."
    );
    notes.push(
      lowStockCount
        ? `${lowStockCount} published listing${lowStockCount === 1 ? "" : "s"} need stock attention soon.`
        : "Published stock levels look healthy right now."
    );
    notes.push(product && product.delivery ? `Delivery note is visible: ${truncate(product.delivery, 70)}` : "Use delivery details to reduce buyer questions.");
    notes.push(store.handle ? `Public store path is ${getStorePath(store)}.` : "Set a clean handle so the public store URL feels trustworthy.");

    elements.panelNotes.innerHTML = "";
    notes.forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      elements.panelNotes.appendChild(item);
    });
  }
}

function splitProducts(products) {
  const cutoff = Date.now() - PRODUCT_RECENT_DAYS * 24 * 60 * 60 * 1000;

  return products.reduce(
    (groups, product) => {
      const timestamp = new Date(product.createdAt || Date.now()).getTime();
      if (Number.isNaN(timestamp) || timestamp >= cutoff) {
        groups.recent.push(product);
      } else {
        groups.previous.push(product);
      }
      return groups;
    },
    { recent: [], previous: [] }
  );
}

function applyFilters(products) {
  const query = state.filters.query.trim().toLowerCase();
  const statusFilter = state.filters.status;
  const deliveryFilter = state.filters.delivery;
  const sort = state.filters.sort;

  const filtered = products.filter((product) => {
    const haystack = [product.name, product.description, product.delivery, product.location]
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) {
      return false;
    }

    if (!state.isPublic && statusFilter !== "all" && product.status !== statusFilter) {
      return false;
    }

    if (deliveryFilter === "delivery" && !product.delivery) {
      return false;
    }

    if (deliveryFilter === "pickup" && !/pickup|collect/i.test(product.delivery || "")) {
      return false;
    }

    return true;
  });

  filtered.sort((left, right) => {
    if (sort === "price-asc") {
      return left.price - right.price;
    }

    if (sort === "price-desc") {
      return right.price - left.price;
    }

    if (sort === "name") {
      return left.name.localeCompare(right.name);
    }

    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });

  return filtered;
}

function setCardImage(card, images, index) {
  const media = card.querySelector(".product-card__media");
  const image = card.querySelector(".product-card__media img");
  const dots = Array.from(card.querySelectorAll(".media-dot"));
  const safeIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0));
  const currentImage = images[safeIndex] || "";

  if (image && currentImage) {
    image.src = currentImage;
    image.alt = card.dataset.productName || "Product image";
  }

  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === safeIndex);
  });

  if (media) {
    media.dataset.activeIndex = String(safeIndex);
  }
}

function createMediaDots(images, onSelect) {
  const dots = document.createElement("div");
  dots.className = "media-dots";

  images.forEach((imageUrl, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === 0 ? "media-dot active" : "media-dot";
    button.setAttribute("aria-label", `Show image ${index + 1}`);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(index);
    });
    dots.appendChild(button);
  });

  return dots;
}

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.dataset.productName = product.name;

  const liveProduct = isLiveProduct(product);
  const badgeLabel = state.isPublic
    ? "Published listing"
    : `${formatProductStatus(product.status)} / ${formatProductVisibility(product.visibility)}`;
  const badgeModifier = getProductBadgeModifier(product);
  const stockLabel = formatStockLabel(product);
  const stockTone = getStockTone(product);
  const publicationLabel = liveProduct
    ? "Visible on the public store"
    : `${formatProductStatus(product.status)} / ${formatProductVisibility(product.visibility)}`;
  const imageMarkup = product.images[0]
    ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}">`
    : `<div class="product-card__placeholder"><i class="fa-regular fa-image"></i></div>`;

  article.innerHTML = `
    <div class="product-card__inner">
      <div class="product-card__media" role="${product.images.length ? "button" : "presentation"}" tabindex="${product.images.length ? "0" : "-1"}">
        ${imageMarkup}
        <span class="product-card__badge ${badgeModifier}">${escapeHtml(badgeLabel)}</span>
      </div>
      <div class="product-card__body">
        <div class="product-card__meta">
          <span>${escapeHtml(formatDate(product.createdAt))}</span>
          <span>${product.images.length ? `${product.images.length} photo${product.images.length > 1 ? "s" : ""}` : "No gallery yet"}</span>
        </div>
        <h3 class="product-card__title">${escapeHtml(product.name)}</h3>
        <p class="product-card__description">${escapeHtml(product.description || "No description provided yet.")}</p>
        <div class="product-card__details">
          <span><i class="fa-solid fa-location-dot"></i>${escapeHtml(product.location || "Location not provided")}</span>
          <span><i class="fa-solid fa-truck-fast"></i>${escapeHtml(product.delivery || "Delivery details pending")}</span>
          <span><i class="fa-solid fa-money-bill-wave"></i>${escapeHtml(product.transportFee > 0 ? `Transport ${formatCurrency(product.transportFee)}` : "Transport included")}</span>
          <span class="product-card__stock product-card__stock--${stockTone}"><i class="fa-solid fa-box-open"></i>${escapeHtml(stockLabel)}</span>
          ${product.variantCount > 0 ? `<span><i class="fa-solid fa-layer-group"></i>${escapeHtml(`${product.variantCount} variant${product.variantCount === 1 ? "" : "s"}`)}</span>` : ""}
        </div>
        ${
          Array.isArray(product.variants) && product.variants.length
            ? `<div class="product-card__variant-list">${product.variants
                .slice(0, 3)
                .map(
                  (variant) =>
                    `<span class="product-card__variant-pill">${escapeHtml(variant.label || "Variant")}${variant.stockQuantity >= 0 ? ` / ${escapeHtml(String(variant.stockQuantity))}` : ""}</span>`
                )
                .join("")}${product.variants.length > 3 ? `<span class="product-card__variant-pill product-card__variant-pill--muted">+${escapeHtml(String(product.variants.length - 3))} more</span>` : ""}</div>`
            : ""
        }
        <div class="product-card__footer">
          <div class="product-card__price">
            <strong>${escapeHtml(formatCurrency(product.price))}</strong>
            <span class="product-card__price-meta">${escapeHtml(publicationLabel)}</span>
          </div>
          <div class="product-card__actions"></div>
        </div>
      </div>
    </div>
  `;

  const media = article.querySelector(".product-card__media");
  const actions = article.querySelector(".product-card__actions");

  if (product.images.length > 1) {
    media.appendChild(
      createMediaDots(product.images, (index) => {
        setCardImage(article, product.images, index);
      })
    );
  }

  if (product.images.length) {
    const open = (event) => {
      event.preventDefault();
      openViewer(product.images, Number(media.dataset.activeIndex || 0));
    };

    media.addEventListener("click", open);
    media.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        open(event);
      }
    });
  }

  if (state.isPublic) {
    if (product.id) {
      const detailsLink = document.createElement("a");
      detailsLink.className = "product-action";
      detailsLink.href = getProductPath(product);
      detailsLink.textContent = "View details";
      actions.appendChild(detailsLink);

      const checkoutLink = document.createElement("a");
      checkoutLink.className = "product-action--primary";
      checkoutLink.href = getCheckoutPath(product);
      checkoutLink.textContent = "Checkout";
      actions.appendChild(checkoutLink);
    }
  } else {
    if (product.id && liveProduct) {
      const previewLink = document.createElement("a");
      previewLink.className = "product-action";
      previewLink.href = getProductPath(product);
      previewLink.textContent = "Public preview";
      actions.appendChild(previewLink);
    }

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "product-action--primary";
    editButton.textContent = "Edit listing";
    editButton.addEventListener("click", () => openModal(product));
    actions.appendChild(editButton);

    if (product.id) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "product-action product-action--danger";
      deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i><span>Delete</span>';
      deleteButton.addEventListener("click", () => {
        deleteListing(product);
      });
      actions.appendChild(deleteButton);
    }

    if (!liveProduct) {
      const visibilityHint = document.createElement("span");
      visibilityHint.className = "product-action product-action--static";
      visibilityHint.textContent = product.status === "archived" ? "Archived" : "Hidden from buyers";
      actions.prepend(visibilityHint);
    }
  }

  return article;
}

function renderProducts() {
  if (!elements.recentGrid || !elements.prevGrid || !elements.emptyState) {
    return;
  }

  const filteredProducts = applyFilters(state.products);
  const groups = splitProducts(filteredProducts);
  const hasProducts = state.products.length > 0;
  const hasVisibleProducts = filteredProducts.length > 0;

  elements.recentGrid.innerHTML = "";
  elements.prevGrid.innerHTML = "";

  groups.recent.forEach((product) => elements.recentGrid.appendChild(createProductCard(product)));
  groups.previous.forEach((product) => elements.prevGrid.appendChild(createProductCard(product)));

  if (elements.recentCount) {
    elements.recentCount.textContent = hasVisibleProducts
      ? `${groups.recent.length} current item${groups.recent.length === 1 ? "" : "s"}`
      : "No items";
  }

  if (elements.prevCount) {
    elements.prevCount.textContent = groups.previous.length
      ? `${groups.previous.length} older item${groups.previous.length === 1 ? "" : "s"}`
      : "No older items";
  }

  if (elements.archiveSection) {
    elements.archiveSection.hidden = groups.previous.length === 0;
  }

  elements.emptyState.hidden = hasVisibleProducts;

  if (!hasProducts) {
    setEmptyState(
      state.isPublic ? "No products yet" : "No listings yet",
      state.isPublic
        ? "This store has not published any products yet."
        : "Open the listing editor to add your first product and start building a fuller catalog for buyers.",
      state.isPublic ? "Browse marketplace" : "Create listing",
      state.isPublic ? "/marketplace" : "#",
      state.isPublic ? "" : "create"
    );
  } else if (!hasVisibleProducts) {
    setEmptyState(
      "No matching products",
      "Try a different search term or reset your filters to see the current listing again.",
      "Reset filters",
      "#",
      "reset"
    );
  }
}

function setView(view) {
  const resolvedView = view === "list" ? "list" : "grid";
  state.view = resolvedView;

  if (elements.productsSection) {
    elements.productsSection.dataset.view = resolvedView;
  }

  if (elements.gridViewBtn) {
    elements.gridViewBtn.classList.toggle("is-active", resolvedView === "grid");
  }

  if (elements.listViewBtn) {
    elements.listViewBtn.classList.toggle("is-active", resolvedView === "list");
  }
}

function openSettingsPanel() {
  if (!elements.settingsPanel || state.isPublic) {
    return;
  }

  elements.settingsPanel.classList.add("open");
  elements.settingsPanel.setAttribute("aria-hidden", "false");
  if (elements.settingsOverlay) {
    elements.settingsOverlay.classList.add("is-open");
  }
}

function closeSettingsPanel() {
  if (!elements.settingsPanel) {
    return;
  }

  elements.settingsPanel.classList.remove("open");
  elements.settingsPanel.setAttribute("aria-hidden", "true");
  if (elements.settingsOverlay) {
    elements.settingsOverlay.classList.remove("is-open");
  }
}

function closeNavMenu() {
  if (!elements.nav || !elements.navToggle) {
    return;
  }

  elements.nav.classList.remove("is-open");
  elements.navToggle.setAttribute("aria-expanded", "false");
}

function toggleNavMenu() {
  if (!elements.nav || !elements.navToggle) {
    return;
  }

  const isOpen = elements.nav.classList.toggle("is-open");
  elements.navToggle.setAttribute("aria-expanded", String(isOpen));
}

function activateTab(tabId) {
  elements.settingsTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });

  elements.tabScreens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === `tab-${tabId}`);
  });
}

function renderViewer() {
  if (!elements.imageViewer || !elements.imageViewerImage || !elements.imageViewerDots) {
    return;
  }

  const total = state.viewerImages.length;
  const safeIndex = Math.min(Math.max(state.viewerIndex, 0), Math.max(total - 1, 0));
  const imageUrl = state.viewerImages[safeIndex] || "";

  elements.imageViewerImage.src = imageUrl;
  elements.imageViewerImage.alt = `Store image ${safeIndex + 1}`;
  elements.imageViewerDots.innerHTML = "";

  state.viewerImages.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === safeIndex ? "media-dot active" : "media-dot";
    button.setAttribute("aria-label", `Show image ${index + 1}`);
    button.addEventListener("click", () => {
      state.viewerIndex = index;
      renderViewer();
    });
    elements.imageViewerDots.appendChild(button);
  });
}

function openViewer(images, index) {
  if (!Array.isArray(images) || images.length === 0 || !elements.imageViewer) {
    return;
  }

  state.viewerImages = images.slice();
  state.viewerIndex = Math.min(Math.max(index, 0), images.length - 1);
  elements.imageViewer.classList.add("show");
  renderViewer();
}

function closeViewer() {
  if (!elements.imageViewer) {
    return;
  }

  elements.imageViewer.classList.remove("show");
  state.viewerImages = [];
  state.viewerIndex = 0;
}

function changeViewer(direction) {
  if (!state.viewerImages.length) {
    return;
  }

  const total = state.viewerImages.length;
  state.viewerIndex = (state.viewerIndex + direction + total) % total;
  renderViewer();
}

function showModalStep(step) {
  state.modalStep = clampStep(step);

  elements.wizardSteps.forEach((wizardStep) => {
    wizardStep.classList.toggle("active", Number(wizardStep.dataset.step) === state.modalStep);
  });

  elements.wizardScreens.forEach((screen) => {
    screen.classList.toggle("is-active", Number(screen.dataset.screen) === state.modalStep);
  });
}

function updateEditorSummary() {
  const totalVariantStock = state.modalVariants.length ? getVariantTotalStock(state.modalVariants) : null;

  if (elements.summaryName) {
    elements.summaryName.textContent =
      elements.productName.value.trim() || (state.modalProductId ? "Listing" : "New listing");
  }

  if (elements.summaryPrice) {
    elements.summaryPrice.textContent = formatCurrency(elements.productPrice.value || 0);
  }

  if (elements.summaryStock) {
    const stockQuantity =
      totalVariantStock == null
        ? Number(elements.productStock && elements.productStock.value || 0)
        : totalVariantStock;
    const suffix = totalVariantStock == null ? "" : " across variants";
    elements.summaryStock.textContent = `${formatStockLabel({ stockQuantity })}${suffix}`;
  }

  if (elements.summaryStatus) {
    const statusLabel = formatProductStatus(elements.productStatus && elements.productStatus.value);
    const visibilityLabel = formatProductVisibility(elements.productVisibility && elements.productVisibility.value);
    elements.summaryStatus.textContent = `${statusLabel} / ${visibilityLabel}`;
  }
}

function renderVariantList() {
  if (!elements.variantList) {
    return;
  }

  elements.variantList.innerHTML = "";

  if (elements.variantEmpty) {
    elements.variantEmpty.hidden = state.modalVariants.length > 0;
  }

  state.modalVariants.forEach((variant, index) => {
    const row = document.createElement("div");
    row.className = "variant-row";
    row.dataset.variantId = String(variant.clientId);
    row.innerHTML = `
      <div class="variant-row__grid">
        <label class="field">
          <span>Option label</span>
          <input type="text" maxlength="80" value="${escapeHtml(variant.label)}" data-variant-field="label" placeholder="Small / Blue / Weekend edition">
        </label>
        <label class="field">
          <span>SKU</span>
          <input type="text" maxlength="120" value="${escapeHtml(variant.sku)}" data-variant-field="sku" placeholder="SKU-${index + 1}">
        </label>
        <label class="field">
          <span>Price override</span>
          <div class="field-prefix">
            <span class="prefix">K</span>
            <input type="number" min="0" step="0.01" value="${escapeHtml(variant.priceOverride)}" data-variant-field="priceOverride" placeholder="Optional">
          </div>
        </label>
        <label class="field">
          <span>Variant stock</span>
          <input type="number" min="0" step="1" value="${escapeHtml(String(variant.stockQuantity))}" data-variant-field="stockQuantity">
        </label>
      </div>
      <div class="variant-row__actions">
        <button type="button" class="product-action product-action--danger" data-remove-variant="${escapeHtml(String(variant.clientId))}">
          <i class="fa-solid fa-trash-can"></i>
          <span>Remove variant</span>
        </button>
      </div>
    `;
    elements.variantList.appendChild(row);
  });
}

function validateVariants() {
  if (!state.modalVariants.length) {
    return true;
  }

  const seenLabels = new Set();
  const seenSkus = new Set();

  for (const variant of state.modalVariants) {
    const label = String(variant.label || "").trim();
    if (!label) {
      showModalWarning("Each variant needs an option label.");
      return false;
    }

    const normalizedLabel = label.toLowerCase();
    if (seenLabels.has(normalizedLabel)) {
      showModalWarning("Variant labels must be unique.");
      return false;
    }
    seenLabels.add(normalizedLabel);

    const sku = String(variant.sku || "").trim().toUpperCase();
    if (sku) {
      if (seenSkus.has(sku)) {
        showModalWarning("Variant SKUs must be unique.");
        return false;
      }
      seenSkus.add(sku);
    }
  }

  clearModalWarning();
  return true;
}

function buildVariantPayloads() {
  return state.modalVariants.map((variant) => ({
    label: String(variant.label || "").trim(),
    sku: String(variant.sku || "").trim(),
    priceOverride: variant.priceOverride === "" ? null : Number(variant.priceOverride || 0),
    stockQuantity: Number(variant.stockQuantity || 0) || 0,
  }));
}

function renderModalImages() {
  if (!elements.productImagePreviewGrid) {
    return;
  }

  const imageSources = state.modalFiles.length
    ? state.modalFiles.map((file) => URL.createObjectURL(file))
    : state.modalExistingImages.slice();

  elements.productImagePreviewGrid.innerHTML = "";

  if (!imageSources.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-thumb";
    placeholder.innerHTML = '<div class="product-card__placeholder"><i class="fa-regular fa-image"></i></div>';
    elements.productImagePreviewGrid.appendChild(placeholder);
    return;
  }

  imageSources.forEach((imageUrl) => {
    const card = document.createElement("div");
    card.className = "preview-thumb";
    card.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="Listing preview image">`;
    elements.productImagePreviewGrid.appendChild(card);
  });
}

function clearModalWarning() {
  if (!elements.imgWarning) {
    return;
  }

  elements.imgWarning.hidden = true;
  elements.imgWarning.textContent = "";
}

function showModalWarning(message) {
  if (!elements.imgWarning) {
    return;
  }

  elements.imgWarning.hidden = false;
  elements.imgWarning.textContent = message;
}

function validateCurrentStep() {
  const fieldsByStep = {
    1: [elements.productName, elements.productDescription],
    2: [elements.productPrice, elements.productStock],
    3: [],
    4: [],
  };

  const baseValid = (fieldsByStep[state.modalStep] || []).every((field) => !field || field.reportValidity());
  if (!baseValid) {
    return false;
  }

  if (state.modalStep === 3) {
    return validateVariants();
  }

  return true;
}

function getModalProduct() {
  if (!state.modalProductId) {
    return null;
  }

  return state.products.find((product) => Number(product.id) === Number(state.modalProductId)) || null;
}

function updateModalMeta() {
  const isEditing = Boolean(state.modalProductId);
  const currentProduct = getModalProduct();

  if (elements.modalTitle) {
    elements.modalTitle.textContent =
      isEditing && currentProduct
        ? `Edit ${truncate(currentProduct.name, 34) || "listing"}`
        : "Create a new listing";
  }

  if (elements.modalCopy) {
    elements.modalCopy.textContent = isEditing
      ? "Refresh the details for this product without going back through store setup."
      : "Add another product to your store without reopening setup.";
  }

  if (elements.modalSubmit) {
    elements.modalSubmit.textContent = isEditing ? "Update listing" : "Save listing";
  }
}

function fillModalFromProduct(product) {
  const currentProduct = product || null;
  state.modalProductId = currentProduct && currentProduct.id ? Number(currentProduct.id) : 0;

  elements.productName.value = currentProduct ? currentProduct.name : "";
  elements.productDescription.value = currentProduct ? currentProduct.description : "";
  elements.productPrice.value = currentProduct && currentProduct.price ? String(currentProduct.price) : "";
  elements.productStock.value = currentProduct ? String(Number(currentProduct.stockQuantity || 0)) : "0";
  elements.transportFee.value =
    currentProduct && currentProduct.transportFee ? String(currentProduct.transportFee) : "";
  elements.productStatus.value = currentProduct ? currentProduct.status : "published";
  elements.productVisibility.value = currentProduct ? currentProduct.visibility : "public";
  elements.deliveryInfo.value = currentProduct ? currentProduct.delivery : "";
  elements.businessLocation.value = currentProduct ? currentProduct.location : "";
  elements.productImages.value = "";

  state.modalFiles = [];
  state.modalExistingImages = currentProduct ? currentProduct.images.slice() : [];
  state.modalVariants = currentProduct && Array.isArray(currentProduct.variants)
    ? currentProduct.variants.map((variant) => createVariantDraft(variant))
    : [];

  updateModalMeta();
  clearModalWarning();
  showModalStep(1);
  renderVariantList();
  updateEditorSummary();
  renderModalImages();
}

function openModal(product = null) {
  if (state.isPublic || !elements.createModal) {
    return;
  }

  if (!state.store || !state.store.storeName || !state.store.handle) {
    window.location.href = "/seller/store";
    return;
  }

  fillModalFromProduct(product);
  elements.createModal.classList.add("open");
  elements.createModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!elements.createModal) {
    return;
  }

  elements.createModal.classList.remove("open");
  elements.createModal.setAttribute("aria-hidden", "true");
  state.modalProductId = 0;
  state.modalVariants = [];
  renderVariantList();
  updateModalMeta();
  clearModalWarning();
}

function readFilesAsDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        })
    )
  );
}

async function handleImageInput() {
  const files = Array.from(elements.productImages.files || []);
  const acceptedFiles = [];
  const warnings = [];

  files.forEach((file) => {
    if (acceptedFiles.length >= MAX_IMAGES) {
      warnings.push(`Only the first ${MAX_IMAGES} images were kept.`);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      warnings.push(`${file.name} is larger than 5MB and was skipped.`);
      return;
    }

    acceptedFiles.push(file);
  });

  state.modalFiles = acceptedFiles;
  if (warnings.length) {
    showModalWarning(warnings.join(" "));
  } else {
    clearModalWarning();
  }

  renderModalImages();
}

async function saveListing(event) {
  event.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  const submitButton = elements.createProductForm.querySelector(".btn-primary");
  const originalLabel = submitButton ? submitButton.textContent : "";
  const isEditing = Boolean(state.modalProductId);

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = isEditing ? "Updating..." : "Saving...";
    }

    clearModalWarning();

    const uploadedImages = state.modalFiles.length
      ? await readFilesAsDataUrls(state.modalFiles)
      : [];

    const payload = {
      product: {
        name: elements.productName.value.trim(),
        description: elements.productDescription.value.trim(),
        price: Number(elements.productPrice.value || 0),
        stockQuantity: Number(elements.productStock.value || 0),
        status: elements.productStatus.value || "published",
        visibility: elements.productVisibility.value || "public",
        delivery: elements.deliveryInfo.value.trim(),
        location: elements.businessLocation.value.trim(),
        transportFee: Number(elements.transportFee.value || 0),
        variants: buildVariantPayloads(),
        images: (uploadedImages.length ? uploadedImages : state.modalExistingImages).map((src) => ({ src })),
      },
    };

    await fetchJson(isEditing ? `/api/products/${state.modalProductId}` : "/api/products", {
      method: isEditing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await loadStorefront();
    closeModal();
  } catch (error) {
    showModalWarning(error.message || "Unable to save listing.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

async function saveStoreUpdate(event) {
  event.preventDefault();

  if (!elements.updateComposerForm) {
    return;
  }

  const submitButton = elements.submitUpdatePost;
  const originalLabel = submitButton ? submitButton.textContent : "";

  try {
    clearUpdateWarning();

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Publishing...";
    }

    const uploadedImages = state.updateFiles.length ? await readFilesAsDataUrls(state.updateFiles) : [];

    const payload = {
      type: elements.updateType ? elements.updateType.value : "announcement",
      title: elements.updateTitle ? elements.updateTitle.value.trim() : "",
      description: elements.updateDescription ? elements.updateDescription.value.trim() : "",
      catalogItemId: elements.updateLinkedProduct ? Number(elements.updateLinkedProduct.value || 0) : 0,
      images: uploadedImages.map((src) => ({ src })),
    };

    const response = await fetchJson("/api/feed/store-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    state.storeUpdates = buildStoreUpdates(response);
    renderSummary();
    renderStoreUpdates();
    resetUpdateComposer();
    setUpdateComposerOpen(false);
  } catch (error) {
    showUpdateWarning(error.message || "Unable to publish update.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel || "Publish update";
    }
  }
}

function deleteListing(product) {
  if (state.isPublic || !product || !product.id) {
    return;
  }

  openDeleteModal({
    title: "Delete listing",
    message: `Delete "${product.name || "this listing"}"? This will remove the listing, its images, and linked engagement records.`,
    confirmLabel: "Delete listing",
    request: async () => {
      const response = await fetchJson(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      state.products = buildProducts(response);
      renderFeatureCards();
      renderSummary();
      renderProducts();
    },
  });
}

function deleteStoreUpdate(feedItemId) {
  const normalizedFeedItemId = Number(feedItemId);
  if (state.isPublic || !Number.isInteger(normalizedFeedItemId) || normalizedFeedItemId <= 0) {
    return;
  }

  openDeleteModal({
    title: "Delete store update",
    message: "Delete this update post? This will remove the post, its uploaded media, and any engagement attached to it.",
    confirmLabel: "Delete post",
    request: async () => {
      const response = await fetchJson(`/api/feed/store-posts/${normalizedFeedItemId}`, {
        method: "DELETE",
      });

      state.storeUpdates = buildStoreUpdates(response);
      renderSummary();
      renderStoreUpdates();
    },
  });
}

async function loadStorefront() {
  try {
    const payload = await fetchStorePayload();
    state.store = buildStore(payload);
    state.products = buildProducts(payload);

    try {
      const updatesPayload = await fetchStoreUpdates();
      state.storeUpdates = buildStoreUpdates(updatesPayload);
    } catch (updatesError) {
      state.storeUpdates = [];
    }
  } catch (error) {
    if (!state.isPublic && (error.status === 401 || error.status === 403)) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/auth/signin?role=seller&returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    state.store = buildStore();
    state.products = [];
    state.storeUpdates = [];
  }

  renderHeader();
  renderFeatureCards();
  renderSummary();
  renderUpdateLinkedProductOptions();
  renderStoreUpdates();
  renderSettingsPanel();
  renderProducts();
}

async function copyStoreLink() {
  const url = new URL(state.isPublic ? window.location.pathname : getStorePath(), window.location.origin).toString();
  const label = elements.shareStoreBtn ? elements.shareStoreBtn.querySelector("span") : null;
  const originalText = label ? label.textContent : "";

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (label) {
      label.textContent = "Copied";
      window.setTimeout(() => {
        label.textContent = originalText || (state.isPublic ? "Share" : "Copy link");
      }, 1600);
    }
  } catch (error) {
    if (label) {
      label.textContent = "Copy failed";
      window.setTimeout(() => {
        label.textContent = originalText || (state.isPublic ? "Share" : "Copy link");
      }, 1800);
    }
  }
}

function resetFilters() {
  state.filters.query = "";
  state.filters.status = "all";
  state.filters.delivery = "all";
  state.filters.sort = "newest";

  if (elements.searchInput) {
    elements.searchInput.value = "";
  }
  if (elements.deliveryFilter) {
    elements.deliveryFilter.value = "all";
  }
  if (elements.productStatusFilter) {
    elements.productStatusFilter.value = "all";
  }
  if (elements.sortFilter) {
    elements.sortFilter.value = "newest";
  }

  renderProducts();
}

function bindEvents() {
  if (elements.yearFooter) {
    elements.yearFooter.textContent = String(new Date().getFullYear());
  }

  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", (event) => {
      state.filters.query = event.target.value || "";
      renderProducts();
    });
  }

  if (elements.deliveryFilter) {
    elements.deliveryFilter.addEventListener("change", (event) => {
      state.filters.delivery = event.target.value || "all";
      renderProducts();
    });
  }

  if (elements.productStatusFilter) {
    elements.productStatusFilter.addEventListener("change", (event) => {
      state.filters.status = event.target.value || "all";
      renderProducts();
    });
  }

  if (elements.sortFilter) {
    elements.sortFilter.addEventListener("change", (event) => {
      state.filters.sort = event.target.value || "newest";
      renderProducts();
    });
  }

  if (elements.gridViewBtn) {
    elements.gridViewBtn.addEventListener("click", () => setView("grid"));
  }

  if (elements.listViewBtn) {
    elements.listViewBtn.addEventListener("click", () => setView("list"));
  }

  if (elements.followBtn && state.isPublic) {
    elements.followBtn.addEventListener("click", toggleStoreFollow);
  }

  if (elements.shareStoreBtn) {
    elements.shareStoreBtn.addEventListener("click", copyStoreLink);
  }

  if (elements.toggleUpdateComposer) {
    elements.toggleUpdateComposer.addEventListener("click", () => {
      const isOpen = !(elements.updatesComposer && elements.updatesComposer.hidden === false);
      setUpdateComposerOpen(isOpen);
      if (isOpen) {
        elements.updateTitle?.focus();
      }
    });
  }

  if (elements.cancelUpdateComposer) {
    elements.cancelUpdateComposer.addEventListener("click", () => {
      resetUpdateComposer();
      setUpdateComposerOpen(false);
    });
  }

  if (elements.updateComposerForm) {
    elements.updateComposerForm.addEventListener("submit", saveStoreUpdate);
  }

  if (elements.updateImages) {
    elements.updateImages.addEventListener("change", handleUpdateImageInput);
  }

  if (elements.navToggle) {
    elements.navToggle.addEventListener("click", toggleNavMenu);
  }

  if (elements.nav) {
    elements.nav.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 760) {
          closeNavMenu();
        }
      });
    });
  }

  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener("click", openSettingsPanel);
  }

  if (elements.closeSettings) {
    elements.closeSettings.addEventListener("click", closeSettingsPanel);
  }

  if (elements.settingsOverlay) {
    elements.settingsOverlay.addEventListener("click", closeSettingsPanel);
  }

  elements.settingsTabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  [elements.createTop, elements.createFab, elements.createSectionBtn].forEach((button) => {
    if (!button) {
      return;
    }

    button.addEventListener("click", () => openModal());
  });

  if (elements.modalClose) {
    elements.modalClose.addEventListener("click", closeModal);
  }

  if (elements.modalBackdrop) {
    elements.modalBackdrop.addEventListener("click", closeModal);
  }

  if (elements.deleteConfirmClose) {
    elements.deleteConfirmClose.addEventListener("click", closeDeleteModal);
  }

  if (elements.deleteConfirmBackdrop) {
    elements.deleteConfirmBackdrop.addEventListener("click", closeDeleteModal);
  }

  if (elements.cancelDeleteAction) {
    elements.cancelDeleteAction.addEventListener("click", closeDeleteModal);
  }

  if (elements.confirmDeleteAction) {
    elements.confirmDeleteAction.addEventListener("click", confirmDeleteModalAction);
  }

  elements.nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!validateCurrentStep()) {
        return;
      }

      showModalStep(state.modalStep + 1);
    });
  });

  elements.backButtons.forEach((button) => {
    button.addEventListener("click", () => showModalStep(state.modalStep - 1));
  });

  [
    elements.productName,
    elements.productDescription,
    elements.productPrice,
    elements.productStock,
    elements.productStatus,
    elements.productVisibility,
    elements.businessLocation,
  ].forEach((field) => {
    if (!field) {
      return;
    }

    field.addEventListener(field.tagName === "SELECT" ? "change" : "input", updateEditorSummary);
  });

  if (elements.productImages) {
    elements.productImages.addEventListener("change", handleImageInput);
  }

  if (elements.clearProductImages) {
    elements.clearProductImages.addEventListener("click", () => {
      state.modalFiles = [];
      state.modalExistingImages = [];
      if (elements.productImages) {
        elements.productImages.value = "";
      }
      clearModalWarning();
      renderModalImages();
    });
  }

  if (elements.addVariantBtn) {
    elements.addVariantBtn.addEventListener("click", () => {
      state.modalVariants.push(createVariantDraft());
      renderVariantList();
      updateEditorSummary();
      const lastRow = elements.variantList && elements.variantList.lastElementChild;
      const firstInput = lastRow && lastRow.querySelector("input[data-variant-field='label']");
      if (firstInput) {
        firstInput.focus();
      }
    });
  }

  if (elements.variantList) {
    elements.variantList.addEventListener("input", (event) => {
      const input = event.target.closest("[data-variant-field]");
      if (!input) {
        return;
      }

      const row = input.closest("[data-variant-id]");
      if (!row) {
        return;
      }

      const variant = state.modalVariants.find((item) => String(item.clientId) === row.dataset.variantId);
      if (!variant) {
        return;
      }

      const field = input.getAttribute("data-variant-field");
      if (field === "stockQuantity") {
        variant.stockQuantity = Math.max(Number(input.value || 0) || 0, 0);
      } else if (field === "priceOverride") {
        variant.priceOverride = input.value === "" ? "" : String(Math.max(Number(input.value || 0) || 0, 0));
      } else {
        variant[field] = input.value;
      }

      updateEditorSummary();
    });

    elements.variantList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-variant]");
      if (!removeButton) {
        return;
      }

      const targetId = removeButton.getAttribute("data-remove-variant");
      state.modalVariants = state.modalVariants.filter((variant) => String(variant.clientId) !== String(targetId));
      renderVariantList();
      updateEditorSummary();
    });
  }

  if (elements.createProductForm) {
    elements.createProductForm.addEventListener("submit", saveListing);
  }

  if (elements.imageViewerPrev) {
    elements.imageViewerPrev.addEventListener("click", () => changeViewer(-1));
  }
  if (elements.imageViewerNext) {
    elements.imageViewerNext.addEventListener("click", () => changeViewer(1));
  }
  if (elements.imageViewerClose) {
    elements.imageViewerClose.addEventListener("click", closeViewer);
  }
  if (elements.imageViewerBackdrop) {
    elements.imageViewerBackdrop.addEventListener("click", closeViewer);
  }

  if (elements.emptyAction) {
    elements.emptyAction.addEventListener("click", (event) => {
      if (elements.emptyAction.dataset.action === "create") {
        event.preventDefault();
        openModal();
        return;
      }

      if (elements.emptyAction.dataset.action === "reset") {
        event.preventDefault();
        resetFilters();
      }
    });
  }

  if (elements.updatesList) {
    elements.updatesList.addEventListener("click", (event) => {
      const deleteUpdateButton = event.target.closest("[data-delete-update]");
      if (deleteUpdateButton) {
        event.preventDefault();
        const feedItemId = Number(deleteUpdateButton.getAttribute("data-delete-update") || 0);
        deleteStoreUpdate(feedItemId);
        return;
      }

      const updateGallery = event.target.closest("[data-update-gallery]");
      if (updateGallery) {
        const updateId = Number(updateGallery.getAttribute("data-update-gallery"));
        const imageIndex = Number(updateGallery.getAttribute("data-update-index") || 0);
        const update = state.storeUpdates.find((item) => Number(item.id) === updateId);
        if (update && Array.isArray(update.images) && update.images.length) {
          if (state.isPublic && state.store && state.store.handle) {
            trackBuyerSignal(
              {
                action: "view_store_post",
                source: "store-update-gallery",
                storeHandle: state.store.handle,
                templateKey: state.store.templateKey,
                itemType: "store_update",
              },
              { preferBeacon: true }
            );
          }
          openViewer(update.images, imageIndex);
        }
        return;
      }

      const storeLink = event.target.closest("[data-update-store]");
      if (storeLink && state.isPublic && state.store && state.store.handle) {
        trackBuyerSignal(
          {
            action: "open_store",
            source: "store-update-card",
            storeHandle: state.store.handle,
            templateKey: state.store.templateKey,
            itemType: state.store.templateKey === "products" ? "product" : state.store.templateKey,
          },
          { preferBeacon: true }
        );
        return;
      }

      const productLink = event.target.closest("[data-update-product]");
      if (productLink && state.isPublic && state.store && state.store.handle) {
        trackBuyerSignal(
          {
            action: "open_listing",
            source: "store-update-card",
            storeHandle: state.store.handle,
            templateKey: state.store.templateKey,
            itemType: state.store.templateKey === "products" ? "product" : state.store.templateKey,
          },
          { preferBeacon: true }
        );
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeNavMenu();
    closeViewer();
    closeModal();
    closeDeleteModal();
    resetUpdateComposer();
    setUpdateComposerOpen(false);
    closeSettingsPanel();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      closeNavMenu();
    }
  });

  window.addEventListener("zest:followed-stores-changed", updateFollowButton);
}

document.addEventListener("DOMContentLoaded", async () => {
  activateTab("profile");
  setView("grid");
  updateModalMeta();
  bindEvents();
  renderUpdateImagePreview();
  const api = followingApi();
  if (api && typeof api.init === "function") {
    await api.init();
  }
  await loadStorefront();
});
