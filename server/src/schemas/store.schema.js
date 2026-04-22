const { normalizeTemplateKey } = require("../utils/store-template");
const {
  STORE_VISIBILITY_STATUSES,
  createNormalizedSchema,
  normalizeAssetValue,
  normalizeCatalogProduct,
  normalizeChoice,
  normalizeColor,
  normalizeHandle,
  normalizeNumber,
  normalizeProductImages,
  normalizeSocialValue,
  normalizeText,
} = require("./shared.schema");

function normalizeStorePayload(body) {
  const payload = body || {};
  const product = payload.product || {};

  return {
    storeName: normalizeText(payload.storeName, 80, "Store name", {
      required: true,
      minLength: 2,
    }),
    handle: normalizeHandle(payload.handle),
    templateKey: normalizeTemplateKey(payload.templateKey),
    tagline: normalizeText(payload.tagline, 140, "Tagline"),
    about: normalizeText(payload.about, 1800, "About"),
    accentColor: normalizeColor(payload.accentColor),
    avatarUrl: normalizeAssetValue(payload.avatarUrl, "Avatar image"),
    coverUrl: normalizeAssetValue(payload.coverUrl, "Cover image"),
    socials: {
      instagram: normalizeSocialValue(payload.socials && payload.socials.instagram, "Instagram"),
      facebook: normalizeSocialValue(payload.socials && payload.socials.facebook, "Facebook"),
      tiktok: normalizeSocialValue(payload.socials && payload.socials.tiktok, "TikTok"),
      xhandle: normalizeSocialValue(payload.socials && payload.socials.xhandle, "X handle"),
    },
    product: normalizeCatalogProduct(product, {
      requireCoreFields: false,
    }),
    visibilityStatus:
      payload.visibilityStatus == null || payload.visibilityStatus === ""
        ? ""
        : normalizeChoice(
            payload.visibilityStatus,
            STORE_VISIBILITY_STATUSES,
            "Visibility status must be draft, published, or unpublished"
          ),
  };
}

function normalizeSellerStoreDraftPayload(body) {
  const payload = body || {};
  const product = payload.product || {};

  return {
    setupStep: normalizeNumber(payload.setupStep, "Setup step", {
      minimum: 1,
      maximum: 4,
      fallback: 1,
    }),
    templateKey: normalizeTemplateKey(payload.templateKey),
    store: {
      storeName: normalizeText(payload.storeName, 80, "Store name"),
      handle: normalizeText(payload.handle, 80, "Handle"),
      tagline: normalizeText(payload.tagline, 140, "Tagline"),
      about: normalizeText(payload.about, 1800, "About"),
      accentColor: normalizeColor(payload.accentColor),
      avatarUrl: normalizeAssetValue(payload.avatarUrl, "Avatar image"),
      coverUrl: normalizeAssetValue(payload.coverUrl, "Cover image"),
      socials: {
        instagram: normalizeSocialValue(payload.socials && payload.socials.instagram, "Instagram"),
        facebook: normalizeSocialValue(payload.socials && payload.socials.facebook, "Facebook"),
        tiktok: normalizeSocialValue(payload.socials && payload.socials.tiktok, "TikTok"),
        xhandle: normalizeSocialValue(payload.socials && payload.socials.xhandle, "X handle"),
      },
    },
    product: {
      name: normalizeText(product.name, 120, "Product name"),
      description: normalizeText(product.description, 2000, "Product description"),
      price: normalizeNumber(product.price, "Product price", {
        minimum: 0,
        maximum: 1_000_000,
        fallback: 0,
      }),
      delivery: normalizeText(product.delivery, 180, "Delivery information"),
      location: normalizeText(product.location, 120, "Location"),
      transportFee: normalizeNumber(product.transportFee, "Transport fee", {
        minimum: 0,
        maximum: 100_000,
        fallback: 0,
      }),
      images: normalizeProductImages(product.images),
    },
  };
}

function normalizeStoreVisibilityPayload(body) {
  return {
    visibilityStatus: normalizeChoice(
      body && body.visibilityStatus,
      STORE_VISIBILITY_STATUSES,
      "Visibility status must be draft, published, or unpublished"
    ),
  };
}

const storeBodySchema = createNormalizedSchema(normalizeStorePayload);
const sellerStoreDraftBodySchema = createNormalizedSchema(normalizeSellerStoreDraftPayload);
const storeVisibilityBodySchema = createNormalizedSchema(normalizeStoreVisibilityPayload);
const storeHandleParamsSchema = createNormalizedSchema((params) => ({
  handle: normalizeHandle(params && params.handle),
}));

module.exports = {
  sellerStoreDraftBodySchema,
  storeBodySchema,
  storeHandleParamsSchema,
  storeVisibilityBodySchema,
};
