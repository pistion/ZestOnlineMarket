(function () {
  "use strict";

  const CART_STORAGE_KEY = "zest_cart_v1";
  const state = {
    isPublic: document.body.dataset.publicStore === "1",
    viewerRole: String(document.body.dataset.viewerRole || "").trim().toLowerCase(),
    store: null,
    meta: {},
    products: [],
    updates: [],
    templateData: {},
    musicFilter: "all",
    searchTerm: "",
    previewItemId: 0,
    toastTimer: null,
  };

  state.canBuy = state.isPublic && state.viewerRole === "buyer";
  state.isGuest = state.isPublic && !state.viewerRole;

  const endpoints = {
    store: String(document.body.dataset.storeApiEndpoint || "").trim(),
    feed: String(document.body.dataset.storeFeedEndpoint || "").trim(),
  };

  const elements = {
    brand: document.querySelector("#musicStoreBrand"),
    brandLabel: document.querySelector("#musicStoreBrandLabel"),
    cover: document.querySelector("#musicStoreCover"),
    avatar: document.querySelector("#musicStoreAvatar"),
    name: document.querySelector("#musicStoreName"),
    handle: document.querySelector("#musicStoreHandle"),
    tagline: document.querySelector("#musicStoreTagline"),
    about: document.querySelector("#musicStoreAbout"),
    meta: document.querySelector("#musicStoreMeta"),
    socials: document.querySelector("#musicStoreSocials"),
    followBtn: document.querySelector("#musicFollowBtn"),
    shareBtn: document.querySelector("#musicShareBtn"),
    previewBtn: document.querySelector("#musicPreviewStoreBtn"),
    metricListings: document.querySelector("#musicMetricListings"),
    metricUpdates: document.querySelector("#musicMetricUpdates"),
    metricStatus: document.querySelector("#musicMetricStatus"),
    metricKinds: document.querySelector("#musicMetricKinds"),
    releaseStrip: document.querySelector("#musicReleaseStrip"),
    releaseEmpty: document.querySelector("#musicReleaseEmpty"),
    collectionGrid: document.querySelector("#musicCollectionGrid"),
    collectionEmpty: document.querySelector("#musicCollectionEmpty"),
    libraryGrid: document.querySelector("#musicLibraryGrid"),
    libraryEmpty: document.querySelector("#musicLibraryEmpty"),
    updatesList: document.querySelector("#musicUpdatesList"),
    updatesEmpty: document.querySelector("#musicUpdatesEmpty"),
    filterRow: document.querySelector("#musicFilterRow"),
    search: document.querySelector("#musicLibrarySearch"),
    kindChips: document.querySelector("#musicKindChips"),
    studioNote: document.querySelector("#musicStudioNote"),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
    player: document.querySelector("#musicPlayer"),
    playerCover: document.querySelector("#musicPlayerCover"),
    playerTitle: document.querySelector("#musicPlayerTitle"),
    playerSubtitle: document.querySelector("#musicPlayerSubtitle"),
    playerToggle: document.querySelector("#musicPlayerToggle"),
    playerClose: document.querySelector("#musicPlayerClose"),
    playerSeek: document.querySelector("#musicPlayerSeek"),
    playerCurrent: document.querySelector("#musicPlayerCurrent"),
    playerDuration: document.querySelector("#musicPlayerDuration"),
    playerAudio: document.querySelector("#musicPreviewAudio"),
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

  function formatTime(value) {
    const seconds = Number(value || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function initials(value) {
    const letters = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return letters || "M";
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
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(store.storeName || "Music store")}">`;
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

  function showToast(message, tone = "default") {
    let toast = document.querySelector(".pulse-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "pulse-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle("pulse-toast--danger", tone === "danger");
    toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
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
      "linear-gradient(135deg, rgba(8,17,31,0.78), rgba(26,142,162,0.52))",
      `url('${coverUrl.replace(/'/g, "\\'")}') center/cover no-repeat`,
    ].join(",");
  }

  function syncBodyDataset() {
    const handle = state.store && state.store.handle ? state.store.handle : "";
    const storePath = getStorePath();

    document.body.dataset.storeHandle = handle;
    document.body.dataset.storePath = storePath;

    if (elements.previewBtn) {
      elements.previewBtn.href = storePath;
    }

    if (elements.brand) {
      elements.brand.href = storePath;
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
          `<a class="pulse-pill" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(link.label)}"><i class="${escapeHtml(link.icon)}"></i><span>${escapeHtml(link.label)}</span></a>`
      )
      .join("");
  }

  function normalizeUpdate(item) {
    const source = item && typeof item === "object" ? item : {};
    return {
      ...source,
      catalogItemId: Number(source.catalogItemId || source.catalog_item_id || 0) || 0,
      images: Array.isArray(source.images) ? source.images : [],
    };
  }

  function buildSearchText(...parts) {
    return parts
      .map((part) => String(part || "").trim().toLowerCase())
      .filter(Boolean)
      .join(" ");
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function readMetaValue(product, keys = []) {
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    if (!variants.length || !keys.length) {
      return "";
    }

    const allowed = new Set(keys.map((key) => normalizeKey(key)));
    for (const variant of variants) {
      const attributes =
        variant && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
          ? variant.attributes
          : {};

      for (const [key, rawValue] of Object.entries(attributes)) {
        if (!allowed.has(normalizeKey(key))) {
          continue;
        }

        const value = String(rawValue || "").trim();
        if (value) {
          return value;
        }
      }
    }

    return "";
  }

  function inferMusicKind(product) {
    const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

    if (/\b(album|lp)\b/.test(searchText)) {
      return "album";
    }
    if (/\bep\b|extended play/.test(searchText)) {
      return "ep";
    }
    if (/\b(pack|sample|stem|loop)\b/.test(searchText)) {
      return "pack";
    }
    if (/\b(video|visualizer)\b/.test(searchText)) {
      return "video";
    }
    if (/\b(license|licence|sync|commercial)\b/.test(searchText)) {
      return "license";
    }
    if (/\b(lesson|class|coaching|masterclass|workshop)\b/.test(searchText)) {
      return "lesson";
    }
    if (/\b(bundle|collection)\b/.test(searchText)) {
      return "bundle";
    }

    return "single";
  }

  function deriveMusicItem(product) {
    const kind = inferMusicKind(product);
    const imageUrl = getProductImage(product);
    const variantCount =
      Number(product && product.variantCount) ||
      (Array.isArray(product && product.variants) ? product.variants.length : 0);

    return {
      id: Number(product && product.id) || 0,
      title: product && (product.title || product.name) ? product.title || product.name : "Untitled release",
      description: product && product.description ? product.description : "",
      price: Number(product && product.price) || 0,
      imageUrl,
      createdAt: product && product.createdAt ? product.createdAt : null,
      createdLabel: formatDate(product && product.createdAt),
      delivery: product && product.delivery ? product.delivery : "",
      location: product && product.location ? product.location : "",
      supportLabel:
        (product && product.delivery) || (product && product.location) || "Digital storefront release",
      kind,
      kindLabel: kind.charAt(0).toUpperCase() + kind.slice(1),
      previewUrl: readMetaValue(product, [
        "preview",
        "previewUrl",
        "preview_url",
        "sample",
        "sampleUrl",
        "sample_url",
        "audio",
        "audioUrl",
        "audio_url",
      ]),
      durationLabel:
        readMetaValue(product, ["duration", "length", "runtime"]) ||
        (kind === "lesson" ? "Guided access" : "Preview pending"),
      bpmLabel: readMetaValue(product, ["bpm", "tempo"]),
      trackCount: Math.max(variantCount || 0, kind === "album" || kind === "ep" || kind === "pack" ? 2 : 1),
      detailPath: getProductPath(product),
    };
  }

  function deriveMusicData(products) {
    const libraryItems = (Array.isArray(products) ? products : [])
      .map(deriveMusicItem)
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
    const collections = libraryItems.filter((item) => ["album", "ep", "pack", "bundle"].includes(item.kind));
    const availableKinds = [...new Set(libraryItems.map((item) => item.kind))];

    return {
      releases: libraryItems.slice(0, 6),
      collections: (collections.length ? collections : libraryItems.slice(0, 3)).slice(0, 4),
      libraryItems,
      availableKinds,
      stats: {
        trackCount: libraryItems.length,
        collectionCount: collections.length,
        lessonCount: libraryItems.filter((item) => item.kind === "lesson").length,
      },
    };
  }

  function musicData() {
    const data = state.templateData && state.templateData.music;
    if (data && Array.isArray(data.libraryItems)) {
      return data;
    }
    return deriveMusicData(state.products);
  }

  function findProduct(productId) {
    return state.products.find((product) => Number(product.id || 0) === Number(productId || 0)) || null;
  }

  function getItemPath(item) {
    if (item && item.detailPath) {
      return item.detailPath;
    }

    return getProductPath(findProduct(item && item.id));
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
    const product = findProduct(productId);
    if (!product) {
      showToast("This release is not available yet.", "danger");
      return;
    }

    const variant = resolveVariant(product);
    const item = {
      id: Number(product.id || 0),
      variantId: Number((variant && variant.id) || 0),
      quantity: 1,
      name: product.title || product.name || "Release",
      price: Number(variant && variant.priceOverride != null ? variant.priceOverride : product.price || 0),
      image: getProductImage(product),
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
        source: "music-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        productId: item.id,
        variantId: item.variantId,
        itemType: "music",
      });
    }
  }

  function renderHero() {
    if (!state.store) {
      return;
    }

    setCoverBackground();

    if (elements.brandLabel) {
      elements.brandLabel.textContent = state.store.storeName || "Music Studio";
    }
    if (elements.name) {
      elements.name.textContent = state.store.storeName || "Music Studio";
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
    if (elements.meta) {
      const listingCount = Array.isArray(state.products) ? state.products.length : 0;
      const updateCount = Array.isArray(state.updates) ? state.updates.length : 0;
      elements.meta.innerHTML = [
        `<span class="pulse-pill"><i class="fa-solid fa-layer-group"></i>${listingCount} release${listingCount === 1 ? "" : "s"}</span>`,
        `<span class="pulse-pill"><i class="fa-solid fa-bullhorn"></i>${updateCount} update${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="pulse-pill"><i class="fa-solid fa-shield-heart"></i>${escapeHtml(getStatusLabel())}</span>`,
      ].join("");
    }

    syncBodyDataset();
    renderSocials();
  }

  function renderSummary() {
    const data = musicData();
    const kinds = Array.isArray(data.availableKinds) ? data.availableKinds : [];

    if (elements.metricListings) {
      elements.metricListings.textContent = String(Array.isArray(state.products) ? state.products.length : 0);
    }
    if (elements.metricUpdates) {
      elements.metricUpdates.textContent = String(Array.isArray(state.updates) ? state.updates.length : 0);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = getStatusLabel();
    }
    if (elements.metricKinds) {
      elements.metricKinds.textContent = kinds.length
        ? kinds.map((kind) => kind.charAt(0).toUpperCase() + kind.slice(1)).join(", ")
        : "Singles, collections, lessons";
    }
    if (elements.kindChips) {
      elements.kindChips.innerHTML = (kinds.length ? kinds : ["single", "album", "lesson"])
        .map(
          (kind) =>
            `<span class="pulse-pill"><i class="fa-solid fa-record-vinyl"></i><span>${escapeHtml(
              kind.charAt(0).toUpperCase() + kind.slice(1)
            )}</span></span>`
        )
        .join("");
    }
    if (elements.studioNote) {
      const stats = data.stats || {};
      elements.studioNote.textContent =
        stats.lessonCount > 0
          ? `${stats.lessonCount} lesson-style offer${stats.lessonCount === 1 ? "" : "s"} are live alongside releases and collections.`
          : "This layout keeps release energy up front while still leaving room for teaching, licensing, and pack-style offers.";
    }
  }

  function renderFilters() {
    if (!elements.filterRow) {
      return;
    }

    const data = musicData();
    const kinds = Array.isArray(data.availableKinds) ? data.availableKinds : [];
    const filters = ["all"].concat(kinds);

    elements.filterRow.innerHTML = filters
      .map((kind) => {
        const active = state.musicFilter === kind;
        const label = kind === "all" ? "All" : kind.charAt(0).toUpperCase() + kind.slice(1);
        return `<button class="pulse-filter${active ? " is-active" : ""}" type="button" data-music-filter="${escapeHtml(
          kind
        )}">${escapeHtml(label)}</button>`;
      })
      .join("");
  }

  function itemActions(item, context = "library") {
    const viewAction = `<a class="pulse-library-card__action" href="${escapeHtml(
      getItemPath(item)
    )}"><i class="fa-regular fa-eye"></i><span>View listing</span></a>`;
    const previewAction = item.previewUrl
      ? `<button class="pulse-library-card__action" type="button" data-preview-id="${Number(
          item.id || 0
        )}"><i class="fa-solid fa-play"></i><span>Preview</span></button>`
      : "";

    if (!state.isPublic) {
      return [
        viewAction,
        `<a class="pulse-library-card__action pulse-library-card__action--accent" href="${escapeHtml(
          document.body.dataset.sellerProductsPath || "/seller/templates/products"
        )}"><i class="fa-solid fa-pen-ruler"></i><span>Manage</span></a>`,
      ]
        .filter(Boolean)
        .join("");
    }

    if (state.canBuy) {
      return [
        viewAction,
        `<button class="pulse-library-card__action pulse-library-card__action--accent" type="button" data-add-cart="${Number(
          item.id || 0
        )}" data-source="${escapeHtml(context)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`,
        previewAction,
      ]
        .filter(Boolean)
        .join("");
    }

    return [
      viewAction,
      `<a class="pulse-library-card__action pulse-library-card__action--accent" href="${escapeHtml(
        getSignInPath()
      )}"><i class="fa-solid fa-right-to-bracket"></i><span>Sign in to buy</span></a>`,
      previewAction,
    ]
      .filter(Boolean)
      .join("");
  }

  function renderReleaseStrip() {
    if (!elements.releaseStrip || !elements.releaseEmpty) {
      return;
    }

    const releases = (musicData().releases || []).slice(0, 4);
    if (!releases.length) {
      elements.releaseStrip.innerHTML = "";
      elements.releaseEmpty.hidden = false;
      return;
    }

    elements.releaseEmpty.hidden = true;
    elements.releaseStrip.innerHTML = releases
      .map((item) => {
        const mediaStyle = item.imageUrl ? ` style="background-image:url('${escapeHtml(item.imageUrl)}')"` : "";
        return `
          <article class="pulse-release-card">
            <div class="pulse-release-card__media"${mediaStyle}></div>
            <div class="pulse-release-card__badges">
              <span class="pulse-badge pulse-badge--accent">${escapeHtml(item.kindLabel || "Release")}</span>
              <span class="pulse-badge">${escapeHtml(item.durationLabel || "Preview pending")}</span>
            </div>
            <div>
              <h3 class="pulse-release-card__title">${escapeHtml(item.title || "Untitled release")}</h3>
              <p class="pulse-library-card__description">${escapeHtml(
                truncate(item.description || "Open the listing to see the full release notes.", 110)
              )}</p>
            </div>
            <div class="pulse-library-card__support">
              <span class="pulse-pill"><i class="fa-solid fa-tags"></i>${formatCurrency(item.price)}</span>
              <span class="pulse-pill"><i class="fa-solid fa-calendar-day"></i>${escapeHtml(item.createdLabel || "Fresh release")}</span>
            </div>
            <div class="pulse-release-card__actions">${itemActions(item, "release-strip")}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderCollections() {
    if (!elements.collectionGrid || !elements.collectionEmpty) {
      return;
    }

    const collections = (musicData().collections || []).slice(0, 4);
    if (!collections.length) {
      elements.collectionGrid.innerHTML = "";
      elements.collectionEmpty.hidden = false;
      return;
    }

    elements.collectionEmpty.hidden = true;
    elements.collectionGrid.innerHTML = collections
      .map((item) => {
        const mediaStyle = item.imageUrl ? ` style="background-image:url('${escapeHtml(item.imageUrl)}')"` : "";
        return `
          <article class="pulse-collection-card">
            <div class="pulse-collection-card__media"${mediaStyle}></div>
            <div class="pulse-release-card__badges">
              <span class="pulse-badge pulse-badge--accent">${escapeHtml(item.kindLabel || "Collection")}</span>
              <span class="pulse-badge">${escapeHtml(`${Number(item.trackCount || 0)} tracks`)}</span>
            </div>
            <div>
              <h3 class="pulse-collection-card__title">${escapeHtml(item.title || "Collection")}</h3>
              <p class="pulse-library-card__description">${escapeHtml(
                truncate(item.description || "Grouped releases and bundle-style offers stay visible here.", 120)
              )}</p>
            </div>
            <div class="pulse-release-card__actions">${itemActions(item, "collection-grid")}</div>
          </article>
        `;
      })
      .join("");
  }

  function filteredLibraryItems() {
    const items = Array.isArray(musicData().libraryItems) ? musicData().libraryItems.slice() : [];
    return items.filter((item) => {
      const matchesFilter = state.musicFilter === "all" || item.kind === state.musicFilter;
      const haystack = buildSearchText(item.title, item.description, item.kind, item.supportLabel, item.durationLabel);
      const matchesSearch = !state.searchTerm || haystack.includes(state.searchTerm);
      return matchesFilter && matchesSearch;
    });
  }

  function renderLibrary() {
    if (!elements.libraryGrid || !elements.libraryEmpty) {
      return;
    }

    renderFilters();

    const items = filteredLibraryItems();
    if (!items.length) {
      elements.libraryGrid.innerHTML = "";
      elements.libraryEmpty.hidden = false;
      return;
    }

    elements.libraryEmpty.hidden = true;
    elements.libraryGrid.innerHTML = items
      .map((item) => {
        const mediaStyle = item.imageUrl ? ` style="background-image:url('${escapeHtml(item.imageUrl)}')"` : "";
        const support = [
          item.supportLabel ? `<span class="pulse-pill"><i class="fa-solid fa-location-dot"></i>${escapeHtml(item.supportLabel)}</span>` : "",
          item.bpmLabel ? `<span class="pulse-pill"><i class="fa-solid fa-wave-square"></i>${escapeHtml(item.bpmLabel)} BPM</span>` : "",
          item.durationLabel ? `<span class="pulse-pill"><i class="fa-regular fa-clock"></i>${escapeHtml(item.durationLabel)}</span>` : "",
        ]
          .filter(Boolean)
          .join("");

        return `
          <article class="pulse-library-card">
            <div class="pulse-library-card__media"${mediaStyle}></div>
            <div class="pulse-library-card__badges">
              <span class="pulse-badge pulse-badge--accent">${escapeHtml(item.kindLabel || "Release")}</span>
              <span class="pulse-badge">${formatCurrency(item.price)}</span>
            </div>
            <div>
              <h3 class="pulse-library-card__title">${escapeHtml(item.title || "Untitled release")}</h3>
              <p class="pulse-library-card__description">${escapeHtml(
                truncate(item.description || "Open this listing to view the full offer details.", 140)
              )}</p>
            </div>
            <div class="pulse-library-card__support">${support}</div>
            <div class="pulse-library-card__actions">${itemActions(item, "library-grid")}</div>
          </article>
        `;
      })
      .join("");
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
    elements.updatesList.innerHTML = state.updates
      .slice()
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .map((item) => {
        const linkedProduct = findProduct(item.catalogItemId);
        const tone = String(item.type || "store_update").replace(/_/g, " ");
        const actions = linkedProduct
          ? [
              `<a class="pulse-update-card__action" href="${escapeHtml(
                getProductPath(linkedProduct)
              )}"><i class="fa-regular fa-eye"></i><span>View listing</span></a>`,
              state.canBuy
                ? `<button class="pulse-update-card__action pulse-update-card__action--accent" type="button" data-add-cart="${Number(
                    linkedProduct.id || 0
                  )}" data-source="music-update"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`
                : "",
            ]
              .filter(Boolean)
              .join("")
          : "";

        return `
          <article class="pulse-update-card">
            <div class="pulse-update-card__meta">
              <span class="pulse-pill"><i class="fa-solid fa-bullhorn"></i>${escapeHtml(tone)}</span>
              <span class="pulse-pill"><i class="fa-regular fa-clock"></i>${escapeHtml(formatDate(item.createdAt))}</span>
            </div>
            ${item.title ? `<h3 class="pulse-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
            <p class="pulse-update-card__body">${escapeHtml(item.description || "New update from this store.")}</p>
            ${actions ? `<div class="pulse-update-card__actions">${actions}</div>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function playerItem() {
    return musicData().libraryItems.find((item) => Number(item.id || 0) === Number(state.previewItemId || 0)) || null;
  }

  function updatePlayerButtons() {
    document.querySelectorAll("[data-preview-id]").forEach((button) => {
      const isActive = Number(button.getAttribute("data-preview-id") || 0) === Number(state.previewItemId || 0);
      button.classList.toggle("is-active", isActive);
    });
  }

  function syncPlayerToggle() {
    if (!elements.playerToggle || !elements.playerAudio) {
      return;
    }

    const paused = elements.playerAudio.paused;
    elements.playerToggle.innerHTML = paused
      ? '<i class="fa-solid fa-play"></i><span>Play</span>'
      : '<i class="fa-solid fa-pause"></i><span>Pause</span>';
  }

  function openPreview(itemId) {
    const item = musicData().libraryItems.find((entry) => Number(entry.id || 0) === Number(itemId || 0));
    if (!item || !item.previewUrl || !elements.playerAudio || !elements.player) {
      showToast("This release does not have a preview yet.", "danger");
      return;
    }

    state.previewItemId = Number(item.id || 0);
    elements.player.hidden = false;
    elements.playerTitle.textContent = item.title || "Preview";
    elements.playerSubtitle.textContent = item.kindLabel
      ? `${item.kindLabel} • ${item.durationLabel || "Preview ready"}`
      : item.durationLabel || "Preview ready";
    elements.playerCover.style.backgroundImage = item.imageUrl ? `url("${item.imageUrl.replace(/"/g, '\\"')}")` : "";
    elements.playerCurrent.textContent = "0:00";
    elements.playerDuration.textContent = "0:00";
    elements.playerSeek.value = "0";

    if (elements.playerAudio.src !== item.previewUrl) {
      elements.playerAudio.src = item.previewUrl;
      elements.playerAudio.load();
    }

    elements.playerAudio
      .play()
      .then(() => {
        syncPlayerToggle();
      })
      .catch(() => {
        showToast("Preview playback was blocked. Use play to start it.", "danger");
        syncPlayerToggle();
      });

    updatePlayerButtons();
  }

  function closePreview() {
    if (!elements.playerAudio || !elements.player) {
      return;
    }

    elements.playerAudio.pause();
    elements.playerAudio.removeAttribute("src");
    elements.playerAudio.load();
    elements.player.hidden = true;
    state.previewItemId = 0;
    syncPlayerToggle();
    updatePlayerButtons();
  }

  function togglePreviewPlayback() {
    if (!elements.playerAudio || !state.previewItemId) {
      return;
    }

    if (elements.playerAudio.paused) {
      elements.playerAudio.play().catch(() => {
        showToast("Preview playback could not start.", "danger");
      });
    } else {
      elements.playerAudio.pause();
    }
    syncPlayerToggle();
  }

  function updatePlayerProgress() {
    if (!elements.playerAudio || !elements.playerSeek) {
      return;
    }

    const duration = Number(elements.playerAudio.duration || 0);
    const currentTime = Number(elements.playerAudio.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    elements.playerCurrent.textContent = formatTime(currentTime);
    elements.playerDuration.textContent = formatTime(duration);
    elements.playerSeek.value = String(percent);
    syncPlayerToggle();
  }

  function shareStore() {
    const shareUrl = `${window.location.origin}${getStorePath()}`;
    const sharePayload = {
      title: state.store && state.store.storeName ? state.store.storeName : "Music store",
      text: state.store && state.store.tagline ? state.store.tagline : "Check out this music storefront on Zest.",
      url: shareUrl,
    };

    if (navigator.share) {
      navigator.share(sharePayload).catch(() => {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => showToast("Store link copied."))
        .catch(() => showToast("Unable to copy the store link right now.", "danger"));
      return;
    }

    showToast("Share is not available in this browser.", "danger");
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

    showToast(result && result.following ? "Artist followed." : "Artist unfollowed.");
  }

  function toggleFaq(event) {
    const button = event.target.closest(".pulse-faq__question");
    if (!button) {
      return;
    }

    const item = button.closest(".pulse-faq__item");
    if (item) {
      item.classList.toggle("is-open");
    }
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

    if (elements.search) {
      elements.search.addEventListener("input", (event) => {
        state.searchTerm = String(event.target.value || "").trim().toLowerCase();
        renderLibrary();
      });
    }

    if (elements.filterRow) {
      elements.filterRow.addEventListener("click", (event) => {
        const button = event.target.closest("[data-music-filter]");
        if (!button) {
          return;
        }

        state.musicFilter = String(button.getAttribute("data-music-filter") || "all");
        renderLibrary();
      });
    }

    if (elements.shareBtn) {
      elements.shareBtn.addEventListener("click", shareStore);
    }

    if (elements.followBtn) {
      elements.followBtn.addEventListener("click", () => {
        handleFollow().catch(() => showToast("Unable to update followed store.", "danger"));
      });
    }

    if (elements.playerToggle) {
      elements.playerToggle.addEventListener("click", togglePreviewPlayback);
    }

    if (elements.playerClose) {
      elements.playerClose.addEventListener("click", closePreview);
    }

    if (elements.playerAudio) {
      elements.playerAudio.addEventListener("loadedmetadata", updatePlayerProgress);
      elements.playerAudio.addEventListener("timeupdate", updatePlayerProgress);
      elements.playerAudio.addEventListener("pause", syncPlayerToggle);
      elements.playerAudio.addEventListener("play", syncPlayerToggle);
      elements.playerAudio.addEventListener("ended", () => {
        syncPlayerToggle();
        updatePlayerButtons();
      });
    }

    if (elements.playerSeek && elements.playerAudio) {
      elements.playerSeek.addEventListener("input", () => {
        const duration = Number(elements.playerAudio.duration || 0);
        if (!duration) {
          return;
        }
        elements.playerAudio.currentTime = (Number(elements.playerSeek.value || 0) / 100) * duration;
      });
    }

    document.addEventListener("click", (event) => {
      const addToCart = event.target.closest("[data-add-cart]");
      if (addToCart) {
        addProductToCart(addToCart.getAttribute("data-add-cart"));
        return;
      }

      const preview = event.target.closest("[data-preview-id]");
      if (preview) {
        openPreview(preview.getAttribute("data-preview-id"));
      }
    });

    document.addEventListener("click", toggleFaq);

    window.addEventListener("zest:followed-stores-changed", () => {
      syncFollowButton().catch(() => {});
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
      showToast("Unable to load this music storefront right now.", "danger");
      return;
    }

    state.store = storeResult.payload.store || null;
    state.meta = storeResult.payload.meta || {};
    state.products = Array.isArray(storeResult.payload.products) ? storeResult.payload.products : [];
    state.templateData = storeResult.payload.templateData || {};
    state.updates =
      feedResult && feedResult.ok && feedResult.payload && feedResult.payload.success !== false
        ? (Array.isArray(feedResult.payload.items) ? feedResult.payload.items : []).map(normalizeUpdate)
        : [];

    renderHero();
    renderSummary();
    renderReleaseStrip();
    renderCollections();
    renderLibrary();
    renderUpdates();
    await syncFollowButton();

    if (state.isPublic && window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "view_store",
        source: "music-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        templateKey: "music",
        itemType: "music",
      });
    }
  }

  bindEvents();
  loadStorefront().catch(() => {
    showToast("Unable to load this music storefront right now.", "danger");
  });
})();
