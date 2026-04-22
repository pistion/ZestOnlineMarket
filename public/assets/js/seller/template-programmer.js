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
  };

  state.canBuy = state.isPublic && state.viewerRole === "buyer";

  const endpoints = {
    store: String(document.body.dataset.storeApiEndpoint || "").trim(),
    feed: String(document.body.dataset.storeFeedEndpoint || "").trim(),
  };

  const elements = {
    brand: document.querySelector("#forgeStoreBrand"),
    brandLabel: document.querySelector("#forgeStoreBrandLabel"),
    avatar: document.querySelector("#forgeStoreAvatar"),
    name: document.querySelector("#forgeStoreName"),
    handle: document.querySelector("#forgeStoreHandle"),
    tagline: document.querySelector("#forgeStoreTagline"),
    about: document.querySelector("#forgeStoreAbout"),
    meta: document.querySelector("#forgeStoreMeta"),
    socials: document.querySelector("#forgeStoreSocials"),
    filterRow: document.querySelector("#forgeFilterRow"),
    packageGrid: document.querySelector("#forgePackageGrid"),
    packageEmpty: document.querySelector("#forgePackageEmpty"),
    offerGrid: document.querySelector("#forgeOfferGrid"),
    offerEmpty: document.querySelector("#forgeOfferEmpty"),
    updatesList: document.querySelector("#forgeUpdatesList"),
    updatesEmpty: document.querySelector("#forgeUpdatesEmpty"),
    metricOffers: document.querySelector("#forgeMetricOffers"),
    metricPackages: document.querySelector("#forgeMetricPackages"),
    metricStatus: document.querySelector("#forgeMetricStatus"),
    metricStack: document.querySelector("#forgeMetricStack"),
    stackCloud: document.querySelector("#forgeStackCloud"),
    quoteForm: document.querySelector("#forgeQuoteForm"),
    quoteOffer: document.querySelector("#forgeQuoteOffer"),
    quoteScope: document.querySelector("#forgeQuoteScope"),
    quoteTimeline: document.querySelector("#forgeQuoteTimeline"),
    quoteHint: document.querySelector("#forgeQuoteHint"),
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
    followBtn: document.querySelector("#forgeFollowBtn"),
    shareBtn: document.querySelector("#forgeShareBtn"),
    previewBtn: document.querySelector("#forgePreviewStoreBtn"),
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message, tone = "info") {
    if (window.ZestToast && typeof window.ZestToast[tone] === "function") {
      window.ZestToast[tone](message);
      return;
    }
    window.alert(message);
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
      .join("") || "D";
  }

  function inferType(product) {
    const haystack = `${product && product.title || ""} ${product && product.description || ""} ${product && product.delivery || ""}`.toLowerCase();
    if (/\b(retainer|monthly|ongoing|fractional)\b/.test(haystack)) {
      return "retainer";
    }
    if (/\b(audit|review|diagnostic|refactor)\b/.test(haystack)) {
      return "audit";
    }
    if (/\b(support|maintenance|bug fix|handoff)\b/.test(haystack)) {
      return "support";
    }
    if (/\b(package|tier|starter|growth|premium)\b/.test(haystack)) {
      return "package";
    }
    return "project";
  }

  function deriveTags(product) {
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    for (const variant of variants) {
      const attrs = variant && typeof variant.attributes === "object" ? variant.attributes : {};
      const stack = attrs.stack || attrs.tech || attrs.framework || attrs.technology;
      if (stack && String(stack).trim()) {
        return String(stack)
          .split(/[,/]| and /i)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 6);
      }
    }

    const text = `${product && product.title || ""} ${product && product.description || ""}`.toLowerCase();
    return ["React", "Node.js", "PostgreSQL", "TypeScript", "Express", "Next.js", "API"].filter((tag) => text.includes(tag.toLowerCase())).slice(0, 6);
  }

  function mapOffer(product, index) {
    const type = inferType(product);
    const variants = Array.isArray(product && product.variants) ? product.variants : [];
    const packageVariants = variants.length
      ? variants.map((variant) => ({
          label: variant.label || "Tier",
          price: Number(variant.priceOverride != null ? variant.priceOverride : product.price || 0),
        }))
      : [
          {
            label: ["Starter", "Growth", "Flagship"][index] || "Base package",
            price: Number(product && product.price) || 0,
          },
        ];

    return {
      id: Number(product && product.id) || 0,
      title: product && (product.title || product.name) ? product.title || product.name : "Developer offer",
      description: product && product.description ? product.description : "",
      price: Number(product && product.price) || 0,
      createdAt: product && product.createdAt ? product.createdAt : null,
      createdLabel: formatDate(product && product.createdAt),
      type,
      typeLabel: type.charAt(0).toUpperCase() + type.slice(1),
      deliveryLabel: product && product.delivery ? product.delivery : "Remote delivery",
      location: product && product.location ? product.location : "",
      scopeLabel: variants[0] && variants[0].attributes && (variants[0].attributes.timeline || variants[0].attributes.scope)
        ? variants[0].attributes.timeline || variants[0].attributes.scope
        : (type === "retainer" ? "Ongoing collaboration" : "Scoped project"),
      stackTags: deriveTags(product),
      packageVariants,
      detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "/marketplace",
    };
  }

  function forgeData() {
    const existing = state.templateData && state.templateData.programmer;
    if (existing && Array.isArray(existing.offers)) {
      return existing;
    }

    const offers = state.products.map(mapOffer);
    return {
      offers,
      packageHighlights: offers.slice(0, 3),
      stackTags: [...new Set(offers.flatMap((offer) => offer.stackTags || []))].slice(0, 10),
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
      elements.brandLabel.textContent = state.store.storeName || "Developer Studio";
    }
    if (elements.name) {
      elements.name.textContent = state.store.storeName || "Developer Studio";
    }
    if (elements.handle) {
      elements.handle.textContent = state.store.handle ? `@${state.store.handle}` : "@devstudio";
    }
    if (elements.tagline) {
      elements.tagline.textContent = state.store.tagline || elements.tagline.textContent;
    }
    if (elements.about) {
      elements.about.textContent = state.store.about || elements.about.textContent;
    }
    if (elements.avatar) {
      const avatarUrl = String(state.store.avatarUrl || "").trim();
      elements.avatar.innerHTML = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(state.store.storeName || "Developer studio")}">`
        : escapeHtml(initials(state.store.storeName));
    }
    if (elements.meta) {
      const offerCount = Array.isArray(state.products) ? state.products.length : 0;
      const updateCount = Array.isArray(state.updates) ? state.updates.length : 0;
      elements.meta.innerHTML = [
        `<span class="forge-pill"><i class="fa-solid fa-layer-group"></i>${offerCount} offer${offerCount === 1 ? "" : "s"}</span>`,
        `<span class="forge-pill"><i class="fa-solid fa-bullhorn"></i>${updateCount} update${updateCount === 1 ? "" : "s"}</span>`,
        `<span class="forge-pill"><i class="fa-solid fa-circle-half-stroke"></i>${escapeHtml(String(state.meta.visibilityStatus || "draft"))}</span>`,
      ].join("");
    }

    const socials = state.store.socials || {};
    const links = [];
    if (socials.instagram) {
      links.push({ label: "Instagram", icon: "fa-brands fa-instagram", href: `https://instagram.com/${String(socials.instagram).replace(/^@+/, "")}` });
    }
    if (socials.xhandle) {
      links.push({ label: "X", icon: "fa-brands fa-x-twitter", href: `https://x.com/${String(socials.xhandle).replace(/^@+/, "")}` });
    }
    if (elements.socials) {
      if (!links.length) {
        elements.socials.hidden = true;
        elements.socials.innerHTML = "";
      } else {
        elements.socials.hidden = false;
        elements.socials.innerHTML = links.map((link) => `<a class="forge-pill" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer"><i class="${escapeHtml(link.icon)}"></i><span>${escapeHtml(link.label)}</span></a>`).join("");
      }
    }
  }

  function renderStats() {
    const data = forgeData();
    if (elements.metricOffers) {
      elements.metricOffers.textContent = String((data.offers || []).length);
    }
    if (elements.metricPackages) {
      elements.metricPackages.textContent = String((data.packageHighlights || []).length);
    }
    if (elements.metricStatus) {
      elements.metricStatus.textContent = String(state.meta.visibilityStatus || "draft").replace(/^./, (char) => char.toUpperCase());
    }
    if (elements.metricStack) {
      elements.metricStack.textContent = (data.stackTags || []).length ? data.stackTags.join(", ") : "React, Node.js, PostgreSQL";
    }
    if (elements.stackCloud) {
      elements.stackCloud.innerHTML = (data.stackTags || []).map((tag) => `<span class="forge-chip">${escapeHtml(tag)}</span>`).join("");
    }
  }

  function renderFilters() {
    if (!elements.filterRow) {
      return;
    }

    const types = ["all", ...new Set((forgeData().offers || []).map((offer) => offer.type))];
    elements.filterRow.innerHTML = types.map((type) => {
      const label = type === "all" ? "All offers" : type.charAt(0).toUpperCase() + type.slice(1);
      return `<button class="forge-filter${state.typeFilter === type ? " is-active" : ""}" type="button" data-forge-filter="${escapeHtml(type)}">${escapeHtml(label)}</button>`;
    }).join("");
  }

  function offerActions(offer, source) {
    const viewAction = `<a class="forge-button" href="${escapeHtml(offer.detailPath)}"><i class="fa-regular fa-eye"></i><span>View offer</span></a>`;
    if (!state.isPublic) {
      return viewAction;
    }
    if (state.canBuy) {
      return [
        viewAction,
        `<button class="forge-button forge-button--accent" type="button" data-add-cart="${Number(offer.id || 0)}" data-source="${escapeHtml(source)}"><i class="fa-solid fa-cart-plus"></i><span>Add to cart</span></button>`,
      ].join("");
    }
    return [
      viewAction,
      `<a class="forge-button forge-button--accent" href="${escapeHtml(getSignInPath())}"><i class="fa-solid fa-right-to-bracket"></i><span>Sign in to enquire</span></a>`,
    ].join("");
  }

  function renderPackages() {
    if (!elements.packageGrid || !elements.packageEmpty) {
      return;
    }

    const packages = (forgeData().packageHighlights || []).slice(0, 3);
    if (!packages.length) {
      elements.packageGrid.innerHTML = "";
      elements.packageEmpty.hidden = false;
      return;
    }

    elements.packageEmpty.hidden = true;
    elements.packageGrid.innerHTML = packages.map((offer) => `
      <article class="forge-package-card">
        <span class="forge-codebar">${escapeHtml(offer.typeLabel)}</span>
        <div>
          <h3 class="forge-package-card__title">${escapeHtml(offer.title)}</h3>
          <p class="forge-offer-card__description">${escapeHtml(offer.description || "Open the listing to review the package scope and delivery details.")}</p>
        </div>
        <div class="forge-chip-cloud">
          ${(offer.packageVariants || []).map((variant) => `<span class="forge-chip">${escapeHtml(variant.label)} - ${formatCurrency(variant.price)}</span>`).join("")}
        </div>
        <div class="forge-package-card__actions">${offerActions(offer, "programmer-package")}</div>
      </article>
    `).join("");
  }

  function renderOffers() {
    if (!elements.offerGrid || !elements.offerEmpty) {
      return;
    }

    renderFilters();
    const offers = (forgeData().offers || []).filter((offer) => state.typeFilter === "all" || offer.type === state.typeFilter);
    if (!offers.length) {
      elements.offerGrid.innerHTML = "";
      elements.offerEmpty.hidden = false;
      return;
    }

    elements.offerEmpty.hidden = true;
    elements.offerGrid.innerHTML = offers.map((offer) => `
      <article class="forge-offer-card">
        <div class="forge-chip-cloud">
          <span class="forge-codebar">${escapeHtml(offer.typeLabel)}</span>
          <span class="forge-chip">${escapeHtml(offer.scopeLabel)}</span>
        </div>
        <div>
          <h3 class="forge-offer-card__title">${escapeHtml(offer.title)}</h3>
          <p class="forge-offer-card__description">${escapeHtml(offer.description || "Open the listing to review the full scope and delivery details.")}</p>
        </div>
        <div class="forge-chip-cloud">
          <span class="forge-chip"><i class="fa-solid fa-tags"></i>${formatCurrency(offer.price)}</span>
          <span class="forge-chip"><i class="fa-regular fa-calendar"></i>${escapeHtml(offer.createdLabel)}</span>
          <span class="forge-chip"><i class="fa-solid fa-location-dot"></i>${escapeHtml(offer.location || offer.deliveryLabel)}</span>
        </div>
        <div class="forge-chip-cloud">
          ${(offer.stackTags || []).map((tag) => `<span class="forge-chip">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="forge-offer-card__actions">${offerActions(offer, "programmer-offer")}</div>
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
      <article class="forge-update-card">
        <div class="forge-chip-cloud">
          <span class="forge-chip">${escapeHtml(String(item.type || "store_update").replace(/_/g, " "))}</span>
          <span class="forge-chip">${escapeHtml(formatDate(item.createdAt))}</span>
        </div>
        ${item.title ? `<h3 class="forge-update-card__title">${escapeHtml(item.title)}</h3>` : ""}
        <p>${escapeHtml(item.description || "New update from this studio.")}</p>
        ${item.catalogItemId ? `<div class="forge-update-card__actions"><a class="forge-button" href="/products/${Number(item.catalogItemId || 0)}"><i class="fa-regular fa-eye"></i><span>Open linked offer</span></a></div>` : ""}
      </article>
    `).join("");
  }

  function populateQuoteForm() {
    if (!elements.quoteOffer) {
      return;
    }

    const offers = forgeData().offers || [];
    elements.quoteOffer.innerHTML = offers.map((offer) => `<option value="${Number(offer.id || 0)}">${escapeHtml(offer.title)}</option>`).join("");
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
          templateKey: "programmer",
          itemType: "programmer",
        });
      }
    } catch (error) {
      toast((error && error.message) || "Unable to add this offer to the cart.", "error");
    }
  }

  function shareStore() {
    const url = `${window.location.origin}${getStorePath()}`;
    if (navigator.share) {
      navigator.share({
        title: state.store && state.store.storeName ? state.store.storeName : "Developer studio",
        text: state.store && state.store.tagline ? state.store.tagline : "Check out this developer storefront on Zest.",
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

  function handleQuoteSubmit(event) {
    event.preventDefault();

    const offerId = Number(elements.quoteOffer && elements.quoteOffer.value || 0);
    const offer = (forgeData().offers || []).find((item) => Number(item.id || 0) === offerId);
    if (!offer) {
      toast("Choose an offer first.", "error");
      return;
    }

    const scope = String(elements.quoteScope && elements.quoteScope.value || "").trim();
    if (!scope) {
      toast("Add a short project summary so the brief is useful.", "error");
      return;
    }

    const timeline = String(elements.quoteTimeline && elements.quoteTimeline.value || "").trim() || "Timeline not specified";
    const brief = [
      `Offer: ${offer.title}`,
      `Studio: ${(state.store && state.store.storeName) || "Developer studio"}`,
      `Summary: ${scope}`,
      `Timeline: ${timeline}`,
      `Stack: ${(offer.stackTags || []).join(", ") || "To be confirmed"}`,
    ].join("\n");

    const goToOffer = () => {
      window.location.href = state.isPublic && !state.canBuy ? getSignInPath() : offer.detailPath;
    };

    if (window.sessionStorage) {
      window.sessionStorage.setItem("zest_quote_draft", brief);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(brief)
        .then(() => {
          if (elements.quoteHint) {
            elements.quoteHint.textContent = "Scope brief copied. Opening the selected offer now.";
          }
          toast("Scope brief copied.", "success");
          window.setTimeout(goToOffer, 120);
        })
        .catch(() => {
          toast("Scope brief prepared. Opening the selected offer.", "success");
          goToOffer();
        });
      return;
    }

    toast("Scope brief prepared. Opening the selected offer.", "success");
    goToOffer();
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
        const button = event.target.closest("[data-forge-filter]");
        if (!button) {
          return;
        }
        state.typeFilter = String(button.getAttribute("data-forge-filter") || "all");
        renderOffers();
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

    if (elements.quoteForm) {
      elements.quoteForm.addEventListener("submit", handleQuoteSubmit);
    }

    document.addEventListener("click", (event) => {
      const cartButton = event.target.closest("[data-add-cart]");
      if (cartButton) {
        addToCart(cartButton.getAttribute("data-add-cart"), cartButton.getAttribute("data-source") || "programmer-storefront");
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
      toast("Unable to load this developer storefront right now.", "error");
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
    renderPackages();
    renderOffers();
    renderUpdates();
    populateQuoteForm();
    await syncFollowButton();
  }

  bindEvents();
  loadStorefront().catch(() => {
    toast("Unable to load this developer storefront right now.", "error");
  });
})();
