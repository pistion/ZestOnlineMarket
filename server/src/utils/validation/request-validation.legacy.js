const { normalizeTemplateKey } = require("../store-template");
const { createHttpError } = require("../api-response");

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i;
const MAX_IMAGE_COUNT = 6;
const MAX_BASE64_LENGTH = 7_500_000;
const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const ENGAGEMENT_TARGET_TYPES = ["feed_item", "catalog_item", "store"];
const FEED_REACTION_TYPES = ["love", "fire", "celebrate"];
const FEED_SCOPES = ["all", "following"];
const STORE_VISIBILITY_STATUSES = ["draft", "published", "unpublished"];
const CATALOG_ITEM_STATUSES = ["draft", "published", "archived"];
const CATALOG_VISIBILITY_STATUSES = ["public", "unlisted", "private"];
const MAX_VARIANT_COUNT = 12;
const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "refunded", "cancelled"];
const PAYMENT_METHODS = ["bsp-pay", "paypal"];
const BUYER_ADDRESS_TYPES = ["billing", "shipping"];
const CONTENT_REPORT_REASONS = ["spam", "abuse", "impersonation", "misleading", "other"];
const FLAGGED_PUBLIC_CONTENT_PATTERNS = [
  /<\s*script\b/i,
  /javascript:/i,
  /\bon(?:error|load)\s*=/i,
  /\bkill yourself\b/i,
  /\bnigg(?:er|a)\b/i,
  /\bfaggot\b/i,
  /\bkike\b/i,
];
const URL_MATCHER = /(?:https?:\/\/|www\.)[^\s]+/gi;

function isUploadedAssetPath(value) {
  return typeof value === "string" && value.startsWith("/uploads/") && !value.includes("..");
}

function isAllowedDataImage(value) {
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    return false;
  }

  const mimeMatch = value.match(/^data:([^;]+);base64,/i);
  const mimeType = mimeMatch ? String(mimeMatch[1] || "").trim().toLowerCase() : "";
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
}

function normalizeText(value, maxLength, fieldName, options = {}) {
  const { required = false, minLength = 0 } = options;
  const normalized = String(value || "").trim();

  if (required && !normalized) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  if (!normalized) {
    return "";
  }

  if (normalized.length < minLength) {
    throw createHttpError(400, `${fieldName} is too short`);
  }

  if (normalized.length > maxLength) {
    throw createHttpError(400, `${fieldName} is too long`);
  }

  return normalized;
}

function assertModeratedPublicText(value, fieldName, options = {}) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const maxLinks = Number.isFinite(Number(options.maxLinks)) ? Number(options.maxLinks) : 2;
  const urlMatches = normalized.match(URL_MATCHER) || [];
  if (urlMatches.length > maxLinks) {
    throw createHttpError(400, `${fieldName} has too many links`);
  }

  if (FLAGGED_PUBLIC_CONTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw createHttpError(400, `${fieldName} violates moderation rules`);
  }

  return normalized;
}

function normalizeEmail(value) {
  const email = normalizeText(value, 120, "Email", { required: true }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, "Email format is invalid");
  }

  return email;
}

function normalizeOptionalEmail(value, fieldName = "Email") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalizeEmail(normalized);
}

function normalizePassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128) {
    throw createHttpError(400, "Password must be between 8 and 128 characters");
  }

  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw createHttpError(400, "Password must include letters and numbers");
  }

  return password;
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (!["buyer", "seller"].includes(role)) {
    throw createHttpError(400, "Invalid role");
  }

  return role;
}

function normalizeHandle(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (!normalized) {
    throw createHttpError(400, "Handle is required");
  }

  if (!HANDLE_PATTERN.test(normalized)) {
    throw createHttpError(
      400,
      "Handle must be 3-40 characters and use only lowercase letters, numbers, and hyphens"
    );
  }

  return normalized;
}

function normalizeColor(value) {
  const color = String(value || "#2563eb").trim();
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw createHttpError(400, "Accent color must be a valid 6-digit hex value");
  }

  return color.startsWith("#") ? color : `#${color}`;
}

function normalizeNumber(value, fieldName, options = {}) {
  const { minimum = 0, maximum = Number.MAX_SAFE_INTEGER, fallback = 0 } = options;
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw createHttpError(400, `${fieldName} must be a valid number`);
  }
  if (parsed < minimum || parsed > maximum) {
    throw createHttpError(400, `${fieldName} is out of range`);
  }

  return parsed;
}

