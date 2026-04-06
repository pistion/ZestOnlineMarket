(function () {
  const CART_STORAGE_KEY = "zest_cart_v1";
  const state = {
    isPublic: document.body.dataset.publicStore === "1",
    templateKey: String(document.body.dataset.storeTemplateKey || "art").trim() || "art",
    store: null,
    meta: {},
    products: [],
    updates: [],
    toastTimer: null,
  };

  const elements = {
    storeBrand: document.querySelector("#serviceStoreBrand"),
    brandLabel: document.querySelector("#serviceStoreBrandLabel"),
    cover: document.querySelector("#serviceStoreCover"),
    avatar: document.querySelector("#serviceStoreAvatar"),
    name: document.querySelector("#serviceStoreName"),
    handle: document.querySelector("#serviceStoreHandle"),
    tagline: document.querySelector("#serviceStoreTagline"),
    about: document.querySelector("#serviceStoreAbout"),
    metaPills: document.querySelector("#serviceStoreMetaPills"),
    socials: document.querySelector("#serviceStoreSocials"),
    followBtn: document.querySelector("#serviceFollowBtn"),
    shareBtn: document.querySelector("#serviceShareBtn"),
    previewBtn: document.querySelector("#servicePreviewStoreBtn"),
    metricListings: document.querySelector("#serviceMetricListings"),
    metricUpdates: document.querySelector("#serviceMetricUpdates"),
    metricStatus: document.querySelector("#serviceMetricStatus"),
    updatesList: document.querySelector("#serviceUpdatesList"),
    updatesEmpty: document.querySelector("#serviceUpdatesEmpty"),
    featuredRail: document.querySelector("#serviceFeaturedRail"),
    productsGrid: document.querySelector("#serviceProductsGrid"),
    productsEmpty: document.querySelector("#serviceProductsEmpty"),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
  };

  const templateCopy = {
    art: { noun: "artwork", featuredLabel: "Featured work", highlightLabel: "Collector-ready" },
    photography: { noun: "session", featuredLabel: "Featured package", highlightLabel: "Booking-ready" },
    programmer: { noun: "service", featuredLabel: "Featured build", highlightLabel: "Delivery-ready" },
    music: { noun: "release", featuredLabel: "Featured drop", highlightLabel: "Fan-ready" },
    classes: { noun: "program", featuredLabel: "Featured program", highlightLabel: "Learner-ready" },
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

  function formatCurrency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
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
    return letters || "S";
  }

  function fetchJson(path, options = {}) {
    return fetch(path, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      return {
        ok: response.ok,
        status: response.status,
        payload,
      };
    });
  }

  function getStorePath() {
    if (document.body.dataset.storePath) {
      return document.body.dataset.storePath;
    }
    const handle = state.store && state.store.handle ? state.store.handle : "";
    return handle ? `/stores/${handle}` : "/marketplace";
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
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(store.storeName || "Store")}">`;
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

  function getTemplateConfig() {
    return templateCopy[state.templateKey] || templateCopy.art;
  }

  function setAccentColor() {
    const accent = String((state.store && state.store.accentColor) || "").trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)) {
      document.documentElement.style.setProperty("--service-accent", accent);
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
      "linear-gradient(180deg, rgba(16,32,51,0.08), rgba(16,32,51,0.12))",
      `url('${coverUrl.replace(/'/g, "\\'")}') center/cover no-repeat`,
    ].join(",");
  }

  function showToast(message, tone = "default") {
    let toast = document.querySelector(".service-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "service-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle("service-toast--danger", tone === "danger");
    toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function syncBodyDataset() {
    const handle = state.store && state.store.handle ? state.store.handle : "";
    const storePath = getStorePath();
    document.body.dataset.storeHandle = handle;
    document.body.dataset.storePath = storePath;
    if (elements.previewBtn) {
      elements.previewBtn.href = storePath;
    }
    if (elements.storeBrand) {
      elements.storeBrand.href = storePath;
    }
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
          `<a class="service-social" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(link.label)}"><i class="${escapeHtml(link.icon)}"></i></a>`
      )
      .join("");
  }

  function renderHero() {
    if (!state.store) {
      return;
    }

    setAccentColor();
    setCoverBackground();

    if (elements.brandLabel) {
      elements.brandLabel.textContent = state.store.storeName || elements.brandLabel.textContent;
    }
    if (elements.name) {
      elements.name.textContent = state.store.storeName || "Untitled store";
    }
    if (elements.handle) {
      elements.handle.textContent = state.store.handle ? `@${state.store.handle}` : "@store";
    }
    if (elements.tagline) {
      elements.tagline.textContent = state.store.tagline || elements.tagline.textContent;
    }
    if (elements.about) {
      elements.about.textContent = state.store.about || elements.about.textContent;
    }
    if (elements.avatar) {
      elements.avatar.innerHTML = getAvatarMarkup(state.store);
    }
    if (elements.metaPills) {
      const listingCount = Array.isArray(state.products) ? state.products.length : 0;
      const updateCount = Array.isArray(state.updates) ? state.updates.length : 0;
      elements.metaPills.innerHTML = [
        `<span class="service-pill"><i class="fa-solid fa-layer-group"></i>${listingCount} listing${listingCount === 1 ? "" : "s"}</span>`,
        `<span class="service-pill"><i class="fa-solid fa-bullhorn"></i>${updateCount} update${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="service-pill"><i class="fa-solid fa-shield-heart"></i>${escapeHtml(getStatusLabel())}</span>`,
      ].join("");
    }

    syncBodyDataset();
    renderSocials();
  }

  function renderMetrics() {
    if (elements.metricListings) {
      elements.metricListings.textContent = String(Array.isArray(state.products) ? state.products.length : 0);
    }
    if (elements.metricUpdates) {
      elements.metricUpdates.textContent = String(Array.isArray(state.updates) ? state.updates.length : 0);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = getStatusLabel();
    }
  }

  function renderFeaturedRail() {
    if (!elements.featuredRail) {
      return;
    }

    const featuredProduct = Array.isArray(state.products) && state.products.length ? state.products[0] : null;
    if (!featuredProduct) {
      elements.featuredRail.innerHTML = "";
      return;
    }

    const config = getTemplateConfig();
    const stockQuantity = Number(featuredProduct.stockQuantity || 0);
    const delivery = featuredProduct.delivery ? escapeHtml(featuredProduct.delivery) : "Store listing";
    const location = featuredProduct.location ? escapeHtml(featuredProduct.location) : "Location shared in listing";
    const variantCount = Number(
      featuredProduct.variantCount || (Array.isArray(featuredProduct.variants) ? featuredProduct.variants.length : 0)
    );

    elements.featuredRail.innerHTML = `
      <article class="service-feature-card">
        <span class="service-feature-card__eyebrow">${escapeHtml(config.featuredLabel)}</span>
        <h3 class="service-feature-card__title">${escapeHtml(featuredProduct.title || featuredProduct.name || "Featured listing")}</h3>
        <p class="service-feature-card__copy">${escapeHtml(truncate(featuredProduct.description || "", 180) || "Open the listing to view the full offer details.")}</p>
        <div class="service-feature-card__meta">
          <span><i class="fa-solid fa-tags"></i>${formatCurrency(featuredProduct.price)}</span>
          <span><i class="fa-solid fa-boxes-stacked"></i>${stockQuantity} in stock</span>
          <span><i class="fa-solid fa-layer-group"></i>${variantCount} variant${variantCount === 1 ? "" : "s"}</span>
          <span><i class="fa-solid fa-location-dot"></i>${location}</span>
          <span><i class="fa-solid fa-sparkles"></i>${escapeHtml(config.highlightLabel)}</span>
          <span><i class="fa-solid fa-truck-fast"></i>${delivery}</span>
        </div>
      </article>
    `;
  }

  function resolveVariant(product) {
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    const inStock = variants.find((variant) => Number(variant.stockQuantity || 0) > 0);
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
      showToast("This listing is not available yet.", "danger");
      return;
    }

    const variant = resolveVariant(product);
    const item = {
      id: Number(product.id || 0),
      variantId: Number((variant && variant.id) || 0),
      quantity: 1,
      name: product.title || product.name || "Product",
      price: Number(variant && variant.priceOverride != null ? variant.priceOverride : product.price || 0),
      image: getProductImage(product) || "https://via.placeholder.com/60?text=Item",
      storeName: state.store && state.store.storeName ? state.store.storeName : "",
      storePath: getStorePath(),
      productPath: getProductPath(product),
      variantLabel: variant && variant.label ? variant.label : "",
    };

    const cart = readCart();
    const key = `${item.id}:${item.variantId}`;
    const index = cart.findIndex((entry) => `${Number(entry.id || 0)}:${Number(entry.variantId || 0)}` === key);
    if (index >= 0) {
      cart[index].quantity = Number(cart[index].quantity || 0) + 1;
    } else {
      cart.push(item);
    }

    writeCart(cart);
    showToast(`${item.name} added to cart.`);

    if (window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "add_to_cart",
        source: "service-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        productId: item.id,
        variantId: item.variantId,
        itemType: state.templateKey,
      });
    }
  }

  function renderProductCard(product) {
    const config = getTemplateConfig();
    const image = getProductImage(product);
    const status = String(product.status || "published").trim().toLowerCase();
    const visibility = String(product.visibility || "public").trim().toLowerCase();
    const variantCount = Number(product.variantCount || (Array.isArray(product.variants) ? product.variants.length : 0));
    const stockQuantity = Number(product.stockQuantity || 0);
    const support = [
      product.delivery ? `<span><i class="fa-solid fa-truck-fast"></i>${escapeHtml(product.delivery)}</span>` : "",
      product.location ? `<span><i class="fa-solid fa-location-dot"></i>${escapeHtml(product.location)}</span>` : "",
      `<span><i class="fa-solid fa-boxes-stacked"></i>${stockQuantity} in stock</span>`,
      variantCount ? `<span><i class="fa-solid fa-layer-group"></i>${variantCount} variant${variantCount === 1 ? "" : "s"}</span>` : "",
    ].filter(Boolean);

    return `
      <article class="service-product-card">
        <div class="service-product-card__media">
          ${
            image
              ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.title || product.name || config.noun)}">`
              : ""
          }
        </div>
        <div class="service-product-card__body">
          <div class="service-product-card__meta">
            <span class="service-product-pill service-product-pill--accent">${escapeHtml(config.noun)}</span>
            ${
              !state.isPublic
                ? `<span class="service-product-pill">${escapeHtml(status)}</span><span class="service-product-pill">${escapeHtml(visibility)}</span>`
                : ""
            }
          </div>
          <h3 class="service-product-card__title">${escapeHtml(product.title || product.name || "Listing")}</h3>
          <p class="service-product-card__description">${escapeHtml(truncate(product.description || "", 180) || "Open the listing to view the full offer details.")}</p>
          <strong class="service-product-card__price">${formatCurrency(product.price)}</strong>
          <div class="service-product-card__support">${support.join("")}</div>
          <div class="service-product-card__actions">
            <a class="service-action-link" href="${escapeHtml(getProductPath(product))}">
              <i class="fa-solid fa-eye"></i>
              <span>View listing</span>
            </a>
            ${
              state.isPublic
                ? `<button class="service-action-button service-action-button--accent" type="button" data-add-cart="${Number(product.id || 0)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`
                : `<a class="service-action-link" href="${escapeHtml(document.body.dataset.sellerProductsPath || "/seller/templates/products")}"><i class="fa-solid fa-pen-ruler"></i><span>Manage in catalog</span></a>`
            }
          </div>
        </div>
      </article>
    `;
  }

  function renderProducts() {
    if (!elements.productsGrid || !elements.productsEmpty) {
      return;
    }

    if (!Array.isArray(state.products) || !state.products.length) {
      elements.productsGrid.innerHTML = "";
      elements.productsEmpty.hidden = false;
      return;
    }

    elements.productsEmpty.hidden = true;
    elements.productsGrid.innerHTML = state.products
      .slice()
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .map((product) => renderProductCard(product))
      .join("");

    renderFeaturedRail();
  }

  function renderUpdateCard(item) {
    const linkedProduct = state.products.find((product) => Number(product.id) === Number(item.catalogItemId || 0));
    const media = Array.isArray(item.images) ? item.images.filter(Boolean).slice(0, 3) : [];
    const tone = item.type ? String(item.type).replace(/_/g, " ") : "store update";

    return `
      <article class="service-update-card">
        <div class="service-update-card__head">
          <div class="service-update-card__identity">
            <div class="service-update-card__avatar">${getAvatarMarkup(state.store || {})}</div>
            <div>
              <span class="service-update-card__store">${escapeHtml(item.storeName || (state.store && state.store.storeName) || "Store update")}</span>
              <span class="service-update-card__meta">${escapeHtml(formatDate(item.createdAt))}</span>
            </div>
          </div>
          <span class="service-update-card__tone">${escapeHtml(tone)}</span>
        </div>
        ${item.title ? `<h3 class="service-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
        <p class="service-update-card__body">${escapeHtml(item.description || "New update from this store.")}</p>
        ${
          media.length
            ? `<div class="service-update-card__media">${media
                .map((image) => `<div class="service-update-card__media-item"><img src="${escapeHtml(image)}" alt="${escapeHtml(item.title || "Store update")}"></div>`)
                .join("")}</div>`
            : ""
        }
        ${
          linkedProduct
            ? `<div class="service-update-card__actions">
                <a class="service-action-link" href="${escapeHtml(getProductPath(linkedProduct))}">
                  <i class="fa-solid fa-eye"></i>
                  <span>View listing</span>
                </a>
                ${
                  state.isPublic
                    ? `<button class="service-action-button service-action-button--accent" type="button" data-add-cart="${Number(linkedProduct.id || 0)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`
                    : ""
                }
              </div>`
            : ""
        }
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

  function toggleFaq(event) {
    const button = event.target.closest(".service-faq__question");
    if (!button) {
      return;
    }
    const item = button.closest(".service-faq__item");
    if (item) {
      item.classList.toggle("is-open");
    }
  }

  function shareStore() {
    const shareUrl = `${window.location.origin}${getStorePath()}`;
    const sharePayload = {
      title: state.store && state.store.storeName ? state.store.storeName : "Zest store",
      text: state.store && state.store.tagline ? state.store.tagline : "Check out this store on Zest.",
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
    if (!elements.followBtn || !state.store || !state.store.handle) {
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
    if (!state.store || !state.store.handle) {
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

  function bindEvents() {
    if (elements.navToggle && elements.nav) {
      elements.navToggle.addEventListener("click", () => {
        const isOpen = elements.nav.classList.toggle("is-open");
        elements.navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      elements.nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          elements.nav.classList.remove("is-open");
          elements.navToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    document.addEventListener("click", (event) => {
      const addToCart = event.target.closest("[data-add-cart]");
      if (addToCart) {
        addProductToCart(addToCart.getAttribute("data-add-cart"));
        return;
      }
    });

    document.addEventListener("click", toggleFaq);

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener("click", shareStore);
    }
    if (elements.followBtn) {
      elements.followBtn.addEventListener("click", () => {
        handleFollow().catch(() => showToast("Unable to update followed store.", "danger"));
      });
    }

    window.addEventListener("zest:followed-stores-changed", () => {
      syncFollowButton().catch(() => {});
    });
  }

  async function loadStorefront() {
    const storeEndpoint = document.body.dataset.storeApiEndpoint;
    const feedEndpoint = document.body.dataset.storeFeedEndpoint;

    if (!storeEndpoint) {
      return;
    }

    const [storeResult, feedResult] = await Promise.all([
      fetchJson(storeEndpoint).catch(() => null),
      feedEndpoint ? fetchJson(feedEndpoint).catch(() => null) : Promise.resolve(null),
    ]);

    if (!storeResult || !storeResult.ok || !storeResult.payload || storeResult.payload.success === false) {
      showToast("Unable to load this storefront right now.", "danger");
      return;
    }

    state.store = storeResult.payload.store || null;
    state.meta = storeResult.payload.meta || {};
    state.products = Array.isArray(storeResult.payload.products) ? storeResult.payload.products : [];
    state.updates =
      feedResult && feedResult.ok && feedResult.payload && feedResult.payload.success !== false
        ? Array.isArray(feedResult.payload.items)
          ? feedResult.payload.items
          : []
        : [];

    renderHero();
    renderMetrics();
    renderUpdates();
    renderProducts();
    await syncFollowButton();

    if (state.isPublic && window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "view_store",
        source: "service-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        templateKey: state.templateKey,
        itemType: state.templateKey,
      });
    }
  }

  bindEvents();
  loadStorefront().catch(() => {
    showToast("Unable to load this storefront right now.", "danger");
  });
})();
