(function () {
  "use strict";

  const CART_STORAGE_KEY = "zest_cart_v1";
  const MAX_ART_IMAGES = 6;
  const DEFAULT_MEDIUM_CHIPS = [
    "Original paintings",
    "Limited prints",
    "Illustration work",
    "Carvings and objects",
    "Portrait commissions",
    "Creative drops",
  ];

  function emptyArtSettings() {
    return {
      studioHeadline: "",
      artistStatement: "",
      featuredMediums: [],
      commissionPolicy: "",
      contactEmail: "",
      commissionOpen: false,
    };
  }

  const state = {
    isPublic: document.body.dataset.publicStore === "1",
    viewerRole: String(document.body.dataset.viewerRole || "").trim().toLowerCase(),
    store: null,
    artSettings: emptyArtSettings(),
    meta: {},
    products: [],
    updates: [],
    activeFilter: "all",
    searchTerm: "",
    sortOrder: "featured",
    pendingImages: [],
    editingArtListingId: 0,
    deleteArmedId: 0,
    deleteArmTimer: null,
    toastTimer: null,
  };

  state.canBuy = state.isPublic && state.viewerRole === "buyer";
  state.isGuest = state.isPublic && !state.viewerRole;
  state.isSellerPreview = !state.isPublic;

  const endpoints = {
    store: String(document.body.dataset.storeApiEndpoint || "").trim(),
    feed: String(document.body.dataset.storeFeedEndpoint || "").trim(),
    saveSettings: String(document.body.dataset.artStoreSaveEndpoint || "").trim(),
    listings: String(document.body.dataset.artListingsEndpoint || "").trim(),
  };

  const elements = {
    brand: document.querySelector("#artStoreBrand"),
    brandLabel: document.querySelector("#artStoreBrandLabel"),
    cover: document.querySelector("#artStoreCover"),
    avatar: document.querySelector("#artStoreAvatar"),
    name: document.querySelector("#artStoreName"),
    handle: document.querySelector("#artStoreHandle"),
    tagline: document.querySelector("#artStoreTagline"),
    about: document.querySelector("#artStoreAbout"),
    meta: document.querySelector("#artStoreMeta"),
    socials: document.querySelector("#artStoreSocials"),
    previewBtn: document.querySelector("#artPreviewStoreBtn"),
    metricListings: document.querySelector("#artMetricListings"),
    metricUpdates: document.querySelector("#artMetricUpdates"),
    metricStatus: document.querySelector("#artMetricStatus"),
    studioSummary: document.querySelector("#artStudioSummary"),
    publicNote: document.querySelector("#artPublicNote"),
    sellerNote: document.querySelector("#artSellerNote"),
    bestForChips: document.querySelector("#artBestForChips"),
    followBtn: document.querySelector("#artFollowBtn"),
    shareBtn: document.querySelector("#artShareBtn"),
    spotlight: document.querySelector("#artFeaturedSpotlight"),
    productsGrid: document.querySelector("#artProductGrid"),
    galleryEmpty: document.querySelector("#artGalleryEmpty"),
    updatesList: document.querySelector("#artUpdatesList"),
    updatesEmpty: document.querySelector("#artUpdatesEmpty"),
    search: document.querySelector("#artGallerySearch"),
    sort: document.querySelector("#artGallerySort"),
    filters: Array.from(document.querySelectorAll("[data-art-filter]")),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
    studioSection: document.querySelector("#studio-management"),
    studioForm: document.querySelector("#artStudioForm"),
    studioHeadline: document.querySelector("#artStudioHeadline"),
    artistStatement: document.querySelector("#artArtistStatement"),
    featuredMediums: document.querySelector("#artFeaturedMediums"),
    contactEmail: document.querySelector("#artContactEmail"),
    commissionPolicy: document.querySelector("#artCommissionPolicy"),
    commissionOpen: document.querySelector("#artCommissionOpen"),
    studioFormHint: document.querySelector("#artStudioFormHint"),
    listingForm: document.querySelector("#artListingForm"),
    listingId: document.querySelector("#artListingId"),
    listingTitle: document.querySelector("#artListingTitle"),
    listingDescription: document.querySelector("#artListingDescription"),
    listingMedium: document.querySelector("#artListingMedium"),
    listingCategory: document.querySelector("#artListingCategory"),
    listingCollection: document.querySelector("#artListingCollection"),
    listingPrice: document.querySelector("#artListingPrice"),
    listingStock: document.querySelector("#artListingStock"),
    listingDelivery: document.querySelector("#artListingDelivery"),
    listingLocation: document.querySelector("#artListingLocation"),
    listingTransportFee: document.querySelector("#artListingTransportFee"),
    listingStatus: document.querySelector("#artListingStatus"),
    listingVisibility: document.querySelector("#artListingVisibility"),
    listingFeatured: document.querySelector("#artListingFeatured"),
    listingCommissionOpen: document.querySelector("#artListingCommissionOpen"),
    listingImages: document.querySelector("#artListingImages"),
    listingImagePreview: document.querySelector("#artListingImagePreview"),
    listingReset: document.querySelector("#artListingReset"),
    listingFormHint: document.querySelector("#artListingFormHint"),
    listingSubmitLabel: document.querySelector("#artListingForm button[type='submit'] span"),
  };

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
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
  }

  function titleCase(value) {
    return String(value || "")
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeArtSettings(settings) {
    const source = settings && typeof settings === "object" ? settings : {};
    return {
      studioHeadline: String(source.studioHeadline || "").trim(),
      artistStatement: String(source.artistStatement || "").trim(),
      featuredMediums: Array.isArray(source.featuredMediums)
        ? source.featuredMediums.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      commissionPolicy: String(source.commissionPolicy || "").trim(),
      contactEmail: String(source.contactEmail || "").trim(),
      commissionOpen: Boolean(source.commissionOpen),
    };
  }

  function normalizeProduct(product) {
    const source = product && typeof product === "object" ? product : {};
    return {
      ...source,
      id: toNumber(source.id),
      artListingId: toNumber(source.artListingId || source.art_listing_id),
      price: toNumber(source.price),
      transportFee: toNumber(source.transportFee),
      stockQuantity: toNumber(source.stockQuantity),
      variantCount: toNumber(source.variantCount),
      featured: Boolean(source.featured),
      commissionOpen: Boolean(source.commissionOpen),
      images: Array.isArray(source.images) ? source.images : [],
      variants: Array.isArray(source.variants) ? source.variants : [],
    };
  }

  function normalizeUpdate(item) {
    const source = item && typeof item === "object" ? item : {};
    return {
      ...source,
      catalogItemId: toNumber(source.catalogItemId || source.catalog_item_id),
      images: Array.isArray(source.images) ? source.images : [],
    };
  }

  function formatCurrency(value) {
    return `K${toNumber(value).toFixed(2)}`;
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  }

  function initials(value) {
    const letters = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return letters || "A";
  }

  function parseJsonResponse(response) {
    return response
      .json()
      .catch(() => null)
      .then((payload) => ({
        ok: response.ok,
        status: response.status,
        payload,
      }));
  }

  function fetchJson(path, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    return fetch(path, {
      credentials: "same-origin",
      ...options,
      headers,
    }).then(parseJsonResponse);
  }

  function sendJson(path, method, payload) {
    return fetchJson(path, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  function resultMessage(result, fallback) {
    if (result && result.payload && typeof result.payload.message === "string" && result.payload.message.trim()) {
      return result.payload.message.trim();
    }
    return fallback;
  }

  function getStorePath() {
    if (document.body.dataset.storePath) {
      return document.body.dataset.storePath;
    }
    const handle = state.store && state.store.handle ? state.store.handle : "";
    return handle ? `/stores/${handle}` : "/marketplace";
  }

  function getSignInPath() {
    const fromDataset = String(document.body.dataset.signinPath || "").trim();
    if (fromDataset) {
      return fromDataset;
    }
    return `/auth/signin?role=buyer&returnTo=${encodeURIComponent(getStorePath())}`;
  }

  function getProductPath(product) {
    if (product && Number(product.id) > 0) {
      return `/products/${Number(product.id)}`;
    }
    return "/marketplace";
  }

  function getProductImage(product) {
    if (Array.isArray(product && product.images) && product.images.length) {
      const first = product.images[0];
      if (typeof first === "string") {
        return first;
      }
      if (first && typeof first === "object") {
        return first.url || first.src || "";
      }
    }
    return "";
  }

  function getAvatarMarkup(store) {
    const avatarUrl = String((store && store.avatarUrl) || "").trim();
    if (avatarUrl) {
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(store.storeName || "Art store")}">`;
    }
    return escapeHtml(initials(store && store.storeName));
  }

  function getStatusLabel() {
    const status = String((state.meta && state.meta.visibilityStatus) || "draft").trim().toLowerCase();
    if (status === "published") {
      return "Published";
    }
    if (status === "unpublished") {
      return "Unpublished";
    }
    return "Draft";
  }

  function showToast(message, tone) {
    let toast = document.querySelector(".atelier-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "atelier-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle("atelier-toast--danger", tone === "danger");
    toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  function syncBodyDataset() {
    const handle = state.store && state.store.handle ? state.store.handle : "";
    const storePath = getStorePath();
    document.body.dataset.storeHandle = handle;
    document.body.dataset.storePath = storePath;

    if (elements.brand) {
      elements.brand.href = storePath;
    }
    if (elements.previewBtn) {
      elements.previewBtn.href = storePath;
    }
  }

  function setCoverBackground() {
    if (!elements.cover) {
      return;
    }
    const coverUrl = String((state.store && state.store.coverUrl) || "").trim();
    if (!coverUrl) {
      return;
    }
    elements.cover.style.background = [
      "linear-gradient(125deg, rgba(30, 18, 11, 0.34), rgba(30, 18, 11, 0.12))",
      `url('${coverUrl.replace(/'/g, "\\'")}') center/cover no-repeat`,
    ].join(",");
  }

  function socialLinks(store) {
    const socials = store && store.socials ? store.socials : {};
    const links = [];

    if (socials.instagram) {
      links.push({
        href: `https://instagram.com/${encodeURIComponent(String(socials.instagram).replace(/^@+/, ""))}`,
        icon: "fa-brands fa-instagram",
        label: "Instagram",
      });
    }
    if (socials.facebook) {
      links.push({
        href: String(socials.facebook).startsWith("http")
          ? socials.facebook
          : `https://facebook.com/${encodeURIComponent(String(socials.facebook).replace(/^@+/, ""))}`,
        icon: "fa-brands fa-facebook-f",
        label: "Facebook",
      });
    }
    if (socials.tiktok) {
      links.push({
        href: `https://tiktok.com/@${encodeURIComponent(String(socials.tiktok).replace(/^@+/, ""))}`,
        icon: "fa-brands fa-tiktok",
        label: "TikTok",
      });
    }
    if (socials.xhandle) {
      links.push({
        href: `https://x.com/${encodeURIComponent(String(socials.xhandle).replace(/^@+/, ""))}`,
        icon: "fa-brands fa-x-twitter",
        label: "X",
      });
    }

    return links;
  }

  function renderSocials() {
    if (!elements.socials || !state.store) {
      return;
    }

    const links = socialLinks(state.store);
    if (!links.length) {
      elements.socials.hidden = true;
      elements.socials.innerHTML = "";
      return;
    }

    elements.socials.hidden = false;
    elements.socials.innerHTML = links
      .map(
        (link) =>
          `<a class="atelier-social" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(link.label)}"><i class="${escapeHtml(link.icon)}"></i></a>`
      )
      .join("");
  }

  function featuredMediumChipValues() {
    const featured = Array.isArray(state.artSettings.featuredMediums)
      ? state.artSettings.featuredMediums.filter(Boolean).slice(0, 6).map((value) => titleCase(value))
      : [];

    if (state.artSettings.commissionOpen && !featured.some((value) => value.toLowerCase() === "commissions")) {
      featured.push("Commissions");
    }

    return featured.length ? featured : DEFAULT_MEDIUM_CHIPS;
  }

  function renderBestForChips() {
    if (!elements.bestForChips) {
      return;
    }

    elements.bestForChips.innerHTML = featuredMediumChipValues()
      .map((value) => `<span class="atelier-chip">${escapeHtml(value)}</span>`)
      .join("");
  }

  function renderHero() {
    if (!state.store) {
      return;
    }

    const storeName = state.store.storeName || "Artists Store";
    const headline =
      state.artSettings.studioHeadline ||
      state.store.tagline ||
      "A gallery-led storefront for originals, commissions, and collector-ready releases.";
    const statement =
      state.artSettings.artistStatement ||
      state.store.about ||
      "Present paintings, carvings, prints, and custom work in one live store without losing the clarity of the real listing flow.";
    const listingCount = Array.isArray(state.products) ? state.products.length : 0;
    const updateCount = Array.isArray(state.updates) ? state.updates.length : 0;
    const featuredMediums = featuredMediumChipValues();

    if (elements.brandLabel) {
      elements.brandLabel.textContent = storeName;
    }
    if (elements.name) {
      elements.name.textContent = storeName;
    }
    if (elements.handle) {
      elements.handle.textContent = state.store.handle ? `@${state.store.handle}` : "@store";
    }
    if (elements.tagline) {
      elements.tagline.textContent = headline;
    }
    if (elements.about) {
      elements.about.textContent = statement;
    }
    if (elements.avatar) {
      elements.avatar.innerHTML = getAvatarMarkup(state.store);
    }
    if (elements.metricListings) {
      elements.metricListings.textContent = String(listingCount);
    }
    if (elements.metricUpdates) {
      elements.metricUpdates.textContent = String(updateCount);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = getStatusLabel();
    }
    if (elements.meta) {
      const notes = [
        `<span class="atelier-pill"><i class="fa-solid fa-palette"></i>${listingCount} live listing${listingCount === 1 ? "" : "s"}</span>`,
        `<span class="atelier-pill"><i class="fa-solid fa-brush"></i>${updateCount} studio note${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="atelier-pill"><i class="fa-solid fa-shield-heart"></i>${escapeHtml(getStatusLabel())}</span>`,
      ];

      if (featuredMediums.length) {
        notes.push(
          `<span class="atelier-pill"><i class="fa-solid fa-swatchbook"></i>${escapeHtml(featuredMediums[0])}${
            featuredMediums.length > 1 ? ` +${featuredMediums.length - 1}` : ""
          }</span>`
        );
      }

      if (state.artSettings.commissionOpen) {
        notes.push('<span class="atelier-pill"><i class="fa-solid fa-sparkles"></i>Commissions open</span>');
      }

      if (state.store.templateKey) {
        notes.push(
          `<span class="atelier-pill"><i class="fa-solid fa-store"></i>${escapeHtml(
            titleCase(String(state.store.templateKey))
          )} engine</span>`
        );
      }

      elements.meta.innerHTML = notes.join("");
    }

    if (elements.studioSummary) {
      elements.studioSummary.textContent =
        statement ||
        `${storeName} uses the art engine to present originals, commissions, and collector-ready releases in one place.`;
    }

    if (elements.publicNote) {
      if (state.canBuy) {
        elements.publicNote.textContent = state.artSettings.commissionOpen
          ? "You are viewing the public art storefront as a buyer, so follow, cart, and listing actions stay active while commission-ready offers remain clear."
          : "You are viewing the public art storefront as a buyer, so follow, cart, and listing actions stay active.";
      } else {
        elements.publicNote.textContent = state.artSettings.commissionOpen
          ? "Guests and non-buyer viewers can browse this art store, open listings, and see that commissions are available, while purchase actions stay hidden until buyer sign-in."
          : "Guests and non-buyer viewers can browse this art store and open listings, while purchase actions stay hidden until buyer sign-in.";
      }
    }

    if (elements.sellerNote) {
      elements.sellerNote.textContent = state.isPublic
        ? "Seller tools stay out of the public art HTML so the storefront remains a clean browsing surface for buyers and guests."
        : "Seller preview mode keeps art settings and art listing tools inside this template while the platform still handles marketplace, feed, checkout, and orders.";
    }

    setCoverBackground();
    syncBodyDataset();
    renderSocials();
    renderBestForChips();
  }

  function isProductPublic(product) {
    return (
      String((product && product.status) || "").trim().toLowerCase() === "published" &&
      String((product && product.visibility) || "").trim().toLowerCase() === "public"
    );
  }

  function deriveMedium(product) {
    const explicit = `${product && product.medium ? product.medium : ""} ${product && product.artCategory ? product.artCategory : ""}`
      .toLowerCase()
      .trim();
    const text = `${explicit} ${product && product.title ? product.title : ""} ${product && product.description ? product.description : ""}`
      .toLowerCase();

    if (/(commission|custom|portrait|request|bespoke)/.test(text)) {
      return "commission";
    }
    if (/(carv|sculpt|wood|stone|ceramic|object)/.test(text)) {
      return "carving";
    }
    if (/(draw|sketch|illustrat|ink|charcoal|graphite)/.test(text)) {
      return "drawing";
    }
    if (/(print|edition|poster|giclee|digital)/.test(text)) {
      return "print";
    }
    if (explicit) {
      return explicit.split(/\s+/)[0];
    }
    return "painting";
  }

  function mediumLabel(product) {
    if (product && product.medium) {
      return titleCase(product.medium);
    }
    const medium = deriveMedium(product);
    if (medium === "commission") {
      return "Commission";
    }
    if (medium === "carving") {
      return "Carving";
    }
    if (medium === "drawing") {
      return "Drawing";
    }
    if (medium === "print") {
      return "Print";
    }
    return "Painting";
  }

  function resolveVariant(product) {
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    const inStock = variants.find((variant) => toNumber(variant.stockQuantity) > 0);
    return inStock || variants[0] || null;
  }

  function readCart() {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function addProductToCart(productId) {
    const product = state.products.find((item) => Number(item.id) === Number(productId));
    if (!product) {
      showToast("This artwork is not available right now.", "danger");
      return;
    }

    const variant = resolveVariant(product);
    const entry = {
      id: Number(product.id || 0),
      variantId: Number((variant && variant.id) || 0),
      quantity: 1,
      name: product.title || product.name || "Artwork",
      price: toNumber(variant && variant.priceOverride != null ? variant.priceOverride : product.price),
      image: getProductImage(product) || "",
      storeName: state.store && state.store.storeName ? state.store.storeName : "",
      storePath: getStorePath(),
      productPath: getProductPath(product),
      variantLabel: variant && variant.label ? variant.label : "",
    };

    const cart = readCart();
    const key = `${entry.id}:${entry.variantId}`;
    const existingIndex = cart.findIndex(
      (item) => `${toNumber(item.id)}:${toNumber(item.variantId)}` === key
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity = toNumber(cart[existingIndex].quantity, 0) + 1;
    } else {
      cart.push(entry);
    }

    if (!writeCart(cart)) {
      showToast("Unable to update the cart right now.", "danger");
      return;
    }

    showToast(`${entry.name} added to cart.`);

    if (window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "add_to_cart",
        source: "art-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        productId: entry.id,
        variantId: entry.variantId,
        itemType: "art",
      });
    }
  }

  function compareProducts(left, right) {
    if (state.sortOrder === "price-asc") {
      return toNumber(left.price) - toNumber(right.price);
    }
    if (state.sortOrder === "price-desc") {
      return toNumber(right.price) - toNumber(left.price);
    }
    if (state.sortOrder === "new") {
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }

    const score = (product) => {
      const stock = toNumber(product.stockQuantity);
      const variants = toNumber(product.variantCount || (Array.isArray(product.variants) ? product.variants.length : 0));
      const medium = deriveMedium(product);
      const mediumBoost = medium === "painting" ? 2 : medium === "commission" ? 1.5 : 1;
      const featuredBoost = product.featured ? 5 : 0;
      return stock + variants + mediumBoost + featuredBoost;
    };

    return score(right) - score(left);
  }

  function getVisibleProducts() {
    const search = state.searchTerm.trim().toLowerCase();

    return state.products
      .filter((product) => {
        if (state.activeFilter !== "all" && deriveMedium(product) !== state.activeFilter) {
          return false;
        }

        if (!search) {
          return true;
        }

        const haystack = [
          product.title || product.name || "",
          product.description || "",
          product.delivery || "",
          product.location || "",
          product.medium || "",
          product.artCategory || "",
          product.collectionName || "",
          mediumLabel(product),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      })
      .slice()
      .sort(compareProducts);
  }

  function clearDeleteArm() {
    window.clearTimeout(state.deleteArmTimer);
    state.deleteArmedId = 0;
    state.deleteArmTimer = null;
  }

  function armDeleteArtListing(artListingId) {
    clearDeleteArm();
    state.deleteArmedId = artListingId;
    state.deleteArmTimer = window.setTimeout(() => {
      state.deleteArmedId = 0;
      state.deleteArmTimer = null;
      renderProducts();
    }, 3200);
    renderProducts();
    showToast("Click delete again to remove this artwork.", "danger");
  }

  function renderSpotlight(product) {
    if (!elements.spotlight) {
      return;
    }

    if (!product) {
      elements.spotlight.innerHTML = "";
      return;
    }

    const stockQuantity = toNumber(product.stockQuantity);
    const variantCount = toNumber(product.variantCount || (Array.isArray(product.variants) ? product.variants.length : 0));
    const image = getProductImage(product);
    const artListingId = toNumber(product.artListingId);
    const previewAction =
      isProductPublic(product) || state.isPublic
        ? `
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
            <i class="fa-solid fa-eye"></i>
            <span>${state.isPublic ? "View listing" : "Preview listing"}</span>
          </a>
        `
        : "";

    let actionMarkup = "";

    if (state.canBuy) {
      actionMarkup = `
        <div class="atelier-product-card__actions">
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
            <i class="fa-solid fa-eye"></i>
            <span>View listing</span>
          </a>
          <button class="atelier-action-button atelier-action-button--accent" type="button" data-add-cart="${Number(
            product.id || 0
          )}">
            <i class="fa-solid fa-cart-plus"></i>
            <span>Add to cart</span>
          </button>
        </div>
      `;
    } else if (state.isGuest) {
      actionMarkup = `
        <div class="atelier-product-card__actions">
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
            <i class="fa-solid fa-eye"></i>
            <span>View listing</span>
          </a>
          <a class="atelier-action-button" href="${escapeHtml(getSignInPath())}">
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Sign in to buy</span>
          </a>
        </div>
      `;
    } else {
      actionMarkup = `
        <div class="atelier-product-card__actions">
          ${previewAction}
          ${
            artListingId
              ? `
                <button class="atelier-action-button" type="button" data-edit-art-listing="${artListingId}">
                  <i class="fa-solid fa-pen-ruler"></i>
                  <span>Edit artwork</span>
                </button>
                <button class="atelier-action-button atelier-action-button--danger" type="button" data-delete-art-listing="${artListingId}">
                  <i class="fa-solid fa-trash"></i>
                  <span>${state.deleteArmedId === artListingId ? "Confirm delete" : "Delete artwork"}</span>
                </button>
              `
              : ""
          }
        </div>
      `;
    }

    elements.spotlight.innerHTML = `
      <article class="atelier-feature-card">
        <div class="atelier-feature-card__copy">
          <span class="atelier-feature-card__eyebrow">
            <i class="fa-solid fa-star"></i>
            ${product.featured ? "Featured artwork" : "Spotlight artwork"}
          </span>
          <h3 class="atelier-feature-card__title">${escapeHtml(product.title || product.name || "Featured artwork")}</h3>
          <p class="atelier-feature-card__description">
            ${escapeHtml(
              truncate(product.description || "Open the listing to explore the full artwork notes, delivery details, and purchase options.", 220)
            )}
          </p>
          <div class="atelier-feature-card__meta">
            <span><i class="fa-solid fa-palette"></i>${escapeHtml(mediumLabel(product))}</span>
            ${
              product.artCategory
                ? `<span><i class="fa-solid fa-tags"></i>${escapeHtml(titleCase(product.artCategory))}</span>`
                : ""
            }
            <span><i class="fa-solid fa-coins"></i>${formatCurrency(product.price)}</span>
            <span><i class="fa-solid fa-boxes-stacked"></i>${stockQuantity} in stock</span>
            <span><i class="fa-solid fa-layer-group"></i>${variantCount} variant${variantCount === 1 ? "" : "s"}</span>
          </div>
          ${actionMarkup}
        </div>
        <div class="atelier-feature-card__media">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title || product.name || "Featured artwork")}">` : ""}
        </div>
      </article>
    `;
  }

  function productActionMarkup(product) {
    const artListingId = toNumber(product.artListingId);

    if (state.canBuy) {
      return `
        <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
          <i class="fa-solid fa-eye"></i>
          <span>View listing</span>
        </a>
        <button class="atelier-action-button atelier-action-button--accent" type="button" data-add-cart="${Number(
          product.id || 0
        )}">
          <i class="fa-solid fa-cart-plus"></i>
          <span>Add to cart</span>
        </button>
      `;
    }

    if (state.isGuest) {
      return `
        <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
          <i class="fa-solid fa-eye"></i>
          <span>View listing</span>
        </a>
        <a class="atelier-action-button" href="${escapeHtml(getSignInPath())}">
          <i class="fa-solid fa-right-to-bracket"></i>
          <span>Sign in to buy</span>
        </a>
      `;
    }

    if (state.isPublic) {
      return `
        <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
          <i class="fa-solid fa-eye"></i>
          <span>View listing</span>
        </a>
      `;
    }

    return `
      ${
        isProductPublic(product)
          ? `
            <a class="atelier-action-link" href="${escapeHtml(getProductPath(product))}">
              <i class="fa-solid fa-eye"></i>
              <span>Preview listing</span>
            </a>
          `
          : ""
      }
      ${
        artListingId
          ? `
            <button class="atelier-action-button" type="button" data-edit-art-listing="${artListingId}">
              <i class="fa-solid fa-pen-ruler"></i>
              <span>Edit artwork</span>
            </button>
            <button class="atelier-action-button atelier-action-button--danger" type="button" data-delete-art-listing="${artListingId}">
              <i class="fa-solid fa-trash"></i>
              <span>${state.deleteArmedId === artListingId ? "Confirm delete" : "Delete artwork"}</span>
            </button>
          `
          : ""
      }
    `;
  }

  function renderProductCard(product) {
    const image = getProductImage(product);
    const support = [
      product.collectionName
        ? `<span><i class="fa-solid fa-layer-group"></i>${escapeHtml(product.collectionName)}</span>`
        : "",
      product.location ? `<span><i class="fa-solid fa-location-dot"></i>${escapeHtml(product.location)}</span>` : "",
      product.delivery ? `<span><i class="fa-solid fa-truck-fast"></i>${escapeHtml(product.delivery)}</span>` : "",
      `<span><i class="fa-solid fa-boxes-stacked"></i>${toNumber(product.stockQuantity)} in stock</span>`,
    ].filter(Boolean);

    return `
      <article class="atelier-product-card">
        <div class="atelier-product-card__media">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title || product.name || "Artwork")}">` : ""}
        </div>
        <div class="atelier-product-card__body">
          <div class="atelier-product-card__meta">
            <span class="atelier-product-pill">${escapeHtml(mediumLabel(product))}</span>
            ${
              product.artCategory
                ? `<span class="atelier-product-pill">${escapeHtml(titleCase(product.artCategory))}</span>`
                : ""
            }
            ${
              !state.isPublic
                ? `<span class="atelier-product-pill">${escapeHtml(String(product.visibility || "public"))}</span><span class="atelier-product-pill">${escapeHtml(
                    String(product.status || "published")
                  )}</span>`
                : ""
            }
          </div>
          <h3 class="atelier-product-card__title">${escapeHtml(product.title || product.name || "Artwork")}</h3>
          <p class="atelier-product-card__description">${escapeHtml(
            truncate(product.description || "Open the listing to view the full art notes and purchase details.", 168)
          )}</p>
          <strong class="atelier-product-card__price">${formatCurrency(product.price)}</strong>
          <div class="atelier-product-card__support">${support.join("")}</div>
          <div class="atelier-product-card__actions">${productActionMarkup(product)}</div>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    if (!elements.productsGrid || !elements.galleryEmpty) {
      return;
    }

    const visibleProducts = getVisibleProducts();
    renderSpotlight(visibleProducts[0] || state.products[0] || null);

    if (!visibleProducts.length) {
      elements.productsGrid.innerHTML = "";
      elements.galleryEmpty.hidden = false;
      return;
    }

    elements.galleryEmpty.hidden = true;
    elements.productsGrid.innerHTML = visibleProducts.map((product) => renderProductCard(product)).join("");
  }

  function updateActionMarkup(linkedProduct) {
    if (!linkedProduct) {
      return "";
    }

    if (state.canBuy) {
      return `
        <div class="atelier-update-card__actions">
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(linkedProduct))}">
            <i class="fa-solid fa-eye"></i>
            <span>View listing</span>
          </a>
          <button class="atelier-action-button atelier-action-button--accent" type="button" data-add-cart="${Number(
            linkedProduct.id || 0
          )}">
            <i class="fa-solid fa-cart-plus"></i>
            <span>Add to cart</span>
          </button>
        </div>
      `;
    }

    if (state.isGuest) {
      return `
        <div class="atelier-update-card__actions">
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(linkedProduct))}">
            <i class="fa-solid fa-eye"></i>
            <span>View listing</span>
          </a>
          <a class="atelier-action-button" href="${escapeHtml(getSignInPath())}">
            <i class="fa-solid fa-right-to-bracket"></i>
            <span>Sign in to buy</span>
          </a>
        </div>
      `;
    }

    if (state.isPublic) {
      return `
        <div class="atelier-update-card__actions">
          <a class="atelier-action-link" href="${escapeHtml(getProductPath(linkedProduct))}">
            <i class="fa-solid fa-eye"></i>
            <span>View listing</span>
          </a>
        </div>
      `;
    }

    return `
      <div class="atelier-update-card__actions">
        ${
          isProductPublic(linkedProduct)
            ? `
              <a class="atelier-action-link" href="${escapeHtml(getProductPath(linkedProduct))}">
                <i class="fa-solid fa-eye"></i>
                <span>Preview listing</span>
              </a>
            `
            : ""
        }
        ${
          linkedProduct.artListingId
            ? `
              <button class="atelier-action-button" type="button" data-edit-art-listing="${Number(linkedProduct.artListingId)}">
                <i class="fa-solid fa-pen-ruler"></i>
                <span>Edit artwork</span>
              </button>
            `
            : ""
        }
      </div>
    `;
  }

  function renderUpdateCard(item) {
    const linkedProduct = state.products.find((product) => Number(product.id) === Number(item.catalogItemId || 0));
    const media = Array.isArray(item.images) ? item.images.filter(Boolean).slice(0, 3) : [];

    return `
      <article class="atelier-update-card">
        <div class="atelier-update-card__head">
          <div class="atelier-update-card__identity">
            <div class="atelier-update-card__avatar">${getAvatarMarkup(state.store || {})}</div>
            <div>
              <span class="atelier-update-card__store">${escapeHtml(
                item.storeName || (state.store && state.store.storeName) || "Studio note"
              )}</span>
              <p class="atelier-update-card__meta">${escapeHtml(formatDate(item.createdAt))}</p>
            </div>
          </div>
          <span class="atelier-update-card__tone">${escapeHtml(String(item.type || "studio note").replace(/_/g, " "))}</span>
        </div>
        ${item.title ? `<h3 class="atelier-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
        <p class="atelier-update-card__body">${escapeHtml(item.description || "New studio note from this artist.")}</p>
        ${
          media.length
            ? `<div class="atelier-update-card__media">${media
                .map(
                  (image) =>
                    `<div class="atelier-update-card__media-item"><img src="${escapeHtml(image)}" alt="${escapeHtml(
                      item.title || "Studio update"
                    )}"></div>`
                )
                .join("")}</div>`
            : ""
        }
        ${updateActionMarkup(linkedProduct)}
      </article>
    `;
  }

  function renderUpdates() {
    if (!elements.updatesList || !elements.updatesEmpty) {
      return;
    }

    if (!Array.isArray(state.updates) || !state.updates.length) {
      elements.updatesList.innerHTML = "";
      elements.updatesEmpty.hidden = false;
      return;
    }

    elements.updatesEmpty.hidden = true;
    elements.updatesList.innerHTML = state.updates
      .slice()
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .map((item) => renderUpdateCard(item))
      .join("");
  }

  function shareStore() {
    const shareUrl = `${window.location.origin}${getStorePath()}`;
    const sharePayload = {
      title: state.store && state.store.storeName ? state.store.storeName : "Art store",
      text:
        state.artSettings.studioHeadline ||
        (state.store && state.store.tagline ? state.store.tagline : "Take a look at this art storefront on Zest."),
      url: shareUrl,
    };

    if (navigator.share) {
      navigator.share(sharePayload).catch(() => {});
      return;
    }

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => showToast("Store link copied."))
      .catch(() => showToast("Unable to copy the store link right now.", "danger"));
  }

  async function syncFollowButton() {
    if (!elements.followBtn || !state.store || !state.store.handle || !state.canBuy) {
      return;
    }

    const api = window.ZestStoreFollowing || null;
    if (!api || typeof api.init !== "function") {
      return;
    }

    await api.init();
    const following = api.isFollowing(state.store.handle);
    elements.followBtn.innerHTML = following
      ? '<i class="fa-solid fa-heart"></i><span>Following</span>'
      : '<i class="fa-regular fa-heart"></i><span>Follow</span>';
  }

  async function handleFollow() {
    if (!state.store || !state.store.handle || !state.canBuy) {
      return;
    }

    const api = window.ZestStoreFollowing || null;
    if (!api || typeof api.toggle !== "function") {
      showToast("Follow tools are not available right now.", "danger");
      return;
    }

    const result = await api.toggle(state.store.handle);
    await syncFollowButton();
    if (result && result.error) {
      showToast(result.error, "danger");
      return;
    }
    showToast(result && result.following ? "Store followed." : "Store unfollowed.");
  }

  function toggleFaq(event) {
    const button = event.target.closest(".atelier-faq__question");
    if (!button) {
      return;
    }
    const item = button.closest(".atelier-faq__item");
    if (item) {
      item.classList.toggle("is-open");
    }
  }

  function bindNavigation() {
    if (!elements.navToggle || !elements.nav) {
      return;
    }

    elements.navToggle.addEventListener("click", () => {
      const isOpen = elements.nav.classList.toggle("is-open");
      elements.navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    elements.nav.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest("button")) {
        elements.nav.classList.remove("is-open");
        elements.navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function bindFilters() {
    elements.filters.forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFilter = button.getAttribute("data-art-filter") || "all";
        elements.filters.forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        renderProducts();
      });
    });

    if (elements.search) {
      elements.search.addEventListener("input", () => {
        state.searchTerm = elements.search.value || "";
        renderProducts();
      });
    }

    if (elements.sort) {
      elements.sort.addEventListener("change", () => {
        state.sortOrder = elements.sort.value || "featured";
        renderProducts();
      });
    }
  }

  function featuredMediumsInputValue() {
    return Array.isArray(state.artSettings.featuredMediums) ? state.artSettings.featuredMediums.join(", ") : "";
  }

  function normalizeFeaturedMediumsInput(value) {
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index)
      .slice(0, 8);
  }

  function studioSettingsPayload() {
    return {
      studioHeadline: elements.studioHeadline ? elements.studioHeadline.value : "",
      artistStatement: elements.artistStatement ? elements.artistStatement.value : "",
      featuredMediums: normalizeFeaturedMediumsInput(elements.featuredMediums ? elements.featuredMediums.value : ""),
      contactEmail: elements.contactEmail ? elements.contactEmail.value : "",
      commissionPolicy: elements.commissionPolicy ? elements.commissionPolicy.value : "",
      commissionOpen: Boolean(elements.commissionOpen && elements.commissionOpen.checked),
    };
  }

  function listingImagePayload() {
    return state.pendingImages.map((item) => ({
      src: String(((item && item.src) || item || "")).trim(),
    }));
  }

  function currentEditingProduct() {
    return state.products.find((product) => Number(product.artListingId) === Number(state.editingArtListingId)) || null;
  }

  function setListingMode(product) {
    const isEditing = Boolean(product && product.artListingId);
    state.editingArtListingId = isEditing ? Number(product.artListingId) : 0;

    if (elements.listingId) {
      elements.listingId.value = isEditing ? String(product.artListingId) : "";
    }
    if (elements.listingTitle) {
      elements.listingTitle.value = isEditing ? product.title || product.name || "" : "";
    }
    if (elements.listingDescription) {
      elements.listingDescription.value = isEditing ? product.description || "" : "";
    }
    if (elements.listingMedium) {
      elements.listingMedium.value = isEditing ? product.medium || "" : "";
    }
    if (elements.listingCategory) {
      elements.listingCategory.value = isEditing ? product.artCategory || "" : "";
    }
    if (elements.listingCollection) {
      elements.listingCollection.value = isEditing ? product.collectionName || "" : "";
    }
    if (elements.listingPrice) {
      elements.listingPrice.value = isEditing ? String(toNumber(product.price).toFixed(2)) : "";
    }
    if (elements.listingStock) {
      elements.listingStock.value = isEditing ? String(toNumber(product.stockQuantity)) : "1";
    }
    if (elements.listingDelivery) {
      elements.listingDelivery.value = isEditing ? product.delivery || "" : "";
    }
    if (elements.listingLocation) {
      elements.listingLocation.value = isEditing ? product.location || "" : "";
    }
    if (elements.listingTransportFee) {
      elements.listingTransportFee.value = isEditing ? String(toNumber(product.transportFee).toFixed(2)) : "0.00";
    }
    if (elements.listingStatus) {
      elements.listingStatus.value = isEditing ? String(product.status || "draft") : "draft";
    }
    if (elements.listingVisibility) {
      elements.listingVisibility.value = isEditing ? String(product.visibility || "public") : "public";
    }
    if (elements.listingFeatured) {
      elements.listingFeatured.checked = isEditing ? Boolean(product.featured) : false;
    }
    if (elements.listingCommissionOpen) {
      elements.listingCommissionOpen.checked = isEditing ? Boolean(product.commissionOpen) : false;
    }
    if (elements.listingImages) {
      elements.listingImages.value = "";
    }

    state.pendingImages = isEditing
      ? (Array.isArray(product.images) ? product.images : [])
          .map((image) => (typeof image === "string" ? image : image && (image.url || image.src)))
          .filter(Boolean)
          .map((src) => ({ src }))
      : [];

    if (elements.listingSubmitLabel) {
      elements.listingSubmitLabel.textContent = isEditing ? "Update artwork" : "Save artwork";
    }
    if (elements.listingFormHint) {
      elements.listingFormHint.textContent = isEditing
        ? "You are editing an existing art listing inside the art engine."
        : "Artworks saved here stay inside the art engine and are then adapted back into the shared marketplace and checkout system.";
    }

    renderListingImagePreview();
  }

  function renderManagementForms() {
    if (!state.isSellerPreview) {
      return;
    }

    if (elements.studioHeadline) {
      elements.studioHeadline.value = state.artSettings.studioHeadline || "";
    }
    if (elements.artistStatement) {
      elements.artistStatement.value = state.artSettings.artistStatement || "";
    }
    if (elements.featuredMediums) {
      elements.featuredMediums.value = featuredMediumsInputValue();
    }
    if (elements.contactEmail) {
      elements.contactEmail.value = state.artSettings.contactEmail || "";
    }
    if (elements.commissionPolicy) {
      elements.commissionPolicy.value = state.artSettings.commissionPolicy || "";
    }
    if (elements.commissionOpen) {
      elements.commissionOpen.checked = Boolean(state.artSettings.commissionOpen);
    }

    const editingProduct = currentEditingProduct();
    if (editingProduct) {
      setListingMode(editingProduct);
    } else if (!state.editingArtListingId) {
      setListingMode(null);
    }
  }

  function imagePreviewMarkup(image, index) {
    const source = String(((image && image.src) || image || "")).trim();
    const isExistingUpload = source.startsWith("/uploads/");
    return `
      <div class="atelier-image-tile">
        <img src="${escapeHtml(source)}" alt="Artwork image ${index + 1}">
        <div class="atelier-image-tile__meta">
          <span>${isExistingUpload ? "Current upload" : "New image"}</span>
          <button type="button" class="atelier-image-tile__remove" data-remove-art-image="${index}">
            <i class="fa-solid fa-xmark"></i>
            <span>Remove</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderListingImagePreview() {
    if (!elements.listingImagePreview) {
      return;
    }

    if (!state.pendingImages.length) {
      elements.listingImagePreview.hidden = true;
      elements.listingImagePreview.innerHTML = "";
      return;
    }

    elements.listingImagePreview.hidden = false;
    elements.listingImagePreview.innerHTML = state.pendingImages.map((image, index) => imagePreviewMarkup(image, index)).join("");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read artwork image"));
      reader.readAsDataURL(file);
    });
  }

  async function handleListingImagesChange(event) {
    const files = Array.from((event.target && event.target.files) || []);
    if (!files.length) {
      return;
    }

    const remainingSlots = Math.max(0, MAX_ART_IMAGES - state.pendingImages.length);
    if (remainingSlots <= 0) {
      showToast(`A maximum of ${MAX_ART_IMAGES} artwork images is allowed.`, "danger");
      event.target.value = "";
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const dataUrls = await Promise.all(acceptedFiles.map((file) => readFileAsDataUrl(file)));
    state.pendingImages = state.pendingImages.concat(dataUrls.filter(Boolean).map((src) => ({ src }))).slice(0, MAX_ART_IMAGES);
    renderListingImagePreview();

    if (files.length > acceptedFiles.length) {
      showToast(`Only the first ${MAX_ART_IMAGES} images were kept.`, "danger");
    }
  }

  function removePendingImage(index) {
    state.pendingImages = state.pendingImages.filter((_image, imageIndex) => imageIndex !== index);
    renderListingImagePreview();
  }

  function listingPayload() {
    return {
      title: elements.listingTitle ? elements.listingTitle.value : "",
      name: elements.listingTitle ? elements.listingTitle.value : "",
      description: elements.listingDescription ? elements.listingDescription.value : "",
      medium: elements.listingMedium ? elements.listingMedium.value : "",
      artCategory: elements.listingCategory ? elements.listingCategory.value : "",
      collectionName: elements.listingCollection ? elements.listingCollection.value : "",
      price: elements.listingPrice ? elements.listingPrice.value : "",
      stockQuantity: elements.listingStock ? elements.listingStock.value : "",
      delivery: elements.listingDelivery ? elements.listingDelivery.value : "",
      location: elements.listingLocation ? elements.listingLocation.value : "",
      transportFee: elements.listingTransportFee ? elements.listingTransportFee.value : "",
      status: elements.listingStatus ? elements.listingStatus.value : "draft",
      visibility: elements.listingVisibility ? elements.listingVisibility.value : "public",
      featured: Boolean(elements.listingFeatured && elements.listingFeatured.checked),
      commissionOpen: Boolean(elements.listingCommissionOpen && elements.listingCommissionOpen.checked),
      images: listingImagePayload(),
      variants: [],
    };
  }

  function scrollToStudioManagement() {
    if (elements.studioSection && typeof elements.studioSection.scrollIntoView === "function") {
      elements.studioSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function openListingEditor(artListingId) {
    const listing = state.products.find((product) => Number(product.artListingId) === Number(artListingId));
    if (!listing) {
      showToast("Unable to find that artwork right now.", "danger");
      return;
    }

    clearDeleteArm();
    setListingMode(listing);
    renderProducts();
    scrollToStudioManagement();
  }

  async function submitStudioForm(event) {
    event.preventDefault();
    if (!endpoints.saveSettings) {
      showToast("Art studio settings are not available right now.", "danger");
      return;
    }

    const result = await sendJson(endpoints.saveSettings, "PUT", studioSettingsPayload());
    if (!result.ok || !result.payload || result.payload.success === false) {
      showToast(resultMessage(result, "Unable to save art studio settings."), "danger");
      return;
    }

    state.store = result.payload.store || state.store;
    state.artSettings = normalizeArtSettings(result.payload.artSettings);
    state.products = Array.isArray(result.payload.products) ? result.payload.products.map(normalizeProduct) : state.products;
    state.meta = result.payload.meta || state.meta;
    renderHero();
    renderProducts();
    renderManagementForms();
    showToast(resultMessage(result, "Art studio settings saved."));
  }

  async function submitListingForm(event) {
    event.preventDefault();
    if (!endpoints.listings) {
      showToast("Art listing tools are not available right now.", "danger");
      return;
    }

    const payload = listingPayload();
    const isEditing = Number(state.editingArtListingId) > 0;
    const targetPath = isEditing ? `${endpoints.listings}/${Number(state.editingArtListingId)}` : endpoints.listings;
    const method = isEditing ? "PUT" : "POST";
    const result = await sendJson(targetPath, method, payload);

    if (!result.ok || !result.payload || result.payload.success === false) {
      showToast(resultMessage(result, isEditing ? "Unable to update artwork." : "Unable to save artwork."), "danger");
      return;
    }

    clearDeleteArm();
    setListingMode(null);
    await loadArtStorefront();
    showToast(resultMessage(result, isEditing ? "Artwork updated." : "Artwork created."));
  }

  async function handleDeleteArtListing(artListingId) {
    if (!endpoints.listings) {
      showToast("Art listing tools are not available right now.", "danger");
      return;
    }

    if (state.deleteArmedId !== artListingId) {
      armDeleteArtListing(artListingId);
      return;
    }

    const result = await fetchJson(`${endpoints.listings}/${artListingId}`, {
      method: "DELETE",
    });

    if (!result.ok || !result.payload || result.payload.success === false) {
      showToast(resultMessage(result, "Unable to delete artwork."), "danger");
      return;
    }

    clearDeleteArm();
    if (Number(state.editingArtListingId) === Number(artListingId)) {
      setListingMode(null);
    }
    await loadArtStorefront();
    showToast(resultMessage(result, "Artwork deleted."));
  }

  function bindEvents() {
    bindNavigation();
    bindFilters();

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener("click", shareStore);
    }

    if (elements.followBtn) {
      elements.followBtn.addEventListener("click", () => {
        handleFollow().catch(() => showToast("Unable to update followed store.", "danger"));
      });
    }

    if (elements.studioForm) {
      elements.studioForm.addEventListener("submit", (event) => {
        submitStudioForm(event).catch(() => showToast("Unable to save art studio settings.", "danger"));
      });
    }

    if (elements.listingForm) {
      elements.listingForm.addEventListener("submit", (event) => {
        submitListingForm(event).catch(() => showToast("Unable to save artwork.", "danger"));
      });
    }

    if (elements.listingImages) {
      elements.listingImages.addEventListener("change", (event) => {
        handleListingImagesChange(event).catch(() => showToast("Unable to read one of the artwork images.", "danger"));
      });
    }

    if (elements.listingReset) {
      elements.listingReset.addEventListener("click", () => {
        clearDeleteArm();
        setListingMode(null);
        renderProducts();
      });
    }

    document.addEventListener("click", (event) => {
      const addToCart = event.target.closest("[data-add-cart]");
      if (addToCart) {
        addProductToCart(addToCart.getAttribute("data-add-cart"));
        return;
      }

      const editButton = event.target.closest("[data-edit-art-listing]");
      if (editButton) {
        openListingEditor(editButton.getAttribute("data-edit-art-listing"));
        return;
      }

      const deleteButton = event.target.closest("[data-delete-art-listing]");
      if (deleteButton) {
        handleDeleteArtListing(Number(deleteButton.getAttribute("data-delete-art-listing"))).catch(() => {
          showToast("Unable to delete artwork right now.", "danger");
        });
        return;
      }

      const removeImageButton = event.target.closest("[data-remove-art-image]");
      if (removeImageButton) {
        removePendingImage(Number(removeImageButton.getAttribute("data-remove-art-image")));
        return;
      }

      toggleFaq(event);
    });

    window.addEventListener("zest:followed-stores-changed", () => {
      syncFollowButton().catch(() => {});
    });
  }

  function applyStorePayload(payload, options = {}) {
    const preserveUpdates = Boolean(options.preserveUpdates);
    state.store = payload && payload.store ? payload.store : state.store;
    state.artSettings = normalizeArtSettings(payload && payload.artSettings);
    state.meta = payload && payload.meta ? payload.meta : state.meta;
    state.products = Array.isArray(payload && payload.products) ? payload.products.map(normalizeProduct) : [];
    if (!preserveUpdates) {
      state.updates = [];
    }
  }

  async function loadArtStorefront() {
    if (!endpoints.store) {
      return;
    }

    const [storeResult, feedResult] = await Promise.all([
      fetchJson(endpoints.store).catch(() => null),
      endpoints.feed ? fetchJson(endpoints.feed).catch(() => null) : Promise.resolve(null),
    ]);

    if (!storeResult || !storeResult.ok || !storeResult.payload || storeResult.payload.success === false) {
      showToast("Unable to load this art storefront right now.", "danger");
      return;
    }

    applyStorePayload(storeResult.payload);
    state.updates =
      feedResult && feedResult.ok && feedResult.payload && feedResult.payload.success !== false
        ? Array.isArray(feedResult.payload.items)
          ? feedResult.payload.items.map(normalizeUpdate)
          : []
        : [];

    renderHero();
    renderProducts();
    renderUpdates();
    renderManagementForms();
    await syncFollowButton();

    if (state.isPublic && window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "view_store",
        source: "art-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        templateKey: "art",
        itemType: "art",
      });
    }
  }

  bindEvents();
  loadArtStorefront().catch(() => {
    showToast("Unable to load this art storefront right now.", "danger");
  });
})();
