const {
  createProduct: createLegacyProduct,
  deleteProduct: deleteLegacyProduct,
  findFirstProductByStoreId: findLegacyFirstProductByStoreId,
  findProductById: findLegacyProductById,
  findProductByIdAndStoreId: findLegacyProductByIdAndStoreId,
  findProductImages: findLegacyProductImages,
  listProductsByStoreId: listLegacyProductsByStoreId,
  listProductsWithStores: listLegacyProductsWithStores,
  replaceProductImages: replaceLegacyProductImages,
  updateProduct: updateLegacyProduct,
} = require("../../models/product.model");
const { getPostgresExecutor, resolveCatalogSource } = require("../repository-source");

function toNumber(value) {
  if (value == null || value === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function mapCatalogItemRow(row) {
  if (!row) {
    return null;
  }

  const templateKey = String(row.templateKey || row.template_key || "").trim().toLowerCase();
  const derivedItemType = String(row.itemType || row.item_type || "").trim().toLowerCase();

  return {
    id: toNumber(row.id),
    storeId: toNumber(row.storeId || row.store_id),
    name: row.name || row.title || "",
    title: row.name || row.title || "",
    itemType: derivedItemType || (templateKey && templateKey !== "products" ? templateKey : "product"),
    description: row.description || "",
    status: row.status || "published",
    visibility: row.visibility || "public",
    price: row.price != null ? Number(row.price) : 0,
    delivery: row.delivery || "",
    location: row.location || "",
    transportFee: row.transportFee != null ? Number(row.transportFee) : Number(row.transport_fee || 0),
    stockQuantity: toNumber(row.stockQuantity || row.stock_quantity || row.total_on_hand || 0) || 0,
    variantCount: toNumber(row.variantCount || row.variant_count || 0) || 0,
    createdAt: row.createdAt || row.created_at || null,
  };
}

function mapCatalogMediaRow(row) {
  return {
    id: toNumber(row.id),
    url: row.url || row.media_url,
    sortOrder: row.sortOrder != null ? row.sortOrder : row.sort_order || 0,
  };
}

function normalizeVariantAttributes(attributes) {
  if (!attributes) {
    return {};
  }

  if (typeof attributes === "string") {
    try {
      const parsed = JSON.parse(attributes);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      return {};
    }

    return {};
  }

  if (typeof attributes === "object" && !Array.isArray(attributes)) {
    return attributes;
  }

  return {};
}

function deriveVariantLabel(attributes, sku) {
  const normalizedAttributes = normalizeVariantAttributes(attributes);
  if (normalizedAttributes.label) {
    return String(normalizedAttributes.label).trim();
  }

  const entries = Object.entries(normalizedAttributes).filter(([, value]) => value != null && value !== "");
  if (entries.length) {
    return entries.map(([key, value]) => `${key}: ${value}`).join(" / ");
  }

  return String(sku || "Variant").trim();
}

function mapCatalogVariantRow(row) {
  if (!row) {
    return null;
  }

  const attributes = normalizeVariantAttributes(row.attributes);
  return {
    id: toNumber(row.id),
    productId: toNumber(row.catalogItemId || row.catalog_item_id),
    sku: String(row.sku || "").trim(),
    label: deriveVariantLabel(attributes, row.sku),
    attributes,
    priceOverride:
      row.priceOverride != null || row.price_override != null
        ? Number(row.priceOverride != null ? row.priceOverride : row.price_override)
        : null,
    stockQuantity: toNumber(row.stockQuantity || row.stock_quantity || row.total_on_hand || 0) || 0,
    createdAt: row.createdAt || row.created_at || null,
  };
}

async function createCatalogItem(product, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return createLegacyProduct(product);
  }

  const knex = getPostgresExecutor(options);
  const [row] = await knex("catalog_items")
    .insert({
      store_id: product.storeId,
      item_type: product.itemType || "product",
      title: product.name || product.title,
      description: product.description,
      status: product.status || "published",
      visibility: product.visibility || "public",
      price: product.price,
      location: product.location,
      delivery: product.delivery,
      transport_fee: product.transportFee,
    })
    .returning(["id"]);

  return {
    lastID: toNumber(row.id),
    changes: 1,
  };
}

async function updateCatalogItem(productId, product, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return updateLegacyProduct(productId, product);
  }

  const knex = getPostgresExecutor(options);
  return knex("catalog_items")
    .where({ id: productId })
    .update({
      title: product.name || product.title,
      description: product.description,
      status: product.status || "published",
      visibility: product.visibility || "public",
      price: product.price,
      delivery: product.delivery,
      location: product.location,
      transport_fee: product.transportFee,
      updated_at: knex.fn.now(),
    });
}

async function deleteCatalogItem(productId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return deleteLegacyProduct(productId);
  }

  const knex = getPostgresExecutor(options);
  return knex("catalog_items").where({ id: productId }).del();
}

