const demoStalls = require("../../../fixtures/marketplace-stalls");
const { enableDemoStalls } = require("../config/env");
const { mapStoreRow, mapProductImages, mapProductRow } = require("../utils/store-mappers");

function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function cloneProductImages(images = []) {
  return images.map((url, index) => ({
    id: null,
    url,
    src: url,
    sortOrder: index,
    name: `demo-image-${index + 1}`,
  }));
}

function mapDemoStore(stall) {
  return {
    id: null,
    userId: null,
    storeName: stall.storeName,
    handle: stall.handle,
    templateKey: stall.templateKey || "products",
    tagline: stall.tagline || "",
    about: stall.about || "",
    accentColor: stall.accentColor || "#2563eb",
    avatarUrl: stall.avatarUrl || "",
    coverUrl: stall.coverUrl || "",
    instagram: "",
    facebook: "",
    tiktok: "",
    xhandle: "",
  };
}

function mapDemoProduct(stall) {
  const product = stall.featuredProduct || null;
  if (!product) {
    return null;
  }

  return {
    id: null,
    storeId: null,
    name: product.name || "Featured product",
    title: product.name || "Featured product",
    description: product.description || "",
    price: Number(product.price || 0),
    delivery: product.delivery || "",
    location: product.location || stall.location || "",
    transportFee: Number(product.transportFee || 0),
    createdAt: null,
  };
}

function listDemoStalls() {
  if (!enableDemoStalls) {
    return [];
  }

  return demoStalls.map((stall) => ({
    handle: normalizeHandle(stall.handle),
    storeName: stall.storeName,
    templateKey: stall.templateKey || "products",
    tagline: stall.tagline || "",
    about: stall.about || "",
    accentColor: stall.accentColor || "#2563eb",
    avatarUrl: stall.avatarUrl || "",
    coverUrl: stall.coverUrl || "",
    location: stall.location || "",
    teaser: stall.teaser || stall.tagline || "",
    featuredProduct: stall.featuredProduct
      ? {
          id: null,
          name: stall.featuredProduct.name || "Featured product",
          title: stall.featuredProduct.name || "Featured product",
          description: stall.featuredProduct.description || "",
          price: Number(stall.featuredProduct.price || 0),
          delivery: stall.featuredProduct.delivery || "",
          location: stall.featuredProduct.location || stall.location || "",
          transportFee: Number(stall.featuredProduct.transportFee || 0),
          images: Array.isArray(stall.featuredProduct.images) ? stall.featuredProduct.images.slice() : [],
        }
      : null,
    followerCount: Number(stall.followerCount || 0),
    productCount: Number(stall.productCount || (stall.featuredProduct ? 1 : 0)),
    salesCount: Number(stall.salesCount || 0),
    isDemo: true,
    isEditable: false,
  }));
}

function getDemoStorePayloadByHandle(handle) {
  const normalized = normalizeHandle(handle);
  if (!normalized) {
    return null;
  }

  const stall = listDemoStalls().find((item) => item.handle === normalized);
  if (!stall) {
    return null;
  }

  const store = mapStoreRow(mapDemoStore(stall));
  const product = mapProductRow(mapDemoProduct(stall));
  const images = cloneProductImages((stall.featuredProduct && stall.featuredProduct.images) || []);

  return {
    success: true,
    message: "Demo store loaded",
    store,
    product,
    images,
    products: product
      ? [
          {
            ...product,
            images,
          },
        ]
      : [],
    meta: {
      isDemo: true,
      isEditable: false,
    },
  };
}

module.exports = {
  getDemoStorePayloadByHandle,
  listDemoStalls,
};
