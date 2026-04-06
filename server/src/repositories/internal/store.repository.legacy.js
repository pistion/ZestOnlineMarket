const {
  findStoreByHandle: findLegacyStoreByHandle,
  findStoreById: findLegacyStoreById,
  findStoreByUserId: findLegacyStoreByUserId,
  listStoresForMarketplace: listLegacyStoresForMarketplace,
  upsertStoreByUserId: upsertLegacyStoreByUserId,
} = require("../../models/store.model");
const { getPostgresExecutor, resolveIdentitySource, resolveStoreWriteSource } = require("../repository-source");
const { deriveStoreProfileCompleted } = require("../../utils/profile-state");

function toNumber(value) {
  if (value == null || value === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeVisibilityStatus(value, profileCompleted = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["draft", "published", "unpublished"].includes(normalized)) {
    return normalized;
  }

  return profileCompleted ? "published" : "draft";
}

function mapStoreRow(row, socials = {}) {
  if (!row) {
    return null;
  }

  const profileCompleted = deriveStoreProfileCompleted(row);
  const setupStep = toNumber(row.setupStep || row.setup_step || 1) || 1;
  const setupState = row.setupState || row.setup_state || {};

  return {
    id: toNumber(row.id),
    userId: toNumber(row.userId || row.owner_user_id || row.ownerUserId),
    storeName: row.storeName || row.store_name || "",
    handle: row.handle || "",
    templateKey: row.templateKey || row.template_key || "products",
    tagline: row.tagline || "",
    about: row.about || row.description || "",
    accentColor: row.accentColor || row.accent_color || "#2563eb",
    avatarUrl: row.avatarUrl || row.logo_media_url || "",
    coverUrl: row.coverUrl || row.cover_media_url || "",
    instagram: socials.instagram || row.instagram || "",
    facebook: socials.facebook || row.facebook || "",
    tiktok: socials.tiktok || row.tiktok || "",
    xhandle: socials.xhandle || row.xhandle || "",
    profileCompleted,
    visibilityStatus: normalizeVisibilityStatus(
      row.visibilityStatus || row.visibility_status,
      profileCompleted
    ),
    publishedAt: row.publishedAt || row.published_at || null,
    setupStep,
    setupState: setupState && typeof setupState === "object" ? setupState : {},
  };
}

function mapMarketplaceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id),
    userId: toNumber(row.userId || row.owner_user_id),
    storeName: row.storeName || row.store_name || "",
    handle: row.handle || "",
    templateKey: row.templateKey || row.template_key || "products",
    tagline: row.tagline || "",
    about: row.about || row.description || "",
    coverUrl: row.coverUrl || row.cover_media_url || "",
    followerCount: toNumber(row.followerCount || row.follower_count || 0) || 0,
    productCount: toNumber(row.productCount || row.product_count || 0) || 0,
    salesCount: toNumber(row.salesCount || row.sales_count || 0) || 0,
    productId: toNumber(row.productId),
    productName: row.productName || row.product_name || "",
    productDescription: row.productDescription || row.product_description || "",
    productPrice: row.productPrice != null ? Number(row.productPrice) : 0,
    productDelivery: row.productDelivery || row.product_delivery || "",
    productLocation: row.productLocation || row.product_location || "",
    productTransportFee: row.productTransportFee != null ? Number(row.productTransportFee) : 0,
    productCreatedAt: row.productCreatedAt || row.product_created_at || null,
    thumbnail: row.thumbnail || "",
  };
}

async function loadStoreSocials(knex, storeId) {
  const rows = await knex("store_social_links")
    .select("platform", "handle_or_url")
    .where({ store_id: storeId });

  return rows.reduce(
    (socials, row) => ({
      ...socials,
      [row.platform]: row.handle_or_url,
    }),
    {
      instagram: "",
      facebook: "",
      tiktok: "",
      xhandle: "",
    }
  );
}

async function hydratePostgresStore(knex, row) {
  if (!row) {
    return null;
  }

  const socials = await loadStoreSocials(knex, row.id);
  return mapStoreRow(row, socials);
}

async function findStoreByUserId(userId, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyStoreByUserId(userId);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("stores as s")
    .leftJoin("store_settings as ss", "ss.store_id", "s.id")
    .select(
      "s.id",
      "s.owner_user_id",
      "s.store_name",
      "s.handle",
      "s.template_key",
      "s.tagline",
      "s.description",
      "s.profile_completed",
      "s.visibility_status",
      "s.published_at",
      "s.logo_media_url",
      "s.cover_media_url",
      "ss.accent_color",
      "ss.setup_step",
      "ss.setup_state"
    )
    .where("s.owner_user_id", userId)
    .first();

  return hydratePostgresStore(knex, row);
}