async function findFirstCatalogItemByStoreId(storeId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return findLegacyFirstProductByStoreId(storeId);
  }

  const knex = getPostgresExecutor(options);
  const query = knex("catalog_items as ci")
    .select(
      "ci.*",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where("ci.store_id", storeId);

  if (options.publicOnly) {
    query.where("ci.status", "published").where("ci.visibility", "public");
  }

  const row = await query
    .orderBy("ci.created_at", "asc")
    .orderBy("ci.id", "asc")
    .first();

  return mapCatalogItemRow(row);
}

async function findCatalogItemByPublicId(productId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return findLegacyProductById(productId);
  }

  const knex = getPostgresExecutor(options);
  const query = knex("catalog_items as ci")
    .select(
      "ci.*",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where("ci.id", productId);

  if (options.publicOnly) {
    query
      .join("stores as s", "s.id", "ci.store_id")
      .where("ci.status", "published")
      .where("ci.visibility", "public")
      .whereRaw(
        "coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'"
      );
  }

  const row = await query.first();
  return mapCatalogItemRow(row);
}

async function findCatalogItemByPublicIdAndStoreId(productId, storeId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return findLegacyProductByIdAndStoreId(productId, storeId);
  }

  const knex = getPostgresExecutor(options);
  const row = await knex("catalog_items as ci")
    .select(
      "ci.*",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where({
      "ci.id": productId,
      "ci.store_id": storeId,
    })
    .first();

  return mapCatalogItemRow(row);
}

async function listProductVariants(productId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return [];
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("product_variants as pv")
    .leftJoin("inventory_items as ii", "ii.variant_id", "pv.id")
    .select(
      "pv.id",
      "pv.catalog_item_id",
      "pv.sku",
      "pv.attributes",
      "pv.price_override",
      "pv.stock_quantity",
      "pv.created_at",
      "ii.total_on_hand"
    )
    .where("pv.catalog_item_id", productId)
    .orderBy("pv.created_at", "asc")
    .orderBy("pv.id", "asc");

  return rows.map(mapCatalogVariantRow);
}

async function replaceProductVariants(productId, variants = [], options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return [];
  }

  const knex = getPostgresExecutor(options);
  await knex("product_variants").where({ catalog_item_id: productId }).del();

  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const insertedRows = await knex("product_variants")
    .insert(
      variants.map((variant) => ({
        catalog_item_id: productId,
        sku: variant.sku || null,
        attributes: variant.attributes || {},
        price_override: variant.priceOverride == null ? null : variant.priceOverride,
        stock_quantity: toNumber(variant.stockQuantity) || 0,
      }))
    )
    .returning(["id", "catalog_item_id", "sku", "attributes", "price_override", "stock_quantity", "created_at"]);

  if (!insertedRows.length) {
    return [];
  }

  await knex("inventory_items").insert(
    insertedRows.map((row) => ({
      catalog_item_id: productId,
      variant_id: row.id,
      total_on_hand: toNumber(row.stock_quantity) || 0,
    }))
  );

  const inventoryRows = await knex("inventory_items")
    .select("id", "variant_id", "total_on_hand")
    .where({ catalog_item_id: productId })
    .whereNotNull("variant_id");

  const inventoryMap = new Map(inventoryRows.map((row) => [Number(row.variant_id), row]));
  const logRows = inventoryRows
    .filter((row) => Number(row.total_on_hand || 0) !== 0)
    .map((row) => {
      const variant = insertedRows.find((item) => Number(item.id) === Number(row.variant_id));
      return {
        inventory_item_id: row.id,
        adjustment_type: "manual",
        quantity_change: Number(row.total_on_hand || 0),
        metadata: {
          scope: "variant_replace",
          label: deriveVariantLabel(variant && variant.attributes, variant && variant.sku),
        },
      };
    });

  if (logRows.length) {
    await knex("inventory_logs").insert(logRows);
  }

  return insertedRows.map((row) =>
    mapCatalogVariantRow({
      ...row,
      total_on_hand: inventoryMap.get(Number(row.id)) && inventoryMap.get(Number(row.id)).total_on_hand,
    })
  );
}

