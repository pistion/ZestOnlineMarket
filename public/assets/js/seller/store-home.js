const state = {
  stalls: [],
  filtered: [],
  query: "",
  filter: "all",
  activeInfoHandle: "",
  activeReportHandle: "",
  bound: false,
};

const elements = {
  search: document.querySelector("#marketplaceSearch"),
  template: document.querySelector("#marketplaceTemplate"),
  quickFilters: document.querySelectorAll("[data-market-filter-chip]"),
  statusSummary: document.querySelector("#marketplaceStatusSummary"),
  followSummary: document.querySelector("#marketplaceFollowSummary"),
  featured: document.querySelector("#marketplaceFeatured"),
  grid: document.querySelector("#marketplaceGrid"),
  results: document.querySelector("#marketplaceResults"),
  loading: document.querySelector("#marketplaceLoading"),
  error: document.querySelector("#marketplaceError"),
  errorText: document.querySelector("#marketplaceErrorText"),
  retry: document.querySelector("#marketplaceRetry"),
  totalCount: document.querySelector("#marketplaceTotalCount"),
  liveCount: document.querySelector("#marketplaceLiveCount"),
  demoCount: document.querySelector("#marketplaceDemoCount"),
  followedCount: document.querySelector("#marketplaceFollowedCount"),
  empty: document.querySelector("#marketplaceEmpty"),
  emptyTitle: document.querySelector("#marketplaceEmptyTitle"),
  emptyText: document.querySelector("#marketplaceEmptyText"),
  reset: document.querySelector("#marketplaceReset"),
  toast: document.querySelector(".toast"),
  infoBackdrop: document.querySelector("#marketplaceInfoBackdrop"),
  infoSheet: document.querySelector("#marketplaceInfoSheet"),
  infoClose: document.querySelector("#marketplaceInfoClose"),
  infoCover: document.querySelector("#marketplaceInfoCover"),
  infoBadge: document.querySelector("#marketplaceInfoBadge"),
  infoHandle: document.querySelector("#marketplaceInfoHandle"),
  infoTitle: document.querySelector("#marketplaceInfoTitle"),
  infoTagline: document.querySelector("#marketplaceInfoTagline"),
  infoFollowers: document.querySelector("#marketplaceInfoFollowers"),
  infoListings: document.querySelector("#marketplaceInfoListings"),
  infoSales: document.querySelector("#marketplaceInfoSales"),
  infoTemplate: document.querySelector("#marketplaceInfoTemplate"),
  infoLocation: document.querySelector("#marketplaceInfoLocation"),
  infoCopy: document.querySelector("#marketplaceInfoCopy"),
  infoFeatured: document.querySelector("#marketplaceInfoFeatured"),
  infoFeaturedTitle: document.querySelector("#marketplaceInfoFeaturedTitle"),
  infoFeaturedDescription: document.querySelector("#marketplaceInfoFeaturedDescription"),
  infoFeaturedPrice: document.querySelector("#marketplaceInfoFeaturedPrice"),
  infoVisit: document.querySelector("#marketplaceInfoVisit"),
  infoShare: document.querySelector("#marketplaceInfoShare"),
  reportBackdrop: document.querySelector("#marketplaceReportBackdrop"),
  reportModal: document.querySelector("#marketplaceReportModal"),
  reportClose: document.querySelector("#marketplaceReportClose"),
  reportCancel: document.querySelector("#marketplaceReportCancel"),
  reportForm: document.querySelector("#marketplaceReportForm"),
  reportStoreName: document.querySelector("#marketplaceReportStoreName"),
  reportHandle: document.querySelector("#marketplaceReportHandle"),
  reportReason: document.querySelector("#marketplaceReportReason"),
  reportDetails: document.querySelector("#marketplaceReportDetails"),
  reportSubmit: document.querySelector("#marketplaceReportSubmit"),
};

let toastTimer = null;

