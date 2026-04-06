const path = require("path");

function mapStoreRow(row) {
  if (!row) {
    return null;
  }

  const socials = {
    instagram: row.instagram || "",
    facebook: row.facebook || "",
    tiktok: row.tiktok || "",
    xhandle: row.xhandle || "",
  };

  return {
    id: row.id,
    userId: row.userId,
    storeName: row.storeName || "",
    handle: row.handle || "",
    templateKey: row.templateKey || "products",
    tagline: row.tagline || "",
    about: row.about || "",
    accentColor: row.accentColor || "#2563eb",
    avatarUrl: row.avatarUrl || "",
    coverUrl: row.coverUrl || "",
    profileCompleted: Boolean(row.profileCompleted),
    visibilityStatus: row.visibilityStatus || "draft",
    publishedAt: row.publishedAt || null,
    setupStep: Number(row.setupStep || 1) || 1,
    setupState: row.setupState && typeof row.setupState === "object" ? row.setupState : {},
    socials,
    instagram: socials.instagram,
    facebook: socials.facebook,
    tiktok: socials.tiktok,
    xhandle: socials.xhandle,
  };
}

function mapProductRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    storeId: row.storeId,
    itemType: row.itemType || "product",
    name: row.name || row.title || "",
    title: row.name || row.title || "",
    description: row.description || "",
    status: row.status || "published",
    visibility: row.visibility || "public",
    price: row.price || 0,
    delivery: row.delivery || "",
    location: row.location || "",
    transportFee: row.transportFee || 0,
    stockQuantity: Number(row.stockQuantity || 0) || 0,
    variantCount: Number(row.variantCount || 0) || 0,
    variants: Array.isArray(row.variants) ? row.variants.map((variant) => mapProductVariantRow(variant)).filter(Boolean) : [],
    createdAt: row.createdAt || null,
  };
}

function mapProductVariantRow(row) {
  if (!row) {
    return null;
  }

  const attributes =
    row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes) ? row.attributes : {};

  return {
    id: row.id,
    productId: row.productId || row.catalogItemId || null,
    label: row.label || "",
    sku: row.sku || "",
    attributes,
    priceOverride:
      row.priceOverride === null || row.priceOverride === undefined || row.priceOverride === ""
        ? null
        : Number(row.priceOverride),
    stockQuantity: Number(row.stockQuantity || 0) || 0,
    createdAt: row.createdAt || null,
  };
}

function mapProductImages(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    src: row.url,
    sortOrder: row.sortOrder,
    name: path.basename(row.url || "") || "product-image",
  }));
}

module.exports = {
  mapProductImages,
  mapProductRow,
  mapProductVariantRow,
  mapStoreRow,
};
