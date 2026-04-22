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
    activeFilter: "all",
    searchTerm: "",
    sortOrder: "featured",
    toastTimer: null,
  };

  state.canBuy = state.isPublic && state.viewerRole === "buyer";
  state.isGuest = state.isPublic && !state.viewerRole;

  const endpoints = {
    store: String(document.body.dataset.storeApiEndpoint || "").trim(),
    feed: String(document.body.dataset.storeFeedEndpoint || "").trim(),
  };

  const elements = {
    brand: document.querySelector("#academyStoreBrand"),
    brandLabel: document.querySelector("#academyStoreBrandLabel"),
    cover: document.querySelector("#academyStoreCover"),
    avatar: document.querySelector("#academyStoreAvatar"),
    name: document.querySelector("#academyStoreName"),
    handle: document.querySelector("#academyStoreHandle"),
    tagline: document.querySelector("#academyStoreTagline"),
    about: document.querySelector("#academyStoreAbout"),
    meta: document.querySelector("#academyStoreMeta"),
    socials: document.querySelector("#academyStoreSocials"),
    followBtn: document.querySelector("#academyFollowBtn"),
    shareBtn: document.querySelector("#academyShareBtn"),
    previewBtn: document.querySelector("#academyPreviewStoreBtn"),
    metricListings: document.querySelector("#academyMetricListings"),
    metricUpdates: document.querySelector("#academyMetricUpdates"),
    metricStatus: document.querySelector("#academyMetricStatus"),
    guideName: document.querySelector("#academyGuideName"),
    guideNote: document.querySelector("#academyGuideNote"),
    learningNote: document.querySelector("#academyLearningNote"),
    spotlightRail: document.querySelector("#academySpotlightRail"),
    spotlightEmpty: document.querySelector("#academySpotlightEmpty"),
    programGrid: document.querySelector("#academyProgramGrid"),
    programEmpty: document.querySelector("#academyProgramEmpty"),
    resourceGrid: document.querySelector("#academyResourceGrid"),
    resourceEmpty: document.querySelector("#academyResourceEmpty"),
    updatesList: document.querySelector("#academyUpdatesList"),
    updatesEmpty: document.querySelector("#academyUpdatesEmpty"),
    filterRow: document.querySelector("#academyFilterRow"),
    search: document.querySelector("#academyProgramSearch"),
    sort: document.querySelector("#academyProgramSort"),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
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
    return letters || "C";
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
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(store.storeName || "Classes store")}">`;
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
    let toast = document.querySelector(".academy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "academy-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle("academy-toast--danger", tone === "danger");
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
      "linear-gradient(135deg, rgba(25,75,85,0.8), rgba(45,127,117,0.5))",
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
          `<a class="academy-pill" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(link.label)}"><i class="${escapeHtml(link.icon)}"></i><span>${escapeHtml(link.label)}</span></a>`
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

  function inferProgramType(product) {
    const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

    if (/\b(workshop|masterclass|bootcamp)\b/.test(searchText)) {
      return "workshop";
    }
    if (/\b(course|cohort|journey|curriculum)\b/.test(searchText)) {
      return "course";
    }
    if (/\b(session|consult|coaching|1:1|one on one)\b/.test(searchText)) {
      return "session";
    }
    if (/\b(resource|ebook|guide|toolkit|worksheet|template)\b/.test(searchText)) {
      return "resource";
    }

    return "program";
  }

  function inferProgramFormat(product, programType) {
    const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

    if (/\b(self[- ]?paced|recorded|digital|download)\b/.test(searchText)) {
      return "Self-paced";
    }
    if (/\b(live|zoom|weekly|cohort|workshop|in person|in-person)\b/.test(searchText)) {
      return "Live";
    }
    if (/\b(hybrid)\b/.test(searchText)) {
      return "Hybrid";
    }
    if (programType === "resource") {
      return "Digital";
    }

    return "Guided";
  }

  function deriveProgram(product) {
    const programType = inferProgramType(product);
    const formatLabel = inferProgramFormat(product, programType);
    const seatsRemaining = Number(product && product.stockQuantity) || 0;

    return {
      id: Number(product && product.id) || 0,
      title: product && (product.title || product.name) ? product.title || product.name : "Untitled program",
      description: product && product.description ? product.description : "",
      price: Number(product && product.price) || 0,
      imageUrl: getProductImage(product),
      createdAt: product && product.createdAt ? product.createdAt : null,
      createdLabel: formatDate(product && product.createdAt),
      delivery: product && product.delivery ? product.delivery : "",
      location: product && product.location ? product.location : "",
      scheduleLabel: (product && product.delivery) || `Updated ${formatDate(product && product.createdAt)}`,
      seatsRemaining,
      capacityLabel: seatsRemaining > 0 ? `${seatsRemaining} seat${seatsRemaining === 1 ? "" : "s"} open` : "Open waitlist",
      programType,
      programTypeLabel: programType.charAt(0).toUpperCase() + programType.slice(1),
      formatLabel,
      durationLabel: readMetaValue(product, ["duration", "length", "pace", "schedule"]) || "Flexible pace",
      levelLabel: readMetaValue(product, ["level", "audience", "difficulty"]) || "",
      isPast: String(product && product.status || "").trim().toLowerCase() === "archived",
      detailPath: getProductPath(product),
    };
  }

  function deriveClassesData(products) {
    const allPrograms = (Array.isArray(products) ? products : [])
      .map(deriveProgram)
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

    return {
      allPrograms,
      upcomingPrograms: allPrograms.filter((program) => !program.isPast),
      pastPrograms: allPrograms.filter((program) => program.isPast),
      availableTypes: [...new Set(allPrograms.map((program) => program.programType))],
      stats: {
        totalPrograms: allPrograms.length,
        livePrograms: allPrograms.filter((program) => program.formatLabel === "Live").length,
        resourcePrograms: allPrograms.filter((program) => program.programType === "resource").length,
      },
    };
  }

  function classesData() {
    const data = state.templateData && state.templateData.classes;
    if (data && Array.isArray(data.allPrograms)) {
      return data;
    }
    return deriveClassesData(state.products);
  }

  function findProduct(productId) {
    return state.products.find((product) => Number(product.id || 0) === Number(productId || 0)) || null;
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
      showToast("This program is not available yet.", "danger");
      return;
    }

    const variant = resolveVariant(product);
    const item = {
      id: Number(product.id || 0),
      variantId: Number((variant && variant.id) || 0),
      quantity: 1,
      name: product.title || product.name || "Program",
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
        source: "classes-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        productId: item.id,
        variantId: item.variantId,
        itemType: "classes",
      });
    }
  }

  function renderHero() {
    if (!state.store) {
      return;
    }

    setCoverBackground();

    if (elements.brandLabel) {
      elements.brandLabel.textContent = state.store.storeName || "Classes Studio";
    }
    if (elements.name) {
      elements.name.textContent = state.store.storeName || "Classes Studio";
    }
    if (elements.guideName) {
      elements.guideName.textContent = state.store.storeName || "Guided learning store";
    }
    if (elements.handle) {
      elements.handle.textContent = state.store.handle ? `@${state.store.handle}` : "@studio";
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
        `<span class="academy-pill"><i class="fa-solid fa-layer-group"></i>${listingCount} program${listingCount === 1 ? "" : "s"}</span>`,
        `<span class="academy-pill"><i class="fa-solid fa-bullhorn"></i>${updateCount} update${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="academy-pill"><i class="fa-solid fa-shield-heart"></i>${escapeHtml(getStatusLabel())}</span>`,
      ].join("");
    }

    syncBodyDataset();
    renderSocials();
  }

  function renderSummary() {
    const data = classesData();
    const stats = data.stats || {};

    if (elements.metricListings) {
      elements.metricListings.textContent = String(stats.totalPrograms || state.products.length || 0);
    }
    if (elements.metricUpdates) {
      elements.metricUpdates.textContent = String(Array.isArray(state.updates) ? state.updates.length : 0);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = getStatusLabel();
    }
    if (elements.guideNote) {
      elements.guideNote.textContent =
        stats.livePrograms > 0
          ? `${stats.livePrograms} live-format program${stats.livePrograms === 1 ? "" : "s"} are active right now, with calmer digital entry points still visible below.`
          : elements.guideNote.textContent;
    }
    if (elements.learningNote) {
      elements.learningNote.textContent =
        stats.resourcePrograms > 0
          ? `${stats.resourcePrograms} resource-style offer${stats.resourcePrograms === 1 ? "" : "s"} help new buyers start with lower-friction support before joining bigger programs.`
          : elements.learningNote.textContent;
    }
  }

  function renderFilters() {
    if (!elements.filterRow) {
      return;
    }

    const filters = ["all"].concat(Array.isArray(classesData().availableTypes) ? classesData().availableTypes : []);
    elements.filterRow.innerHTML = filters
      .map((filter) => {
        const active = state.activeFilter === filter;
        const label = filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1);
        return `<button class="academy-filter${active ? " is-active" : ""}" type="button" data-program-filter="${escapeHtml(
          filter
        )}">${escapeHtml(label)}</button>`;
      })
      .join("");
  }

  function itemActions(item, context = "program") {
    const viewAction = `<a class="academy-program-card__action" href="${escapeHtml(
      item.detailPath || getProductPath(findProduct(item.id))
    )}"><i class="fa-regular fa-eye"></i><span>View listing</span></a>`;

    if (!state.isPublic) {
      return [
        viewAction,
        `<a class="academy-program-card__action academy-program-card__action--accent" href="${escapeHtml(
          document.body.dataset.sellerProductsPath || "/seller/templates/products"
        )}"><i class="fa-solid fa-book-open-reader"></i><span>Manage</span></a>`,
      ]
        .filter(Boolean)
        .join("");
    }

    if (state.canBuy) {
      return [
        viewAction,
        `<button class="academy-program-card__action academy-program-card__action--accent" type="button" data-add-cart="${Number(
          item.id || 0
        )}" data-source="${escapeHtml(context)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`,
      ].join("");
    }

    return [
      viewAction,
      `<a class="academy-program-card__action academy-program-card__action--accent" href="${escapeHtml(
        getSignInPath()
      )}"><i class="fa-solid fa-right-to-bracket"></i><span>Sign in to join</span></a>`,
    ].join("");
  }

  function filteredPrograms() {
    const programs = Array.isArray(classesData().allPrograms) ? classesData().allPrograms.slice() : [];
    const filtered = programs.filter((program) => {
      const matchesFilter = state.activeFilter === "all" || program.programType === state.activeFilter;
      const haystack = buildSearchText(
        program.title,
        program.description,
        program.programType,
        program.formatLabel,
        program.levelLabel,
        program.durationLabel
      );
      const matchesSearch = !state.searchTerm || haystack.includes(state.searchTerm);
      return matchesFilter && matchesSearch;
    });

    filtered.sort((left, right) => {
      if (state.sortOrder === "newest") {
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      }
      if (state.sortOrder === "price-low") {
        return Number(left.price || 0) - Number(right.price || 0);
      }
      if (state.sortOrder === "price-high") {
        return Number(right.price || 0) - Number(left.price || 0);
      }
      if (left.isPast !== right.isPast) {
        return left.isPast ? 1 : -1;
      }
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    });

    return filtered;
  }

  function renderSpotlight() {
    if (!elements.spotlightRail || !elements.spotlightEmpty) {
      return;
    }

    const upcomingPrograms = (classesData().upcomingPrograms || []).slice(0, 3);
    if (!upcomingPrograms.length) {
      elements.spotlightRail.innerHTML = "";
      elements.spotlightEmpty.hidden = false;
      return;
    }

    elements.spotlightEmpty.hidden = true;
    elements.spotlightRail.innerHTML = upcomingPrograms
      .map(
        (program) => `
          <article class="academy-spotlight-card">
            <div class="academy-spotlight-card__meta">
              <span><i class="fa-solid fa-sparkles"></i>${escapeHtml(program.programTypeLabel)}</span>
              <span><i class="fa-regular fa-clock"></i>${escapeHtml(program.formatLabel)}</span>
            </div>
            <div>
              <h3 class="academy-spotlight-card__title">${escapeHtml(program.title)}</h3>
              <p class="academy-program-card__description">${escapeHtml(
                truncate(program.description || "Open this listing to view the full program details.", 150)
              )}</p>
            </div>
            <div class="academy-program-card__support">
              <span class="academy-pill"><i class="fa-solid fa-calendar-day"></i>${escapeHtml(program.scheduleLabel)}</span>
              <span class="academy-pill"><i class="fa-solid fa-user-group"></i>${escapeHtml(program.capacityLabel)}</span>
              <span class="academy-pill"><i class="fa-solid fa-tags"></i>${formatCurrency(program.price)}</span>
            </div>
            <div class="academy-spotlight-card__actions">${itemActions(program, "spotlight")}</div>
          </article>
        `
      )
      .join("");
  }

  function renderPrograms() {
    if (!elements.programGrid || !elements.programEmpty) {
      return;
    }

    renderFilters();

    const programs = filteredPrograms();
    if (!programs.length) {
      elements.programGrid.innerHTML = "";
      elements.programEmpty.hidden = false;
      return;
    }

    elements.programEmpty.hidden = true;
    elements.programGrid.innerHTML = programs
      .map((program) => {
        const mediaStyle = program.imageUrl ? ` style="background-image:url('${escapeHtml(program.imageUrl)}')"` : "";
        const support = [
          `<span><i class="fa-solid fa-calendar-day"></i>${escapeHtml(program.scheduleLabel)}</span>`,
          `<span><i class="fa-regular fa-clock"></i>${escapeHtml(program.durationLabel)}</span>`,
          program.levelLabel ? `<span><i class="fa-solid fa-signal"></i>${escapeHtml(program.levelLabel)}</span>` : "",
        ]
          .filter(Boolean)
          .join("");

        return `
          <article class="academy-program-card">
            <div class="academy-program-card__media"${mediaStyle}></div>
            <div class="academy-program-card__meta">
              <span>${escapeHtml(program.programTypeLabel)}</span>
              <span>${escapeHtml(program.formatLabel)}</span>
              ${program.isPast ? "<span>Past</span>" : `<span>${escapeHtml(program.capacityLabel)}</span>`}
            </div>
            <div>
              <h3 class="academy-program-card__title">${escapeHtml(program.title)}</h3>
              <p class="academy-program-card__description">${escapeHtml(
                truncate(program.description || "Program details are available in the full listing.", 150)
              )}</p>
            </div>
            <div class="academy-program-card__support">${support}</div>
            <div class="academy-program-card__actions">${itemActions(program, "program-grid")}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderResources() {
    if (!elements.resourceGrid || !elements.resourceEmpty) {
      return;
    }

    const resources = (classesData().allPrograms || []).filter((program) => program.programType === "resource").slice(0, 4);
    if (!resources.length) {
      elements.resourceGrid.innerHTML = "";
      elements.resourceEmpty.hidden = false;
      return;
    }

    elements.resourceEmpty.hidden = true;
    elements.resourceGrid.innerHTML = resources
      .map((program) => {
        const mediaStyle = program.imageUrl ? ` style="background-image:url('${escapeHtml(program.imageUrl)}')"` : "";
        return `
          <article class="academy-resource-card">
            <div class="academy-resource-card__media academy-program-card__media"${mediaStyle}></div>
            <div class="academy-program-card__meta">
              <span>${escapeHtml(program.programTypeLabel)}</span>
              <span>${escapeHtml(program.formatLabel)}</span>
            </div>
            <div>
              <h3 class="academy-resource-card__title">${escapeHtml(program.title)}</h3>
              <p class="academy-program-card__description">${escapeHtml(
                truncate(program.description || "A lower-friction teaching support offer.", 140)
              )}</p>
            </div>
            <div class="academy-program-card__actions">${itemActions(program, "resource-grid")}</div>
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
              `<a class="academy-update-card__action" href="${escapeHtml(
                getProductPath(linkedProduct)
              )}"><i class="fa-regular fa-eye"></i><span>View listing</span></a>`,
              state.canBuy
                ? `<button class="academy-update-card__action academy-update-card__action--accent" type="button" data-add-cart="${Number(
                    linkedProduct.id || 0
                  )}" data-source="classes-update"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`
                : "",
            ]
              .filter(Boolean)
              .join("")
          : "";

        return `
          <article class="academy-update-card">
            <div class="academy-update-card__meta">
              <span><i class="fa-solid fa-bookmark"></i>${escapeHtml(tone)}</span>
              <span><i class="fa-regular fa-clock"></i>${escapeHtml(formatDate(item.createdAt))}</span>
            </div>
            ${item.title ? `<h3 class="academy-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
            <p class="academy-update-card__body">${escapeHtml(item.description || "New update from this studio.")}</p>
            ${actions ? `<div class="academy-update-card__actions">${actions}</div>` : ""}
          </article>
        `;
      })
      .join("");
  }

  function shareStore() {
    const shareUrl = `${window.location.origin}${getStorePath()}`;
    const sharePayload = {
      title: state.store && state.store.storeName ? state.store.storeName : "Classes store",
      text: state.store && state.store.tagline ? state.store.tagline : "Check out this teaching storefront on Zest.",
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

    showToast(result && result.following ? "Studio followed." : "Studio unfollowed.");
  }

  function toggleFaq(event) {
    const button = event.target.closest(".academy-faq__question");
    if (!button) {
      return;
    }

    const item = button.closest(".academy-faq__item");
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
        renderPrograms();
      });
    }

    if (elements.sort) {
      elements.sort.addEventListener("change", (event) => {
        state.sortOrder = String(event.target.value || "featured");
        renderPrograms();
      });
    }

    if (elements.filterRow) {
      elements.filterRow.addEventListener("click", (event) => {
        const button = event.target.closest("[data-program-filter]");
        if (!button) {
          return;
        }

        state.activeFilter = String(button.getAttribute("data-program-filter") || "all");
        renderPrograms();
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

    document.addEventListener("click", (event) => {
      const addToCart = event.target.closest("[data-add-cart]");
      if (addToCart) {
        addProductToCart(addToCart.getAttribute("data-add-cart"));
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
      showToast("Unable to load this classes storefront right now.", "danger");
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
    renderSpotlight();
    renderPrograms();
    renderResources();
    renderUpdates();
    await syncFollowButton();

    if (state.isPublic && window.ZestBuyerInteractions && typeof window.ZestBuyerInteractions.track === "function") {
      window.ZestBuyerInteractions.track({
        action: "view_store",
        source: "classes-storefront",
        storeHandle: state.store && state.store.handle ? state.store.handle : "",
        templateKey: "classes",
        itemType: "classes",
      });
    }
  }

  bindEvents();
  loadStorefront().catch(() => {
    showToast("Unable to load this classes storefront right now.", "danger");
  });
})();