function setLoadingState(isLoading) {
  if (elements.loading) {
    elements.loading.hidden = !isLoading;
  }

  if (elements.grid) {
    elements.grid.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  if (elements.featured) {
    elements.featured.setAttribute("aria-busy", isLoading ? "true" : "false");
  }
}

function clearMarketplaceError() {
  if (elements.error) {
    elements.error.hidden = true;
  }
}

function showMarketplaceError(message) {
  if (elements.errorText) {
    elements.errorText.textContent = message || "Try again in a moment or reopen the marketplace.";
  }

  if (elements.error) {
    elements.error.hidden = false;
  }
}

function followingApi() {
  return window.ZestStoreFollowing || null;
}

function buyerInteractionApi() {
  return window.ZestBuyerInteractions || null;
}

function listFollowedHandles() {
  const api = followingApi();
  return api ? api.list() : [];
}

function isFollowing(handle) {
  const api = followingApi();
  return api ? api.isFollowing(handle) : false;
}

function trackBuyerSignal(payload, options = {}) {
  const api = buyerInteractionApi();
  if (!api || typeof api.track !== "function") {
    return;
  }

  api.track(payload, options);
}

function showToast(message) {
  if (!elements.toast) {
    return;
  }

  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function formatCurrency(value) {
  return `K${Number(value || 0).toFixed(2)}`;
}

function formatCount(value) {
  const number = Number(value || 0);
  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  }
  return String(number);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeHandle(value) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

function getItemType(templateKey) {
  const normalized = String(templateKey || "products").trim().toLowerCase();
  return normalized === "products" ? "product" : normalized;
}

function getStorePath(handle) {
  return `/stores/${encodeURIComponent(handle)}`;
}

function normalizeStall(raw) {
  const featuredProduct = raw.featuredProduct || null;
  const followerCount = Number(raw.followerCount || (raw.metrics && raw.metrics.followers) || 0) || 0;
  const productCount = Number(raw.productCount || (raw.metrics && raw.metrics.listings) || 0) || 0;
  const salesCount = Number(raw.salesCount || (raw.metrics && raw.metrics.sales) || 0) || 0;
  return {
    storeId: Number(raw.storeId || raw.id || 0) || 0,
    handle: normalizeHandle(raw.handle),
    storeName: String(raw.storeName || "").trim() || "Zest Store",
    templateKey: String(raw.templateKey || "products").trim() || "products",
    tagline: String(raw.tagline || "").trim(),
    teaser: String(raw.teaser || "").trim(),
    location: String(raw.location || "").trim(),
    thumbnailUrl: String(raw.thumbnailUrl || "").trim(),
    coverUrl: String(raw.coverUrl || "").trim(),
    featuredProduct: featuredProduct
      ? {
          id: Number(featuredProduct.id) || 0,
          name: String(featuredProduct.name || featuredProduct.title || "").trim() || "Featured product",
          description: String(featuredProduct.description || "").trim(),
          price: Number(featuredProduct.price || 0),
          location: String(featuredProduct.location || raw.location || "").trim(),
        }
      : null,
    followerCount,
    productCount,
    salesCount,
    isDemo: Boolean(raw.isDemo),
    isEditable: Boolean(raw.isEditable),
  };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.success === false) {
    const error = new Error((payload && payload.message) || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function fetchStalls() {
  const payload = await fetchJson("/api/marketplace/stalls");
  return (payload.stalls || []).map(normalizeStall);
}

function updateCounts() {
  const liveCount = state.stalls.filter((stall) => !stall.isDemo).length;
  const demoCount = state.stalls.filter((stall) => stall.isDemo).length;
  const followedCount = listFollowedHandles().length;

  if (elements.totalCount) {
    elements.totalCount.textContent = String(state.stalls.length);
  }
  if (elements.liveCount) {
    elements.liveCount.textContent = String(liveCount);
  }
  if (elements.demoCount) {
    elements.demoCount.textContent = String(demoCount);
  }
  if (elements.followedCount) {
    elements.followedCount.textContent = String(followedCount);
  }
  if (elements.followSummary) {
    elements.followSummary.textContent = `${followedCount} followed store${followedCount === 1 ? "" : "s"} ready for your feed.`;
  }
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const followedHandles = listFollowedHandles();

  state.filtered = state.stalls.filter((stall) => {
    if (state.filter === "following" && !followedHandles.includes(stall.handle)) {
      return false;
    }

    if (state.filter === "live" && stall.isDemo) {
      return false;
    }

    if (state.filter === "demo" && !stall.isDemo) {
      return false;
    }

    if (state.filter !== "all" && state.filter !== "live" && state.filter !== "demo") {
      if (stall.templateKey !== state.filter) {
        return false;
      }
    }

    if (!query) {
      return true;
    }

    const haystack = [
      stall.storeName,
      stall.handle,
      stall.tagline,
      stall.teaser,
      stall.location,
      stall.templateKey,
      stall.featuredProduct && stall.featuredProduct.name,
      stall.featuredProduct && stall.featuredProduct.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function sortFeaturedStalls(stalls) {
  return [...stalls].sort((left, right) => {
    const leftScore = (left.followerCount || 0) * 4 + (left.salesCount || 0) * 3 + (left.productCount || 0);
    const rightScore = (right.followerCount || 0) * 4 + (right.salesCount || 0) * 3 + (right.productCount || 0);

    if (left.isDemo !== right.isDemo) {
      return left.isDemo ? 1 : -1;
    }

    return rightScore - leftScore;
  });
}

function createBadgeMarkup(stall) {
  const badgeLabel = stall.isDemo ? "Demo showcase" : "Live store";
  const modifier = stall.isDemo ? " market-stall__badge--demo" : "";
  return `<span class="market-stall__badge${modifier}">${escapeHtml(badgeLabel)}</span>`;
}

function createMetricStripMarkup(stall, compact = false) {
  const className = compact ? "market-stall__metrics market-stall__metrics--compact" : "market-stall__metrics";
  return `
    <div class="${className}">
      <span><i class="fa-solid fa-user-group"></i>${escapeHtml(formatCount(stall.followerCount))} followers</span>
      <span><i class="fa-solid fa-box-open"></i>${escapeHtml(formatCount(stall.productCount))} listings</span>
      <span><i class="fa-solid fa-chart-line"></i>${escapeHtml(formatCount(stall.salesCount))} sales</span>
    </div>
  `;
}

function createActionMenuMarkup(stall, menuId) {
  return `
    <div class="market-stall__menu-wrap">
      <button
        class="market-stall__menu-toggle"
        type="button"
        aria-label="More store actions"
        aria-expanded="false"
        data-menu-toggle="${escapeHtml(menuId)}"
      >
        <i class="fa-solid fa-ellipsis"></i>
      </button>
      <div class="market-action-menu" data-menu="${escapeHtml(menuId)}" hidden>
        <button class="market-action-menu__item" type="button" data-share-handle="${escapeHtml(stall.handle)}">
          <i class="fa-solid fa-share-nodes"></i><span>Share</span>
        </button>
        <button class="market-action-menu__item" type="button" data-report-handle="${escapeHtml(stall.handle)}">
          <i class="fa-solid fa-flag"></i><span>Report store</span>
        </button>
        <button class="market-action-menu__item" type="button" data-info-handle="${escapeHtml(stall.handle)}">
          <i class="fa-solid fa-circle-info"></i><span>Store info</span>
        </button>
      </div>
    </div>
  `;
}

function createFollowButtonMarkup(stall) {
  if (stall.isDemo) {
    return `
      <button
        class="market-stall__follow is-disabled"
        type="button"
        disabled
        aria-disabled="true"
        title="Demo showcase stores stay in the marketplace only"
      >
        Demo only
      </button>
    `;
  }

  return `
    <button
      class="market-stall__follow${isFollowing(stall.handle) ? " is-following" : ""}"
      type="button"
      data-follow-handle="${escapeHtml(stall.handle)}"
      aria-pressed="${isFollowing(stall.handle) ? "true" : "false"}"
    >
      ${isFollowing(stall.handle) ? "Following" : "Follow"}
    </button>
  `;
}

function createFeaturedCard(stall) {
  const column = document.createElement("div");
  column.className = "col-lg-4 col-md-6";
  const menuId = `featured-${stall.handle}`;

  const coverStyle = stall.coverUrl
    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.42)), url('${stall.coverUrl.replace(/'/g, "\\'")}') center/cover`
    : "";
  const teaser =
    stall.featuredProduct && stall.featuredProduct.description
      ? stall.featuredProduct.description
      : stall.teaser || stall.tagline || "Browse this storefront";

  column.innerHTML = `
    <article class="market-feature-card h-100">
      <div class="market-feature-card__cover"${coverStyle ? ` style="background:${coverStyle};"` : ""}>
        ${createBadgeMarkup(stall)}
        <span class="market-feature-card__handle">@${escapeHtml(stall.handle)}</span>
      </div>
      <div class="market-feature-card__body">
        <div class="market-feature-card__top">
          <div>
            <h3>${escapeHtml(stall.storeName)}</h3>
            <p>${escapeHtml(teaser)}</p>
          </div>
          ${createActionMenuMarkup(stall, menuId)}
        </div>
        <div class="market-feature-card__meta">
          <span class="market-chip"><i class="fa-solid fa-location-dot"></i>${escapeHtml(stall.location || "PNG")}</span>
          <span class="market-chip"><i class="fa-solid fa-layer-group"></i>${escapeHtml(stall.templateKey)}</span>
        </div>
        ${createMetricStripMarkup(stall, true)}
        <div class="market-feature-card__actions">
          ${createFollowButtonMarkup(stall)}
          <a class="market-stall__action" href="${getStorePath(stall.handle)}" data-open-store="${escapeHtml(stall.handle)}">Visit stall</a>
        </div>
      </div>
    </article>
  `;

  return column;
}

function createStallCard(stall) {
  const column = document.createElement("div");
  column.className = "col-xl-4 col-md-6";
  const menuId = `grid-${stall.handle}`;

  const coverStyle = stall.coverUrl
    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.46)), url('${stall.coverUrl.replace(/'/g, "\\'")}') center/cover`
    : "";
  const featuredDescription =
    stall.featuredProduct && stall.featuredProduct.description
      ? stall.featuredProduct.description
      : stall.teaser || stall.tagline || "Visit this stall to browse the storefront.";
  const featuredPrice = stall.featuredProduct ? formatCurrency(stall.featuredProduct.price) : "";

  column.innerHTML = `
    <article class="market-stall-card h-100">
      <div class="market-stall__cover"${coverStyle ? ` style="background:${coverStyle};"` : ""}>
        ${createBadgeMarkup(stall)}
        <span class="market-stall__handle">@${escapeHtml(stall.handle)}</span>
      </div>
      <div class="market-stall__body">
        <div class="market-stall__top">
          <div>
            <h3 class="market-stall__title">${escapeHtml(stall.storeName)}</h3>
            <p class="market-stall__teaser">${escapeHtml(stall.tagline || stall.teaser || "Storefront ready for buyers.")}</p>
          </div>
          ${createActionMenuMarkup(stall, menuId)}
        </div>

        <div class="market-stall__meta">
          <span class="market-chip"><i class="fa-solid fa-location-dot"></i>${escapeHtml(stall.location || "PNG")}</span>
          <span class="market-chip"><i class="fa-solid fa-shop"></i>${escapeHtml(stall.templateKey)}</span>
        </div>

        ${createMetricStripMarkup(stall)}

        <div class="market-stall__featured">
          <strong>${escapeHtml(
            (stall.featuredProduct && stall.featuredProduct.name) || "Store overview"
          )}</strong>
          <span>${escapeHtml(featuredDescription)}</span>
          ${featuredPrice ? `<span class="market-stall__price">${escapeHtml(featuredPrice)}</span>` : ""}
        </div>

        <div class="market-stall__actions">
          ${createFollowButtonMarkup(stall)}
          <a class="market-stall__action" href="${getStorePath(stall.handle)}" data-open-store="${escapeHtml(stall.handle)}">Visit stall</a>
        </div>
      </div>
    </article>
  `;

  return column;
}

function renderFeatured() {
  if (!elements.featured) {
    return;
  }

  elements.featured.innerHTML = "";
  sortFeaturedStalls(state.stalls)
    .slice(0, 3)
    .forEach((stall) => {
      elements.featured.appendChild(createFeaturedCard(stall));
    });
}

function renderGrid() {
  if (!elements.grid) {
    return;
  }

  applyFilters();
  syncQuickFilterButtons();
  updateMarketplaceSummary();
  updateEmptyStateCopy();
  elements.grid.innerHTML = "";
  state.filtered.forEach((stall) => {
    elements.grid.appendChild(createStallCard(stall));
  });

  if (elements.results) {
    elements.results.textContent = `${state.filtered.length} store${state.filtered.length === 1 ? "" : "s"}`;
  }

  if (elements.empty) {
    elements.empty.hidden = state.filtered.length > 0;
  }
}

function syncQuickFilterButtons() {
  elements.quickFilters.forEach((button) => {
    const filterValue = button.getAttribute("data-market-filter-chip");
    button.classList.toggle("is-active", filterValue === state.filter);
    button.setAttribute("aria-pressed", filterValue === state.filter ? "true" : "false");
  });
}

function getActiveFilterLabel() {
  if (state.filter === "all") {
    return "all stalls";
  }
  if (state.filter === "live") {
    return "live seller stores";
  }
  if (state.filter === "following") {
    return "followed stores";
  }
  if (state.filter === "demo") {
    return "demo showcase stalls";
  }

  return `${state.filter} stores`;
}

function updateMarketplaceSummary() {
  if (!elements.statusSummary) {
    return;
  }

  const query = state.query.trim();
  const filterLabel = getActiveFilterLabel();
  const resultCount = state.filtered.length;
  let message = `Showing ${resultCount} ${filterLabel}.`;

  if (query) {
    message = `Showing ${resultCount} ${filterLabel} for "${query}".`;
  }

  elements.statusSummary.textContent = message;
}

function updateEmptyStateCopy() {
  if (!elements.emptyTitle || !elements.emptyText) {
    return;
  }

  if (state.filter === "following" && !listFollowedHandles().length) {
    elements.emptyTitle.textContent = "Follow stores to build this view.";
    elements.emptyText.textContent = "Once you follow a few stalls, this marketplace filter will show only the stores you care about most.";
    return;
  }

  if (state.query.trim()) {
    elements.emptyTitle.textContent = "No stores match this search yet.";
    elements.emptyText.textContent = "Try a shorter keyword, switch the store type, or reset the filters to reopen the full marketplace.";
    return;
  }

  elements.emptyTitle.textContent = "No stores match this filter yet.";
  elements.emptyText.textContent = "Try a broader search, switch the store type, or clear the filter to see the full marketplace again.";
}

function syncFollowButtons(root = document) {
  root.querySelectorAll("[data-follow-handle]").forEach((button) => {
    if (button.disabled) {
      return;
    }

    const handle = button.getAttribute("data-follow-handle");
    const following = isFollowing(handle);
    button.classList.toggle("is-following", following);
    button.textContent = following ? "Following" : "Follow";
    button.setAttribute("aria-pressed", following ? "true" : "false");
  });
}

function resetFilters() {
  state.query = "";
  state.filter = "all";

  if (elements.search) {
    elements.search.value = "";
  }
  if (elements.template) {
    elements.template.value = "all";
  }

  renderGrid();
}

function closeAllMenus() {
  document.querySelectorAll("[data-menu]").forEach((menu) => {
    menu.hidden = true;
  });

  document.querySelectorAll("[data-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleMenu(handle) {
  const normalized = normalizeHandle(handle);
  const menu = document.querySelector(`[data-menu="${CSS.escape(normalized)}"]`);
  const toggle = document.querySelector(`[data-menu-toggle="${CSS.escape(normalized)}"]`);
  if (!menu || !toggle) {
    return;
  }

  const shouldOpen = menu.hidden;
  closeAllMenus();
  menu.hidden = !shouldOpen;
  toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

function findStall(handle) {
  return state.stalls.find((stall) => stall.handle === normalizeHandle(handle)) || null;
}

function openInfoSheet(stall) {
  if (!stall || !elements.infoSheet || !elements.infoBackdrop) {
    return;
  }

  state.activeInfoHandle = stall.handle;
  const coverStyle = stall.coverUrl
    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.14), rgba(15, 23, 42, 0.58)), url('${stall.coverUrl.replace(/'/g, "\\'")}') center/cover`
    : "";

  elements.infoCover.style.background = coverStyle || "";
  elements.infoBadge.textContent = stall.isDemo ? "Demo showcase" : "Live store";
  elements.infoBadge.classList.toggle("market-stall__badge--demo", stall.isDemo);
  elements.infoHandle.textContent = `@${stall.handle}`;
  elements.infoTitle.textContent = stall.storeName;
  elements.infoTagline.textContent = stall.tagline || "Storefront ready for buyers.";
  elements.infoFollowers.textContent = formatCount(stall.followerCount);
  elements.infoListings.textContent = formatCount(stall.productCount);
  elements.infoSales.textContent = formatCount(stall.salesCount);
  elements.infoTemplate.innerHTML = `<i class="fa-solid fa-shop"></i>${escapeHtml(stall.templateKey)}`;
  elements.infoLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i>${escapeHtml(stall.location || "PNG")}`;
  elements.infoCopy.textContent =
    stall.teaser || stall.tagline || "Visit this store to browse the full storefront.";
  elements.infoVisit.href = getStorePath(stall.handle);

  if (stall.featuredProduct) {
    elements.infoFeatured.hidden = false;
    elements.infoFeaturedTitle.textContent = stall.featuredProduct.name;
    elements.infoFeaturedDescription.textContent =
      stall.featuredProduct.description || "Featured listing available from this store.";
    elements.infoFeaturedPrice.textContent = formatCurrency(stall.featuredProduct.price);
  } else {
    elements.infoFeatured.hidden = true;
  }

  elements.infoBackdrop.hidden = false;
  elements.infoSheet.setAttribute("aria-hidden", "false");
  elements.infoSheet.classList.add("is-open");

  trackBuyerSignal(
    {
      action: "view_store",
      source: "marketplace-info",
      storeHandle: stall.handle,
      templateKey: stall.templateKey,
      itemType: getItemType(stall.templateKey),
    },
    { preferBeacon: true }
  );
}

function closeInfoSheet() {
  if (!elements.infoSheet || !elements.infoBackdrop) {
    return;
  }

  state.activeInfoHandle = "";
  elements.infoBackdrop.hidden = true;
  elements.infoSheet.setAttribute("aria-hidden", "true");
  elements.infoSheet.classList.remove("is-open");
}

async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function shareStore(handle) {
  const stall = findStall(handle);
  if (!stall) {
    return;
  }

  try {
    const shareUrl = new URL(getStorePath(stall.handle), window.location.origin).toString();
    await copyText(shareUrl);
    trackBuyerSignal({
      action: "share_post",
      source: "marketplace-share",
      storeHandle: stall.handle,
      templateKey: stall.templateKey,
      itemType: getItemType(stall.templateKey),
    });
    showToast("Store link copied.");
  } catch (error) {
    showToast("Unable to copy store link.");
  }
}

function reportStore(handle) {
  const stall = findStall(handle);
  if (!stall) {
    return;
  }

  if (stall.isDemo || !stall.storeId) {
    showToast("Demo stalls cannot be reported from the live moderation flow.");
    return;
  }

  state.activeReportHandle = stall.handle;
  if (elements.reportStoreName) {
    elements.reportStoreName.textContent = stall.storeName;
  }
  if (elements.reportHandle) {
    elements.reportHandle.textContent = `@${stall.handle}`;
  }
  if (elements.reportForm) {
    elements.reportForm.reset();
  }
  if (elements.reportReason) {
    elements.reportReason.value = "spam";
  }
  if (elements.reportDetails) {
    elements.reportDetails.value = "";
  }
  if (elements.reportBackdrop) {
    elements.reportBackdrop.hidden = false;
  }
  if (elements.reportModal) {
    elements.reportModal.hidden = false;
    elements.reportModal.classList.add("is-open");
    elements.reportModal.setAttribute("aria-hidden", "false");
  }
  elements.reportReason?.focus();
}

function closeReportModal() {
  state.activeReportHandle = "";
  if (elements.reportBackdrop) {
    elements.reportBackdrop.hidden = true;
  }
  if (elements.reportModal) {
    elements.reportModal.hidden = true;
    elements.reportModal.classList.remove("is-open");
    elements.reportModal.setAttribute("aria-hidden", "true");
  }
  if (elements.reportSubmit) {
    elements.reportSubmit.disabled = false;
    elements.reportSubmit.textContent = "Submit report";
  }
}

function redirectToSignIn() {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/auth/signin?returnTo=${encodeURIComponent(returnTo)}`;
}

async function submitStoreReport(event) {
  event.preventDefault();

  const stall = findStall(state.activeReportHandle);
  if (!stall || stall.isDemo || !stall.storeId) {
    closeReportModal();
    return;
  }

  const submitButton = elements.reportSubmit;
  const originalLabel = submitButton ? submitButton.textContent : "";

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    await fetchJson("/api/engagement/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetType: "store",
        targetId: stall.storeId,
        reason: elements.reportReason ? elements.reportReason.value : "other",
        details: elements.reportDetails ? elements.reportDetails.value.trim() : "",
        metadata: {
          source: "marketplace-report-modal",
          storeHandle: stall.handle,
          storeName: stall.storeName,
        },
      }),
    });

    closeReportModal();
    showToast("Store report submitted.");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      redirectToSignIn();
      return;
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel || "Submit report";
    }
    showToast(error.message || "Unable to submit the report.");
  }
}

