const { all, get, run } = require("../config/db");
const { findCatalogItemByPublicId, listPublicCatalogItems } = require("./catalog.repository");
const { findStoreByHandle, findStoreById } = require("./store.repository");
const { findUserById } = require("./user.repository");
const { getPostgresExecutor, resolveIdentitySource } = require("./repository-source");
const { deriveBuyerProfileCompleted } = require("../utils/profile-state");

function displayNameFromEmail(email = "") {
  const base = String(email || "")
    .trim()
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!base) {
    return "Buyer";
  }

  return base
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJsonValue(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function uniqueLowerStrings(values = []) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function clampRecentValues(values = [], limit = 24) {
  return uniqueLowerStrings(values).slice(0, limit);
}

function incrementCounter(bucket, key, amount = 1) {
  if (!key) {
    return;
  }

  const normalizedKey = String(key || "").trim().toLowerCase();
  if (!normalizedKey) {
    return;
  }

  bucket[normalizedKey] = Number(bucket[normalizedKey] || 0) + amount;
}

function topKeys(bucket, limit = 6) {
  return Object.entries(bucket || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
    .slice(0, limit)
    .map(([key]) => key);
}

function normalizeStoreHandle(value = "") {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

function resolveTemplateLikeItemType(itemType, templateKey) {
  const normalizedItemType = String(itemType || "").trim().toLowerCase();
  if (normalizedItemType) {
    return normalizedItemType;
  }

  const normalizedTemplate = String(templateKey || "").trim().toLowerCase();
  if (!normalizedTemplate || normalizedTemplate === "products") {
    return "product";
  }

  return normalizedTemplate;
}

function buildEmptyInteractionSummary() {
  return {
    actions: {},
    categories: {},
    templates: {},
    stores: {},
    sources: {},
    lastAction: "",
    lastSource: "",
    updatedAt: null,
  };
}

function normalizeInteractionSummary(value) {
  const parsed = parseJsonValue(value, {});
  return {
    ...buildEmptyInteractionSummary(),
    ...(parsed && typeof parsed === "object" ? parsed : {}),
    actions: { ...(parsed && parsed.actions ? parsed.actions : {}) },
    categories: { ...(parsed && parsed.categories ? parsed.categories : {}) },
    templates: { ...(parsed && parsed.templates ? parsed.templates : {}) },
    stores: { ...(parsed && parsed.stores ? parsed.stores : {}) },
    sources: { ...(parsed && parsed.sources ? parsed.sources : {}) },
  };
}

function buildPreferenceWeight(action) {
  switch (String(action || "").trim().toLowerCase()) {
    case "purchase_item":
      return 8;
    case "follow_store":
      return 5;
    case "share_post":
      return 4;
    case "open_listing":
    case "view_product":
      return 3;
    case "open_store":
    case "view_store":
      return 2;
    default:
      return 1;
  }
}

function buildFallbackBuyerProfile(user) {
  if (!user || user.role !== "buyer") {
    return null;
  }

  return {
    id: null,
    userId: toNumber(user.id),
    email: String(user.email || "").trim(),
    displayName: displayNameFromEmail(user.email),
    fullName: String(user.fullName || "").trim(),
    phone: String(user.phone || "").trim(),
    avatarUrl: String(user.avatarUrl || "").trim(),
    coverUrl: "",
    bio: "",
    profileCompleted: deriveBuyerProfileCompleted(user),
  };
}

function mapBuyerProfile(row) {
  if (!row) {
    return null;
  }

  const fullName = String(row.full_name || row.fullName || "").trim();
  const email = String(row.email || "").trim();

  return {
    id: toNumber(row.id, 0) || null,
    userId: toNumber(row.user_id || row.userId || row.id),
    email,
    displayName: fullName || displayNameFromEmail(email),
    fullName,
    phone: String(row.phone || "").trim(),
    avatarUrl: String(row.avatar_url || row.avatarUrl || "").trim(),
    coverUrl: String(row.cover_url || row.coverUrl || "").trim(),
    bio: String(row.bio || "").trim(),
    profileCompleted: deriveBuyerProfileCompleted(row),
  };
}

function mapBuyerPreferences(row) {
  if (!row) {
    return {
      favoriteCategories: [],
      favoriteTemplates: [],
      viewedItems: [],
      interactionSummary: buildEmptyInteractionSummary(),
    };
  }

  return {
    favoriteCategories: uniqueLowerStrings(
      Array.isArray(parseJsonValue(row.popular_categories || row.favoriteCategories, []))
        ? parseJsonValue(row.popular_categories || row.favoriteCategories, [])
        : []
    ),
    favoriteTemplates: uniqueLowerStrings(
      Array.isArray(parseJsonValue(row.favorite_templates || row.favoriteTemplates, []))
        ? parseJsonValue(row.favorite_templates || row.favoriteTemplates, [])
        : []
    ),
    viewedItems: clampRecentValues(
      Array.isArray(parseJsonValue(row.viewed_products || row.viewedItems, []))
        ? parseJsonValue(row.viewed_products || row.viewedItems, [])
        : [],
      24
    ),
    interactionSummary: normalizeInteractionSummary(
      row.interaction_summary || row.interactionSummary
    ),
  };
}

function toJsonb(knex, value) {
  return knex.raw("?::jsonb", [JSON.stringify(value == null ? {} : value)]);
}

function buildBuyerPreferencesUpdate(preferences = {}) {
  const interactionSummary = normalizeInteractionSummary(preferences.interactionSummary);

  return {
    favoriteCategories: topKeys(interactionSummary.categories, 6),
    favoriteTemplates: topKeys(interactionSummary.templates, 6),
    viewedItems: clampRecentValues(preferences.viewedItems || [], 24),
    interactionSummary,
  };
}

function mapFollowedStore(row) {
  const handle = String(row.handle || "").trim();
  return {
    storeId: toNumber(row.store_id || row.storeId),
    handle,
    storeName: String(row.store_name || row.storeName || "").trim(),
    templateKey: String(row.template_key || row.templateKey || "products").trim(),
    tagline: String(row.tagline || "").trim(),
    about: String(row.description || row.about || "").trim(),
    avatarUrl: String(row.logo_media_url || row.avatarUrl || "").trim(),
    coverUrl: String(row.cover_media_url || row.coverUrl || "").trim(),
    storePath: handle ? `/stores/${encodeURIComponent(handle)}` : "/marketplace",
    followedAt: row.created_at || row.createdAt || null,
  };
}

function mapWishlistItem(row) {
  const productId = toNumber(row.product_id || row.catalog_item_id || row.id);
  const imageUrl = String(row.thumbnail || row.media_url || row.url || "").trim();

  return {
    id: productId,
    productId,
    storeId: toNumber(row.store_id || row.storeId),
    storeHandle: String(row.handle || "").trim(),
    storeName: String(row.store_name || row.storeName || "").trim(),
    title: String(row.title || row.name || "").trim() || "Saved item",
    description: String(row.description || "").trim(),
    price: Number(row.price || 0),
    location: String(row.location || "").trim(),
    delivery: String(row.delivery || "").trim(),
    imageUrl,
    productPath: productId ? `/products/${productId}` : "/marketplace",
    storePath: row.handle ? `/stores/${encodeURIComponent(row.handle)}` : "/marketplace",
    savedAt: row.created_at || row.createdAt || null,
  };
}

function mapBuyerAddress(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0) || null,
    addressType: String(row.address_type || row.addressType || "shipping").trim().toLowerCase(),
    addressLine1: String(row.address_line_1 || row.addressLine1 || "").trim(),
    addressLine2: String(row.address_line_2 || row.addressLine2 || "").trim(),
    city: String(row.city || "").trim(),
    region: String(row.region || "").trim(),
    postalCode: String(row.postal_code || row.postalCode || "").trim(),
    countryCode: String(row.country_code || row.countryCode || "").trim().toUpperCase(),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
    summary: [
      String(row.address_line_1 || row.addressLine1 || "").trim(),
      String(row.city || "").trim(),
      String(row.region || "").trim(),
      String(row.country_code || row.countryCode || "").trim().toUpperCase(),
    ]
      .filter(Boolean)
      .join(", "),
  };
}

function mapRecentlyViewedItem(row, viewedAt = null) {
  const wishlistShape = mapWishlistItem(row);
  return {
    ...wishlistShape,
    viewedAt,
  };
}

function mapPurchaseItem(row) {
  const productId = toNumber(row.product_id || row.catalog_item_id || row.productId);
  const imageUrl = String(row.thumbnail || row.media_url || row.url || "").trim();

  return {
    id: toNumber(row.id || row.order_id || row.orderId),
    orderId: toNumber(row.order_id || row.orderId || row.id),
    productId,
    storeId: toNumber(row.store_id || row.storeId),
    storeHandle: String(row.handle || "").trim(),
    storeName: String(row.store_name || row.storeName || "").trim(),
    title: String(row.title || row.name || "Recent purchase").trim(),
    price: Number(row.price || row.total_amount || row.totalAmount || 0),
    totalAmount: Number(row.total_amount || row.totalAmount || row.price || 0),
    status: String(row.status || "pending").trim() || "pending",
    imageUrl,
    purchasedAt: row.purchased_at || row.created_at || row.createdAt || null,
    orderPath: toNumber(row.order_id || row.orderId || row.id)
      ? `/buyer/purchases/${toNumber(row.order_id || row.orderId || row.id)}`
      : "",
    productPath: productId ? `/products/${productId}` : "/marketplace",
    storePath: row.handle ? `/stores/${encodeURIComponent(row.handle)}` : "/marketplace",
  };
}

function buildRecommendationReason(item, context = {}) {
  const followedHandles = new Set(context.followedHandles || []);
  const preferredTemplates = new Set(context.preferredTemplates || []);

  if (followedHandles.has(item.storeHandle)) {
    return `From a store you follow: ${item.storeName}`;
  }

  if (preferredTemplates.has(item.templateKey)) {
    return `Matches your preferred ${item.templateKey} storefronts`;
  }

  if (item.storeName) {
    return `Trending now from ${item.storeName}`;
  }

  return "Recommended for your marketplace activity";
}

async function findCustomerProfileRecordByUserId(userId, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return get("SELECT * FROM customer_profiles WHERE userId = ?", [userId]);
  }

  const knex = getPostgresExecutor(options);
  return knex("customer_profiles as cp")
    .join("users as u", "u.id", "cp.user_id")
    .select(
      "cp.id",
      "cp.user_id",
      "cp.full_name",
      "cp.email",
      "cp.phone",
      "cp.avatar_url",
      "cp.cover_url",
      "cp.bio",
      "cp.profile_completed"
    )
    .where("cp.user_id", userId)
    .first();
}

