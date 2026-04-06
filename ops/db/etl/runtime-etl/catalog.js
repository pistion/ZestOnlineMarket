const {
  closeReader,
  completeMigrationRun,
  createMigrationRun,
  openLegacyReader,
  openPostgres,
  recordMigrationFailure,
  recordMigrationMapping,
  syncIdentitySequence,
  upsertLegacyIdentityRow,
} = require("./helpers");

function mapLegacyProduct(row) {
  return {
    id: row.id,
    legacy_id: row.id,
    store_id: row.storeId,
    item_type: "product",
    title: row.name || "Untitled Product",
    description: row.description || null,
    status: "published",
    visibility: "public",
    price: row.price == null ? 0 : row.price,
    location: row.location || null,
    delivery: row.delivery || null,
    transport_fee: row.transportFee == null ? 0 : row.transportFee,
    created_at: row.createdAt || new Date().toISOString(),
    updated_at: row.createdAt || new Date().toISOString(),
  };
}

function mapLegacyProductImage(row) {
  return {
    id: row.id,
    legacy_id: row.id,
    catalog_item_id: row.productId,
    media_url: row.url,
    media_type: "image",
    is_cover: Number(row.sortOrder || 0) === 0,
    sort_order: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function migrateCatalogAndMedia() {
  const legacy = await openLegacyReader();
  const knex = await openPostgres();
  const runId = await createMigrationRun(knex, {
    name: "catalog-media-etl",
    stage: "catalog-media",
    metadata: {
      source: "sqlite",
      target: "postgres",
    },
  });

  const stats = {
    productsRead: 0,
    productsMigrated: 0,
    mediaRead: 0,
    mediaMigrated: 0,
    failures: 0,
  };

  try {
    const existingStores = await knex("stores").select("id");
    const knownStoreIds = new Set(existingStores.map((row) => Number(row.id)));
    const products = await legacy.all("SELECT * FROM products ORDER BY id ASC");
    stats.productsRead = products.length;

    for (const productRow of products) {
      try {
        if (!knownStoreIds.has(Number(productRow.storeId))) {
          throw new Error(`Legacy product references missing store ${productRow.storeId}`);
        }

        await upsertLegacyIdentityRow(
          knex,
          "catalog_items",
          mapLegacyProduct(productRow),
          ["legacy_id"]
        );
        await recordMigrationMapping(
          knex,
          runId,
          "catalog_items",
          productRow.id,
          productRow.id,
          productRow.name || null
        );
        stats.productsMigrated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "catalog_items",
          productRow.id,
          "upsert",
          error.message,
          {
            storeId: productRow.storeId,
            name: productRow.name,
          }
        );
      }
    }

    const existingCatalogItems = await knex("catalog_items").select("id");
    const knownCatalogItemIds = new Set(existingCatalogItems.map((row) => Number(row.id)));
    const images = await legacy.all("SELECT * FROM product_images ORDER BY id ASC");
    stats.mediaRead = images.length;

    for (const imageRow of images) {
      try {
        if (!knownCatalogItemIds.has(Number(imageRow.productId))) {
          throw new Error(`Legacy media references missing catalog item ${imageRow.productId}`);
        }

        await upsertLegacyIdentityRow(
          knex,
          "catalog_media",
          mapLegacyProductImage(imageRow),
          ["legacy_id"]
        );
        await recordMigrationMapping(
          knex,
          runId,
          "catalog_media",
          imageRow.id,
          imageRow.id,
          imageRow.url || null
        );
        stats.mediaMigrated += 1;
      } catch (error) {
        stats.failures += 1;
        await recordMigrationFailure(
          knex,
          runId,
          "catalog_media",
          imageRow.id,
          "upsert",
          error.message,
          {
            productId: imageRow.productId,
            url: imageRow.url,
          }
        );
      }
    }

    await syncIdentitySequence(knex, "catalog_items");
    await syncIdentitySequence(knex, "catalog_media");
    await syncIdentitySequence(knex, "product_variants");
    await syncIdentitySequence(knex, "inventory_items");
    await syncIdentitySequence(knex, "inventory_logs");

    await completeMigrationRun(knex, runId, {
      status: stats.failures ? "completed_with_failures" : "completed",
      metadata: stats,
    });

    return {
      runId,
      stats,
    };
  } catch (error) {
    await completeMigrationRun(knex, runId, {
      status: "failed",
      metadata: {
        ...stats,
        error: error.message,
      },
    });
    throw error;
  } finally {
    await closeReader(legacy);
  }
}

module.exports = {
  migrateCatalogAndMedia,
};
