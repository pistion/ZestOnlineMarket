const { resolveIdentitySource } = require("../repositories/repository-source");
const { buildFeedPayload } = require("./feed.service");
const {
  addBuyerWishlistItem,
  createBuyerAddress,
  deleteBuyerAddress,
  getBuyerDomainSnapshot,
  followStore,
  listBuyerAddresses,
  listBuyerRecentlyViewed,
  listBuyerWishlist,
  recordBuyerPreferenceSignal,
  removeBuyerWishlistItem,
  saveBuyerProfileSetup,
  unfollowStore,
  updateBuyerAddress,
  updateBuyerSettings,
} = require("../repositories/buyer.repository");

function formatActivityTime(value) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildBuyerActivity(snapshot) {
  const activities = [];

  snapshot.following.slice(0, 2).forEach((store) => {
    activities.push({
      type: "followed-store",
      icon: "fa-solid fa-store",
      text: `Following ${store.storeName || `@${store.handle}`}`,
      time: formatActivityTime(store.followedAt),
      href: store.storePath || (store.handle ? `/stores/${encodeURIComponent(store.handle)}` : "/marketplace"),
    });
  });

  snapshot.purchases.slice(0, 2).forEach((purchase) => {
    activities.push({
      type: "purchase",
      icon: "fa-solid fa-bag-shopping",
      text: `Purchased ${purchase.title || "a listing"}`,
      time: formatActivityTime(purchase.purchasedAt),
      href: purchase.productPath || purchase.storePath || "/marketplace",
    });
  });

  snapshot.wishlist.slice(0, 2).forEach((item) => {
    activities.push({
      type: "saved-item",
      icon: "fa-solid fa-heart",
      text: `Saved ${item.title || "an item"} to wishlist`,
      time: formatActivityTime(item.savedAt),
      href: item.productPath || "/marketplace",
    });
  });

  if (!activities.length) {
    activities.push({
      type: "welcome",
      icon: "fa-solid fa-sparkles",
      text: "Start following stores to build your personalized buyer activity.",
      time: "Now",
      href: "/marketplace",
    });
  }

  return activities.slice(0, 4);
}

function buildBuyerStoreNetwork(snapshot) {
  return snapshot.following.slice(0, 3).map((store) => ({
    id: store.storeId,
    title: `Updates and drops from ${store.storeName || `@${store.handle}`}`,
    meta: `Followed store - ${formatActivityTime(store.followedAt)}`,
    thumbnailUrl: store.avatarUrl || store.coverUrl || "",
    storePath: store.storePath || (store.handle ? `/stores/${encodeURIComponent(store.handle)}` : "/marketplace"),
    actionLabel: "Open seller profile",
    secondaryActionLabel: "Marketplace",
  }));
}

function buildBuyerInsights(snapshot, feedPayload) {
  const preferences = snapshot.preferences || {};
  const favoriteCategories = Array.isArray(preferences.favoriteCategories)
    ? preferences.favoriteCategories.slice(0, 4)
    : [];
  const favoriteTemplates = Array.isArray(preferences.favoriteTemplates)
    ? preferences.favoriteTemplates.slice(0, 4)
    : [];
  const viewedItemsCount = Array.isArray(preferences.viewedItems) ? preferences.viewedItems.length : 0;
  const personalizedFeed = Boolean(feedPayload && feedPayload.meta && feedPayload.meta.personalized);

  const highlights = [
    {
      label: "Feed status",
      value: personalizedFeed ? "Personalized" : "Learning your taste",
      meta: personalizedFeed
        ? "Followed stores and interests are shaping the order."
        : "Browse more stores and listings to sharpen recommendations.",
      tone: personalizedFeed ? "active" : "neutral",
    },
    {
      label: "Top categories",
      value: favoriteCategories.length ? favoriteCategories.join(", ") : "Not enough signals yet",
      meta: favoriteCategories.length
        ? "Built from your recent buyer activity."
        : "Your viewed listings and follows will fill this in.",
      tone: favoriteCategories.length ? "active" : "neutral",
    },
    {
      label: "Storefront styles",
      value: favoriteTemplates.length ? favoriteTemplates.join(", ") : "Still discovering",
      meta: favoriteTemplates.length
        ? "These storefront types are showing up more often."
        : "Template affinities will grow as you interact.",
      tone: favoriteTemplates.length ? "active" : "neutral",
    },
    {
      label: "Viewed listings",
      value: String(viewedItemsCount),
      meta:
        viewedItemsCount > 0
          ? "Recent listing views are feeding the recommendation engine."
          : "Your viewed-item history will appear here.",
      tone: viewedItemsCount > 0 ? "active" : "neutral",
    },
  ];

  const badges = [];
  if (personalizedFeed) {
    badges.push("Personalized feed live");
  }
  favoriteCategories.forEach((category) => badges.push(`Category: ${category}`));
  favoriteTemplates.forEach((template) => badges.push(`Style: ${template}`));
  if (!badges.length) {
    badges.push("Start following stores to build your buyer pulse");
  }

  return {
    personalizedFeed,
    favoriteCategories,
    favoriteTemplates,
    viewedItemsCount,
    badges: badges.slice(0, 6),
    highlights,
    summary: personalizedFeed
      ? "Your profile is now tuned by real store follows, viewed listings, and storefront styles."
      : "Your buyer profile is ready. Follow a few stores and open more listings to personalize it.",
  };
}

