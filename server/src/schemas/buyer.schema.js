const { normalizeTemplateKey } = require("../utils/store-template");
const {
  BUYER_ADDRESS_TYPES,
  PAYMENT_METHODS,
  createNormalizedSchema,
  normalizeAssetValue,
  normalizeChoice,
  normalizeEmail,
  normalizeHandle,
  normalizeNumber,
  normalizeOptionalTemplateKey,
  normalizePositiveInteger,
  normalizeStringArray,
  normalizeText,
} = require("./shared.schema");

function normalizeBuyerProfilePayload(body) {
  const payload = body || {};

  return {
    fullName: normalizeText(payload.fullName, 120, "Full name", {
      required: true,
      minLength: 2,
    }),
    phone: normalizeText(payload.phone, 40, "Phone"),
    avatarUrl: normalizeAssetValue(payload.avatarUrl, "Profile photo"),
    coverUrl: normalizeAssetValue(payload.coverUrl, "Cover photo"),
    bio: normalizeText(payload.bio, 600, "Bio"),
    favoriteCategories: normalizeStringArray(payload.favoriteCategories, "Favorite categories", {
      maxItems: 8,
      itemMaxLength: 40,
    }),
    favoriteTemplates: normalizeStringArray(payload.favoriteTemplates, "Favorite storefront styles", {
      maxItems: 6,
      itemMaxLength: 32,
    }).map((value) => normalizeTemplateKey(value)),
  };
}

function normalizeBuyerAddressPayload(body) {
  const payload = body || {};
  const addressType = normalizeChoice(
    payload.addressType || payload.address_type,
    BUYER_ADDRESS_TYPES,
    "Address type must be billing or shipping"
  );
  const countryCode = normalizeText(payload.countryCode || payload.country_code, 3, "Country code")
    .toUpperCase()
    .slice(0, 3);

  return {
    addressType,
    addressLine1: normalizeText(payload.addressLine1 || payload.address_line_1, 240, "Address line 1", {
      required: true,
      minLength: 4,
    }),
    addressLine2: normalizeText(payload.addressLine2 || payload.address_line_2, 240, "Address line 2"),
    city: normalizeText(payload.city, 120, "City", {
      required: true,
      minLength: 2,
    }),
    region: normalizeText(payload.region, 120, "Region"),
    postalCode: normalizeText(payload.postalCode || payload.postal_code, 32, "Postal code"),
    countryCode,
  };
}

function normalizeBuyerWishlistPayload(body) {
  const payload = body || {};

  return {
    productId: normalizeNumber(payload.productId || payload.catalogItemId, "Product id", {
      minimum: 1,
      fallback: 0,
    }),
  };
}

function normalizeBuyerInteractionPayload(body) {
  const payload = body || {};

  return {
    action: normalizeText(payload.action, 40, "Interaction action", {
      required: true,
      minLength: 3,
    })
      .toLowerCase()
      .replace(/\s+/g, "_"),
    source: normalizeText(payload.source, 64, "Interaction source")
      .toLowerCase()
      .replace(/\s+/g, "-"),
    storeId: normalizeNumber(payload.storeId, "Store id", {
      minimum: 0,
      fallback: 0,
    }),
    storeHandle: payload.storeHandle ? normalizeHandle(payload.storeHandle) : "",
    templateKey: normalizeOptionalTemplateKey(payload.templateKey),
    itemType: normalizeText(payload.itemType, 40, "Item type")
      .toLowerCase()
      .replace(/\s+/g, "_"),
    catalogItemId: normalizeNumber(payload.catalogItemId || payload.productId, "Product id", {
      minimum: 0,
      fallback: 0,
    }),
  };
}

