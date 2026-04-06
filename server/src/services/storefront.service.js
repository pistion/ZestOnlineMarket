const {
  findCatalogMedia,
  listProductVariants,
  listStoreCatalogItems,
} = require("../repositories/catalog.repository");
const { findStoreByHandle, listMarketplaceStalls: listRealMarketplaceStalls } = require("../repositories/store.repository");
const { mapProductImages, mapProductRow, mapProductVariantRow, mapStoreRow } = require("../utils/store-mappers");
const { getDemoStorePayloadByHandle, listDemoStalls } = require("./demo-store.service");

async function buildStoreProducts(storeId, options = {}) {
  const productRows = await listStoreCatalogItems(storeId, options);
  return Promise.all(
    productRows.map(async (productRow) => {
      const [imageRows, variantRows] = await Promise.all([
        findCatalogMedia(productRow.id),
        listProductVariants(productRow.id),
      ]);
      return {
        ...mapProductRow({
          ...productRow,
          variants: variantRows.map((variant) => mapProductVariantRow(variant)),
        }),
        images: mapProductImages(imageRows),
      };
    })
  );
}

async function buildRealStorePayload(storeRow, options = {}) {
  if (!storeRow) {
    return {
      success: true,
      message: "Store loaded",
      store: null,
      product: null,
      images: [],
      products: [],
      meta: {
        isDemo: false,
        isEditable: true,
        visibilityStatus: "draft",
        setupStep: 1,
      },
    };
  }

  const products = await buildStoreProducts(storeRow.id, {
    publicOnly: Boolean(options.publicOnly),
  });
  if (!products.length) {
    return {
      success: true,
      message: "Store loaded",
      store: mapStoreRow(storeRow),
      product: null,
      images: [],
      products: [],
      meta: {
        isDemo: false,
        isEditable: true,
        visibilityStatus: storeRow.visibilityStatus || "draft",
        setupStep: storeRow.setupStep || 1,
      },
    };
  }

  const featuredProduct = products[0];
  return {
    success: true,
    message: "Store loaded",
    store: mapStoreRow(storeRow),
    product: featuredProduct,
    images: featuredProduct.images || [],
    products,
    meta: {
      isDemo: false,
      isEditable: true,
      visibilityStatus: storeRow.visibilityStatus || "draft",
      setupStep: storeRow.setupStep || 1,
    },
  };
}

async function resolveStorePayloadByHandle(handle) {
  const storeRow = await findStoreByHandle(handle);
  if (storeRow && storeRow.visibilityStatus === "published") {
    return buildRealStorePayload(storeRow, { publicOnly: true });
  }

  return getDemoStorePayloadByHandle(handle);
}

function mapMarketplaceRow(row) {
  const handle = String(row.handle || "").trim();
  const productImages = row.thumbnail ? [row.thumbnail] : [];
  const followerCount = Number(row.followerCount || 0);
  const productCount = Number(row.productCount || 0);
  const salesCount = Number(row.salesCount || 0);

  return {
    storeId: Number(row.id || row.storeId || 0) || 0,
    handle,
    storeName: row.storeName || `@${handle}`,
    templateKey: row.templateKey || "products",
    tagline: row.tagline || "",
    teaser: row.productDescription || row.tagline || row.about || "Browse this stall",
    location: row.productLocation || "",
    thumbnailUrl: row.thumbnail || "",
    coverUrl: row.coverUrl || "",
    followerCount,
    productCount,
    salesCount,
    metrics: {
      followers: followerCount,
      listings: productCount,
      sales: salesCount,
    },
    featuredProduct: row.productId
      ? {
          id: row.productId,
          name: row.productName || "Featured product",
          title: row.productName || "Featured product",
          description: row.productDescription || "",
          price: Number(row.productPrice || 0),
          delivery: row.productDelivery || "",
          location: row.productLocation || "",
          transportFee: Number(row.productTransportFee || 0),
          images: productImages,
        }
      : null,
    isDemo: false,
    isEditable: false,
  };
}

async function listMarketplaceStalls() {
  const rows = await listRealMarketplaceStalls();
  const realStalls = rows.map(mapMarketplaceRow);
  const realHandles = new Set(realStalls.map((stall) => stall.handle));
  const demoStalls = listDemoStalls().filter((stall) => !realHandles.has(stall.handle));

  return [...realStalls, ...demoStalls];
}

module.exports = {
  buildRealStorePayload,
  listMarketplaceStalls,
  resolveStorePayloadByHandle,
};