function normalizeSocialValue(value, fieldName) {
  const normalized = normalizeText(value, 160, fieldName);
  if (!normalized) {
    return "";
  }

  if (/[\r\n]/.test(normalized)) {
    throw createHttpError(400, `${fieldName} contains invalid characters`);
  }

  return normalized;
}

function normalizeStringArray(values, fieldName, options = {}) {
  const { maxItems = 8, itemMaxLength = 40 } = options;
  const list = Array.isArray(values) ? values : [];
  const normalized = [
    ...new Set(
      list
        .map((value) =>
          normalizeText(value, itemMaxLength, fieldName)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
    ),
  ];

  if (normalized.length > maxItems) {
    throw createHttpError(400, `${fieldName} has too many selections`);
  }

  return normalized;
}

function normalizeAssetValue(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("data:image/")) {
    if (!isAllowedDataImage(normalized)) {
      throw createHttpError(400, `${fieldName} must be a PNG, JPG, WEBP, or GIF image`);
    }

    if (normalized.length > MAX_BASE64_LENGTH) {
      throw createHttpError(400, `${fieldName} is too large`);
    }

    return normalized;
  }

  if (
    isUploadedAssetPath(normalized) ||
    normalized.startsWith("/assets/") ||
    /^https?:\/\//i.test(normalized)
  ) {
    if (normalized.length > 2048) {
      throw createHttpError(400, `${fieldName} is too long`);
    }

    return normalized;
  }

  throw createHttpError(400, `${fieldName} must be an uploaded image or image URL`);
}

function normalizeProductImages(images) {
  const list = Array.isArray(images) ? images : [];
  if (list.length > MAX_IMAGE_COUNT) {
    throw createHttpError(400, `A maximum of ${MAX_IMAGE_COUNT} images is allowed`);
  }

  return list.map((item, index) => {
    const src = String((item && (item.src || item.url)) || "").trim();
    if (!src) {
      throw createHttpError(400, `Image ${index + 1} is missing source data`);
    }

    if (src.startsWith("data:image/")) {
      if (!isAllowedDataImage(src)) {
        throw createHttpError(400, `Image ${index + 1} must be a PNG, JPG, WEBP, or GIF image`);
      }

      if (src.length > MAX_BASE64_LENGTH) {
        throw createHttpError(400, `Image ${index + 1} is too large`);
      }

      return { src };
    }

    if (!isUploadedAssetPath(src)) {
      throw createHttpError(400, `Image ${index + 1} must be a base64 image or uploaded asset`);
    }

    return { src };
  });
}

function normalizeFeedPostImages(images) {
  const list = Array.isArray(images) ? images : [];
  if (list.length > MAX_IMAGE_COUNT) {
    throw createHttpError(400, `A maximum of ${MAX_IMAGE_COUNT} images is allowed`);
  }

  return list.map((item, index) => {
    const source = typeof item === "string" ? item : item && (item.src || item.url);
    return normalizeAssetValue(source, `Update image ${index + 1}`);
  });
}

function normalizeCatalogStatus(value, fallback = "published") {
  const status = String(value || fallback).trim().toLowerCase();
  if (!CATALOG_ITEM_STATUSES.includes(status)) {
    throw createHttpError(400, "Product status must be draft, published, or archived");
  }

  return status;
}

function normalizeCatalogVisibility(value, fallback = "public") {
  const visibility = String(value || fallback).trim().toLowerCase();
  if (!CATALOG_VISIBILITY_STATUSES.includes(visibility)) {
    throw createHttpError(400, "Product visibility must be public, unlisted, or private");
  }

  return visibility;
}

function normalizeVariantAttributes(attributes, label) {
  const source = attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {};
  const entries = Object.entries(source)
    .map(([key, value]) => {
      const normalizedKey = normalizeText(key, 32, "Variant attribute name").toLowerCase().replace(/\s+/g, "_");
      const normalizedValue = normalizeText(value, 60, "Variant attribute value");
      if (!normalizedKey || !normalizedValue) {
        return null;
      }

      return [normalizedKey, normalizedValue];
    })
    .filter(Boolean)
    .slice(0, 6);

  if (entries.length) {
    return Object.fromEntries(entries);
  }

  if (label) {
    return { label };
  }

  return {};
}