async function ensureBuyerPreferencesByProfileId(profileId, options = {}) {
  const source = resolveIdentitySource(options);
  if (!profileId) {
    return null;
  }

  if (source === "sqlite") {
    const row = await get("SELECT * FROM customer_preferences WHERE customerProfileId = ?", [profileId]);
    if (row) {
      return row;
    }

    await run(
      `INSERT INTO customer_preferences (
        customerProfileId, favoriteCategories, favoriteTemplates, viewedItems, interactionSummary
      ) VALUES (?, '[]', '[]', '[]', '{}')`,
      [profileId]
    );

    return get("SELECT * FROM customer_preferences WHERE customerProfileId = ?", [profileId]);
  }

  const knex = getPostgresExecutor(options);
  await knex("customer_preferences")
    .insert({
      customer_profile_id: profileId,
      popular_categories: toJsonb(knex, []),
      favorite_templates: toJsonb(knex, []),
      viewed_products: toJsonb(knex, []),
      interaction_summary: toJsonb(knex, {}),
    })
    .onConflict("customer_profile_id")
    .ignore();

  return knex("customer_preferences")
    .where({ customer_profile_id: profileId })
    .first();
}

async function createBuyerProfileForUser({ userId, email }, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    await run(
      `INSERT INTO customer_profiles (userId, email, profileCompleted)
        VALUES (?, ?, 0)
        ON CONFLICT(userId) DO UPDATE SET email = excluded.email`,
      [userId, email]
    );

    const row = await findCustomerProfileRecordByUserId(userId, options);
    if (row && row.id) {
      await ensureBuyerPreferencesByProfileId(row.id, options);
    }
    return mapBuyerProfile(row);
  }

  const knex = getPostgresExecutor(options);
  await knex("customer_profiles")
    .insert({
      user_id: userId,
      email,
      profile_completed: false,
    })
    .onConflict("user_id")
    .merge({
      email,
      updated_at: knex.fn.now(),
    });

  const row = await findCustomerProfileRecordByUserId(userId, options);
  if (row && row.id) {
    await ensureBuyerPreferencesByProfileId(row.id, options);
  }
  return mapBuyerProfile(row);
}