function normalizeBuyerCheckoutPayload(body) {
  const payload = body || {};
  const paymentMethod = normalizeChoice(
    payload.paymentMethod,
    PAYMENT_METHODS,
    "Payment method must be BSP Pay or PayPal"
  );

  return {
    productId: normalizeNumber(payload.productId, "Product id", {
      minimum: 1,
      fallback: 0,
    }),
    variantId: normalizeNumber(payload.variantId, "Variant id", {
      minimum: 0,
      fallback: 0,
    }),
    quantity: normalizeNumber(payload.quantity, "Quantity", {
      minimum: 1,
      maximum: 100,
      fallback: 1,
    }),
    paymentMethod,
    customerName: normalizeText(payload.customerName, 160, "Full name", {
      required: true,
      minLength: 2,
    }),
    customerEmail: normalizeEmail(payload.customerEmail),
    customerPhone: normalizeText(payload.customerPhone, 60, "Phone", {
      required: true,
      minLength: 5,
    }),
    couponCode: normalizeText(payload.couponCode || payload.coupon_code, 64, "Coupon code")
      .toUpperCase()
      .replace(/\s+/g, "-"),
    deliveryMethod: normalizeText(payload.deliveryMethod, 80, "Delivery method", {
      required: true,
      minLength: 2,
    }),
    deliveryAddress: normalizeText(payload.deliveryAddress, 240, "Delivery address", {
      required: true,
      minLength: 5,
    }),
    deliveryCity: normalizeText(payload.deliveryCity, 120, "Delivery city", {
      required: true,
      minLength: 2,
    }),
    deliveryNotes: normalizeText(payload.deliveryNotes, 500, "Delivery notes"),
  };
}

function normalizeBuyerCartItemPayload(body) {
  const payload = body || {};

  return {
    productId: normalizeNumber(payload.productId, "Product id", {
      minimum: 1,
      fallback: 0,
    }),
    variantId: normalizeNumber(payload.variantId, "Variant id", {
      minimum: 0,
      fallback: 0,
    }),
    quantity: normalizeNumber(payload.quantity, "Quantity", {
      minimum: 1,
      maximum: 100,
      fallback: 1,
    }),
  };
}

function normalizeBuyerCartItemQuantityPayload(body) {
  const payload = body || {};

  return {
    quantity: normalizeNumber(payload.quantity, "Quantity", {
      minimum: 1,
      maximum: 100,
      fallback: 1,
    }),
  };
}

const buyerProfileBodySchema = createNormalizedSchema(normalizeBuyerProfilePayload);
const buyerSettingsBodySchema = createNormalizedSchema(normalizeBuyerProfilePayload);
const buyerAddressBodySchema = createNormalizedSchema(normalizeBuyerAddressPayload);
const buyerCartItemBodySchema = createNormalizedSchema(normalizeBuyerCartItemPayload);
const buyerCartItemQuantityBodySchema = createNormalizedSchema(normalizeBuyerCartItemQuantityPayload);
const buyerWishlistBodySchema = createNormalizedSchema(normalizeBuyerWishlistPayload);
const buyerInteractionBodySchema = createNormalizedSchema(normalizeBuyerInteractionPayload);
const buyerCheckoutBodySchema = createNormalizedSchema(normalizeBuyerCheckoutPayload);
const buyerAddressParamsSchema = createNormalizedSchema((params) => ({
  addressId: normalizePositiveInteger(params && params.addressId, "Address id"),
}));
const buyerCartItemParamsSchema = createNormalizedSchema((params) => ({
  itemId: normalizePositiveInteger(params && params.itemId, "Cart item id"),
}));
const buyerWishlistParamsSchema = createNormalizedSchema((params) => ({
  productId: normalizePositiveInteger(params && params.productId, "Product id"),
}));
const buyerFollowingParamsSchema = createNormalizedSchema((params) => ({
  handle: normalizeHandle(params && params.handle),
}));

module.exports = {
  buyerAddressBodySchema,
  buyerAddressParamsSchema,
  buyerCartItemBodySchema,
  buyerCartItemParamsSchema,
  buyerCartItemQuantityBodySchema,
  buyerCheckoutBodySchema,
  buyerFollowingParamsSchema,
  buyerInteractionBodySchema,
  buyerProfileBodySchema,
  buyerSettingsBodySchema,
  buyerWishlistBodySchema,
  buyerWishlistParamsSchema,
};
