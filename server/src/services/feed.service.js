const {
  findBuyerPreferencesByUserId,
  listBuyerFollowedStores,
} = require("../repositories/buyer.repository");
const { listFeedSourceItems } = require("../repositories/feed.repository");
const { hydrateFeedItemsWithEngagement } = require("./engagement.service");

function getTimestampValue(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))];
}

function normalizeInteractionSummary(value) {
  const summary = value && typeof value === "object" ? value : {};
  return {
    actions: summary.actions && typeof summary.actions === "object" ? summary.actions : {},
    categories: summary.categories && typeof summary.categories === "object" ? summary.categories : {},
    templates: summary.templates && typeof summary.templates === "object" ? summary.templates : {},
    stores: summary.stores && typeof summary.stores === "object" ? summary.stores : {},
    sources: summary.sources && typeof summary.sources === "object" ? summary.sources : {},
    lastAction: String(summary.lastAction || "").trim().toLowerCase(),
    lastSource: String(summary.lastSource || "").trim().toLowerCase(),
    updatedAt: summary.updatedAt || null,
  };
}

function getAffinityValue(bucket, key) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  if (!normalizedKey || !bucket || typeof bucket !== "object") {
    return 0;
  }

  return Number(bucket[normalizedKey] || 0);
}

function dedupeFallbackItems(persistedItems, fallbackItems) {
  const seenCatalogIds = new Set(
    persistedItems
      .map((item) => Number(item.catalogItemId || 0))
      .filter((value) => Number.isInteger(value) && value > 0)
  );

  return fallbackItems.filter((item) => {
    const catalogItemId = Number(item.catalogItemId || 0);
    if (!Number.isInteger(catalogItemId) || catalogItemId <= 0) {
      return true;
    }

    return !seenCatalogIds.has(catalogItemId);
  });
}

function buildRankedItems(items, context) {
  const followedSet = new Set(uniqueStrings(context.followedHandles));
  const preferredCategories = new Set(uniqueStrings(context.preferredCategories));
  const preferredTemplates = new Set(uniqueStrings(context.preferredTemplates));
  const viewedItems = new Set(
    uniqueStrings((context.viewedItems || []).map((value) => String(value || "").trim()))
  );
  const interactionSummary = normalizeInteractionSummary(context.interactionSummary);

  return items
    .map((item) => {
      const storeHandle = String(item.storeHandle || "").trim().toLowerCase();
      const templateKey = String(item.templateKey || "").trim().toLowerCase();
      const itemType = String(item.itemType || templateKey || "product").trim().toLowerCase();
      const catalogItemId = String(item.catalogItemId || "").trim();
      const createdAtWeight = Math.floor(getTimestampValue(item.createdAt) / 1_000_000);
      const storeAffinity = getAffinityValue(interactionSummary.stores, storeHandle);
      const templateAffinity = getAffinityValue(interactionSummary.templates, templateKey);
      const categoryAffinity = getAffinityValue(interactionSummary.categories, itemType);

      let score = createdAtWeight;
      const isFollowedStore = followedSet.has(storeHandle);
      const matchesCategory = preferredCategories.has(itemType);
      const matchesTemplate = preferredTemplates.has(templateKey);

      if (isFollowedStore) {
        score += 1_000_000_000;
      }

      if (matchesTemplate) {
        score += 300_000_000;
      }

      if (matchesCategory) {
        score += 150_000_000;
      }

      if (item.source === "feed_item") {
        score += 75_000_000;
      }

      score += storeAffinity * 50_000_000;
      score += templateAffinity * 16_000_000;
      score += categoryAffinity * 10_000_000;

      if (catalogItemId && viewedItems.has(catalogItemId)) {
        score -= 35_000_000;
      }

      return {
        ...item,
        isFollowedStore,
        matchesCategory,
        matchesTemplate,
        storeAffinity,
        templateAffinity,
        categoryAffinity,
        rankScore: score,
      };
    })
    .sort((left, right) => {
      if (left.rankScore !== right.rankScore) {
        return right.rankScore - left.rankScore;
      }

      return getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt);
    });
}