async function ensureBuyerProfileByUserId(userId, options = {}) {
  const existingProfile = await findCustomerProfileRecordByUserId(userId, options);
  if (existingProfile) {
    if (existingProfile.id) {
      await ensureBuyerPreferencesByProfileId(existingProfile.id, options);
    }
    return mapBuyerProfile(existingProfile);
  }

  const user = await findUserById(userId, options);
  if (!user || user.role !== "buyer") {
    return null;
  }

  return createBuyerProfileForUser(
    {
      userId: user.id,
      email: user.email,
    },
    options
  );
}

async function findBuyerProfileByUserId(userId, options = {}) {
  const row = await findCustomerProfileRecordByUserId(userId, options);
  if (row) {
    return mapBuyerProfile(row);
  }

  const user = await findUserById(userId, options);
  return buildFallbackBuyerProfile(user);
}

async function findBuyerPreferencesByUserId(userId, options = {}) {
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return mapBuyerPreferences(null);
  }

  const row = await ensureBuyerPreferencesByProfileId(profile.id, options);
  return mapBuyerPreferences(row);
}

async function persistBuyerPreferencesByProfileId(profileId, preferences, options = {}) {
  const source = resolveIdentitySource(options);
  const normalized = buildBuyerPreferencesUpdate(preferences);

  if (source === "sqlite") {
    await run(
      `UPDATE customer_preferences
      SET favoriteCategories = ?, favoriteTemplates = ?, viewedItems = ?, interactionSummary = ?
      WHERE customerProfileId = ?`,
      [
        JSON.stringify(normalized.favoriteCategories),
        JSON.stringify(normalized.favoriteTemplates),
        JSON.stringify(normalized.viewedItems),
        JSON.stringify(normalized.interactionSummary),
        profileId,
      ]
    );
  } else {
    const knex = getPostgresExecutor(options);
    await knex("customer_preferences")
      .where({ customer_profile_id: profileId })
      .update({
        popular_categories: toJsonb(knex, normalized.favoriteCategories),
        favorite_templates: toJsonb(knex, normalized.favoriteTemplates),
        viewed_products: toJsonb(knex, normalized.viewedItems),
        interaction_summary: toJsonb(knex, normalized.interactionSummary),
        updated_at: knex.fn.now(),
      });
  }

  return normalized;
}