function normalizeProductVariants(variants, basePrice) {
  const list = Array.isArray(variants) ? variants : [];
  if (list.length > MAX_VARIANT_COUNT) {
    throw createHttpError(400, `A maximum of ${MAX_VARIANT_COUNT} variants is allowed`);
  }

  const seenLabels = new Set();
  const seenSkus = new Set();

  return list.map((variant, index) => {
    const label = normalizeText(
      variant && (variant.label || variant.name || variant.optionLabel || variant.title),
      80,
      `Variant ${index + 1} label`,
      { required: true, minLength: 1 }
    );
    const normalizedLabelKey = label.toLowerCase();
    if (seenLabels.has(normalizedLabelKey)) {
      throw createHttpError(400, `Variant ${index + 1} duplicates another variant label`);
    }
    seenLabels.add(normalizedLabelKey);

    const sku = normalizeText(variant && variant.sku, 120, `Variant ${index + 1} SKU`).toUpperCase();
    if (sku) {
      if (seenSkus.has(sku)) {
        throw createHttpError(400, `Variant ${index + 1} duplicates another SKU`);
      }
      seenSkus.add(sku);
    }

    const priceOverrideRaw =
      variant && (variant.priceOverride ?? variant.price_override ?? variant.price ?? "");
    const priceOverride =
      priceOverrideRaw === "" || priceOverrideRaw == null
        ? null
        : normalizeNumber(priceOverrideRaw, `Variant ${index + 1} price`, {
            minimum: 0,
            maximum: 1_000_000,
            fallback: basePrice || 0,
          });

    return {
      label,
      sku,
      attributes: normalizeVariantAttributes(variant && variant.attributes, label),
      priceOverride,
      stockQuantity: normalizeNumber(variant && variant.stockQuantity, `Variant ${index + 1} stock quantity`, {
        minimum: 0,
        maximum: 1_000_000,
        fallback: 0,
      }),
    };
  });
}

function deriveFeedPostTitle(title, description) {
  const normalizedTitle = normalizeText(title, 120, "Update headline");
  if (normalizedTitle) {
    return {
      title: normalizedTitle,
      hasExplicitTitle: true,
    };
  }

  const compactDescription = String(description || "").replace(/\s+/g, " ").trim();
  const derivedTitle =
    compactDescription.length > 72
      ? `${compactDescription.slice(0, 69).trimEnd()}...`
      : compactDescription;

  return {
    title: derivedTitle || "Store update",
    hasExplicitTitle: false,
  };
}

function validateAuthPayload(body, mode) {
  const payload = body || {};
  const email = normalizeEmail(payload.email);
  const password = normalizePassword(payload.password);

  if (mode === "register") {
    return {
      email,
      password,
      role: normalizeRole(payload.role),
    };
  }

  return { email, password };
}

function normalizeCatalogProduct(product, options = {}) {
  const { requireCoreFields = false } = options;
  const price = normalizeNumber(product.price, "Product price", {
    minimum: 0,
    maximum: 1_000_000,
    fallback: 0,
  });

  return {
    name: normalizeText(product.name, 120, "Product name", {
      required: requireCoreFields,
      minLength: requireCoreFields ? 2 : 0,
    }),
    description: normalizeText(product.description, 2000, "Product description", {
      required: requireCoreFields,
      minLength: requireCoreFields ? 6 : 0,
    }),
    price,
    delivery: normalizeText(product.delivery, 180, "Delivery information"),
    location: normalizeText(product.location, 120, "Location"),
    transportFee: normalizeNumber(product.transportFee, "Transport fee", {
      minimum: 0,
      maximum: 100_000,
      fallback: 0,
    }),
    status: normalizeCatalogStatus(product.status, requireCoreFields ? "published" : "published"),
    visibility: normalizeCatalogVisibility(product.visibility, "public"),
    stockQuantity: normalizeNumber(product.stockQuantity, "Stock quantity", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    variants: normalizeProductVariants(product.variants, price),
    images: normalizeProductImages(product.images),
  };
}

function validateStorePayload(body) {
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
  };
}

