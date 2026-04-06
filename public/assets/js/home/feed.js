(function () {
  const POSTS_PER_BATCH = 6;
  const SEARCH_DEBOUNCE_MS = 220;
  const REACTION_ORDER = ["", "love", "fire", "celebrate"];
  const CART_STORAGE_KEY = "zest_cart_v1";
  const feedMode = document.body?.dataset?.feedMode === "buyer" ? "buyer" : "global";
  const feedApiEndpoint =
    document.body?.dataset?.feedApiEndpoint || (feedMode === "buyer" ? "/api/buyer/feed" : "/api/feed");

  const state = {
    posts: [],
    feedMeta: null,
    nextPage: 1,
    hasMore: false,
    scope: "all",
    query: "",
    isFetching: false,
    lightboxImages: [],
    lightboxIndex: 0,
  };

  const elements = {
    posts: document.querySelector("#posts"),
    sentinel: document.querySelector("#sentinel"),
    loading: document.querySelector("#feedLoading"),
    error: document.querySelector("#feedError"),
    errorText: document.querySelector("#feedErrorText"),
    empty: document.querySelector("#feedEmpty"),
    emptyTitle: document.querySelector("#feedEmptyTitle"),
    emptyText: document.querySelector("#feedEmptyText"),
    emptyAction: document.querySelector("#feedEmptyAction"),
    scopeFollowing: document.querySelector("#scopeFollowing"),
    scopeAll: document.querySelector("#scopeAll"),
    search: document.querySelector("#feedSearch"),
    followCount: document.querySelector("#followCount"),
    updateCount: document.querySelector("#updateCount"),
    storeCount: document.querySelector("#storeCount"),
    spotlightList: document.querySelector("#spotlightList"),
    toast: document.querySelector("#feedToast"),
    footerYear: document.querySelector("#feedFooterYear"),
    lightbox: document.querySelector("#feedLightbox"),
    lightboxImage: document.querySelector("#feedLightboxImage"),
    lightboxPrev: document.querySelector("#feedLightboxPrev"),
    lightboxNext: document.querySelector("#feedLightboxNext"),
    lightboxClose: document.querySelector("#feedLightboxClose"),
    lightboxBackdrop: document.querySelector("#feedLightbox .feed-lightbox__backdrop"),
    lightboxDots: document.querySelector("#feedLightboxDots"),
  };

  let observer = null;
  let toastTimer = null;
  let searchTimer = null;

  function setLoadingState(isLoading) {
    if (elements.loading) {
      elements.loading.hidden = !isLoading;
    }

    if (elements.posts) {
      elements.posts.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    if (isLoading && elements.empty) {
      elements.empty.hidden = true;
    }
  }

  function clearFeedError() {
    if (elements.error) {
      elements.error.hidden = true;
    }
  }

  function showFeedError(message) {
    if (elements.errorText) {
      elements.errorText.textContent = message || "Try refreshing the page or opening the marketplace directly.";
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function normalizeHandle(handle) {
    return String(handle || "").trim().replace(/^@+/, "").toLowerCase();
  }

  function trackBuyerSignal(payload, options = {}) {
    const api = buyerInteractionApi();
    if (!api || typeof api.track !== "function") {
      return;
    }

    api.track(payload, options);
  }

  function seedValue(seed, min, max) {
    const value = Math.abs(Math.sin((Number(seed) || 1) * 9301.27)) * 10000;
    return Math.floor(min + (value % (max - min + 1)));
  }

  function formatRelative(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return `${weeks}w ago`;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function formatCurrency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
  }

  function readCartItems() {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function writeCartItems(items) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getAvatarMarkup(post) {
    const avatarUrl = String(post.avatarUrl || "").trim();
    if (avatarUrl) {
      return `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(post.storeName)}">`;
    }

    return escapeHtml(post.storeName.charAt(0).toUpperCase() || "S");
  }

  function getFollowedHandles() {
    const api = followingApi();
    return api ? api.list() : [];
  }

  function isFollowing(handle) {
    const api = followingApi();
    return api ? api.isFollowing(handle) : false;
  }

  function showToast(message, tone = "default") {
    if (!elements.toast) {
      return;
    }

    elements.toast.textContent = message;
    elements.toast.classList.remove("feed-toast--danger");
    if (tone === "danger") {
      elements.toast.classList.add("feed-toast--danger");
    }
    elements.toast.classList.add("is-visible");

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
      elements.toast.classList.remove("feed-toast--danger");
    }, 2200);
  }

  function getReactionMeta(type) {
    if (type === "love") {
      return {
        icon: "fa-solid fa-heart",
        label: "Loved",
      };
    }

    if (type === "fire") {
      return {
        icon: "fa-solid fa-fire",
        label: "Fire",
      };
    }

    if (type === "celebrate") {
      return {
        icon: "fa-solid fa-sparkles",
        label: "Celebrate",
      };
    }

    return {
      icon: "fa-regular fa-face-smile",
      label: "React",
    };
  }

  function getNextReaction(currentReaction) {
    const currentIndex = REACTION_ORDER.indexOf(String(currentReaction || "").trim().toLowerCase());
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    return REACTION_ORDER[(safeIndex + 1) % REACTION_ORDER.length];
  }

  function getPostTarget(post) {
    const targetType = String(post.targetType || "").trim();
    const targetId = Number(post.targetId || 0);
    if (!targetType || !(targetId > 0)) {
      return null;
    }

    return {
      targetType,
      targetId,
    };
  }

  function buildReactionSummaryMarkup(post) {
    const summary = post.reactionSummary && typeof post.reactionSummary === "object" ? post.reactionSummary : {};
    const parts = Object.entries(summary)
      .filter(([, count]) => Number(count || 0) > 0)
      .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
      .slice(0, 3)
      .map(([type, count]) => {
        const meta = getReactionMeta(type);
        return `
          <span class="feed-post__reaction-pill">
            <i class="${meta.icon}"></i>
            <span>${Number(count || 0)}</span>
          </span>
        `;
      });

    return parts.length
      ? `<div class="feed-post__reaction-summary">${parts.join("")}</div>`
      : "";
  }

  function buildCommentMarkupList(post) {
    if (Array.isArray(post.comments) && post.comments.length) {
      return post.comments.map(createCommentMarkup).join("");
    }

    return `
      <div class="feed-post__comment feed-post__comment--empty">
        <div class="feed-post__comment-avatar">--</div>
        <div>
          <strong>No comments yet</strong>
          <span>Start the conversation on this update.</span>
        </div>
      </div>
    `;
  }

  async function postJson(path, body) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error((payload && payload.message) || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return payload || {};
  }

  function redirectToBuyerSignIn() {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/signin?role=buyer&returnTo=${encodeURIComponent(returnTo)}`;
  }

  function applySummaryToPost(postId, summary, overrides = {}) {
    const nextSummary = summary && typeof summary === "object" ? summary : {};
    const updatePost = (post) => {
      if (post.id !== Number(postId)) {
        return post;
      }

      return {
        ...post,
        likes: Number(nextSummary.likeCount || post.likes || 0),
        liked: Boolean(nextSummary.viewerLiked),
        commentCount: Number(nextSummary.commentCount || post.commentCount || 0),
        shareCount: Number(nextSummary.shareCount || post.shareCount || 0),
        comments: Array.isArray(nextSummary.comments) ? nextSummary.comments : post.comments,
        viewerReaction: String(nextSummary.viewerReaction || "").trim(),
        reactionSummary:
          nextSummary.reactionSummary && typeof nextSummary.reactionSummary === "object"
            ? nextSummary.reactionSummary
            : post.reactionSummary,
        ...overrides,
      };
    };

    state.posts = state.posts.map(updatePost);

    const updatedPost = findPost(postId);
    const existingCard = elements.posts ? elements.posts.querySelector(`[data-post-id="${Number(postId)}"]`) : null;
    if (updatedPost && existingCard) {
      existingCard.replaceWith(createPostElement(updatedPost));
    }

    updateStats();
  }

  function buildPost(item) {
    const handle = normalizeHandle(item.storeHandle);
    const storeName = String(item.storeName || "").trim() || `@${handle}`;
    const images = unique([...(Array.isArray(item.images) ? item.images : []), item.thumbnail]);
    const sharePath = String(item.sharePath || item.productPath || item.storePath || "/marketplace").trim();
    const primaryPath = String(item.productPath || item.storePath || "/marketplace").trim() || "/marketplace";
    const hasListingPath = Boolean(item.productPath);
    const feedTag = String(item.feedTag || "").trim() || "Store update";
    const type = String(item.type || "product_published").trim().toLowerCase() || "product_published";

    let metricLabel = formatCurrency(item.price);
    if (!(Number(item.price) > 0)) {
      if (type === "live_drop") {
        metricLabel = "Live drop";
      } else if (type === "promo") {
        metricLabel = "Promo post";
      } else if (type === "announcement") {
        metricLabel = "Store update";
      } else {
        metricLabel = "New listing";
      }
    }

    return {
      id: Number(item.id) || seedValue(handle.length, 1, 9999),
      catalogItemId: Number(item.catalogItemId || item.id || 0) || 0,
      type,
      hasExplicitTitle: Boolean(item.hasExplicitTitle || type === "product_published"),
      storeHandle: handle,
      storeName,
      avatarUrl: String(item.avatarUrl || "").trim(),
      title: String(item.title || item.name || "Store update").trim() || "Store update",
      description:
        String(item.description || "").trim() ||
        `${storeName} posted a fresh update for buyers browsing the feed.`,
      price: Number(item.price || 0),
      templateKey: String(item.templateKey || "products").trim(),
      location: String(item.location || "").trim(),
      delivery: String(item.delivery || "").trim(),
      createdAt: item.createdAt || Date.now(),
      images,
      imageUrl: images[0] || "",
      storePath: String(item.storePath || (handle ? `/stores/${encodeURIComponent(handle)}` : "/marketplace")).trim(),
      productPath: hasListingPath ? primaryPath : "",
      hasListingPath,
      sharePath,
      feedTag,
      itemType: String(item.itemType || "product").trim() || "product",
      metricLabel,
      targetType: String(item.targetType || "").trim(),
      targetId: Number(item.targetId || 0) || 0,
      likes: Number(item.likeCount || 0),
      liked: Boolean(item.viewerLiked),
      commentCount: Number(item.commentCount || 0),
      shareCount: Number(item.shareCount || 0),
      viewerReaction: String(item.viewerReaction || "").trim(),
      reactionSummary: item.reactionSummary && typeof item.reactionSummary === "object" ? item.reactionSummary : {},
      comments: Array.isArray(item.comments) ? item.comments : [],
    };
  }

  function findPost(postId) {
    return state.posts.find((item) => item.id === Number(postId));
  }

  async function fetchPosts(page) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(POSTS_PER_BATCH));
    params.set("scope", state.scope === "following" ? "following" : "all");
    if (state.query.trim()) {
      params.set("q", state.query.trim());
    }

    const load = async (path) => {
      const response = await fetch(`${path}?${params.toString()}`, {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => null);
      return {
        response,
        payload,
      };
    };

    const { response, payload } = await load(feedApiEndpoint);

    if (!response.ok || !payload) {
      throw new Error((payload && payload.message) || "Unable to load feed.");
    }

    return {
      posts: (payload.items || []).map(buildPost),
      followedHandles: Array.isArray(payload.followedHandles) ? payload.followedHandles : [],
      meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    };
  }

  function setScope(scope) {
    state.scope = scope === "following" ? "following" : "all";
    elements.scopeFollowing.classList.toggle("is-active", state.scope === "following");
    elements.scopeAll.classList.toggle("is-active", state.scope === "all");
    void loadFeed({ reset: true });
  }

  function updateStats() {
    const followed = getFollowedHandles();
    const pagination = state.feedMeta && state.feedMeta.pagination ? state.feedMeta.pagination : null;
    const totalItems = pagination ? Number(pagination.totalItems || 0) : state.posts.length;
    const visibleStores =
      state.feedMeta && Number(state.feedMeta.visibleStoreCount || 0) > 0
        ? Number(state.feedMeta.visibleStoreCount || 0)
        : new Set(state.posts.map((post) => post.storeHandle).filter(Boolean)).size;

    if (elements.followCount) {
      elements.followCount.textContent = String(followed.length);
    }
    if (elements.updateCount) {
      elements.updateCount.textContent = String(totalItems);
    }
    if (elements.storeCount) {
      elements.storeCount.textContent = String(visibleStores);
    }
  }

  function updateEmptyState() {
    if (!elements.empty) {
      return;
    }

    const pagination = state.feedMeta && state.feedMeta.pagination ? state.feedMeta.pagination : null;
    const totalItems = pagination ? Number(pagination.totalItems || 0) : state.posts.length;
    const hasPosts = totalItems > 0;
    const hasFollowed = getFollowedHandles().length > 0;
    const hasVisible = state.posts.length > 0;

    elements.empty.hidden = hasVisible;

    if (hasVisible) {
      return;
    }

    if (!hasPosts) {
      elements.emptyTitle.textContent =
        feedMode === "buyer" ? "No feed updates yet" : "No global updates yet";
      elements.emptyText.textContent =
        feedMode === "buyer"
          ? "Sellers have not published any live storefront updates yet."
          : "The marketplace has not published any live feed items yet. Check back soon for broader storefront activity.";
      elements.emptyAction.textContent = "Open marketplace";
      elements.emptyAction.href = "/marketplace";
      return;
    }

    if (state.scope === "following" && !hasFollowed) {
      elements.emptyTitle.textContent =
        feedMode === "buyer"
          ? "Follow stores to personalize this feed"
          : "Sign in as a buyer to build a following feed";
      elements.emptyText.textContent =
        feedMode === "buyer"
          ? "Your following stream is empty right now. Browse the marketplace, follow a few stalls, then come back here for their updates."
          : "The global feed is open to everyone, but the following tab only comes alive once you sign in as a buyer and start following stores.";
      elements.emptyAction.textContent =
        feedMode === "buyer" ? "Browse marketplace" : "Buyer sign in";
      elements.emptyAction.href =
        feedMode === "buyer"
          ? "/marketplace"
          : `/auth/signin?role=buyer&returnTo=${encodeURIComponent("/buyer/feed")}`;
      return;
    }
    if (state.scope === "following") {
      elements.emptyTitle.textContent = "No followed-store updates match";
      elements.emptyText.textContent = "Try switching to all updates or adjusting your search to see more store activity.";
      elements.emptyAction.textContent = "Show all updates";
      elements.emptyAction.href = "#";
      return;
    }

    elements.emptyTitle.textContent = "No updates match this search";
    elements.emptyText.textContent = "Try a broader keyword or clear the search field to reload the full feed.";
    elements.emptyAction.textContent = "Clear search";
    elements.emptyAction.href = "#";
  }

  function renderSpotlight() {
    if (!elements.spotlightList) {
      return;
    }

    const spotlight = [];
    const seen = new Set();

    state.posts.forEach((post) => {
      if (seen.has(post.storeHandle) || !post.storeHandle) {
        return;
      }

      spotlight.push(post);
      seen.add(post.storeHandle);
    });

    elements.spotlightList.innerHTML = "";

    spotlight.slice(0, 4).forEach((post) => {
      const item = document.createElement("article");
      item.className = "feed-spotlight__item";
      item.innerHTML = `
        <strong>${escapeHtml(post.storeName)}</strong>
        <span>@${escapeHtml(post.storeHandle)} - ${escapeHtml(post.templateKey)}</span>
        <a class="feed-spotlight__link" href="${escapeHtml(post.storePath)}">Visit store</a>
      `;
      elements.spotlightList.appendChild(item);
    });
  }

  function createDotsMarkup(post) {
    if (post.images.length <= 1) {
      return "";
    }

    return `
      <div class="feed-post__dots" aria-hidden="true">
        ${post.images
          .map(
            (_, index) =>
              `<span class="feed-post__dot${index === 0 ? " is-active" : ""}"></span>`
          )
          .join("")}
      </div>
    `;
  }

  function createCommentMarkup(comment) {
    const authorName = String(comment.authorName || comment.name || "User").trim() || "User";
    const initials = authorName.slice(0, 2).toUpperCase();
    return `
      <div class="feed-post__comment">
        <div class="feed-post__comment-avatar">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(authorName)}</strong>
          <span>${escapeHtml(comment.text || comment.body || "")}</span>
        </div>
      </div>
    `;
  }

  function createPostElement(post) {
    const article = document.createElement("article");
    const following = isFollowing(post.storeHandle);
    const reactionMeta = getReactionMeta(post.viewerReaction);
    const commentLabel = post.commentCount > 0 ? String(post.commentCount) : "Comment";
    const shareLabel = post.shareCount > 0 ? String(post.shareCount) : "Share";

    article.className = "feed-post";
    article.dataset.postId = String(post.id);
    article.dataset.handle = post.storeHandle;
    article.innerHTML = `
      <div class="feed-post__header">
        <div class="feed-post__identity">
          <div class="feed-post__avatar">${getAvatarMarkup(post)}</div>
          <div class="feed-post__meta">
            <a href="${escapeHtml(post.storePath)}" data-open-store="${post.id}">${escapeHtml(post.storeName)}</a>
            <span>@${escapeHtml(post.storeHandle)} - ${escapeHtml(formatRelative(post.createdAt))}</span>
          </div>
        </div>
        <button
          class="feed-post__follow${following ? " is-following" : ""}"
          type="button"
          data-follow-handle="${escapeHtml(post.storeHandle)}"
          aria-pressed="${following ? "true" : "false"}"
        >
          ${following ? "Following" : "Follow"}
        </button>
      </div>

      <div class="feed-post__media" data-gallery-open="${post.id}" tabindex="0" role="button" aria-label="Open image gallery">
        ${
          post.images[0]
            ? `<img src="${escapeHtml(post.images[0])}" alt="${escapeHtml(post.title)}">`
            : `<div class="feed-post__placeholder"><i class="fa-regular fa-image"></i></div>`
        }
        <div class="feed-post__overlay">
          <span class="feed-post__tag">${escapeHtml(post.feedTag)}</span>
          ${
            post.hasExplicitTitle
              ? `<h2>${escapeHtml(post.title)}</h2>`
              : ""
          }
          <p>${escapeHtml(post.description)}</p>
        </div>
        ${createDotsMarkup(post)}
      </div>

      <div class="feed-post__body">
        <div class="feed-post__actions">
          <div class="feed-post__action-group">
            <button class="feed-post__action${post.liked ? " is-liked" : ""}" type="button" data-like-post="${post.id}">
              <i class="${post.liked ? "fa-solid fa-heart" : "fa-regular fa-heart"}"></i>
              <span>${post.likes}</span>
            </button>
            <button class="feed-post__action" type="button" data-focus-comment="${post.id}">
              <i class="fa-regular fa-comment"></i>
              <span>${commentLabel}</span>
            </button>
            <button class="feed-post__action" type="button" data-share-post="${post.id}">
              <i class="fa-solid fa-share-nodes"></i>
              <span>${shareLabel}</span>
            </button>
            <button class="feed-post__action${post.viewerReaction ? " is-reacted" : ""}" type="button" data-react-post="${post.id}">
              <i class="${reactionMeta.icon}"></i>
              <span>${reactionMeta.label}</span>
            </button>
          </div>

          <div class="feed-post__cta-group">
            <span class="feed-post__price">${escapeHtml(post.metricLabel)}</span>
            <a class="feed-post__cta" href="${escapeHtml(post.storePath)}" data-open-store="${post.id}">Visit store</a>
            ${
              post.hasListingPath
                ? `
                  <a class="feed-post__cta feed-post__cta--primary" href="${escapeHtml(post.productPath)}" data-open-product="${post.id}">View listing</a>
                  <button class="feed-post__cta feed-post__cta--cart" type="button" data-add-cart-post="${post.id}">
                    <i class="fa-solid fa-cart-plus"></i>
                    <span>Add to cart</span>
                  </button>
                `
                : ""
            }
          </div>
        </div>

        <p class="feed-post__summary">
          <strong>${escapeHtml(post.storeName)}</strong> shared ${escapeHtml(post.feedTag.toLowerCase())}${
            post.location ? ` from ${escapeHtml(post.location)}` : ""
          }${post.delivery ? `. Delivery note: ${escapeHtml(post.delivery)}` : "."}
        </p>

        ${buildReactionSummaryMarkup(post)}

        <div class="feed-post__comments">
          ${buildCommentMarkupList(post)}
          <div class="feed-post__composer">
            <input type="text" id="comment-input-${post.id}" placeholder="Add a comment..." maxlength="150">
            <button type="button" data-post-comment="${post.id}">Post</button>
          </div>
        </div>
      </div>
    `;

    return article;
  }

  function renderFeed(reset) {
    updateStats();
    updateEmptyState();
    renderSpotlight();

    if (elements.posts) {
      elements.posts.innerHTML = "";
    }

    state.posts.forEach((post) => {
      elements.posts?.appendChild(createPostElement(post));
    });

    if (observer) {
      observer.disconnect();
    }

    if (observer && elements.sentinel && state.hasMore && state.posts.length > 0) {
      observer.observe(elements.sentinel);
    }
  }

  async function loadFeed(options = {}) {
    const reset = Boolean(options.reset);
    if (state.isFetching) {
      return;
    }

    state.isFetching = true;
    if (reset) {
      setLoadingState(true);
      clearFeedError();
    } else if (elements.posts) {
      elements.posts.setAttribute("aria-busy", "true");
    }

    try {
      const response = await fetchPosts(reset ? 1 : state.nextPage);
      state.feedMeta = response.meta || {};
      const pagination = state.feedMeta.pagination || {};
      const nextPosts = response.posts || [];

      state.posts = reset ? nextPosts : state.posts.concat(nextPosts);
      state.nextPage = pagination.nextPage || 0;
      state.hasMore = Boolean(pagination.hasMore);

      renderFeed(reset);
      setLoadingState(false);
      if (elements.posts) {
        elements.posts.setAttribute("aria-busy", "false");
      }
    } catch (error) {
      if (reset) {
        state.posts = [];
        state.feedMeta = {
          pagination: {
            totalItems: 0,
          },
        };
        renderFeed(true);
        setLoadingState(false);
        showFeedError(error.message || "Unable to load feed right now.");
        showToast(error.message || "Unable to load feed.");
      } else {
        showToast(error.message || "Unable to load more updates.");
      }
      state.hasMore = false;
    } finally {
      state.isFetching = false;
      if (elements.posts) {
        elements.posts.setAttribute("aria-busy", "false");
      }
    }
  }

  function syncFollowButtons() {
    document.querySelectorAll("[data-follow-handle]").forEach((button) => {
      const handle = button.getAttribute("data-follow-handle");
      const following = isFollowing(handle);
      button.classList.toggle("is-following", following);
      button.textContent = following ? "Following" : "Follow";
      button.setAttribute("aria-pressed", following ? "true" : "false");
    });
  }

  function openLightbox(images, index) {
    if (!Array.isArray(images) || !images.length || !elements.lightbox) {
      return;
    }

    state.lightboxImages = images.slice();
    state.lightboxIndex = Math.min(Math.max(index, 0), images.length - 1);
    elements.lightbox.classList.add("is-open");
    elements.lightbox.setAttribute("aria-hidden", "false");
    renderLightbox();
  }

  function closeLightbox() {
    if (!elements.lightbox) {
      return;
    }

    elements.lightbox.classList.remove("is-open");
    elements.lightbox.setAttribute("aria-hidden", "true");
    state.lightboxImages = [];
    state.lightboxIndex = 0;
  }

  function renderLightbox() {
    if (!elements.lightboxImage || !elements.lightboxDots) {
      return;
    }

    const safeIndex = Math.min(
      Math.max(state.lightboxIndex, 0),
      Math.max(state.lightboxImages.length - 1, 0)
    );
    const imageUrl = state.lightboxImages[safeIndex] || "";

    elements.lightboxImage.src = imageUrl;
    elements.lightboxImage.alt = `Feed image ${safeIndex + 1}`;
    elements.lightboxDots.innerHTML = "";

    state.lightboxImages.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `feed-post__dot${index === safeIndex ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `Show image ${index + 1}`);
      dot.addEventListener("click", () => {
        state.lightboxIndex = index;
        renderLightbox();
      });
      elements.lightboxDots.appendChild(dot);
    });
  }

  function stepLightbox(direction) {
    if (!state.lightboxImages.length) {
      return;
    }

    const total = state.lightboxImages.length;
    state.lightboxIndex = (state.lightboxIndex + direction + total) % total;
    renderLightbox();
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

  async function toggleLike(post) {
    const target = getPostTarget(post);
    if (!target) {
      showToast("This update cannot be liked yet.");
      return;
    }

    try {
      const response = await postJson("/api/engagement/likes/toggle", target);
      applySummaryToPost(post.id, response.summary, {
        liked: Boolean(response.liked),
      });
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showToast("Sign in to like updates.");
        redirectToBuyerSignIn();
        return;
      }

      showToast(error.message || "Unable to update like.");
    }
  }

  async function submitComment(post, text) {
    const target = getPostTarget(post);
    if (!target) {
      showToast("This update cannot accept comments yet.");
      return;
    }

    try {
      const response = await postJson("/api/engagement/comments", {
        ...target,
        body: text,
      });
      applySummaryToPost(post.id, response.summary);
      showToast("Comment posted.");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showToast("Sign in to comment.");
        redirectToBuyerSignIn();
        return;
      }

      showToast(error.message || "Unable to post comment.");
    }
  }

  async function recordShare(post) {
    const target = getPostTarget(post);
    if (!target) {
      return;
    }

    try {
      const response = await postJson("/api/engagement/shares", {
        ...target,
        destination: "copy_link",
        method: "clipboard",
      });
      applySummaryToPost(post.id, response.summary);
    } catch (error) {
      if (error.status !== 401 && error.status !== 403) {
        showToast(error.message || "Unable to record share.");
      }
    }
  }

  function addPostToCart(post) {
    if (!post || !post.hasListingPath || !(Number(post.catalogItemId) > 0)) {
      showToast("This post does not have a live listing to add.");
      return;
    }

    const currentItems = readCartItems();
    const existingIndex = currentItems.findIndex((item) => Number(item && item.id) === Number(post.catalogItemId));

    if (existingIndex >= 0) {
      const existing = currentItems[existingIndex] || {};
      currentItems[existingIndex] = {
        ...existing,
        quantity: Math.max(1, Number(existing.quantity || 1) + 1),
      };
    } else {
      currentItems.push({
        id: Number(post.catalogItemId),
        name: post.title,
        price: Number(post.price || 0),
        quantity: 1,
        image: post.imageUrl || "https://via.placeholder.com/60?text=Item",
        storeName: post.storeName,
        storePath: post.storePath,
        productPath: post.productPath,
        variantLabel: "",
        stockQuantity: 0,
      });
    }

    if (!writeCartItems(currentItems)) {
      showToast("Cart could not be updated right now.");
      return;
    }

    trackBuyerSignal(
      {
        action: "add_to_cart",
        source: "feed-page",
        catalogItemId: post.catalogItemId || post.id,
        storeHandle: post.storeHandle,
        templateKey: post.templateKey,
        itemType: post.itemType,
      },
      { preferBeacon: true }
    );
    showToast("Added to cart.", "danger");
  }

  async function cycleReaction(post) {
    const target = getPostTarget(post);
    if (!target || target.targetType !== "feed_item") {
      showToast("Reactions are available on live feed items only.");
      return;
    }

    try {
      const nextReaction = getNextReaction(post.viewerReaction);
      const reactionType = nextReaction || post.viewerReaction || "love";
      const response = await postJson("/api/engagement/reactions", {
        ...target,
        reactionType,
      });
      applySummaryToPost(post.id, response.summary, {
        viewerReaction: response.reactionType || "",
      });
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        showToast("Sign in to react.");
        redirectToBuyerSignIn();
        return;
      }

      showToast(error.message || "Unable to update reaction.");
    }
  }

  function bindPostEvents() {
    if (!elements.posts) {
      return;
    }

    elements.posts.addEventListener("click", async (event) => {
      const openProductLink = event.target.closest("[data-open-product]");
      if (openProductLink) {
        const post = findPost(openProductLink.getAttribute("data-open-product"));
        if (post) {
          trackBuyerSignal(
            {
              action: "open_listing",
              source: "feed-page",
              catalogItemId: post.catalogItemId || post.id,
              storeHandle: post.storeHandle,
              templateKey: post.templateKey,
              itemType: post.itemType,
            },
            { preferBeacon: true }
          );
        }
        return;
      }

      const openStoreLink = event.target.closest("[data-open-store]");
      if (openStoreLink) {
        const post = findPost(openStoreLink.getAttribute("data-open-store"));
        if (post) {
          trackBuyerSignal(
            {
              action: "open_store",
              source: "feed-page",
              storeHandle: post.storeHandle,
              templateKey: post.templateKey,
              itemType: post.itemType,
            },
            { preferBeacon: true }
          );
        }
        return;
      }

      const addToCartButton = event.target.closest("[data-add-cart-post]");
      if (addToCartButton) {
        const post = findPost(addToCartButton.getAttribute("data-add-cart-post"));
        if (post) {
          addPostToCart(post);
        }
        return;
      }

      const likeButton = event.target.closest("[data-like-post]");
      if (likeButton) {
        const post = findPost(likeButton.getAttribute("data-like-post"));
        if (post) {
          await toggleLike(post);
        }
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
        updateStats();
        updateEmptyState();
        showToast(result.following ? "Store followed." : "Store unfollowed.");

        if (state.scope === "following") {
          await loadFeed({ reset: true });
        }
        return;
      }

      const shareButton = event.target.closest("[data-share-post]");
      if (shareButton) {
        const postId = Number(shareButton.getAttribute("data-share-post"));
        const post = findPost(postId);
        if (!post) {
          return;
        }

        try {
          await copyText(new URL(post.sharePath, window.location.origin).toString());
          await recordShare(post);
          trackBuyerSignal({
            action: "share_post",
            source: "feed-page",
            catalogItemId: post.catalogItemId || post.id,
            storeHandle: post.storeHandle,
            templateKey: post.templateKey,
            itemType: post.itemType,
          });
          showToast("Listing link copied.");
        } catch (error) {
          showToast("Copy failed.");
        }
        return;
      }

      const reactionButton = event.target.closest("[data-react-post]");
      if (reactionButton) {
        const post = findPost(reactionButton.getAttribute("data-react-post"));
        if (post) {
          await cycleReaction(post);
        }
        return;
      }

      const commentFocusButton = event.target.closest("[data-focus-comment]");
      if (commentFocusButton) {
        const postId = commentFocusButton.getAttribute("data-focus-comment");
        const input = document.querySelector(`#comment-input-${postId}`);
        input?.focus();
        return;
      }

      const postCommentButton = event.target.closest("[data-post-comment]");
      if (postCommentButton) {
        const postId = postCommentButton.getAttribute("data-post-comment");
        const input = document.querySelector(`#comment-input-${postId}`);
        const text = String(input?.value || "").trim();
        if (!text) {
          showToast("Type a comment first.");
          return;
        }

        const post = findPost(postId);
        if (post) {
          await submitComment(post, text);
          if (input) {
            input.value = "";
          }
        }
        return;
      }

      const gallery = event.target.closest("[data-gallery-open]");
      if (gallery) {
        const postId = Number(gallery.getAttribute("data-gallery-open"));
        const post = findPost(postId);
        if (post) {
          trackBuyerSignal({
            action: "view_product",
            source: "feed-gallery",
            catalogItemId: post.catalogItemId || post.id,
            storeHandle: post.storeHandle,
            templateKey: post.templateKey,
            itemType: post.itemType,
          });
          openLightbox(post.images, 0);
        }
      }
    });

    elements.posts.addEventListener("keydown", (event) => {
      const gallery = event.target.closest("[data-gallery-open]");
      if (!gallery) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const postId = Number(gallery.getAttribute("data-gallery-open"));
        const post = findPost(postId);
        if (post) {
          trackBuyerSignal({
            action: "view_product",
            source: "feed-gallery",
            catalogItemId: post.catalogItemId || post.id,
            storeHandle: post.storeHandle,
            templateKey: post.templateKey,
            itemType: post.itemType,
          });
          openLightbox(post.images, 0);
        }
      }
    });
  }

  function bindGlobalEvents() {
    if (elements.footerYear) {
      elements.footerYear.textContent = String(new Date().getFullYear());
    }

    elements.scopeFollowing?.addEventListener("click", () => setScope("following"));
    elements.scopeAll?.addEventListener("click", () => setScope("all"));

    elements.search?.addEventListener("input", (event) => {
      state.query = event.target.value || "";
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        void loadFeed({ reset: true });
      }, SEARCH_DEBOUNCE_MS);
    });

    elements.emptyAction?.addEventListener("click", (event) => {
      if (elements.emptyAction.getAttribute("href") !== "#") {
        return;
      }

      event.preventDefault();
      if (state.scope === "following") {
        setScope("all");
      } else {
        state.query = "";
        if (elements.search) {
          elements.search.value = "";
        }
        void loadFeed({ reset: true });
      }
    });

    elements.lightboxPrev?.addEventListener("click", () => stepLightbox(-1));
    elements.lightboxNext?.addEventListener("click", () => stepLightbox(1));
    elements.lightboxClose?.addEventListener("click", closeLightbox);
    elements.lightboxBackdrop?.addEventListener("click", closeLightbox);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (!elements.lightbox?.classList.contains("is-open")) {
        return;
      }

      if (event.key === "ArrowRight") {
        stepLightbox(1);
      }

      if (event.key === "ArrowLeft") {
        stepLightbox(-1);
      }
    });

    window.addEventListener("zest:followed-stores-changed", () => {
      syncFollowButtons();
      updateStats();
      updateEmptyState();
      if (state.scope === "following") {
        void loadFeed({ reset: true });
      }
    });
  }

  async function init() {
    setLoadingState(true);
    clearFeedError();

    if (elements.scopeFollowing) {
      elements.scopeFollowing.classList.toggle("is-active", false);
    }
    if (elements.scopeAll) {
      elements.scopeAll.classList.add("is-active");
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || !state.hasMore || state.isFetching) {
          return;
        }

        void loadFeed({ reset: false });
      },
      {
        threshold: 0.2,
      }
    );

    bindPostEvents();
    bindGlobalEvents();
    const api = followingApi();
    if (api && typeof api.init === "function") {
      await api.init();
    }

    trackBuyerSignal({
      action: "view_feed",
      source: "feed-page",
    });
    const followed = getFollowedHandles();
    state.scope = feedMode === "buyer" && followed.length ? "following" : "all";
    elements.scopeFollowing?.classList.toggle("is-active", state.scope === "following");
    elements.scopeAll?.classList.toggle("is-active", state.scope === "all");
    await loadFeed({ reset: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