async function persistBuyerProfileData(userId, payload, persistOptions = {}) {
  const source = resolveIdentitySource(persistOptions);
  const user = await findUserById(userId, persistOptions);
  if (!user || user.role !== "buyer") {
    return null;
  }

  const existingProfile = await ensureBuyerProfileByUserId(userId, persistOptions);
  if (!existingProfile || !existingProfile.id) {
    return null;
  }

  const existingPreferences = await findBuyerPreferencesByUserId(userId, persistOptions);
  const profileCompleted =
    typeof persistOptions.markCompleted === "boolean"
      ? persistOptions.markCompleted
      : Boolean(existingProfile.profileCompleted);

  if (source === "sqlite") {
    await run(
      `INSERT INTO customer_profiles (
        userId, fullName, email, phone, avatarUrl, coverUrl, bio, profileCompleted
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        fullName = excluded.fullName,
        email = excluded.email,
        phone = excluded.phone,
        avatarUrl = excluded.avatarUrl,
        coverUrl = excluded.coverUrl,
        bio = excluded.bio,
        profileCompleted = excluded.profileCompleted`,
      [
        userId,
        payload.fullName,
        user.email,
        payload.phone,
        payload.avatarUrl,
        payload.coverUrl,
        payload.bio,
        profileCompleted ? 1 : 0,
      ]
    );

    await run(
      `UPDATE customer_preferences
      SET favoriteCategories = ?, favoriteTemplates = ?, viewedItems = ?, interactionSummary = ?
      WHERE customerProfileId = ?`,
      [
        JSON.stringify(payload.favoriteCategories),
        JSON.stringify(payload.favoriteTemplates),
        JSON.stringify(existingPreferences.viewedItems || []),
        JSON.stringify(existingPreferences.interactionSummary || buildEmptyInteractionSummary()),
        existingProfile.id,
      ]
    );
  } else {
    const knex = getPostgresExecutor(persistOptions);

    await knex("customer_profiles")
      .insert({
        user_id: userId,
        full_name: payload.fullName,
        email: user.email,
        phone: payload.phone,
        avatar_url: payload.avatarUrl,
        cover_url: payload.coverUrl,
        bio: payload.bio,
        profile_completed: profileCompleted,
      })
      .onConflict("user_id")
      .merge({
        full_name: payload.fullName,
        email: user.email,
        phone: payload.phone,
        avatar_url: payload.avatarUrl,
        cover_url: payload.coverUrl,
        bio: payload.bio,
        profile_completed: profileCompleted,
        updated_at: knex.fn.now(),
      });

    await knex("customer_preferences")
      .insert({
        customer_profile_id: existingProfile.id,
        popular_categories: toJsonb(knex, payload.favoriteCategories),
        favorite_templates: toJsonb(knex, payload.favoriteTemplates),
        viewed_products: toJsonb(knex, existingPreferences.viewedItems || []),
        interaction_summary: toJsonb(
          knex,
          existingPreferences.interactionSummary || buildEmptyInteractionSummary()
        ),
      })
      .onConflict("customer_profile_id")
      .merge({
        popular_categories: toJsonb(knex, payload.favoriteCategories),
        favorite_templates: toJsonb(knex, payload.favoriteTemplates),
        viewed_products: toJsonb(knex, existingPreferences.viewedItems || []),
        interaction_summary: toJsonb(
          knex,
          existingPreferences.interactionSummary || buildEmptyInteractionSummary()
        ),
        updated_at: knex.fn.now(),
      });
  }

  const profile = await findBuyerProfileByUserId(userId, persistOptions);
  const preferences = await findBuyerPreferencesByUserId(userId, persistOptions);

  return {
    profile,
    preferences,
  };
}

async function saveBuyerProfileSetup(userId, payload, options = {}) {
  return persistBuyerProfileData(userId, payload, {
    ...options,
    markCompleted: true,
  });
}

async function updateBuyerSettings(userId, payload, options = {}) {
  const source = resolveIdentitySource(options);
  const existingProfile = await ensureBuyerProfileByUserId(userId, options);
  return persistBuyerProfileData(userId, payload, {
    ...options,
    markCompleted: Boolean(existingProfile && existingProfile.profileCompleted),
    source,
  });
}

