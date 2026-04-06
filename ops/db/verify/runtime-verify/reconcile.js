const { closeReader, openLegacyReader, openPostgres, toNumber } = require("../../etl/runtime-etl/helpers");

async function countPostgres(knex, tableName) {
  const row = await knex(tableName).count("* as count").first();
  return toNumber(row && row.count, 0);
}

function buildAcceptedExceptionSet(rows = [], entityType, messageFragment) {
  return new Set(
    rows
      .filter(
        (row) =>
          row &&
          row.entity_type === entityType &&
          typeof row.message === "string" &&
          row.message.includes(messageFragment)
      )
      .map((row) => Number(row.legacy_id))
      .filter((value) => Number.isFinite(value))
  );
}

function subtractAccepted(list = [], acceptedSet) {
  return list.filter((value) => !acceptedSet.has(Number(value)));
}

async function buildReconciliationReport() {
  const legacy = await openLegacyReader();
  const knex = await openPostgres();

  try {
    const [
      legacyUsers,
      legacyStores,
      legacyProducts,
      legacyImages,
      pgUsers,
      pgStores,
      pgCatalogItems,
      pgMedia,
    ] = await Promise.all([
      legacy.all("SELECT id, email, password, role FROM users ORDER BY id ASC"),
      legacy.all("SELECT id, userId, handle, storeName FROM stores ORDER BY id ASC"),
      legacy.all("SELECT id, storeId, name FROM products ORDER BY id ASC"),
      legacy.all("SELECT id, productId, url FROM product_images ORDER BY id ASC"),
      knex("users").select("id", "legacy_id", "email", "password_hash", "role").orderBy("id", "asc"),
      knex("stores").select("id", "legacy_id", "owner_user_id", "handle", "store_name").orderBy("id", "asc"),
      knex("catalog_items").select("id", "legacy_id", "store_id", "title").orderBy("id", "asc"),
      knex("catalog_media").select("id", "legacy_id", "catalog_item_id", "media_url").orderBy("id", "asc"),
    ]);

    const legacyCounts = {
      users: legacyUsers.length,
      stores: legacyStores.length,
      products: legacyProducts.length,
      product_images: legacyImages.length,
    };

    const postgresCounts = {
      users: pgUsers.length,
      stores: pgStores.length,
      catalog_items: pgCatalogItems.length,
      catalog_media: pgMedia.length,
    };

    const pgUsersByLegacyId = new Map(pgUsers.map((row) => [Number(row.legacy_id), row]));
    const pgStoresByLegacyId = new Map(pgStores.map((row) => [Number(row.legacy_id), row]));
    const pgItemsByLegacyId = new Map(pgCatalogItems.map((row) => [Number(row.legacy_id), row]));
    const pgMediaByLegacyId = new Map(pgMedia.map((row) => [Number(row.legacy_id), row]));

    const mismatches = {
      usersMissing: legacyUsers.filter((row) => !pgUsersByLegacyId.has(Number(row.id))).map((row) => row.id),
      storesMissing: legacyStores.filter((row) => !pgStoresByLegacyId.has(Number(row.id))).map((row) => row.id),
      productsMissing: legacyProducts
        .filter((row) => !pgItemsByLegacyId.has(Number(row.id)))
        .map((row) => row.id),
      imagesMissing: legacyImages.filter((row) => !pgMediaByLegacyId.has(Number(row.id))).map((row) => row.id),
      emailMismatches: [],
      passwordHashMismatches: [],
      roleMismatches: [],
      handleMismatches: [],
      productStoreMismatches: [],
      mediaUrlMismatches: [],
    };

    for (const userRow of legacyUsers) {
      const migrated = pgUsersByLegacyId.get(Number(userRow.id));
      if (!migrated) {
        continue;
      }

      if (String(migrated.email || "") !== String(userRow.email || "")) {
        mismatches.emailMismatches.push(userRow.id);
      }
      if (String(migrated.password_hash || "") !== String(userRow.password || "")) {
        mismatches.passwordHashMismatches.push(userRow.id);
      }
      if (String(migrated.role || "") !== String(userRow.role || "")) {
        mismatches.roleMismatches.push(userRow.id);
      }
    }

    for (const storeRow of legacyStores) {
      const migrated = pgStoresByLegacyId.get(Number(storeRow.id));
      if (!migrated) {
        continue;
      }

      if (String(migrated.handle || "") !== String(storeRow.handle || "")) {
        mismatches.handleMismatches.push(storeRow.id);
      }
    }

    for (const productRow of legacyProducts) {
      const migrated = pgItemsByLegacyId.get(Number(productRow.id));
      if (!migrated) {
        continue;
      }

      if (Number(migrated.store_id) !== Number(productRow.storeId)) {
        mismatches.productStoreMismatches.push(productRow.id);
      }
    }

    for (const mediaRow of legacyImages) {
      const migrated = pgMediaByLegacyId.get(Number(mediaRow.id));
      if (!migrated) {
        continue;
      }

      if (String(migrated.media_url || "") !== String(mediaRow.url || "")) {
        mismatches.mediaUrlMismatches.push(mediaRow.id);
      }
    }

    const duplicateHandleRows = await knex("stores")
      .select("handle")
      .count("* as count")
      .groupBy("handle")
      .havingRaw("COUNT(*) > 1");

    const failureRows = await knex("migration_failures").select("entity_type", "legacy_id", "message");

    const auditCounts = {
      migration_runs: await countPostgres(knex, "migration_runs"),
      migration_mappings: await countPostgres(knex, "migration_mappings"),
      migration_failures: await countPostgres(knex, "migration_failures"),
    };

    const report = {
      generatedAt: new Date().toISOString(),
      counts: {
        legacy: legacyCounts,
        postgres: postgresCounts,
        audit: auditCounts,
      },
      roleBreakdown: {
        legacy: {
          buyers: legacyUsers.filter((row) => row.role === "buyer").length,
          sellers: legacyUsers.filter((row) => row.role === "seller").length,
        },
        postgres: {
          buyers: pgUsers.filter((row) => row.role === "buyer").length,
          sellers: pgUsers.filter((row) => row.role === "seller").length,
        },
      },
      duplicateHandles: duplicateHandleRows.map((row) => ({
        handle: row.handle,
        count: toNumber(row.count, 0),
      })),
      mismatches,
    };

    const acceptedExceptions = {
      storesMissing: [...buildAcceptedExceptionSet(failureRows, "stores", "Legacy store references missing user")],
      productsMissing: [
        ...buildAcceptedExceptionSet(
          failureRows,
          "catalog_items",
          "Legacy product references missing store"
        ),
      ],
    };

    const unresolvedMismatches = {
      ...mismatches,
      storesMissing: subtractAccepted(mismatches.storesMissing, new Set(acceptedExceptions.storesMissing)),
      productsMissing: subtractAccepted(
        mismatches.productsMissing,
        new Set(acceptedExceptions.productsMissing)
      ),
    };

    report.acceptedExceptions = acceptedExceptions;
    report.unresolvedMismatches = unresolvedMismatches;
    report.passed =
      report.duplicateHandles.length === 0 &&
      Object.values(unresolvedMismatches).every((items) => Array.isArray(items) && items.length === 0) &&
      legacyCounts.users === postgresCounts.users &&
      legacyCounts.stores - acceptedExceptions.storesMissing.length === postgresCounts.stores &&
      legacyCounts.products - acceptedExceptions.productsMissing.length === postgresCounts.catalog_items &&
      legacyCounts.product_images === postgresCounts.catalog_media;

    report.passedWithAcceptedExceptions =
      report.passed &&
      (acceptedExceptions.storesMissing.length > 0 || acceptedExceptions.productsMissing.length > 0);

    return report;
  } finally {
    await closeReader(legacy);
  }
}

module.exports = {
  buildReconciliationReport,
};