function bindEvents() {
  if (state.bound) {
    return;
  }
  state.bound = true;

  elements.search?.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    renderGrid();
  });

  elements.template?.addEventListener("change", (event) => {
    state.filter = event.target.value || "all";
    renderGrid();
  });

  elements.reset?.addEventListener("click", resetFilters);
  elements.retry?.addEventListener("click", async () => {
    await init();
  });
  elements.infoClose?.addEventListener("click", closeInfoSheet);
  elements.infoBackdrop?.addEventListener("click", closeInfoSheet);
  elements.reportClose?.addEventListener("click", closeReportModal);
  elements.reportCancel?.addEventListener("click", closeReportModal);
  elements.reportBackdrop?.addEventListener("click", closeReportModal);
  elements.reportForm?.addEventListener("submit", submitStoreReport);
  elements.infoShare?.addEventListener("click", async () => {
    if (state.activeInfoHandle) {
      await shareStore(state.activeInfoHandle);
    }
  });

  elements.quickFilters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.getAttribute("data-market-filter-chip") || "all";
      if (elements.template) {
        elements.template.value = ["all", "live", "demo"].includes(state.filter) ? state.filter : "all";
      }
      renderGrid();
    });
  });

  document.addEventListener("click", async (event) => {
    const menuToggle = event.target.closest("[data-menu-toggle]");
    if (menuToggle) {
      event.preventDefault();
      toggleMenu(menuToggle.getAttribute("data-menu-toggle"));
      return;
    }

    const shareButton = event.target.closest("[data-share-handle]");
    if (shareButton) {
      event.preventDefault();
      closeAllMenus();
      await shareStore(shareButton.getAttribute("data-share-handle"));
      return;
    }

    const reportButton = event.target.closest("[data-report-handle]");
    if (reportButton) {
      event.preventDefault();
      closeAllMenus();
      reportStore(reportButton.getAttribute("data-report-handle"));
      return;
    }

    const infoButton = event.target.closest("[data-info-handle]");
    if (infoButton) {
      event.preventDefault();
      closeAllMenus();
      openInfoSheet(findStall(infoButton.getAttribute("data-info-handle")));
      return;
    }

    const followButton = event.target.closest("[data-follow-handle]");
    if (followButton) {
      const handle = followButton.getAttribute("data-follow-handle");
      const api = followingApi();
      if (!api || !handle) {
        return;
      }

      const result = await api.toggle(handle);
      if (result && result.error) {
        showToast(result.error);
        return;
      }

      syncFollowButtons();
      updateCounts();
      showToast(result.following ? "Store followed." : "Store unfollowed.");
      return;
    }

    if (!event.target.closest(".market-stall__menu-wrap")) {
      closeAllMenus();
    }
  });

  document.addEventListener("click", (event) => {
    const visitLink = event.target.closest("[data-open-store]");
    if (!visitLink) {
      return;
    }

    const stall = findStall(visitLink.getAttribute("data-open-store"));
    if (!stall) {
      return;
    }

    closeAllMenus();
    trackBuyerSignal(
      {
        action: "open_store",
        source: "marketplace-card",
        storeHandle: stall.handle,
        templateKey: stall.templateKey,
        itemType: getItemType(stall.templateKey),
      },
      { preferBeacon: true }
    );
  });

  window.addEventListener("zest:followed-stores-changed", () => {
    syncFollowButtons();
    updateCounts();
    renderGrid();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMenus();
      closeInfoSheet();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.reportModal?.classList.contains("is-open")) {
      closeReportModal();
    }
  });
}

async function init() {
  setLoadingState(true);
  clearMarketplaceError();
  bindEvents();
  const api = followingApi();
  if (api && typeof api.init === "function") {
    await api.init();
  }

  try {
    state.stalls = await fetchStalls();
    updateCounts();
    renderFeatured();
    renderGrid();
    setLoadingState(false);
  } catch (error) {
    setLoadingState(false);
    showMarketplaceError(error.message || "Unable to load marketplace.");
    showToast(error.message || "Unable to load marketplace.");
    if (elements.empty) {
      elements.empty.hidden = false;
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
