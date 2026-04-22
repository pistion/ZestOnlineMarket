(function () {
  "use strict";

  const state = {
    isPublic: document.body.dataset.publicStore === "1",
    viewerRole: String(document.body.dataset.viewerRole || "").trim().toLowerCase(),
    store: null,
    meta: {},
    products: [],
    updates: [],
    templateData: {},
    typeFilter: "all",
    lightboxId: 0,
  };

  state.canBuy = state.isPublic && state.viewerRole === "buyer";

  const endpoints = {
    store: String(document.body.dataset.storeApiEndpoint || "").trim(),
    feed: String(document.body.dataset.storeFeedEndpoint || "").trim(),
  };

  const elements = {
    brand: document.querySelector("#photoStoreBrand"),
    brandLabel: document.querySelector("#photoStoreBrandLabel"),
    cover: document.querySelector("#photoStoreCover"),
    avatar: document.querySelector("#photoStoreAvatar"),
    name: document.querySelector("#photoStoreName"),
    handle: document.querySelector("#photoStoreHandle"),
    tagline: document.querySelector("#photoStoreTagline"),
    about: document.querySelector("#photoStoreAbout"),
    meta: document.querySelector("#photoStoreMeta"),
    socials: document.querySelector("#photoStoreSocials"),
    filterRow: document.querySelector("#photoFilterRow"),
    gallery: document.querySelector("#photoGallery"),
    galleryEmpty: document.querySelector("#photoGalleryEmpty"),
    serviceGrid: document.querySelector("#photoServiceGrid"),
    serviceEmpty: document.querySelector("#photoServiceEmpty"),
    updatesList: document.querySelector("#photoUpdatesList"),
    updatesEmpty: document.querySelector("#photoUpdatesEmpty"),
    metricPieces: document.querySelector("#photoMetricPieces"),
    metricServices: document.querySelector("#photoMetricServices"),
    metricStatus: document.querySelector("#photoMetricStatus"),
    metricFormats: document.querySelector("#photoMetricFormats"),
    studioNote: document.querySelector("#photoStudioNote"),
    typeCloud: document.querySelector("#photoTypeCloud"),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
    followBtn: document.querySelector("#photoFollowBtn"),
    shareBtn: document.querySelector("#photoShareBtn"),
    previewBtn: document.querySelector("#photoPreviewStoreBtn"),
    lightbox: document.querySelector("#photoLightbox"),
    lightboxMedia: document.querySelector("#photoLightboxMedia"),
    lightboxType: document.querySelector("#photoLightboxType"),
    lightboxTitle: document.querySelector("#photoLightboxTitle"),
    lightboxDescription: document.querySelector("#photoLightboxDescription"),
    lightboxMeta: document.querySelector("#photoLightboxMeta"),
    lightboxActions: document.querySelector("#photoLightboxActions"),
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function toast(message, tone = "info") {
    if (window.ZestToast && typeof window.ZestToast[tone] === "function") {
      window.ZestToast[tone](message);
      return;
    }
    window.alert(message);
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
      return { ok: response.ok, status: response.status, payload };
    });
  }

  function getStorePath() {
    const handle = state.store && state.store.handle ? state.store.handle : "";
    return handle ? `/stores/${handle}` : "/marketplace";
  }

  function getSignInPath() {
    return String(document.body.dataset.signinPath || `/auth/signin?role=buyer&returnTo=${encodeURIComponent(getStorePath())}`);
  }

  function initials(value) {
    return String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "P";
  }

  function getProductImage(product) {
    if (Array.isArray(product && product.images) && product.images.length) {
      const first = product.images[0];
      if (typeof first === "string") {
        return first;
      }
      return first && (first.url || first.src) ? first.url || first.src : "";
    }
    return "";
  }

  function inferType(product) {
    const haystack = `${product && product.title || ""} ${product && product.description || ""} ${product && product.delivery || ""}`.toLowerCase();
    if (/\b(license|licence|rights|usage|commercial)\b/.test(haystack)) {
      return "license";
    }
    if (/\b(session|portrait|shoot|coverage|wedding|event)\b/.test(haystack)) {
      return "session";
    }
    if (/\b(editorial|campaign|brand|lookbook)\b/.test(haystack)) {
      return "editorial";
    }
    if (/\b(collection|series|gallery)\b/.test(haystack)) {
      return "gallery";
    }
    return "print";
  }

  function readMeta(product, keys) {
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    const allowed = new Set((keys || []).map((key) => String(key).toLowerCase().replace(/[^a-z0-9]+/g, "")));
    for (const variant of variants) {
      const attrs = variant && typeof variant.attributes === "object" ? variant.attributes : {};
      for (const [key, value] of Object.entries(attrs)) {
        const normalized = String(key || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
        if (allowed.has(normalized) && String(value || "").trim()) {
          return String(value).trim();
        }
      }
    }
    return "";
  }

  function mapPhotoItem(product) {
    const type = inferType(product);
    return {
      id: Number(product && product.id) || 0,
      title: product && (product.title || product.name) ? product.title || product.name : "Untitled capture",
      description: product && product.description ? product.description : "",
      imageUrl: getProductImage(product),
      price: Number(product && product.price) || 0,
      createdAt: product && product.createdAt ? product.createdAt : null,
      createdLabel: formatDate(product && product.createdAt),
      type,
      typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
      sizeLabel: readMeta(product, ["size", "print_size", "format"]) || (type === "session" ? "Custom scope" : "Open edition"),
      licenseLabel: readMeta(product, ["license", "licence", "usage", "rights"]) || (type === "license" ? "Usage-ready" : "Collector print"),
      deliveryLabel: product && product.delivery ? product.delivery : (type === "session" ? "Booking flow" : "Print delivery"),
      detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "/marketplace",
      location: product && product.location ? product.location : "",
    };
  }

  function photoData() {
    const existing = state.templateData && state.templateData.photography;
    if (existing && Array.isArray(existing.galleryItems)) {
      return existing;
    }

    const galleryItems = state.products.map(mapPhotoItem);
    return {
      galleryItems,
      serviceItems: galleryItems.filter((item) => ["session", "license", "editorial"].includes(item.type)),
      availableTypes: [...new Set(galleryItems.map((item) => item.type))],
    };
  }

  function renderHero() {
    if (!state.store) {
      return;
    }

    if (elements.brand) {
      elements.brand.href = getStorePath();
    }
    if (elements.previewBtn) {
      elements.previewBtn.href = getStorePath();
    }
    if (elements.brandLabel) {
      elements.brandLabel.textContent = state.store.storeName || "Photography Studio";
    }
    if (elements.name) {
      elements.name.textContent = state.store.storeName || "Photography Studio";
    }
    if (elements.handle) {
      elements.handle.textContent = state.store.handle ? `@${state.store.handle}` : "@photo";
    }
    if (elements.tagline) {
      elements.tagline.textContent = state.store.tagline || elements.tagline.textContent;
    }
    if (elements.about) {
      elements.about.textContent = state.store.about || elements.about.textContent;
    }
    if (elements.cover) {
      const coverUrl = String(state.store.coverUrl || "").trim();
      if (coverUrl) {
        elements.cover.style.backgroundImage = `linear-gradient(135deg, rgba(47,36,28,0.38), rgba(47,36,28,0.1)), url("${coverUrl.replace(/"/g, '\\"')}")`;
      }
    }
    if (elements.avatar) {
      const avatarUrl = String(state.store.avatarUrl || "").trim();
      elements.avatar.innerHTML = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(state.store.storeName || "Photography studio")}">`
        : escapeHtml(initials(state.store.storeName));
    }
    if (elements.meta) {
      const itemCount = Array.isArray(state.products) ? state.products.length : 0;
      const updateCount = Array.isArray(state.updates) ? state.updates.length : 0;
      elements.meta.innerHTML = [
        `<span class="atelier-pill"><i class="fa-solid fa-camera-retro"></i>${itemCount} listing${itemCount === 1 ? "" : "s"}</span>`,
        `<span class="atelier-pill"><i class="fa-solid fa-bullhorn"></i>${updateCount} update${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="atelier-pill"><i class="fa-solid fa-circle-half-stroke"></i>${escapeHtml(String(state.meta.visibilityStatus || "draft"))}</span>`,
      ].join("");
    }

    const socials = state.store.socials || {};
    const links = [];
    if (socials.instagram) {
      links.push({ label: "Instagram", icon: "fa-brands fa-instagram", href: `https://instagram.com/${String(socials.instagram).replace(/^@+/, "")}` });
    }
    if (socials.facebook) {
      links.push({ label: "Facebook", icon: "fa-brands fa-facebook-f", href: String(socials.facebook).startsWith("http") ? socials.facebook : `https://facebook.com/${socials.facebook}` });
    }
    if (elements.socials) {
      if (!links.length) {
        elements.socials.hidden = true;
        elements.socials.innerHTML = "";
      } else {
        elements.socials.hidden = false;
        elements.socials.innerHTML = links.map((link) => `<a class="atelier-pill" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer"><i class="${escapeHtml(link.icon)}"></i><span>${escapeHtml(link.label)}</span></a>`).join("");
      }
    }
  }

  function renderStats() {
    const data = photoData();
    if (elements.metricPieces) {
      elements.metricPieces.textContent = String((data.galleryItems || []).length);
    }
    if (elements.metricServices) {
      elements.metricServices.textContent = String((data.serviceItems || []).length);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = String(state.meta.visibilityStatus || "draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (elements.metricFormats) {
      const labels = [...new Set((data.availableTypes || []).map((type) => type.charAt(0).toUpperCase() + type.slice(1)))];
      elements.metricFormats.textContent = labels.length ? labels.join(", ") : "Prints, licensing, sessions";
    }
    if (elements.typeCloud) {
      elements.typeCloud.innerHTML = (data.availableTypes || []).map((type) => `<span class="atelier-chip">${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))}</span>`).join("");
    }
  }

  function renderFilters() {
    if (!elements.filterRow) {
      return;
    }

    const types = ["all", ...(photoData().availableTypes || [])];
    elements.filterRow.innerHTML = types.map((type) => {
      const label = type === "all" ? "All work" : type.charAt(0).toUpperCase() + type.slice(1);
      return `<button class="atelier-filter${state.typeFilter === type ? " is-active" : ""}" type="button" data-photo-filter="${escapeHtml(type)}">${escapeHtml(label)}</button>`;
    }).join("");
  }

  function visibleGalleryItems() {
    return (photoData().galleryItems || []).filter((item) => state.typeFilter === "all" || item.type === state.typeFilter);
  }

  function cardActions(item, source) {
    const viewAction = `<a class="atelier-button" href="${escapeHtml(item.detailPath)}"><i class="fa-regular fa-eye"></i><span>View listing</span></a>`;
    const lightboxAction = `<button class="atelier-button" type="button" data-lightbox-open="${Number(item.id || 0)}"><i class="fa-solid fa-expand"></i><span>Open preview</span></button>`;

    if (!state.isPublic) {
      return [viewAction, lightboxAction].join("");
    }
    if (state.canBuy) {
      return [
        viewAction,
        `<button class="atelier-button atelier-button--accent" type="button" data-add-cart="${Number(item.id || 0)}" data-source="${escapeHtml(source)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`,
        lightboxAction,
      ].join("");
    }

    return [
      viewAction,
      `<a class="atelier-button atelier-button--accent" href="${escapeHtml(getSignInPath())}"><i class="fa-solid fa-right-to-bracket"></i><span>Sign in to collect</span></a>`,
      lightboxAction,
    ].join("");
  }

  function renderGallery() {
    if (!elements.gallery || !elements.galleryEmpty) {
      return;
    }

    renderFilters();
    const items = visibleGalleryItems();
    if (!items.length) {
      elements.gallery.innerHTML = "";
      elements.galleryEmpty.hidden = false;
      return;
    }

    elements.galleryEmpty.hidden = true;
    elements.gallery.innerHTML = items.map((item) => {
      const mediaStyle = item.imageUrl ? ` style="background-image:url('${escapeHtml(item.imageUrl)}')"` : "";
      return `
        <article class="atelier-card">
          <div class="atelier-card__media"${mediaStyle}></div>
          <div class="atelier-card__meta">
            <span class="atelier-chip">${escapeHtml(item.typeLabel)}</span>
            <span class="atelier-chip">${escapeHtml(item.sizeLabel)}</span>
          </div>
          <div>
            <h3 class="atelier-card__title">${escapeHtml(item.title)}</h3>
            <p class="atelier-card__description">${escapeHtml(item.description || "Open the listing to view the full frame and purchase details.")}</p>
          </div>
          <div class="atelier-card__meta">
            <span class="atelier-chip"><i class="fa-solid fa-tags"></i>${formatCurrency(item.price)}</span>
            <span class="atelier-chip"><i class="fa-regular fa-copyright"></i>${escapeHtml(item.licenseLabel)}</span>
            <span class="atelier-chip"><i class="fa-regular fa-calendar"></i>${escapeHtml(item.createdLabel)}</span>
          </div>
          <div class="atelier-card__actions">${cardActions(item, "photography-gallery")}</div>
        </article>
      `;
    }).join("");
  }

  function renderServices() {
    if (!elements.serviceGrid || !elements.serviceEmpty) {
      return;
    }

    const items = (photoData().serviceItems || []).slice(0, 6);
    if (!items.length) {
      elements.serviceGrid.innerHTML = "";
      elements.serviceEmpty.hidden = false;
      return;
    }

    elements.serviceEmpty.hidden = true;
    elements.serviceGrid.innerHTML = items.map((item) => `
      <article class="atelier-service-card">
        <div class="atelier-card__meta">
          <span class="atelier-chip">${escapeHtml(item.typeLabel)}</span>
          <span class="atelier-chip">${escapeHtml(item.deliveryLabel)}</span>
        </div>
        <div>
          <h3 class="atelier-service-card__title">${escapeHtml(item.title)}</h3>
          <p class="atelier-card__description">${escapeHtml(item.description || "Open the listing to review scope, size, and purchase details.")}</p>
        </div>
        <div class="atelier-card__meta">
          <span class="atelier-chip"><i class="fa-solid fa-money-bill-wave"></i>${formatCurrency(item.price)}</span>
          <span class="atelier-chip"><i class="fa-solid fa-location-dot"></i>${escapeHtml(item.location || "Remote / flexible")}</span>
        </div>
        <div class="atelier-service-card__actions">${cardActions(item, "photography-services")}</div>
      </article>
    `).join("");
  }

  function renderUpdates() {
    if (!elements.updatesList || !elements.updatesEmpty) {
      return;
    }

    if (!state.updates.length) {
      elements.updatesList.innerHTML = "";
      elements.updatesEmpty.hidden = false;
      return;
    }

    elements.updatesEmpty.hidden = true;
    elements.updatesList.innerHTML = state.updates.slice(0, 6).map((item) => `
      <article class="atelier-update-card">
        <div class="atelier-card__meta">
          <span class="atelier-chip">${escapeHtml(String(item.type || "store_update").replace(/_/g, " "))}</span>
          <span class="atelier-chip">${escapeHtml(formatDate(item.createdAt))}</span>
        </div>
        ${item.title ? `<h3 class="atelier-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
        <p>${escapeHtml(item.description || "New update from this store.")}</p>
        ${item.catalogItemId ? `<div class="atelier-update-card__actions"><a class="atelier-button" href="/products/${Number(item.catalogItemId || 0)}"><i class="fa-regular fa-eye"></i><span>Open linked listing</span></a></div>` : ""}
      </article>
    `).join("");
  }

  function openLightbox(itemId) {
    const item = (photoData().galleryItems || []).find((entry) => Number(entry.id || 0) === Number(itemId || 0));
    if (!item || !elements.lightbox) {
      return;
    }

    state.lightboxId = Number(item.id || 0);
    elements.lightbox.hidden = false;
    elements.lightboxType.textContent = item.typeLabel;
    elements.lightboxTitle.textContent = item.title;
    elements.lightboxDescription.textContent = item.description || "Open the listing to continue through the live product flow.";
    elements.lightboxMedia.style.backgroundImage = item.imageUrl ? `url("${item.imageUrl.replace(/"/g, '\\"')}")` : "";
    elements.lightboxMeta.innerHTML = [
      `<span class="atelier-chip"><i class="fa-solid fa-tags"></i>${formatCurrency(item.price)}</span>`,
      `<span class="atelier-chip"><i class="fa-regular fa-image"></i>${escapeHtml(item.sizeLabel)}</span>`,
      `<span class="atelier-chip"><i class="fa-regular fa-copyright"></i>${escapeHtml(item.licenseLabel)}</span>`,
    ].join("");
    elements.lightboxActions.innerHTML = cardActions(item, "photography-lightbox");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!elements.lightbox) {
      return;
    }
    elements.lightbox.hidden = true;
    state.lightboxId = 0;
    document.body.style.overflow = "";
  }

  function shareStore() {
    const url = `${window.location.origin}${getStorePath()}`;
    if (navigator.share) {
      navigator.share({
        title: state.store && state.store.storeName ? state.store.storeName : "Photography studio",
        text: state.store && state.store.tagline ? state.store.tagline : "Check out this photography storefront on Zest.",
        url,
      }).catch(() => {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => toast("Store link copied.", "success")).catch(() => toast("Unable to copy store link right now.", "error"));
      return;
    }

    toast("Share is not available in this browser.", "error");
  }

  async function addToCart(productId, source) {
    if (!window.ZestCart || typeof window.ZestCart.addToCart !== "function") {
      window.location.href = `/products/${Number(productId || 0)}`;
      return;
    }

    try {
      await window.ZestCart.addToCart(
        {
          productId: Number(productId || 0),
          quantity: 1,
        },
        {
          authRedirect: getSignInPath(),
        }
      );
      toast("Added to cart.", "success");
      if (window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
        window.ZestBuyerInteractions.track({
          action: "add_to_cart",
          source,
          storeHandle: state.store && state.store.handle ? state.store.handle : "",
          catalogItemId: Number(productId || 0),
          templateKey: "photography",
          itemType: "photography",
        });
      }
    } catch (error) {
      toast((error && error.message) || "Unable to add this item to the cart.", "error");
    }
  }

  async function syncFollowButton() {
    if (!elements.followBtn || !window.ZestStoreFollowing || !state.store || !state.store.handle) {
      return;
    }

    await window.ZestStoreFollowing.init();
    const following = window.ZestStoreFollowing.isFollowing(state.store.handle);
    elements.followBtn.innerHTML = following
      ? '<i class="fa-solid fa-heart"></i><span>Following</span>'
      : '<i class="fa-regular fa-heart"></i><span>Follow</span>';
  }

  async function handleFollow() {
    if (!window.ZestStoreFollowing || !state.store || !state.store.handle) {
      return;
    }

    const result = await window.ZestStoreFollowing.toggle(state.store.handle);
    await syncFollowButton();
    if (result && result.error) {
      toast(result.error, "error");
      return;
    }

    toast(result && result.following ? "Studio followed." : "Studio unfollowed.", "success");
  }

  function bindEvents() {
    if (elements.navToggle && elements.nav) {
      elements.navToggle.addEventListener("click", () => {
        const open = elements.nav.classList.toggle("is-open");
        elements.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    if (elements.filterRow) {
      elements.filterRow.addEventListener("click", (event) => {
        const button = event.target.closest("[data-photo-filter]");
        if (!button) {
          return;
        }
        state.typeFilter = String(button.getAttribute("data-photo-filter") || "all");
        renderGallery();
      });
    }

    if (elements.followBtn) {
      elements.followBtn.addEventListener("click", () => {
        handleFollow().catch(() => toast("Unable to update followed store.", "error"));
      });
    }

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener("click", shareStore);
    }

    document.addEventListener("click", (event) => {
      const cartButton = event.target.closest("[data-add-cart]");
      if (cartButton) {
        addToCart(cartButton.getAttribute("data-add-cart"), cartButton.getAttribute("data-source") || "photography-storefront");
        return;
      }

      const lightboxButton = event.target.closest("[data-lightbox-open]");
      if (lightboxButton) {
        openLightbox(lightboxButton.getAttribute("data-lightbox-open"));
        return;
      }

      if (event.target.closest("[data-lightbox-close]")) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    });
  }

  async function loadStorefront() {
    if (!endpoints.store) {
      return;
    }

    const [storeResult, feedResult] = await Promise.all([
      fetchJson(endpoints.store).catch(() => null),
      endpoints.feed ? fetchJson(endpoints.feed).catch(() => null) : Promise.resolve(null),
    ]);

    if (!storeResult || !storeResult.ok || !storeResult.payload || storeResult.payload.success === false) {
      toast("Unable to load this photography storefront right now.", "error");
      return;
    }

    state.store = storeResult.payload.store || null;
    state.meta = storeResult.payload.meta || {};
    state.products = Array.isArray(storeResult.payload.products) ? storeResult.payload.products : [];
    state.templateData = storeResult.payload.templateData || {};
    state.updates =
      feedResult && feedResult.ok && feedResult.payload && feedResult.payload.success !== false
        ? Array.isArray(feedResult.payload.items) ? feedResult.payload.items : []
        : [];

    renderHero();
    renderStats();
    renderGallery();
    renderServices();
    renderUpdates();
    await syncFollowButton();
  }

  bindEvents();
  loadStorefront().catch(() => {
    toast("Unable to load this photography storefront right now.", "error");
  });
})();
