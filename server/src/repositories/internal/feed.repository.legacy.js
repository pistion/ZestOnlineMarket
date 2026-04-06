const { all, get, run } = require("../../config/db");
const { listPublicCatalogItems } = require("../catalog.repository");
const { getPostgresExecutor, resolveCatalogSource } = require("../repository-source");
const { createHttpError } = require("../../utils/api-response");

const FEED_TYPES = ["product_published", "announcement", "promo", "live_drop"];
const STORE_UPDATE_TYPES = FEED_TYPES.filter((type) => type !== "product_published");

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

function normalizeFeedType(value) {
  const type = String(value || "").trim().toLowerCase();
  if (FEED_TYPES.includes(type)) {
    return type;
  }

  return "product_published";
}

function normalizeStoreUpdateType(value) {
  const type = normalizeFeedType(value);
  if (!STORE_UPDATE_TYPES.includes(type)) {
    throw createHttpError(400, "Store updates must be announcement, promo, or live drop");
  }

  return type;
}

function normalizeTypeFilter(types) {
  const list = Array.isArray(types) ? types : [];
  return [...new Set(list.map(normalizeFeedType))];
}

function buildFeedTag(type) {
  if (type === "announcement") {
    return "Store announcement";
  }

  if (type === "promo") {
    return "Promo drop";
  }

  if (type === "live_drop") {
    return "Live drop";
  }

  return "New product live";
}