function buildBuyerNetwork(feedPayload) {
  const items = Array.isArray(feedPayload && feedPayload.items) ? feedPayload.items : [];
  if (!items.length) {
    return [];
  }

  return items.slice(0, 3).map((item) => ({
    id: item.feedItemId || item.catalogItemId || item.id,
    title: item.title || `Update from ${item.storeName || "Marketplace store"}`,
    meta: item.isFollowedStore
      ? `From a followed store - ${formatActivityTime(item.createdAt)}`
      : "Suggested because it matches your marketplace signals",
    thumbnailUrl: item.thumbnail || (Array.isArray(item.images) ? item.images[0] : "") || "",
    storePath: item.storePath || "/marketplace",
    productPath: item.productPath || "",
    actionLabel: item.productPath ? "Open listing" : "Open seller profile",
    secondaryActionLabel: "Seller profile",
  }));
}

function buildBuyerFeedPreview(feedPayload) {
  const items = Array.isArray(feedPayload && feedPayload.items) ? feedPayload.items : [];
  return items.filter((item) => item && item.isFollowedStore).slice(0, 4);
}

function buildBuyerInteractionFeed(feedPayload) {
  const items = Array.isArray(feedPayload && feedPayload.items) ? feedPayload.items : [];
  return items.filter((item) => item && item.source === "feed_item");
}

async function buildBuyerSnapshot(user, options = {}) {
  const snapshot = await getBuyerDomainSnapshot(user.id, options);
  const feedPayload = await buildFeedPayload(user, {
    ...options,
    includeFallbackItems: false,
  });
  const insights = buildBuyerInsights(snapshot, feedPayload);
  const feedPreview = buildBuyerFeedPreview(feedPayload);
  const interactionFeed = buildBuyerInteractionFeed(feedPayload);

  return {
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: snapshot.profile,
    following: snapshot.following,
    purchases: snapshot.purchases,
    wishlist: snapshot.wishlist,
    recentlyViewed: snapshot.recentlyViewed,
    addresses: snapshot.addresses,
    recommendations: snapshot.recommendations,
    preferences: snapshot.preferences,
    feedPreview,
    activity: buildBuyerActivity(snapshot),
    interactions: buildBuyerNetwork({
      ...feedPayload,
      items: interactionFeed,
    }),
    storeNetwork: buildBuyerStoreNetwork(snapshot),
    insights,
    stats: snapshot.stats,
    meta: {
      source: resolveIdentitySource(options),
      stage: "phase-4-buyer-engine",
    },
  };
}

async function buildBuyerSettingsWorkspace(user, options = {}) {
  const snapshot = await getBuyerDomainSnapshot(user.id, options);
  return {
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: snapshot.profile,
    preferences: snapshot.preferences,
    addresses: snapshot.addresses,
    recentlyViewed: snapshot.recentlyViewed,
    wishlist: snapshot.wishlist,
    stats: snapshot.stats,
    meta: {
      source: resolveIdentitySource(options),
      stage: "phase-4-buyer-settings",
    },
  };
}