function filterFeedItems(items, context = {}) {
  const scope = String(context.scope || "all").trim().toLowerCase() || "all";
  const query = String(context.query || "").trim().toLowerCase();
  const followedSet = new Set(uniqueStrings(context.followedHandles));

  return items.filter((item) => {
    if (
      scope === "following" &&
      !followedSet.has(String(item.storeHandle || "").trim().toLowerCase())
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      item.storeName,
      item.storeHandle,
      item.title,
      item.description,
      item.delivery,
      item.location,
      item.templateKey,
      item.itemType,
      item.feedTag,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function buildPagination(totalItems, options = {}) {
  const pageSize = Math.max(1, Number(options.limit || 6));
  const page = Math.max(1, Number(options.page || 1));
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    offset,
    hasMore: safePage < totalPages,
    nextPage: safePage < totalPages ? safePage + 1 : null,
  };
}

async function buildFeedPayload(user = null, options = {}) {
  const { persistedItems, fallbackItems } = await listFeedSourceItems({
    ...options,
    limit: 0,
  });
  const includeFallbackItems = options.includeFallbackItems !== false;
  const scope = String(options.scope || "all").trim().toLowerCase() || "all";
  const query = String(options.query || "").trim();

  let followedStores = [];
  let preferences = {
    favoriteCategories: [],
    favoriteTemplates: [],
    viewedItems: [],
    interactionSummary: {},
  };

  if (user && user.role === "buyer") {
    [followedStores, preferences] = await Promise.all([
      listBuyerFollowedStores(user.id, options),
      findBuyerPreferencesByUserId(user.id, options),
    ]);
  }

  const followedHandles = followedStores.map((store) => store.handle);
  const preferredTemplates = uniqueStrings([
    ...(preferences.favoriteTemplates || []),
    ...followedStores.map((store) => store.templateKey),
  ]);
  const preferredCategories = uniqueStrings(preferences.favoriteCategories || []);
  const interactionSummary = normalizeInteractionSummary(preferences.interactionSummary);

  const combinedItems = includeFallbackItems
    ? [...persistedItems, ...dedupeFallbackItems(persistedItems, fallbackItems)]
    : persistedItems.slice();

  const rankedItems = buildRankedItems(combinedItems, {
    followedHandles,
    preferredTemplates,
    preferredCategories,
    viewedItems: preferences.viewedItems || [],
    interactionSummary,
  });
  const filteredItems = filterFeedItems(rankedItems, {
    scope,
    query,
    followedHandles,
  });
  const visibleStoreCount = new Set(
    filteredItems.map((item) => String(item.storeHandle || "").trim()).filter(Boolean)
  ).size;
  const pagination = buildPagination(filteredItems.length, options);
  const pageItems = filteredItems.slice(
    pagination.offset,
    pagination.offset + pagination.pageSize
  );
  const items = await hydrateFeedItemsWithEngagement(pageItems, user, options);

  return {
    items,
    followedHandles,
    meta: {
      personalized:
        followedHandles.length > 0 ||
        preferredTemplates.length > 0 ||
        preferredCategories.length > 0 ||
        Object.keys(interactionSummary.stores || {}).length > 0,
      source: includeFallbackItems ? "feed-items+catalog-fallback" : "feed-items-only",
      stage: "phase-6-discovery-engine",
      persistedCount: persistedItems.length,
      fallbackCount: includeFallbackItems ? fallbackItems.length : 0,
      scope,
      query,
      visibleStoreCount,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: pagination.totalItems,
        totalPages: pagination.totalPages,
        hasMore: pagination.hasMore,
        nextPage: pagination.nextPage,
      },
      affinity: {
        stores: Object.keys(interactionSummary.stores || {}).length,
        templates: Object.keys(interactionSummary.templates || {}).length,
        categories: Object.keys(interactionSummary.categories || {}).length,
        viewedItems: (preferences.viewedItems || []).length,
      },
    },
  };
}

module.exports = {
  buildFeedPayload,
};