async function findStoreById(storeId, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyStoreById(storeId);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("stores as s")
    .leftJoin("store_settings as ss", "ss.store_id", "s.id")
    .select(
      "s.id",
      "s.owner_user_id",
      "s.store_name",
      "s.handle",
      "s.template_key",
      "s.tagline",
      "s.description",
      "s.profile_completed",
      "s.visibility_status",
      "s.published_at",
      "s.logo_media_url",
      "s.cover_media_url",
      "ss.accent_color",
      "ss.setup_step",
      "ss.setup_state"
    )
    .where("s.id", storeId)
    .first();

  return hydratePostgresStore(knex, row);
}

async function findStoreByHandle(handle, options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return findLegacyStoreByHandle(handle);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("stores as s")
    .leftJoin("store_settings as ss", "ss.store_id", "s.id")
    .select(
      "s.id",
      "s.owner_user_id",
      "s.store_name",
      "s.handle",
      "s.template_key",
      "s.tagline",
      "s.description",
      "s.profile_completed",
      "s.visibility_status",
      "s.published_at",
      "s.logo_media_url",
      "s.cover_media_url",
      "ss.accent_color",
      "ss.setup_step",
      "ss.setup_state"
    )
    .where("s.handle", handle)
    .first();

  return hydratePostgresStore(knex, row);
}