function resolveFeedItemType(itemType, templateKey) {
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

function mapFeedItemRow(row, options = {}) {
  const payload = parseJsonValue(row.payload, {});
  const storeHandle = String(row.handle || row.storeHandle || "").trim();
  const storeName = String(row.store_name || row.storeName || "").trim() || `@${storeHandle}`;
  const feedType = normalizeFeedType(row.type || row.feed_type);
  const catalogItemId = toNumber(row.catalog_item_id || row.catalogItemId || row.product_id || row.productId, 0);
  const templateKey = String(row.template_key || row.templateKey || "products").trim() || "products";
  const imageCandidates = [
    ...(Array.isArray(payload.images) ? payload.images : []),
    payload.imageUrl,
    payload.thumbnail,
    row.thumbnail,
  ].filter(Boolean);

  return {
    id: toNumber(row.feed_item_id || row.id, 0),
    feedItemId: toNumber(row.feed_item_id || row.id, 0),
    catalogItemId: catalogItemId || null,
    type: feedType,
    hasExplicitTitle: Boolean(payload.hasExplicitTitle),
    source: options.source || "feed_item",
    storeId: toNumber(row.store_id || row.storeId, 0) || null,
    storeHandle,
    storeName,
    avatarUrl: String(row.avatar_url || row.logo_media_url || "").trim(),
    templateKey,
    itemType: resolveFeedItemType(row.item_type || row.itemType, templateKey),
    title:
      String(
        row.feed_title ||
          row.catalog_title ||
          row.title ||
          row.name ||
          payload.title ||
          payload.headline ||
          "Store update"
      ).trim() || "Store update",
    description:
      String(
        row.feed_description ||
          row.catalog_description ||
          row.description ||
          payload.description ||
          payload.text ||
          `${storeName} shared a fresh update.`
      ).trim() || `${storeName} shared a fresh update.`,
    price: Number(row.price || payload.price || 0),
    delivery: String(row.delivery || payload.delivery || "").trim(),
    location: String(row.location || payload.location || "").trim(),
    createdAt: row.feed_created_at || row.created_at || row.createdAt || null,
    images: [...new Set(imageCandidates.map((item) => String(item || "").trim()).filter(Boolean))],
    thumbnail: String(row.thumbnail || payload.thumbnail || "").trim(),
    storePath: storeHandle ? `/stores/${encodeURIComponent(storeHandle)}` : "/marketplace",
    productPath: catalogItemId ? `/products/${catalogItemId}` : "",
    sharePath: catalogItemId ? `/products/${catalogItemId}` : storeHandle ? `/stores/${encodeURIComponent(storeHandle)}` : "/marketplace",
    feedTag: buildFeedTag(feedType),
  };
}

function mapCatalogFallbackItem(row) {
  const storeHandle = String(row.handle || row.storeHandle || "").trim();
  const thumbnail = String(row.thumbnail || "").trim();
  const templateKey = String(row.templateKey || "products").trim() || "products";

  return {
    id: toNumber(row.id, 0),
    feedItemId: null,
    catalogItemId: toNumber(row.id, 0),
    type: "product_published",
    hasExplicitTitle: true,
    source: "catalog_fallback",
    storeId: toNumber(row.storeId, 0) || null,
    storeHandle,
    storeName: String(row.storeName || "").trim() || `@${storeHandle}`,
    avatarUrl: "",
    templateKey,
    itemType: resolveFeedItemType(row.itemType, templateKey),
    title: String(row.title || row.name || "Store update").trim() || "Store update",
    description: String(row.description || "").trim(),
    price: Number(row.price || 0),
    delivery: String(row.delivery || "").trim(),
    location: String(row.location || "").trim(),
    createdAt: row.createdAt || null,
    images: thumbnail ? [thumbnail] : [],
    thumbnail,
    storePath: storeHandle ? `/stores/${encodeURIComponent(storeHandle)}` : "/marketplace",
    productPath: row.id ? `/products/${row.id}` : "",
    sharePath: row.id ? `/products/${row.id}` : storeHandle ? `/stores/${encodeURIComponent(storeHandle)}` : "/marketplace",
    feedTag: "New product live",
  };
}

async function listPersistedFeedItems(options = {}) {
  const source = resolveCatalogSource(options);
  const storeId = toNumber(options.storeId, 0);
  const feedItemId = toNumber(options.feedItemId, 0);
  const catalogItemId = toNumber(options.catalogItemId, 0);
  const limit = toNumber(options.limit, 0);
  const typeFilter = normalizeTypeFilter(options.types);
  if (source === "sqlite") {
    const whereClauses = [];
    const params = [];

    if (storeId > 0) {
      whereClauses.push("fi.storeId = ?");
      params.push(storeId);
    }

    if (feedItemId > 0) {
      whereClauses.push("fi.id = ?");
      params.push(feedItemId);
    }

    if (catalogItemId > 0) {
      whereClauses.push("fi.catalogItemId = ?");
      params.push(catalogItemId);
    }

    if (typeFilter.length) {
      whereClauses.push(`fi.type IN (${typeFilter.map(() => "?").join(", ")})`);
      params.push(...typeFilter);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limitSql = limit > 0 ? "LIMIT ?" : "";
    if (limit > 0) {
      params.push(limit);
    }

    const rows = await all(
      `SELECT
        fi.id AS feed_item_id,
        fi.type,
        fi.storeId AS store_id,
        fi.catalogItemId AS catalog_item_id,
        fi.title AS feed_title,
        fi.description AS feed_description,
        fi.payload,
        fi.createdAt AS feed_created_at,
        s.handle,
        s.storeName AS store_name,
        s.templateKey AS template_key,
        s.coverUrl AS cover_url,
        s.avatarUrl AS avatar_url,
        p.name AS catalog_title,
        p.description AS catalog_description,
        p.price,
        p.delivery,
        p.location,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.productId = fi.catalogItemId
          ORDER BY pi.sortOrder ASC, pi.id ASC
          LIMIT 1
        ) AS thumbnail
      FROM feed_items fi
      JOIN stores s ON s.id = fi.storeId
      LEFT JOIN products p ON p.id = fi.catalogItemId
      ${whereSql}
      ORDER BY datetime(fi.createdAt) DESC, fi.id DESC
      ${limitSql}`,
      params
    );

    return rows.map((row) => mapFeedItemRow(row, { source: "feed_item" }));
  }

  const knex = getPostgresExecutor(options);
  const query = knex("feed_items as fi")
    .join("stores as s", "s.id", "fi.store_id")
    .leftJoin("catalog_items as ci", "ci.id", "fi.catalog_item_id")
    .leftJoin("catalog_media as cm", function joinMedia() {
      this.on("cm.catalog_item_id", "=", "ci.id").andOn("cm.is_cover", "=", knex.raw("true"));
    })
    .select(
      "fi.id as feed_item_id",
      "fi.type",
      "fi.store_id",
      "fi.catalog_item_id",
      "fi.payload",
      "fi.created_at as feed_created_at",
      "s.handle",
      "s.store_name",
      "s.template_key",
      "s.cover_media_url",
      "s.logo_media_url",
      "ci.item_type",
      "ci.title as catalog_title",
      "ci.description as catalog_description",
      "ci.price",
      "ci.delivery",
      "ci.location",
      "cm.media_url as thumbnail"
    );

  if (storeId > 0) {
    query.where("fi.store_id", storeId);
  }

  if (feedItemId > 0) {
    query.where("fi.id", feedItemId);
  }

  if (catalogItemId > 0) {
    query.where("fi.catalog_item_id", catalogItemId);
  }

  if (typeFilter.length) {
    query.whereIn("fi.type", typeFilter);
  }

  if (limit > 0) {
    query.limit(limit);
  }

  const resultRows = await query
    .orderBy("fi.created_at", "desc")
    .orderBy("fi.id", "desc");

  return resultRows.map((row) => mapFeedItemRow(row, { source: "feed_item" }));
}

async function listCatalogFallbackFeedItems(options = {}) {
  const items = await listPublicCatalogItems(options);
  return items.map(mapCatalogFallbackItem);
}

async function listFeedSourceItems(options = {}) {
  const [persistedItems, fallbackItems] = await Promise.all([
    listPersistedFeedItems(options),
    listCatalogFallbackFeedItems(options),
  ]);

  return {
    persistedItems,
    fallbackItems,
  };
}

async function listStoreFeedItemsByStoreId(storeId, options = {}) {
  const normalizedStoreId = toNumber(storeId, 0);
  if (!normalizedStoreId) {
    return [];
  }

  const includeProductPublished = Boolean(options.includeProductPublished);
  const types = includeProductPublished ? FEED_TYPES : STORE_UPDATE_TYPES;
  return listPersistedFeedItems({
    ...options,
    storeId: normalizedStoreId,
    types,
  });
}

async function publishCatalogFeedItem(
  { storeId, catalogItemId, title, description, price = 0, delivery = "", location = "", images = [] },
  options = {}
) {
  if (!storeId || !catalogItemId) {
    return null;
  }

  const source = resolveCatalogSource(options);
  const payload = JSON.stringify({
    title,
    description,
    price,
    delivery,
    location,
    images,
  });

  if (source === "sqlite") {
    await run(
      `INSERT INTO feed_items (
        type, storeId, catalogItemId, title, description, payload, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(type, catalogItemId) DO UPDATE SET
        storeId = excluded.storeId,
        title = excluded.title,
        description = excluded.description,
        payload = excluded.payload,
        createdAt = datetime('now')`,
      ["product_published", storeId, catalogItemId, title || "", description || "", payload]
    );

    return get(
      "SELECT id AS feed_item_id, type, storeId AS store_id, catalogItemId AS catalog_item_id, title AS feed_title, description AS feed_description, payload, createdAt AS feed_created_at FROM feed_items WHERE type = ? AND catalogItemId = ?",
      ["product_published", catalogItemId]
    );
  }

  const knex = getPostgresExecutor(options);
  const existing = await knex("feed_items")
    .where({
      type: "product_published",
      catalog_item_id: catalogItemId,
    })
    .first();

  if (existing) {
    await knex("feed_items")
      .where({ id: existing.id })
      .update({
        store_id: storeId,
        payload: {
          title,
          description,
          price,
          delivery,
          location,
          images,
        },
        created_at: knex.fn.now(),
      });

    return { id: existing.id };
  }

  const [row] = await knex("feed_items")
    .insert({
      type: "product_published",
      store_id: storeId,
      catalog_item_id: catalogItemId,
      payload: {
        title,
        description,
        price,
        delivery,
        location,
        images,
      },
    })
    .returning(["id"]);

  return row || null;
}

async function createStoreFeedItem(
  { storeId, type, title, description, catalogItemId = null, images = [], hasExplicitTitle = false },
  options = {}
) {
  const normalizedStoreId = toNumber(storeId, 0);
  const normalizedCatalogItemId = toNumber(catalogItemId, 0);
  if (!normalizedStoreId) {
    throw createHttpError(400, "Store update requires a valid store");
  }

  const normalizedType = normalizeStoreUpdateType(type);
  const payload = {
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    hasExplicitTitle: Boolean(hasExplicitTitle),
    images: Array.isArray(images) ? images.filter(Boolean) : [],
  };

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    const result = await run(
      `INSERT INTO feed_items (
        type, storeId, catalogItemId, title, description, payload, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        normalizedType,
        normalizedStoreId,
        normalizedCatalogItemId || null,
        payload.title,
        payload.description,
        JSON.stringify(payload),
      ]
    );

    const [item] = await listPersistedFeedItems({
      ...options,
      feedItemId: result.lastID,
      limit: 1,
    });

    return item || null;
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("feed_items")
    .insert({
      type: normalizedType,
      store_id: normalizedStoreId,
      catalog_item_id: normalizedCatalogItemId || null,
      payload,
    })
    .returning(["id"]);

  if (!row || !row.id) {
    return null;
  }

  const [item] = await listPersistedFeedItems({
    ...options,
    feedItemId: row.id,
    limit: 1,
  });

  return item || null;
}

async function findStoreFeedItemByIdAndStoreId(feedItemId, storeId, options = {}) {
  const normalizedFeedItemId = toNumber(feedItemId, 0);
  const normalizedStoreId = toNumber(storeId, 0);
  if (!normalizedFeedItemId || !normalizedStoreId) {
    return null;
  }

  const [item] = await listPersistedFeedItems({
    ...options,
    feedItemId: normalizedFeedItemId,
    storeId: normalizedStoreId,
    limit: 1,
  });

  return item || null;
}

async function listFeedItemsByCatalogItemId(catalogItemId, options = {}) {
  const normalizedCatalogItemId = toNumber(catalogItemId, 0);
  if (!normalizedCatalogItemId) {
    return [];
  }

  return listPersistedFeedItems({
    ...options,
    catalogItemId: normalizedCatalogItemId,
  });
}

async function deleteFeedItemById(feedItemId, options = {}) {
  const normalizedFeedItemId = toNumber(feedItemId, 0);
  if (!normalizedFeedItemId) {
    return 0;
  }

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    const result = await run("DELETE FROM feed_items WHERE id = ?", [normalizedFeedItemId]);
    return toNumber(result.changes, 0);
  }

  const knex = getPostgresExecutor(options);
  return knex("feed_items").where({ id: normalizedFeedItemId }).del();
}

async function deleteFeedItemsByCatalogItemId(catalogItemId, options = {}) {
  const normalizedCatalogItemId = toNumber(catalogItemId, 0);
  if (!normalizedCatalogItemId) {
    return 0;
  }

  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    const result = await run("DELETE FROM feed_items WHERE catalogItemId = ?", [normalizedCatalogItemId]);
    return toNumber(result.changes, 0);
  }

  const knex = getPostgresExecutor(options);
  return knex("feed_items").where({ catalog_item_id: normalizedCatalogItemId }).del();
}

module.exports = {
  createStoreFeedItem,
  deleteFeedItemById,
  deleteFeedItemsByCatalogItemId,
  findStoreFeedItemByIdAndStoreId,
  listCatalogFallbackFeedItems,
  listFeedItemsByCatalogItemId,
  listFeedSourceItems,
  listPersistedFeedItems,
  listStoreFeedItemsByStoreId,
  publishCatalogFeedItem,
};