async function resolveBuyerInteractionContext(signal = {}, options = {}) {
  const context = {
    action: String(signal.action || "view_feed").trim().toLowerCase() || "view_feed",
    source: String(signal.source || "").trim().toLowerCase(),
    storeId: signal.storeId ? toNumber(signal.storeId, 0) : 0,
    storeHandle: normalizeStoreHandle(signal.storeHandle),
    templateKey: String(signal.templateKey || "").trim().toLowerCase(),
    itemType: String(signal.itemType || "").trim().toLowerCase(),
    catalogItemId: signal.catalogItemId ? toNumber(signal.catalogItemId, 0) : 0,
  };

  if (context.catalogItemId > 0) {
    const catalogItem = await findCatalogItemByPublicId(context.catalogItemId, options);
    if (catalogItem) {
      context.storeId = toNumber(catalogItem.storeId, context.storeId);
      context.itemType = resolveTemplateLikeItemType(catalogItem.itemType, context.templateKey);
    }
  }

  if ((context.storeId > 0 || context.storeHandle) && (!context.storeHandle || !context.templateKey)) {
    const store =
      context.storeId > 0
        ? await findStoreById(context.storeId, options)
        : await findStoreByHandle(context.storeHandle, options);

    if (store) {
      context.storeId = toNumber(store.id, context.storeId);
      context.storeHandle = normalizeStoreHandle(store.handle || context.storeHandle);
      context.templateKey = String(store.templateKey || context.templateKey || "products")
        .trim()
        .toLowerCase();
      context.itemType = resolveTemplateLikeItemType(context.itemType, context.templateKey);
    }
  }

  context.itemType = resolveTemplateLikeItemType(context.itemType, context.templateKey);

  return context;
}

async function recordBuyerPreferenceSignal(userId, signal = {}, options = {}) {
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return mapBuyerPreferences(null);
  }

  const existingPreferences = await findBuyerPreferencesByUserId(userId, options);
  const interactionContext = await resolveBuyerInteractionContext(signal, options);

  const nextViewedItems = Array.isArray(existingPreferences.viewedItems)
    ? [...existingPreferences.viewedItems]
    : [];
  const interactionSummary = normalizeInteractionSummary(existingPreferences.interactionSummary);
  const actionWeight = buildPreferenceWeight(interactionContext.action);

  incrementCounter(interactionSummary.actions, interactionContext.action, 1);
  incrementCounter(interactionSummary.sources, interactionContext.source || "direct", 1);
  incrementCounter(interactionSummary.templates, interactionContext.templateKey, actionWeight);
  incrementCounter(interactionSummary.categories, interactionContext.itemType, actionWeight);
  incrementCounter(interactionSummary.stores, interactionContext.storeHandle, actionWeight);

  interactionSummary.lastAction = interactionContext.action;
  interactionSummary.lastSource = interactionContext.source || "direct";
  interactionSummary.updatedAt = new Date().toISOString();

  if (interactionContext.catalogItemId > 0) {
    nextViewedItems.unshift(String(interactionContext.catalogItemId));
  }

  return persistBuyerPreferencesByProfileId(
    profile.id,
    {
      favoriteCategories: existingPreferences.favoriteCategories,
      favoriteTemplates: existingPreferences.favoriteTemplates,
      viewedItems: nextViewedItems,
      interactionSummary,
    },
    options
  );
}

async function listBuyerFollowedStores(userId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return [];
  }

  if (source === "sqlite") {
    const rows = await all(
      `SELECT
        s.id AS store_id,
        s.handle,
        s.storeName AS store_name,
        s.templateKey AS template_key,
        s.tagline,
        s.about AS description,
        s.avatarUrl AS logo_media_url,
        s.coverUrl AS cover_media_url,
        cfs.createdAt AS created_at
      FROM customer_followed_stores cfs
      JOIN stores s ON s.id = cfs.storeId
      WHERE cfs.customerProfileId = ?
      ORDER BY datetime(cfs.createdAt) DESC, cfs.id DESC`,
      [profile.id]
    );

    return rows.map(mapFollowedStore);
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("customer_followed_stores as cfs")
    .join("stores as s", "s.id", "cfs.store_id")
    .select(
      "s.id as store_id",
      "s.handle",
      "s.store_name",
      "s.template_key",
      "s.tagline",
      "s.description",
      "s.logo_media_url",
      "s.cover_media_url",
      "cfs.created_at"
    )
    .where("cfs.customer_profile_id", profile.id)
    .orderBy("cfs.created_at", "desc");

  return rows.map(mapFollowedStore);
}

async function followStore(userId, handle, options = {}) {
  const normalizedHandle = normalizeStoreHandle(handle);
  if (!normalizedHandle) {
    return {
      following: false,
      followingList: await listBuyerFollowedStores(userId, options),
    };
  }

  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return {
      following: false,
      followingList: [],
    };
  }

  const store = await findStoreByHandle(normalizedHandle, options);
  if (!store) {
    return null;
  }

  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    await run(
      `INSERT INTO customer_followed_stores (customerProfileId, storeId)
        VALUES (?, ?)
        ON CONFLICT(customerProfileId, storeId) DO NOTHING`,
      [profile.id, store.id]
    );
  } else {
    const knex = getPostgresExecutor(options);
    await knex("customer_followed_stores")
      .insert({
        customer_profile_id: profile.id,
        store_id: store.id,
      })
      .onConflict(["customer_profile_id", "store_id"])
      .ignore();
  }

  const followingList = await listBuyerFollowedStores(userId, options);
  await recordBuyerPreferenceSignal(
    userId,
    {
      action: "follow_store",
      source: "following-api",
      storeHandle: store.handle,
      storeId: store.id,
      templateKey: store.templateKey,
    },
    options
  );

  return {
    following: true,
    store,
    followingList,
  };
}

