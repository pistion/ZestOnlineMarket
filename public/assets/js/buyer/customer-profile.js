(function () {
  const state = {
    snapshot: null,
  };

  const profileEndpoint =
    document.body?.dataset?.buyerProfileEndpoint || "/api/buyer/me";

  const elements = {
    profileStatus: document.querySelector("#buyerProfileStatus"),
    heroCover: document.querySelector("#buyerHeroCover"),
    heroAvatar: document.querySelector("#buyerHeroAvatar"),
    heroBuyerPill: document.querySelector("#buyerHeroBuyerPill"),
    heroStatusPill: document.querySelector("#buyerHeroStatusPill"),
    heroEmail: document.querySelector("#buyerHeroEmail"),
    heroName: document.querySelector("#buyerHeroName"),
    heroHandle: document.querySelector("#buyerHeroHandle"),
    heroBio: document.querySelector("#buyerHeroBio"),
    shareProfile: document.querySelector("#buyerShareProfile"),
    switchAccount: document.querySelector("#buyerSwitchAccountBtn"),
    signOut: document.querySelector("#buyerSignOutBtn"),
    purchasesStat: document.querySelector("#buyerPurchasesStat"),
    wishlistStat: document.querySelector("#buyerWishlistStat"),
    followingStat: document.querySelector("#buyerFollowingStat"),
    savedStoresStat: document.querySelector("#buyerSavedStoresStat"),
    dockFeedCount: document.querySelector("#buyerDockFeedCount"),
    dockWishlistCount: document.querySelector("#buyerDockWishlistCount"),
    dockFollowingCount: document.querySelector("#buyerDockFollowingCount"),
    dockRecommendationCount: document.querySelector("#buyerDockRecommendationCount"),
    insightSummary: document.querySelector("#buyerInsightSummary"),
    signalBadges: document.querySelector("#buyerSignalBadges"),
    insightsGrid: document.querySelector("#buyerInsightsGrid"),
    feedList: document.querySelector("#buyerFeedList"),
    wishlistList: document.querySelector("#buyerWishlistList"),
    recentlyViewedList: document.querySelector("#buyerRecentlyViewedList"),
    purchasesList: document.querySelector("#buyerPurchasesList"),
    activityList: document.querySelector("#buyerActivityList"),
    interactionsList: document.querySelector("#buyerInteractionsList"),
    storeNetworkList: document.querySelector("#buyerStoreNetworkList"),
    recommendationsList: document.querySelector("#buyerRecommendationsList"),
    followingList: document.querySelector("#buyerFollowingList"),
  };

  function followingApi() {
    return window.ZestStoreFollowing || null;
  }

  function wishlistApi() {
    return window.ZestBuyerWishlist || null;
  }

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
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function deriveHandle(profile, account) {
    const base = String(
      (profile && (profile.fullName || profile.displayName)) ||
        (account && account.email) ||
        "buyer"
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

    return base || "buyer";
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
      throw new Error((payload && payload.message) || `Request failed (${response.status})`);
    }

    return payload;
  }

  function clearSavedSession() {
    try {
      window.localStorage.removeItem("zestUser");
    } catch {
      // ignore
    }
  }

  async function signOut() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          redirectTo: "/auth/signin?signedOut=1&role=buyer",
        }),
      });
    } catch {
      // ignore
    } finally {
      clearSavedSession();
      window.location.href = "/auth/signin?signedOut=1&role=buyer";
    }
  }

  function buildEmptyState(icon, title, text) {
    return `
      <div class="empty-state ui-state ui-state--empty" role="status">
        <div class="empty-icon"><i class="${escapeHtml(icon)}"></i></div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function setProfileStatus(mode = "hidden", title = "", text = "") {
    if (!elements.profileStatus) {
      return;
    }

    if (mode === "hidden") {
      elements.profileStatus.hidden = true;
      return;
    }

    elements.profileStatus.hidden = false;
    elements.profileStatus.className = `ui-state buyer-profile-status ${
      mode === "error" ? "ui-state--error" : "ui-state--empty"
    }`;
    elements.profileStatus.innerHTML = `
      <p class="ui-eyebrow">${escapeHtml(mode === "error" ? "Profile issue" : "Loading profile")}</p>
      <h2 class="ui-state__title">${escapeHtml(title)}</h2>
      <p class="ui-state__copy">${escapeHtml(text)}</p>
    `;
  }

  function renderHero(snapshot) {
    const account = snapshot.account || {};
    const profile = snapshot.profile || {};
    const insights = snapshot.insights || {};
    const stats = snapshot.stats || {};
    const displayName = profile.displayName || "Buyer";
    const handle = deriveHandle(profile, account);
    const email = profile.email || account.email || "hello@zest.market";

    if (elements.heroCover) {
      if (profile.coverUrl) {
        elements.heroCover.style.background = `linear-gradient(180deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.72) 100%), url("${profile.coverUrl.replace(/"/g, '\\"')}") center/cover`;
      } else {
        elements.heroCover.style.background = "";
      }
    }

    if (elements.heroAvatar) {
      if (profile.avatarUrl) {
        elements.heroAvatar.style.backgroundImage = `url("${profile.avatarUrl.replace(/"/g, '\\"')}")`;
        elements.heroAvatar.textContent = "";
      } else {
        elements.heroAvatar.style.backgroundImage = "";
        elements.heroAvatar.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    if (elements.heroBuyerPill) {
      elements.heroBuyerPill.innerHTML = `<i class="fa-solid fa-user"></i> Buyer: ${escapeHtml(displayName)}`;
    }

    if (elements.heroStatusPill) {
      elements.heroStatusPill.innerHTML = insights.personalizedFeed
        ? `<i class="fa-solid fa-sparkles"></i> Personalized feed live`
        : `<i class="fa-solid fa-compass"></i> Buyer pulse warming up`;
    }

    if (elements.heroEmail) {
      elements.heroEmail.href = `mailto:${email}`;
      elements.heroEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${escapeHtml(email)}`;
    }

    if (elements.heroName) {
      elements.heroName.textContent = `${displayName} - Buyer Profile`;
    }

    if (elements.heroHandle) {
      elements.heroHandle.textContent = `@${handle}`;
    }

    if (elements.heroBio) {
      elements.heroBio.textContent =
        profile.bio ||
        insights.summary ||
        "Keep your marketplace activity, followed stores, saved items, and recent shopping signals in one buyer-focused profile.";
    }

    if (elements.purchasesStat) {
      elements.purchasesStat.textContent = String(stats.purchases || 0);
    }

    if (elements.wishlistStat) {
      elements.wishlistStat.textContent = String(stats.wishlist || 0);
    }

    if (elements.followingStat) {
      elements.followingStat.textContent = String(stats.following || 0);
    }

    if (elements.savedStoresStat) {
      elements.savedStoresStat.textContent = String(stats.savedStores || 0);
    }
  }

  function renderOverviewDock(snapshot) {
    const feedCount = Array.isArray(snapshot.feedPreview) ? snapshot.feedPreview.length : 0;
    const wishlistCount = Array.isArray(snapshot.wishlist) ? snapshot.wishlist.length : 0;
    const followingCount = Array.isArray(snapshot.following) ? snapshot.following.length : 0;
    const recommendationCount = Array.isArray(snapshot.recommendations) ? snapshot.recommendations.length : 0;

    if (elements.dockFeedCount) {
      elements.dockFeedCount.textContent = String(feedCount);
    }

    if (elements.dockWishlistCount) {
      elements.dockWishlistCount.textContent = String(wishlistCount);
    }

    if (elements.dockFollowingCount) {
      elements.dockFollowingCount.textContent = String(followingCount);
    }

    if (elements.dockRecommendationCount) {
      elements.dockRecommendationCount.textContent = String(recommendationCount);
    }
  }

  function renderInsights(snapshot) {
    const insights = snapshot.insights || {};

    if (elements.insightSummary) {
      elements.insightSummary.innerHTML = `
        <div class="pulse-summary__headline">Buyer profile tuned for discovery</div>
        <p>${escapeHtml(
          insights.summary ||
            "Your buyer profile is ready. Follow stores and explore more listings to sharpen recommendations."
        )}</p>
      `;
    }

    if (elements.signalBadges) {
      const badges = Array.isArray(insights.badges) ? insights.badges : [];
      elements.signalBadges.innerHTML = badges.length
        ? badges
            .map((badge) => `<span class="signal-badge">${escapeHtml(badge)}</span>`)
            .join("")
        : `<span class="signal-badge">Buyer signals will appear here</span>`;
    }

    if (elements.insightsGrid) {
      const highlights = Array.isArray(insights.highlights) ? insights.highlights : [];
      elements.insightsGrid.innerHTML = highlights.length
        ? highlights
            .map(
              (item) => `
                <article class="insight-card insight-card--${escapeHtml(item.tone || "neutral")}">
                  <div class="insight-card__label">${escapeHtml(item.label || "Signal")}</div>
                  <div class="insight-card__value">${escapeHtml(item.value || "Not available")}</div>
                  <p class="insight-card__meta">${escapeHtml(item.meta || "")}</p>
                </article>
              `
            )
            .join("")
        : buildEmptyState(
            "fa-solid fa-wave-square",
            "Signals are still warming up",
            "Browse the marketplace and interact with stores to build your buyer pulse."
          );
    }
  }

  function renderFeed(feedItems) {
    if (!elements.feedList) {
      return;
    }

    if (!feedItems.length) {
      elements.feedList.innerHTML = buildEmptyState(
        "fa-solid fa-rss",
        "No followed-store updates yet",
        "Follow a few stores and their latest posts will appear here."
      );
      return;
    }

    elements.feedList.innerHTML = feedItems
      .slice(0, 4)
      .map(
        (item) => `
          <article class="wishlist-card" data-href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">
            <div class="wishlist-image"${
              item.images && item.images[0]
                ? ` style="background-image: url('${item.images[0].replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="wishlist-info">
              <div class="wishlist-kicker">${escapeHtml(item.feedTag || "Store update")}</div>
              <div class="wishlist-title">${escapeHtml(item.title || "Store update")}</div>
              <div class="wishlist-price">${escapeHtml(item.storeName || "Marketplace store")}</div>
              <div class="wishlist-meta">${escapeHtml(item.description || "Open this update to see more.")}</div>
              <div class="card-actions">
                <a class="card-action-link card-action-link--primary" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">Open update</a>
                <a class="card-action-link" href="${escapeHtml(item.storePath || "/marketplace")}">Seller profile</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderWishlist(items) {
    if (!elements.wishlistList) {
      return;
    }

    if (!items.length) {
      elements.wishlistList.innerHTML = buildEmptyState(
        "fa-solid fa-heart",
        "No wishlist items yet",
        "Save listings you want to revisit and they will appear here."
      );
      return;
    }

    elements.wishlistList.innerHTML = items
      .map(
        (item) => `
          <article class="wishlist-card" data-href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">
            ${
              item.productId
                ? `<button class="wishlist-remove" type="button" data-remove-wishlist-product="${escapeHtml(item.productId)}" aria-label="Remove ${escapeHtml(item.title || "item")} from wishlist"><i class="fa-solid fa-xmark"></i></button>`
                : ""
            }
            <div class="wishlist-image"${
              item.imageUrl
                ? ` style="background-image: url('${item.imageUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="wishlist-info">
              <div class="wishlist-title">${escapeHtml(item.title || "Saved item")}</div>
              <div class="wishlist-price">${escapeHtml(formatCurrency(item.price))}</div>
              <div class="wishlist-meta">${escapeHtml(item.storeName || "Saved from marketplace")}</div>
              <div class="card-actions">
                <a class="card-action-link card-action-link--primary" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">Open listing</a>
                <a class="card-action-link" href="${escapeHtml(item.storePath || "/marketplace")}">Seller profile</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderRecentlyViewed(items) {
    if (!elements.recentlyViewedList) {
      return;
    }

    if (!items.length) {
      elements.recentlyViewedList.innerHTML = buildEmptyState(
        "fa-solid fa-clock-rotate-left",
        "No recently viewed listings yet",
        "Open a few listings from the marketplace and they will appear here."
      );
      return;
    }

    elements.recentlyViewedList.innerHTML = items
      .map(
        (item) => `
          <article class="wishlist-card" data-href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">
            <div class="wishlist-image"${
              item.imageUrl
                ? ` style="background-image: url('${item.imageUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="wishlist-info">
              <div class="wishlist-kicker">Recently viewed</div>
              <div class="wishlist-title">${escapeHtml(item.title || "Viewed listing")}</div>
              <div class="wishlist-price">${escapeHtml(formatCurrency(item.price))}</div>
              <div class="wishlist-meta">${escapeHtml(item.storeName || "Marketplace listing")}</div>
              <div class="card-actions">
                <a class="card-action-link card-action-link--primary" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">Open listing</a>
                <a class="card-action-link" href="${escapeHtml(item.storePath || "/marketplace")}">Seller profile</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderPurchases(purchases) {
    if (!elements.purchasesList) {
      return;
    }

    if (!purchases.length) {
      elements.purchasesList.innerHTML = buildEmptyState(
        "fa-solid fa-bag-shopping",
        "No purchases yet",
        "Once orders are placed, your buyer profile will show them here."
      );
      return;
    }

    elements.purchasesList.innerHTML = purchases
      .map(
        (purchase) => `
          <article class="purchase-card" data-href="${escapeHtml(purchase.orderPath || purchase.productPath || purchase.storePath || "/marketplace")}">
            <div class="purchase-image"${
              purchase.imageUrl
                ? ` style="background-image: url('${purchase.imageUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="purchase-info">
              <div class="purchase-title">${escapeHtml(purchase.title || "Purchase")}</div>
              <div class="purchase-price">${escapeHtml(formatCurrency(purchase.totalAmount || purchase.price))}</div>
              <div class="purchase-status">
                <span class="status-badge">${escapeHtml(purchase.status || "pending")}</span>
                <span>${escapeHtml(formatDate(purchase.purchasedAt))}</span>
              </div>
              <div class="card-actions">
                <a class="card-action-link card-action-link--primary" href="${escapeHtml(purchase.orderPath || purchase.productPath || purchase.storePath || "/marketplace")}">Open order</a>
                <a class="card-action-link" href="${escapeHtml(purchase.storePath || "/marketplace")}">Seller profile</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderActivity(items) {
    if (!elements.activityList) {
      return;
    }

    if (!items.length) {
      elements.activityList.innerHTML = buildEmptyState(
        "fa-solid fa-clock-rotate-left",
        "No activity yet",
        "Your latest follows, saves, and purchases will appear here."
      );
      return;
    }

    elements.activityList.innerHTML = items
      .map(
        (item) => `
          <div class="activity-item"${item.href ? ` data-href="${escapeHtml(item.href)}"` : ""}>
            <div class="activity-icon"><i class="${escapeHtml(item.icon || "fa-solid fa-sparkles")}"></i></div>
            <div class="activity-content">
              <div class="activity-text">${escapeHtml(item.text || "Buyer activity")}</div>
              <div class="activity-time">${escapeHtml(item.time || "Recently")}</div>
            </div>
          </div>
        `
      )
      .join("");
  }

  function renderInteractionCollection(items, container, emptyConfig) {
    if (!container) {
      return;
    }

    if (!items.length) {
      container.innerHTML = buildEmptyState(emptyConfig.icon, emptyConfig.title, emptyConfig.text);
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
          <div class="interaction-item">
            <div class="interaction-thumb"${
              item.thumbnailUrl
                ? ` style="background-image: url('${item.thumbnailUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="interaction-content">
              <div class="interaction-title">${escapeHtml(item.title || "Store interaction")}</div>
              <div class="interaction-meta">${escapeHtml(item.meta || "Recently")}</div>
              <div class="interaction-actions">
                <a class="interaction-btn" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">${escapeHtml(item.actionLabel || "Open")}</a>
                <a class="interaction-btn" href="${escapeHtml(item.storePath || "/marketplace")}">${escapeHtml(item.secondaryActionLabel || "Seller profile")}</a>
              </div>
            </div>
          </div>
        `
      )
      .join("");
  }

  function renderRecommendations(items) {
    if (!elements.recommendationsList) {
      return;
    }

    if (!items.length) {
      elements.recommendationsList.innerHTML = buildEmptyState(
        "fa-solid fa-lightbulb",
        "Recommendations will grow over time",
        "Follow more stores and browse more listings to improve buyer recommendations."
      );
      return;
    }

    elements.recommendationsList.innerHTML = items
      .map(
        (item) => `
          <article class="recommendation-card" data-href="${escapeHtml(item.productPath || "/marketplace")}">
            <div class="recommendation-image"${
              item.imageUrl
                ? ` style="background-image: url('${item.imageUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="recommendation-info">
              <div class="recommendation-title">${escapeHtml(item.title || "Recommended listing")}</div>
              <div class="recommendation-price">${escapeHtml(formatCurrency(item.price))}</div>
              <div class="recommendation-reason">${escapeHtml(item.reason || "Suggested for your buyer activity")}</div>
              <div class="card-actions">
                <a class="card-action-link card-action-link--primary" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">Open listing</a>
                <a class="card-action-link" href="${escapeHtml(item.storePath || "/marketplace")}">Seller profile</a>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderFollowing(items) {
    if (!elements.followingList) {
      return;
    }

    if (!items.length) {
      elements.followingList.innerHTML = buildEmptyState(
        "fa-solid fa-store",
        "No followed stores yet",
        "Browse the marketplace and follow stores you want to keep up with."
      );
      return;
    }

    elements.followingList.innerHTML = items
      .map(
        (store) => `
          <article class="subscription-card">
            <div class="subscription-header">
              <div class="subscription-name">${escapeHtml(store.storeName || `@${store.handle}`)}</div>
              <span class="subscription-status active">Following</span>
            </div>
            <div class="subscription-content">
              <div class="subscription-desc">${escapeHtml(
                store.tagline || store.about || "This store will appear in your personalized buyer feed."
              )}</div>
              <div class="subscription-actions">
                <a class="btn btn-primary" href="${escapeHtml(
                  store.storePath || (store.handle ? `/stores/${encodeURIComponent(store.handle)}` : "/marketplace")
                )}">Open seller profile</a>
                <button class="btn" type="button" data-unfollow-handle="${escapeHtml(store.handle)}">Unfollow</button>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderDashboard(snapshot) {
    renderHero(snapshot);
    renderOverviewDock(snapshot);
    renderInsights(snapshot);
    renderFeed(Array.isArray(snapshot.feedPreview) ? snapshot.feedPreview : []);
    renderWishlist(Array.isArray(snapshot.wishlist) ? snapshot.wishlist : []);
    renderRecentlyViewed(Array.isArray(snapshot.recentlyViewed) ? snapshot.recentlyViewed : []);
    renderPurchases(Array.isArray(snapshot.purchases) ? snapshot.purchases : []);
    renderActivity(Array.isArray(snapshot.activity) ? snapshot.activity : []);
    renderInteractionCollection(
      Array.isArray(snapshot.interactions) ? snapshot.interactions : [],
      elements.interactionsList,
      {
        icon: "fa-solid fa-comments",
        title: "No interaction highlights yet",
        text: "Store and listing interactions will turn into buyer-specific highlights here.",
      }
    );
    renderInteractionCollection(
      Array.isArray(snapshot.storeNetwork) ? snapshot.storeNetwork : [],
      elements.storeNetworkList,
      {
        icon: "fa-solid fa-people-group",
        title: "Your store network is still growing",
        text: "Followed stores will appear here once your buyer network expands.",
      }
    );
    renderRecommendations(Array.isArray(snapshot.recommendations) ? snapshot.recommendations : []);
    renderFollowing(Array.isArray(snapshot.following) ? snapshot.following : []);
  }

  async function loadBuyerProfile() {
    setProfileStatus(
      "loading",
      "Pulling your buyer dashboard",
      "We are syncing followed stores, wishlist activity, purchases, and recommendations."
    );

    try {
      const buyerData = await fetchJson(profileEndpoint);
      state.snapshot = buyerData;
      renderDashboard(buyerData);
      setProfileStatus("hidden");
    } catch (error) {
      setProfileStatus(
        "error",
        "We could not load your buyer profile",
        error.message || "Try refreshing the page or signing in again."
      );
      throw error;
    }
  }

  async function toggleUnfollow(handle) {
    const api = followingApi();
    if (!api || !handle) {
      return;
    }

    await api.unfollow(handle);
    await loadBuyerProfile();
  }

  async function removeWishlistItem(productId) {
    const api = wishlistApi();
    if (!api || !productId) {
      return;
    }

    await api.remove(productId);
    await loadBuyerProfile();
  }

  async function copyProfileLink(event) {
    event.preventDefault();

    const url = window.location.href;
    const label = elements.shareProfile;
    const originalMarkup = label ? label.innerHTML : "";

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
        label.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
        window.setTimeout(() => {
          label.innerHTML = originalMarkup || '<i class="fa-solid fa-share-nodes"></i> Share';
        }, 1400);
      }
    } catch (error) {
      if (label) {
        label.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Copy failed`;
        window.setTimeout(() => {
          label.innerHTML = originalMarkup || '<i class="fa-solid fa-share-nodes"></i> Share';
        }, 1600);
      }
    }
  }

  function bindCardNavigation() {
    document.addEventListener("click", async (event) => {
      const unfollowButton = event.target.closest("[data-unfollow-handle]");
      if (unfollowButton) {
        event.preventDefault();
        await toggleUnfollow(unfollowButton.getAttribute("data-unfollow-handle"));
        return;
      }

      const removeWishlistButton = event.target.closest("[data-remove-wishlist-product]");
      if (removeWishlistButton) {
        event.preventDefault();
        await removeWishlistItem(removeWishlistButton.getAttribute("data-remove-wishlist-product"));
        return;
      }

      const card = event.target.closest("[data-href]");
      if (!card || event.target.closest("a, button")) {
        return;
      }

      const href = card.getAttribute("data-href");
      if (href) {
        window.location.href = href;
      }
    });
  }

  async function initFollowingState() {
    const api = followingApi();
    if (!api || typeof api.init !== "function") {
      return;
    }

    await api.init();
  }

  async function initWishlistState() {
    const api = wishlistApi();
    if (!api || typeof api.init !== "function") {
      return;
    }

    await api.init();
  }

  async function init() {
    bindCardNavigation();
    elements.shareProfile?.addEventListener("click", copyProfileLink);
    elements.switchAccount?.addEventListener("click", () => {
      clearSavedSession();
      window.location.href = "/auth/signin?role=buyer";
    });
    elements.signOut?.addEventListener("click", async () => {
      await signOut();
    });

    await initFollowingState();
    await initWishlistState();
    await loadBuyerProfile();

    window.addEventListener("zest:followed-stores-changed", async () => {
      await loadBuyerProfile();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch(() => {
      setProfileStatus(
        "error",
        "We could not load your buyer profile",
        "Try refreshing the page or signing in again."
      );
      renderInsights({});
      renderFeed([]);
      renderWishlist([]);
      renderRecentlyViewed([]);
      renderPurchases([]);
      renderActivity([]);
      renderInteractionCollection([], elements.interactionsList, {
        icon: "fa-solid fa-comments",
        title: "No interaction highlights yet",
        text: "Store and listing interactions will turn into buyer-specific highlights here.",
      });
      renderInteractionCollection([], elements.storeNetworkList, {
        icon: "fa-solid fa-people-group",
        title: "Your store network is still growing",
        text: "Followed stores will appear here once your buyer network expands.",
      });
      renderRecommendations([]);
      renderFollowing([]);
    });
  });
})();