function validateSellerStoreDraftPayload(body) {
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

function validateStoreVisibilityPayload(body) {
  const visibilityStatus = String(body && body.visibilityStatus || "")
    .trim()
    .toLowerCase();

  if (!STORE_VISIBILITY_STATUSES.includes(visibilityStatus)) {
    throw createHttpError(400, "Visibility status must be draft, published, or unpublished");
  }

  return { visibilityStatus };
}

function validateProductPayload(body) {
  const payload = body || {};
  return normalizeCatalogProduct(payload.product || payload, {
    requireCoreFields: true,
  });
}

function normalizeBooleanFlag(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function validateArtStoreSettingsPayload(body) {
  const payload = body || {};
  return {
    studioHeadline: normalizeText(payload.studioHeadline, 255, "Studio headline"),
    artistStatement: normalizeText(payload.artistStatement, 2000, "Artist statement"),
    featuredMediums: normalizeStringArray(payload.featuredMediums, "Featured mediums", {
      maxItems: 8,
      itemMaxLength: 40,
    }),
    commissionPolicy: normalizeText(payload.commissionPolicy, 1200, "Commission policy"),
    contactEmail: normalizeOptionalEmail(payload.contactEmail, "Contact email"),
    commissionOpen: normalizeBooleanFlag(payload.commissionOpen, false),
  };
}

function validateArtListingPayload(body) {
  const payload = body || {};
  const listing = normalizeCatalogProduct(payload.listing || payload, {
    requireCoreFields: true,
  });

  return {
    ...listing,
    medium: normalizeText(payload.medium, 80, "Medium", {
      required: true,
      minLength: 2,
    }),
    artCategory: normalizeText(payload.artCategory || payload.category, 80, "Art category"),
    collectionName: normalizeText(payload.collectionName, 120, "Collection name"),
    featured: normalizeBooleanFlag(payload.featured, false),
    commissionOpen: normalizeBooleanFlag(payload.commissionOpen, false),
  };
}

function validateBuyerProfilePayload(body) {
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

function validateBuyerSettingsPayload(body) {
  return validateBuyerProfilePayload(body);
}

function validateBuyerAddressPayload(body) {
  const payload = body || {};
  const addressType = String(payload.addressType || payload.address_type || "")
    .trim()
    .toLowerCase();

  if (!BUYER_ADDRESS_TYPES.includes(addressType)) {
    throw createHttpError(400, "Address type must be billing or shipping");
  }

  const countryCode = normalizeText(
    payload.countryCode || payload.country_code,
    3,
    "Country code"
  )
    .toUpperCase()
    .slice(0, 3);

  return {
    addressType,
    addressLine1: normalizeText(
      payload.addressLine1 || payload.address_line_1,
      240,
      "Address line 1",
      {
        required: true,
        minLength: 4,
      }
    ),
    addressLine2: normalizeText(
      payload.addressLine2 || payload.address_line_2,
      240,
      "Address line 2"
    ),
    city: normalizeText(payload.city, 120, "City", {
      required: true,
      minLength: 2,
    }),
    region: normalizeText(payload.region, 120, "Region"),
    postalCode: normalizeText(payload.postalCode || payload.postal_code, 32, "Postal code"),
    countryCode,
  };
}

function validateBuyerWishlistPayload(body) {
  const payload = body || {};
  return {
    productId: normalizeNumber(payload.productId || payload.catalogItemId, "Product id", {
      minimum: 1,
      fallback: 0,
    }),
  };
}

function validateBuyerInteractionPayload(body) {
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
    templateKey: payload.templateKey ? normalizeTemplateKey(payload.templateKey) : "",
    itemType: normalizeText(payload.itemType, 40, "Item type")
      .toLowerCase()
      .replace(/\s+/g, "_"),
    catalogItemId: normalizeNumber(payload.catalogItemId || payload.productId, "Product id", {
      minimum: 0,
      fallback: 0,
    }),
  };
}

function validateFeedQueryPayload(query) {
  const payload = query || {};
  const scope = String(payload.scope || "all")
    .trim()
    .toLowerCase();

  return {
    page: normalizeNumber(payload.page, "Feed page", {
      minimum: 1,
      maximum: 200,
      fallback: 1,
    }),
    limit: normalizeNumber(payload.limit, "Feed limit", {
      minimum: 1,
      maximum: 12,
      fallback: 6,
    }),
    scope: FEED_SCOPES.includes(scope) ? scope : "all",
    query: normalizeText(payload.q || payload.query, 120, "Feed search"),
  };
}

function validateStoreFeedPostPayload(body) {
  const payload = body || {};
  const type = String(payload.type || "").trim().toLowerCase();
  if (!["announcement", "promo", "live_drop"].includes(type)) {
    throw createHttpError(400, "Update type must be announcement, promo, or live drop");
  }

  const description = normalizeText(payload.description, 600, "Update details", {
    required: true,
    minLength: 3,
  });
  const derived = deriveFeedPostTitle(payload.title, description);
  const moderatedTitle = assertModeratedPublicText(derived.title, "Update headline");
  const moderatedDescription = assertModeratedPublicText(description, "Update details", {
    maxLinks: 2,
  });

  return {
    type,
    title: moderatedTitle,
    hasExplicitTitle: derived.hasExplicitTitle,
    description: moderatedDescription,
    catalogItemId: normalizeNumber(payload.catalogItemId || payload.productId, "Linked listing id", {
      minimum: 0,
      fallback: 0,
    }),
    images: normalizeFeedPostImages(payload.images),
  };
}

function validateBuyerCheckoutPayload(body) {
  const payload = body || {};
  const paymentMethod = String(payload.paymentMethod || "")
    .trim()
    .toLowerCase();
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw createHttpError(400, "Payment method must be BSP Pay or PayPal");
  }

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

function validateSellerOrderStatusPayload(body) {
  const payload = body || {};
  const status = String(payload.status || "")
    .trim()
    .toLowerCase();
  if (!ORDER_STATUSES.includes(status)) {
    throw createHttpError(400, "Order status is invalid");
  }

  return {
    status,
    trackingNumber: normalizeText(payload.trackingNumber, 255, "Tracking number"),
    carrier: normalizeText(payload.carrier, 160, "Carrier"),
    deliveryEstimate: normalizeText(payload.deliveryEstimate, 120, "Delivery estimate"),
    refundReason: normalizeText(payload.refundReason, 300, "Refund reason"),
  };
}

function normalizeEngagementTargetType(value) {
  const targetType = String(value || "").trim().toLowerCase();
  if (!ENGAGEMENT_TARGET_TYPES.includes(targetType)) {
    throw createHttpError(400, "Target type must be feed_item, catalog_item, or store");
  }

  return targetType;
}

function validateEngagementTargetPayload(body) {
  const payload = body || {};
  const targetType = normalizeEngagementTargetType(payload.targetType);
  const targetId = normalizeNumber(payload.targetId, "Target id", {
    minimum: 1,
    fallback: 0,
  });

  if (!targetId) {
    throw createHttpError(400, "Target id is required");
  }

  return {
    targetType,
    targetId,
  };
}

function validateCommentPayload(body) {
  const target = validateEngagementTargetPayload(body);
  const commentBody = normalizeText(body && body.body, 300, "Comment", {
    required: true,
    minLength: 1,
  });

  return {
    ...target,
    body: assertModeratedPublicText(commentBody, "Comment", {
      maxLinks: 1,
    }),
  };
}

function validateSharePayload(body) {
  const target = validateEngagementTargetPayload(body);

  return {
    ...target,
    destination: normalizeText(body && body.destination, 120, "Share destination"),
    method: normalizeText(body && body.method, 120, "Share method"),
  };
}

function validateReactionPayload(body) {
  const target = validateEngagementTargetPayload(body);
  if (target.targetType !== "feed_item") {
    throw createHttpError(400, "Reactions currently support feed items only");
  }

  const reactionType = String(body && body.reactionType || "").trim().toLowerCase();
  if (!FEED_REACTION_TYPES.includes(reactionType)) {
    throw createHttpError(400, "Reaction must be love, fire, or celebrate");
  }

  return {
    ...target,
    reactionType,
  };
}

function validateContentReportPayload(body) {
  const target = validateEngagementTargetPayload(body);
  const reason = String((body && body.reason) || "")
    .trim()
    .toLowerCase();
  if (!CONTENT_REPORT_REASONS.includes(reason)) {
    throw createHttpError(400, "Report reason must be spam, abuse, impersonation, misleading, or other");
  }

  return {
    ...target,
    reason,
    details: normalizeText(body && body.details, 800, "Report details", {
      required: true,
      minLength: 6,
    }),
    metadata:
      body && body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {},
  };
}

module.exports = {
  validateArtListingPayload,
  validateArtStoreSettingsPayload,
  validateBuyerCheckoutPayload,
  validateBuyerInteractionPayload,
  validateBuyerAddressPayload,
  validateContentReportPayload,
  validateFeedQueryPayload,
  normalizeEngagementTargetType,
  normalizeHandle,
  validateAuthPayload,
  validateBuyerProfilePayload,
  validateBuyerSettingsPayload,
  validateBuyerWishlistPayload,
  validateCommentPayload,
  validateEngagementTargetPayload,
  validateProductPayload,
  validateReactionPayload,
  validateSellerStoreDraftPayload,
  validateSellerOrderStatusPayload,
  validateSharePayload,
  validateStoreFeedPostPayload,
  validateStoreVisibilityPayload,
  validateStorePayload,
};