async function unfollowStore(userId, handle, options = {}) {
  const normalizedHandle = normalizeStoreHandle(handle);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id || !normalizedHandle) {
    return {
      following: false,
      followingList: await listBuyerFollowedStores(userId, options),
    };
  }

  const store = await findStoreByHandle(normalizedHandle, options);
  if (!store) {
    return {
      following: false,
      followingList: await listBuyerFollowedStores(userId, options),
    };
  }

  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    await run(
      "DELETE FROM customer_followed_stores WHERE customerProfileId = ? AND storeId = ?",
      [profile.id, store.id]
    );
  } else {
    const knex = getPostgresExecutor(options);
    await knex("customer_followed_stores")
      .where({
        customer_profile_id: profile.id,
        store_id: store.id,
      })
      .del();
  }

  const followingList = await listBuyerFollowedStores(userId, options);
  return {
    following: false,
    store,
    followingList,
  };
}

async function listBuyerPurchases(userId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return [];
  }

  if (source === "sqlite") {
    const rows = await all(
      `SELECT
        cp.id,
        cp.storeId AS store_id,
        cp.productId AS product_id,
        cp.status,
        cp.totalAmount AS total_amount,
        cp.purchasedAt AS purchased_at,
        s.handle,
        s.storeName AS store_name,
        p.name AS title,
        p.price,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.productId = cp.productId
          ORDER BY pi.sortOrder ASC, pi.id ASC
          LIMIT 1
        ) AS thumbnail
      FROM customer_purchases cp
      LEFT JOIN stores s ON s.id = cp.storeId
      LEFT JOIN products p ON p.id = cp.productId
      WHERE cp.customerProfileId = ?
      ORDER BY datetime(cp.purchasedAt) DESC, cp.id DESC`,
      [profile.id]
    );

    return rows.map(mapPurchaseItem);
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("orders as o")
    .leftJoin("stores as s", "s.id", "o.store_id")
    .leftJoin("order_items as oi", "oi.order_id", "o.id")
    .leftJoin("catalog_items as ci", "ci.id", "oi.catalog_item_id")
    .leftJoin("catalog_media as cm", function joinMedia() {
      this.on("cm.catalog_item_id", "=", "ci.id").andOn("cm.is_cover", "=", knex.raw("true"));
    })
    .select(
      "o.id as order_id",
      "o.store_id",
      "o.status",
      "o.total_amount",
      "o.created_at",
      "s.handle",
      "s.store_name",
      "ci.id as catalog_item_id",
      "ci.title",
      "ci.price",
      "cm.media_url"
    )
    .where("o.customer_profile_id", profile.id)
    .orderBy("o.created_at", "desc");

  return rows.map(mapPurchaseItem);
}

async function listBuyerWishlist(userId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return [];
  }

  if (source === "sqlite") {
    const rows = await all(
      `SELECT
        w.id,
        w.productId AS product_id,
        p.storeId AS store_id,
        s.handle,
        s.storeName AS store_name,
        p.name AS title,
        p.description,
        p.price,
        p.location,
        p.delivery,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.productId = p.id
          ORDER BY pi.sortOrder ASC, pi.id ASC
          LIMIT 1
        ) AS thumbnail,
        w.createdAt AS created_at
      FROM wishlists w
      JOIN products p ON p.id = w.productId
      JOIN stores s ON s.id = p.storeId
      WHERE w.customerProfileId = ?
      ORDER BY datetime(w.createdAt) DESC, w.id DESC`,
      [profile.id]
    );

    return rows.map(mapWishlistItem);
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("wishlists as w")
    .join("catalog_items as ci", "ci.id", "w.catalog_item_id")
    .join("stores as s", "s.id", "ci.store_id")
    .leftJoin("catalog_media as cm", function joinMedia() {
      this.on("cm.catalog_item_id", "=", "ci.id").andOn("cm.is_cover", "=", knex.raw("true"));
    })
    .select(
      "w.id",
      "w.catalog_item_id",
      "ci.store_id",
      "s.handle",
      "s.store_name",
      "ci.title",
      "ci.description",
      "ci.price",
      "ci.location",
      "ci.delivery",
      "cm.media_url",
      "w.created_at"
    )
    .where("w.customer_profile_id", profile.id)
    .orderBy("w.created_at", "desc");

  return rows.map(mapWishlistItem);
}

async function listBuyerAddresses(userId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return [];
  }

  if (source === "sqlite") {
    const rows = await all(
      `SELECT
        id,
        addressType AS address_type,
        addressLine1 AS address_line_1,
        addressLine2 AS address_line_2,
        city,
        region,
        postalCode AS postal_code,
        countryCode AS country_code,
        createdAt AS created_at,
        updatedAt AS updated_at
      FROM customer_addresses
      WHERE customerProfileId = ?
      ORDER BY CASE WHEN lower(addressType) = 'shipping' THEN 0 ELSE 1 END, datetime(createdAt) DESC, id DESC`,
      [profile.id]
    );

    return rows.map(mapBuyerAddress);
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("customer_addresses")
    .select(
      "id",
      "address_type",
      "address_line_1",
      "address_line_2",
      "city",
      "region",
      "postal_code",
      "country_code",
      "created_at",
      "updated_at"
    )
    .where("customer_profile_id", profile.id)
    .orderByRaw("case when address_type = 'shipping' then 0 else 1 end asc")
    .orderBy("created_at", "desc")
    .orderBy("id", "desc");

  return rows.map(mapBuyerAddress);
}