async function upsertCatalogInventory(productId, stockQuantity, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return 0;
  }

  const knex = getPostgresExecutor(options);
  const normalizedQuantity = toNumber(stockQuantity, 0) || 0;
  const existing = await knex("inventory_items")
    .select("id", "total_on_hand")
    .where({ catalog_item_id: productId })
    .whereNull("variant_id")
    .first();

  if (existing && existing.id) {
    const changes = await knex("inventory_items")
      .where({ id: existing.id })
      .update({
        total_on_hand: normalizedQuantity,
        updated_at: knex.fn.now(),
      });

    const quantityChange = normalizedQuantity - Number(existing.total_on_hand || 0);
    if (quantityChange !== 0) {
      await knex("inventory_logs").insert({
        inventory_item_id: existing.id,
        adjustment_type: "manual",
        quantity_change: quantityChange,
        metadata: { scope: "base_inventory_sync" },
      });
    }

    return changes;
  }

  const insertedRows = await knex("inventory_items")
    .insert({
      catalog_item_id: productId,
      variant_id: null,
      total_on_hand: normalizedQuantity,
    })
    .returning(["id"]);

  const insertedId = insertedRows[0] && insertedRows[0].id ? insertedRows[0].id : null;
  if (insertedId && normalizedQuantity !== 0) {
    await knex("inventory_logs").insert({
      inventory_item_id: insertedId,
      adjustment_type: "manual",
      quantity_change: normalizedQuantity,
      metadata: { scope: "base_inventory_seed" },
    });
  }

  return insertedRows.length;
}

async function replaceCatalogMedia(productId, imageUrls = [], options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return replaceLegacyProductImages(productId, imageUrls);
  }

  const knex = getPostgresExecutor(options);
  await knex("catalog_media").where({ catalog_item_id: productId }).del();

  if (!imageUrls.length) {
    return;
  }

  await knex("catalog_media").insert(
    imageUrls.map((url, index) => ({
      catalog_item_id: productId,
      media_url: url,
      media_type: "image",
      is_cover: index === 0,
      sort_order: index,
    }))
  );
}

async function findCatalogMedia(productId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return findLegacyProductImages(productId);
  }

  const knex = getPostgresExecutor(options);
  const rows = await knex("catalog_media")
    .select("id", "media_url", "sort_order")
    .where({ catalog_item_id: productId })
    .orderBy("sort_order", "asc")
    .orderBy("id", "asc");

  return rows.map(mapCatalogMediaRow);
}

async function listStoreCatalogItems(storeId, options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return listLegacyProductsByStoreId(storeId);
  }

  const knex = getPostgresExecutor(options);
  const query = knex("catalog_items as ci")
    .select(
      "ci.*",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where("ci.store_id", storeId);

  if (options.publicOnly) {
    query.where("ci.status", "published").where("ci.visibility", "public");
  }

  const rows = await query
    .orderBy("ci.created_at", "desc")
    .orderBy("ci.id", "desc");

  return rows.map(mapCatalogItemRow);
}

async function listPublicCatalogItems(options = {}) {
  const source = resolveCatalogSource(options);
  if (source === "sqlite") {
    return listLegacyProductsWithStores();
  }

  const knex = getPostgresExecutor(options);
  const result = await knex.raw(
    `
      select
        ci.id,
        ci.store_id as "storeId",
        ci.title as name,
        ci.item_type as "itemType",
        ci.description,
        ci.status,
        ci.visibility,
        ci.price,
        ci.delivery,
        ci.location,
        ci.transport_fee as "transportFee",
        ci.created_at as "createdAt",
        (
          select ii.total_on_hand
          from inventory_items ii
          where ii.catalog_item_id = ci.id
            and ii.variant_id is null
          order by ii.id asc
          limit 1
        ) as "stockQuantity",
        (
          select count(*)
          from product_variants pv
          where pv.catalog_item_id = ci.id
        ) as "variantCount",
        s.handle,
        s.store_name as "storeName",
        s.template_key as "templateKey",
        first_media.media_url as thumbnail
      from catalog_items ci
      join stores s on s.id = ci.store_id
      left join lateral (
        select cm.media_url
        from catalog_media cm
        where cm.catalog_item_id = ci.id
        order by cm.sort_order asc, cm.id asc
        limit 1
      ) first_media on true
      where ci.status = 'published'
        and ci.visibility = 'public'
        and coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'
      order by ci.created_at desc, ci.id desc
    `
  );

  return result.rows.map((row) => ({
    ...mapCatalogItemRow(row),
    handle: row.handle || "",
    storeName: row.storeName || "",
    templateKey: row.templateKey || "products",
    thumbnail: row.thumbnail || "",
  }));
}

module.exports = {
  createCatalogItem,
  createProduct: createCatalogItem,
  deleteCatalogItem,
  findCatalogItemByPublicId,
  findCatalogItemByPublicIdAndStoreId,
  find_catalog_item_by_public_id: findCatalogItemByPublicId,
  findFirstCatalogItemByStoreId,
  findCatalogMedia,
  listProductVariants,
  find_catalog_media: findCatalogMedia,
  listPublicCatalogItems,
  listStoreCatalogItems,
  list_store_catalog_items: listStoreCatalogItems,
  replaceCatalogMedia,
  replaceProductVariants,
  upsertCatalogInventory,
  updateCatalogItem,
  updateProduct: updateCatalogItem,
};
