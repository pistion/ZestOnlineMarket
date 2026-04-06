const {
  findCatalogMedia,
  listProductVariants,
} = require("./catalog.repository");
const { getPostgresExecutor } = require("./repository-source");
const { mapProductImages, mapProductRow } = require("../utils/store-mappers");

function toNumber(value) {
  if (value == null || value === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function mapArtStoreSettingsRow(row) {
  if (!row) {
    return {
      studioHeadline: "",
      artistStatement: "",
      featuredMediums: [],
      commissionPolicy: "",
      contactEmail: "",
      commissionOpen: false,
    };
  }

  const featuredMediums = Array.isArray(row.featured_mediums)
    ? row.featured_mediums.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  return {
    id: toNumber(row.id),
    storeId: toNumber(row.store_id),
    studioHeadline: row.studio_headline || "",
    artistStatement: row.artist_statement || "",
    featuredMediums,
    commissionPolicy: row.commission_policy || "",
    contactEmail: row.contact_email || "",
    commissionOpen: Boolean(row.commission_open),
  };
}

function mapArtListingBaseRow(row) {
  if (!row) {
    return null;
  }

  return {
    artListingId: toNumber(row.art_listing_id || row.id),
    medium: row.medium || "",
    artCategory: row.art_category || "",
    collectionName: row.collection_name || "",
    featured: Boolean(row.featured),
    commissionOpen: Boolean(row.commission_open),
    ...mapProductRow({
      id: row.catalog_item_id || row.id,
      storeId: row.store_id,
      itemType: "art",
      title: row.title,
      description: row.description,
      status: row.status,
      visibility: row.visibility,
      price: row.price,
      delivery: row.delivery,
      location: row.location,
      transportFee: row.transport_fee,
      stockQuantity: row.stock_quantity,
      variantCount: row.variant_count,
      createdAt: row.catalog_created_at || row.created_at,
      variants: [],
    }),
  };
}

async function findArtStoreSettingsByStoreId(storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("art_store_settings")
    .where({ store_id: storeId })
    .first();

  return mapArtStoreSettingsRow(row);
}

async function upsertArtStoreSettings(storeId, settings, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("art_store_settings")
    .insert({
      store_id: storeId,
      studio_headline: settings.studioHeadline || null,
      artist_statement: settings.artistStatement || null,
      featured_mediums: settings.featuredMediums || [],
      commission_policy: settings.commissionPolicy || null,
      contact_email: settings.contactEmail || null,
      commission_open: Boolean(settings.commissionOpen),
      updated_at: knex.fn.now(),
    })
    .onConflict("store_id")
    .merge({
      studio_headline: settings.studioHeadline || null,
      artist_statement: settings.artistStatement || null,
      featured_mediums: settings.featuredMediums || [],
      commission_policy: settings.commissionPolicy || null,
      contact_email: settings.contactEmail || null,
      commission_open: Boolean(settings.commissionOpen),
      updated_at: knex.fn.now(),
    })
    .returning([
      "id",
      "store_id",
      "studio_headline",
      "artist_statement",
      "featured_mediums",
      "commission_policy",
      "contact_email",
      "commission_open",
    ]);

  return mapArtStoreSettingsRow(row);
}

async function createArtListingMeta(listing, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("art_listings")
    .insert({
      store_id: listing.storeId,
      catalog_item_id: listing.catalogItemId,
      medium: listing.medium || null,
      art_category: listing.artCategory || null,
      collection_name: listing.collectionName || null,
      featured: Boolean(listing.featured),
      commission_open: Boolean(listing.commissionOpen),
    })
    .returning([
      "id",
      "store_id",
      "catalog_item_id",
      "medium",
      "art_category",
      "collection_name",
      "featured",
      "commission_open",
    ]);

  return mapArtListingBaseRow(row);
}

async function updateArtListingMeta(artListingId, storeId, listing, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("art_listings")
    .where({
      id: artListingId,
      store_id: storeId,
    })
    .update({
      medium: listing.medium || null,
      art_category: listing.artCategory || null,
      collection_name: listing.collectionName || null,
      featured: Boolean(listing.featured),
      commission_open: Boolean(listing.commissionOpen),
      updated_at: knex.fn.now(),
    })
    .returning([
      "id",
      "store_id",
      "catalog_item_id",
      "medium",
      "art_category",
      "collection_name",
      "featured",
      "commission_open",
    ]);

  return mapArtListingBaseRow(row);
}

async function findArtListingByIdAndStoreId(artListingId, storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("art_listings as al")
    .join("catalog_items as ci", "ci.id", "al.catalog_item_id")
    .select(
      "al.id as art_listing_id",
      "al.store_id",
      "al.catalog_item_id",
      "al.medium",
      "al.art_category",
      "al.collection_name",
      "al.featured",
      "al.commission_open",
      "ci.title",
      "ci.description",
      "ci.status",
      "ci.visibility",
      "ci.price",
      "ci.delivery",
      "ci.location",
      "ci.transport_fee",
      "ci.created_at as catalog_created_at",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where({
      "al.id": artListingId,
      "al.store_id": storeId,
    })
    .first();

  if (!row) {
    return null;
  }

  const [imageRows, variantRows] = await Promise.all([
    findCatalogMedia(row.catalog_item_id, options),
    listProductVariants(row.catalog_item_id, options),
  ]);

  return {
    ...mapArtListingBaseRow(row),
    images: mapProductImages(imageRows),
    variants: variantRows,
  };
}

async function listArtListingsByStoreId(storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const query = knex("art_listings as al")
    .join("catalog_items as ci", "ci.id", "al.catalog_item_id")
    .join("stores as s", "s.id", "al.store_id")
    .select(
      "al.id as art_listing_id",
      "al.store_id",
      "al.catalog_item_id",
      "al.medium",
      "al.art_category",
      "al.collection_name",
      "al.featured",
      "al.commission_open",
      "ci.title",
      "ci.description",
      "ci.status",
      "ci.visibility",
      "ci.price",
      "ci.delivery",
      "ci.location",
      "ci.transport_fee",
      "ci.created_at as catalog_created_at",
      knex.raw(
        "(select ii.total_on_hand from inventory_items ii where ii.catalog_item_id = ci.id and ii.variant_id is null order by ii.id asc limit 1) as stock_quantity"
      ),
      knex.raw(
        "(select count(*) from product_variants pv where pv.catalog_item_id = ci.id) as variant_count"
      )
    )
    .where("al.store_id", storeId);

  if (options.publicOnly) {
    query
      .where("ci.status", "published")
      .where("ci.visibility", "public")
      .whereRaw(
        "coalesce(s.visibility_status, case when coalesce(s.profile_completed, false) then 'published' else 'draft' end) = 'published'"
      );
  }

  const rows = await query
    .orderBy("al.featured", "desc")
    .orderBy("ci.created_at", "desc")
    .orderBy("al.id", "desc");

  return Promise.all(
    rows.map(async (row) => {
      const [imageRows, variantRows] = await Promise.all([
        findCatalogMedia(row.catalog_item_id, options),
        listProductVariants(row.catalog_item_id, options),
      ]);

      return {
        ...mapArtListingBaseRow(row),
        images: mapProductImages(imageRows),
        variants: variantRows,
      };
    })
  );
}

async function deleteArtListingMeta(artListingId, storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  return knex("art_listings")
    .where({
      id: artListingId,
      store_id: storeId,
    })
    .del();
}

module.exports = {
  createArtListingMeta,
  deleteArtListingMeta,
  findArtListingByIdAndStoreId,
  findArtStoreSettingsByStoreId,
  listArtListingsByStoreId,
  mapArtListingBaseRow,
  mapArtStoreSettingsRow,
  updateArtListingMeta,
  upsertArtStoreSettings,
};