async function upsertStoreByUserId(store, options = {}) {
  const source = options.source || resolveStoreWriteSource();
  const profileCompleted = deriveStoreProfileCompleted(store);
  const visibilityStatus = normalizeVisibilityStatus(store.visibilityStatus, profileCompleted);
  if (source === "sqlite") {
    return upsertLegacyStoreByUserId({
      ...store,
      profileCompleted,
    });
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("stores")
    .insert({
      owner_user_id: store.userId,
      handle: store.handle,
      store_name: store.storeName,
      tagline: store.tagline,
      description: store.about,
      template_key: store.templateKey,
      logo_media_url: store.avatarUrl,
      cover_media_url: store.coverUrl,
      profile_completed: profileCompleted,
      visibility_status: visibilityStatus,
      published_at:
        visibilityStatus === "published"
          ? store.publishedAt || knex.fn.now()
          : null,
    })
    .onConflict("owner_user_id")
    .merge({
      handle: store.handle,
      store_name: store.storeName,
      tagline: store.tagline,
      description: store.about,
      template_key: store.templateKey,
      logo_media_url: store.avatarUrl,
      cover_media_url: store.coverUrl,
      profile_completed: profileCompleted,
      visibility_status: visibilityStatus,
      published_at:
        visibilityStatus === "published"
          ? store.publishedAt || knex.fn.now()
          : null,
      updated_at: knex.fn.now(),
    })
    .returning(["id"]);

  const storeId = toNumber(row.id);

  await knex("store_settings")
    .insert({
      store_id: storeId,
      accent_color: store.accentColor || "#2563eb",
      theme_settings: {},
      color_palette: {},
      font_choices: {},
      layout_preferences: {},
      setup_step: toNumber(store.setupStep) || 1,
      setup_state: store.setupState || {},
    })
    .onConflict("store_id")
    .merge({
      accent_color: store.accentColor || "#2563eb",
      setup_step: toNumber(store.setupStep) || 1,
      setup_state: store.setupState || {},
      updated_at: knex.fn.now(),
    });

  await knex("store_social_links").where({ store_id: storeId }).del();

  const socialEntries = [
    ["instagram", store.instagram],
    ["facebook", store.facebook],
    ["tiktok", store.tiktok],
    ["xhandle", store.xhandle],
  ]
    .filter(([, handleOrUrl]) => String(handleOrUrl || "").trim())
    .map(([platform, handleOrUrl]) => ({
      store_id: storeId,
      platform,
      handle_or_url: handleOrUrl,
    }));

  if (socialEntries.length) {
    await knex("store_social_links").insert(socialEntries);
  }

  return {
    id: storeId,
  };
}

async function updateStoreVisibilityByUserId(userId, visibilityStatus, options = {}) {
  const knex = getPostgresExecutor(options);
  const normalizedVisibility = normalizeVisibilityStatus(visibilityStatus, false);

  const updates = {
    visibility_status: normalizedVisibility,
    updated_at: knex.fn.now(),
    published_at:
      normalizedVisibility === "published"
        ? knex.fn.now()
        : null,
  };

  const [row] = await knex("stores")
    .where({ owner_user_id: userId })
    .update(updates)
    .returning(["id"]);

  return row ? toNumber(row.id) : 0;
}

async function getSellerWorkspaceSummary(userId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("stores as s")
    .leftJoin("store_settings as ss", "ss.store_id", "s.id")
    .select(
      "s.id",
      "s.owner_user_id",
      "s.store_name",
      "s.handle",
      "s.template_key",
      "s.tagline",
      "s.description",
      "s.profile_completed",
      "s.visibility_status",
      "s.published_at",
      "s.logo_media_url",
      "s.cover_media_url",
      "ss.accent_color",
      "ss.setup_step",
      "ss.setup_state"
    )
    .where("s.owner_user_id", userId)
    .first();

  if (!row) {
    return null;
  }

  const storeId = toNumber(row.id);
  const socials = await loadStoreSocials(knex, storeId);
  const store = mapStoreRow(row, socials);
  const counts = await knex.raw(
    `
      select
        (select count(*) from customer_followed_stores cfs where cfs.store_id = ?) as follower_count,
        (select count(*) from catalog_items ci where ci.store_id = ?) as product_count,
        (select count(*) from catalog_items ci where ci.store_id = ? and coalesce(ci.status, 'published') = 'draft') as draft_product_count,
        (select count(*) from catalog_items ci where ci.store_id = ? and coalesce(ci.status, 'published') = 'published') as live_product_count,
        (select count(*) from feed_items fi where fi.store_id = ? and fi.type <> 'product_published') as update_count,
        (select count(*) from orders o where o.store_id = ?) as order_count
    `,
    [storeId, storeId, storeId, storeId, storeId, storeId]
  );

  const metricsRow = counts.rows[0] || {};
  return {
    store,
    metrics: {
      followers: toNumber(metricsRow.follower_count || 0) || 0,
      products: toNumber(metricsRow.product_count || 0) || 0,
      draftProducts: toNumber(metricsRow.draft_product_count || 0) || 0,
      liveProducts: toNumber(metricsRow.live_product_count || 0) || 0,
      updates: toNumber(metricsRow.update_count || 0) || 0,
      orders: toNumber(metricsRow.order_count || 0) || 0,
    },
  };
}

async function listMarketplaceStalls(options = {}) {
  const source = resolveIdentitySource(options);
  if (source === "sqlite") {
    return listLegacyStoresForMarketplace();
  }

  const knex = getPostgresExecutor(options);
  const result = await knex.raw(
    `
      select
        s.id,
        s.owner_user_id,
        s.store_name,
        s.handle,
        s.template_key,
        s.tagline,
        s.description,
        s.cover_media_url,
        (
          select count(*)
          from customer_followed_stores cfs
          where cfs.store_id = s.id
        ) as "followerCount",
        (
          select count(*)
          from catalog_items catalog_count
          where catalog_count.store_id = s.id
        ) as "productCount",
        (
          select count(*)
          from orders o
          where o.store_id = s.id
        ) as "salesCount",
        first_item.id as "productId",
        first_item.title as "productName",
        first_item.description as "productDescription",
        first_item.price as "productPrice",
        first_item.delivery as "productDelivery",
        first_item.location as "productLocation",
        first_item.transport_fee as "productTransportFee",
        first_item.created_at as "productCreatedAt",
        first_media.media_url as thumbnail
      from stores s
      left join lateral (
        select ci.*
        from catalog_items ci
        where ci.store_id = s.id
        order by ci.created_at asc, ci.id asc
        limit 1
      ) first_item on true
      left join lateral (
        select cm.media_url
        from catalog_media cm
        where cm.catalog_item_id = first_item.id
        order by cm.sort_order asc, cm.id asc
        limit 1
      ) first_media on true
      where s.handle is not null
        and trim(s.handle) <> ''
        and coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'
      order by
        case when first_item.id is null then 1 else 0 end asc,
        first_item.created_at desc nulls last,
        s.id desc
    `
  );

  return result.rows.map(mapMarketplaceRow);
}

module.exports = {
  findStoreByHandle,
  find_store_by_handle: findStoreByHandle,
  findStoreById,
  findStoreByUserId,
  find_store_by_user_id: findStoreByUserId,
  getSellerWorkspaceSummary,
  listMarketplaceStalls,
  list_marketplace_stalls: listMarketplaceStalls,
  updateStoreVisibilityByUserId,
  upsertStoreByUserId,
  upsert_store: upsertStoreByUserId,
};