async function createBuyerAddress(userId, payload, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return null;
  }

  if (source === "sqlite") {
    const result = await run(
      `INSERT INTO customer_addresses (
        customerProfileId, addressType, addressLine1, addressLine2, city, region, postalCode, countryCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        payload.addressType,
        payload.addressLine1,
        payload.addressLine2,
        payload.city,
        payload.region,
        payload.postalCode,
        payload.countryCode,
      ]
    );

    const row = await get("SELECT * FROM customer_addresses WHERE id = ?", [result.lastID]);
    return mapBuyerAddress(row);
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("customer_addresses")
    .insert({
      customer_profile_id: profile.id,
      address_type: payload.addressType,
      address_line_1: payload.addressLine1,
      address_line_2: payload.addressLine2,
      city: payload.city,
      region: payload.region,
      postal_code: payload.postalCode,
      country_code: payload.countryCode,
    })
    .returning([
      "id",
      "address_type",
      "address_line_1",
      "address_line_2",
      "city",
      "region",
      "postal_code",
      "country_code",
      "created_at",
      "updated_at",
    ]);

  return mapBuyerAddress(row);
}

async function updateBuyerAddress(userId, addressId, payload, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return null;
  }

  if (source === "sqlite") {
    await run(
      `UPDATE customer_addresses
      SET addressType = ?, addressLine1 = ?, addressLine2 = ?, city = ?, region = ?, postalCode = ?, countryCode = ?
      WHERE id = ? AND customerProfileId = ?`,
      [
        payload.addressType,
        payload.addressLine1,
        payload.addressLine2,
        payload.city,
        payload.region,
        payload.postalCode,
        payload.countryCode,
        addressId,
        profile.id,
      ]
    );

    const row = await get(
      "SELECT * FROM customer_addresses WHERE id = ? AND customerProfileId = ?",
      [addressId, profile.id]
    );
    return mapBuyerAddress(row);
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("customer_addresses")
    .where({
      id: addressId,
      customer_profile_id: profile.id,
    })
    .update({
      address_type: payload.addressType,
      address_line_1: payload.addressLine1,
      address_line_2: payload.addressLine2,
      city: payload.city,
      region: payload.region,
      postal_code: payload.postalCode,
      country_code: payload.countryCode,
      updated_at: knex.fn.now(),
    })
    .returning([
      "id",
      "address_type",
      "address_line_1",
      "address_line_2",
      "city",
      "region",
      "postal_code",
      "country_code",
      "created_at",
      "updated_at",
    ]);

  return mapBuyerAddress(row);
}

async function deleteBuyerAddress(userId, addressId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return false;
  }

  if (source === "sqlite") {
    const result = await run(
      "DELETE FROM customer_addresses WHERE id = ? AND customerProfileId = ?",
      [addressId, profile.id]
    );
    return Boolean(result && result.changes);
  }

  const knex = getPostgresExecutor(options);
  const deleted = await knex("customer_addresses")
    .where({
      id: addressId,
      customer_profile_id: profile.id,
    })
    .del();

  return deleted > 0;
}

async function addBuyerWishlistItem(userId, productId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return null;
  }

  const catalogItem = await findCatalogItemByPublicId(productId, {
    ...options,
    publicOnly: true,
  });
  if (!catalogItem) {
    return null;
  }

  if (source === "sqlite") {
    await run(
      `INSERT INTO wishlists (customerProfileId, productId)
      VALUES (?, ?)
      ON CONFLICT(customerProfileId, productId) DO NOTHING`,
      [profile.id, catalogItem.id]
    );
  } else {
    const knex = getPostgresExecutor(options);
    await knex("wishlists")
      .insert({
        customer_profile_id: profile.id,
        catalog_item_id: catalogItem.id,
      })
      .onConflict(["customer_profile_id", "catalog_item_id"])
      .ignore();
  }

  await recordBuyerPreferenceSignal(
    userId,
    {
      action: "save_wishlist",
      source: "wishlist-api",
      catalogItemId: catalogItem.id,
      storeId: catalogItem.storeId,
      itemType: catalogItem.itemType,
    },
    options
  );

  return listBuyerWishlist(userId, options);
}

async function removeBuyerWishlistItem(userId, productId, options = {}) {
  const source = resolveIdentitySource(options);
  const profile = await ensureBuyerProfileByUserId(userId, options);
  if (!profile || !profile.id) {
    return [];
  }

  if (source === "sqlite") {
    await run("DELETE FROM wishlists WHERE customerProfileId = ? AND productId = ?", [profile.id, productId]);
  } else {
    const knex = getPostgresExecutor(options);
    await knex("wishlists")
      .where({
        customer_profile_id: profile.id,
        catalog_item_id: productId,
      })
      .del();
  }

  return listBuyerWishlist(userId, options);
}

async function listBuyerRecentlyViewed(userId, options = {}) {
  const preferences = await findBuyerPreferencesByUserId(userId, options);
  const viewedIds = [...new Set((preferences.viewedItems || []).map((value) => toNumber(value, 0)).filter(Boolean))];
  if (!viewedIds.length) {
    return [];
  }

  const catalogItems = await listPublicCatalogItems(options);
  const itemMap = new Map(catalogItems.map((item) => [Number(item.id), item]));

  return viewedIds
    .map((productId) => {
      const item = itemMap.get(Number(productId));
      if (!item) {
        return null;
      }

      return mapRecentlyViewedItem(
        {
          ...item,
          product_id: item.id,
          store_id: item.storeId,
          store_name: item.storeName,
          thumbnail: item.thumbnail,
        },
        null
      );
    })
    .filter(Boolean)
    .slice(0, 8);
}

async function listBuyerRecommendations(userId, options = {}) {
  const [following, wishlist, preferences, catalogItems] = await Promise.all([
    listBuyerFollowedStores(userId, options),
    listBuyerWishlist(userId, options),
    findBuyerPreferencesByUserId(userId, options),
    listPublicCatalogItems(options),
  ]);

  const followedHandles = new Set(following.map((store) => store.handle));
  const preferredTemplates = new Set(
    (preferences.favoriteTemplates || []).concat(following.map((store) => store.templateKey)).filter(Boolean)
  );
  const preferredCategories = new Set((preferences.favoriteCategories || []).filter(Boolean));
  const interactionSummary = normalizeInteractionSummary(preferences.interactionSummary);
  const templateAffinity = interactionSummary.templates || {};
  const categoryAffinity = interactionSummary.categories || {};
  const viewedItemIds = new Set((preferences.viewedItems || []).map((value) => Number(value)));
  const wishlistedIds = new Set(wishlist.map((item) => Number(item.productId)));

  return catalogItems
    .filter((item) => !wishlistedIds.has(Number(item.id)))
    .map((item) => {
      const storeHandle = String(item.handle || "").trim();
      const templateKey = String(item.templateKey || "products").trim() || "products";
      const itemType = resolveTemplateLikeItemType(item.itemType, templateKey);
      let score = 0;

      if (followedHandles.has(storeHandle)) {
        score += 100;
      }
      if (preferredTemplates.has(templateKey)) {
        score += 40;
      }
      if (preferredCategories.has(itemType)) {
        score += 30;
      }
      score += Number(templateAffinity[templateKey] || 0) * 5;
      score += Number(categoryAffinity[itemType] || 0) * 4;
      if (viewedItemIds.has(Number(item.id))) {
        score -= 25;
      }

      const createdAtScore = new Date(item.createdAt || 0).getTime();
      score += Number.isFinite(createdAtScore) ? createdAtScore / 1_000_000_000 : 0;

      const mapped = mapWishlistItem({
        ...item,
        product_id: item.id,
        store_id: item.storeId,
        store_name: item.storeName,
        thumbnail: item.thumbnail,
      });

      return {
        ...mapped,
        templateKey,
        reason: buildRecommendationReason(
          {
            storeHandle,
            storeName: mapped.storeName,
            templateKey,
          },
          {
            followedHandles: [...followedHandles],
            preferredTemplates: [...preferredTemplates],
          }
        ),
        score,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ score, ...item }) => item);
}

async function getBuyerDomainSnapshot(userId, options = {}) {
  const [profile, following, purchases, wishlist, recommendations, preferences, addresses, recentlyViewed] =
    await Promise.all([
    findBuyerProfileByUserId(userId, options),
    listBuyerFollowedStores(userId, options),
    listBuyerPurchases(userId, options),
    listBuyerWishlist(userId, options),
    listBuyerRecommendations(userId, options),
    findBuyerPreferencesByUserId(userId, options),
    listBuyerAddresses(userId, options),
    listBuyerRecentlyViewed(userId, options),
  ]);

  return {
    profile,
    following,
    purchases,
    wishlist,
    recommendations,
    preferences,
    addresses,
    recentlyViewed,
    stats: {
      following: following.length,
      purchases: purchases.length,
      wishlist: wishlist.length,
      savedStores: following.length,
      addresses: addresses.length,
      recentlyViewed: recentlyViewed.length,
    },
  };
}

module.exports = {
  addBuyerWishlistItem,
  createBuyerAddress,
  createBuyerProfileForUser,
  deleteBuyerAddress,
  ensureBuyerProfileByUserId,
  findBuyerPreferencesByUserId,
  findBuyerProfileByUserId,
  followStore,
  getBuyerDomainSnapshot,
  listBuyerAddresses,
  listBuyerFollowedStores,
  listBuyerPurchases,
  listBuyerRecentlyViewed,
  listBuyerRecommendations,
  listBuyerWishlist,
  recordBuyerPreferenceSignal,
  removeBuyerWishlistItem,
  saveBuyerProfileSetup,
  updateBuyerAddress,
  updateBuyerSettings,
  unfollowStore,
};