async function followBuyerStore(user, handle, options = {}) {
  const result = await followStore(user.id, handle, options);
  if (!result) {
    return null;
  }

  return {
    following: result.following,
    handles: result.followingList.map((store) => store.handle),
    followingList: result.followingList,
  };
}

async function unfollowBuyerStore(user, handle, options = {}) {
  const result = await unfollowStore(user.id, handle, options);
  if (!result) {
    return null;
  }

  return {
    following: result.following,
    handles: result.followingList.map((store) => store.handle),
    followingList: result.followingList,
  };
}

async function recordBuyerInteraction(user, signal, options = {}) {
  if (!user || user.role !== "buyer") {
    return {
      tracked: false,
      preferences: null,
    };
  }

  const preferences = await recordBuyerPreferenceSignal(user.id, signal, options);
  return {
    tracked: true,
    preferences,
  };
}

async function saveBuyerSetup(user, payload, options = {}) {
  const result = await saveBuyerProfileSetup(user.id, payload, options);
  if (!result) {
    return null;
  }

  return {
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: result.profile,
    preferences: result.preferences,
    meta: {
      source: resolveIdentitySource(options),
      stage: "buyer-wizard-setup",
    },
  };
}

async function saveBuyerAccountSettings(user, payload, options = {}) {
  const result = await updateBuyerSettings(user.id, payload, options);
  if (!result) {
    return null;
  }

  return {
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: result.profile,
    preferences: result.preferences,
    meta: {
      source: resolveIdentitySource(options),
      stage: "phase-4-buyer-settings-save",
    },
  };
}

async function createBuyerAddressEntry(user, payload, options = {}) {
  const address = await createBuyerAddress(user.id, payload, options);
  const addresses = await listBuyerAddresses(user.id, options);
  return {
    address,
    addresses,
  };
}

async function updateBuyerAddressEntry(user, addressId, payload, options = {}) {
  const address = await updateBuyerAddress(user.id, addressId, payload, options);
  const addresses = await listBuyerAddresses(user.id, options);
  return {
    address,
    addresses,
  };
}

async function deleteBuyerAddressEntry(user, addressId, options = {}) {
  const removed = await deleteBuyerAddress(user.id, addressId, options);
  const addresses = await listBuyerAddresses(user.id, options);
  return {
    removed,
    addresses,
  };
}

async function listBuyerWishlistWorkspace(user, options = {}) {
  const wishlist = await listBuyerWishlist(user.id, options);
  return {
    wishlist,
    ids: wishlist.map((item) => Number(item.productId)).filter(Boolean),
  };
}

async function addBuyerWishlistEntry(user, productId, options = {}) {
  const wishlist = await addBuyerWishlistItem(user.id, productId, options);
  if (!wishlist) {
    return null;
  }

  return {
    saved: true,
    wishlist,
    ids: wishlist.map((item) => Number(item.productId)).filter(Boolean),
  };
}

async function removeBuyerWishlistEntry(user, productId, options = {}) {
  const wishlist = await removeBuyerWishlistItem(user.id, productId, options);
  return {
    saved: false,
    wishlist,
    ids: wishlist.map((item) => Number(item.productId)).filter(Boolean),
  };
}

async function listBuyerRecentlyViewedWorkspace(user, options = {}) {
  const items = await listBuyerRecentlyViewed(user.id, options);
  return {
    items,
    count: items.length,
  };
}

module.exports = {
  addBuyerWishlistEntry,
  buildBuyerSettingsWorkspace,
  buildBuyerSnapshot,
  createBuyerAddressEntry,
  deleteBuyerAddressEntry,
  followBuyerStore,
  listBuyerRecentlyViewedWorkspace,
  listBuyerWishlistWorkspace,
  recordBuyerInteraction,
  removeBuyerWishlistEntry,
  saveBuyerAccountSettings,
  saveBuyerSetup,
  unfollowBuyerStore,
  updateBuyerAddressEntry,
};
