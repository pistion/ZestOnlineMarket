const { z } = require("zod");

const { createValidationErrorFromZod } = require("../utils/errors");
const { normalizeTemplateKey } = require("../utils/store-template");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;
const MAX_IMAGE_COUNT = 6;
const MAX_BASE64_LENGTH = 7_500_000;
const ALLOWED_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const BUYER_ADDRESS_TYPES = ["billing", "shipping"];
const CATALOG_ITEM_STATUSES = ["draft", "published", "archived"];
const CATALOG_VISIBILITY_STATUSES = ["public", "unlisted", "private"];
const CONTENT_REPORT_REASONS = ["spam", "abuse", "impersonation", "misleading", "other"];
const ENGAGEMENT_TARGET_TYPES = ["feed_item", "catalog_item", "store"];
const FEED_REACTION_TYPES = ["love", "fire", "celebrate"];
const FEED_SCOPES = ["all", "following"];
const HEX_COLOR_PATTERN = /^#?[0-9a-f]{6}$/i;
const MAX_VARIANT_COUNT = 12;
const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "refunded", "cancelled"];
const PAYMENT_METHODS = ["bsp-pay", "paypal"];
const STORE_VISIBILITY_STATUSES = ["draft", "published", "unpublished"];
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

function createNormalizedSchema(normalize) {
  return z.any().transform((value, ctx) => {
    try {
      return normalize(value);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error && error.message ? error.message : "Request validation failed",
      });
      return z.NEVER;
    }
  });
}

function parseWithSchema(schema, payload) {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }

  throw createValidationErrorFromZod(result.error);
}

function normalizeText(value, maxLength, fieldName, options = {}) {
  const { required = false, minLength = 0 } = options;
  const normalized = String(value || "").trim();

  if (required && !normalized) {
    throw new Error(`${fieldName} is required`);
  }

  if (!normalized) {
    return "";
  }

  if (normalized.length < minLength) {
    throw new Error(`${fieldName} is too short`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} is too long`);
  }

  return normalized;
}

function normalizeChoice(value, allowedValues, errorMessage, options = {}) {
  const fallback = Object.prototype.hasOwnProperty.call(options, "fallback")
    ? options.fallback
    : undefined;
  const normalized = String(value || fallback || "")
    .trim()
    .toLowerCase();

  if (fallback !== undefined && !allowedValues.includes(normalized)) {
    return fallback;
  }

  if (!allowedValues.includes(normalized)) {
    throw new Error(errorMessage);
  }

  return normalized;
}

function normalizeEmail(value) {
  const email = normalizeText(value, 120, "Email", { required: true }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Email format is invalid");
  }

  return email;
}

function normalizeNumber(value, fieldName, options = {}) {
  const { minimum = 0, maximum = Number.MAX_SAFE_INTEGER, fallback = 0 } = options;
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${fieldName} is out of range`);
  }

  return parsed;
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

function normalizePositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is invalid`);
  }

  return parsed;
}

function normalizeHandle(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  if (!normalized) {
    throw new Error("Handle is required");
  }

  if (!HANDLE_PATTERN.test(normalized)) {
    throw new Error("Handle must be 3-40 characters and use only lowercase letters, numbers, and hyphens");
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
    throw new Error(`${fieldName} has too many selections`);
  }

  return normalized;
}

function normalizeOptionalEmail(value, fieldName = "Email") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const email = normalizeEmail(normalized);
  if (fieldName === "Email") {
    return email;
  }

  return email;
}

function normalizeColor(value) {
  const color = String(value || "#2563eb").trim();
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error("Accent color must be a valid 6-digit hex value");
  }

  return color.startsWith("#") ? color : `#${color}`;
}

function normalizeSocialValue(value, fieldName) {
  const normalized = normalizeText(value, 160, fieldName);
  if (!normalized) {
    return "";
  }

  if (/[\r\n]/.test(normalized)) {
    throw new Error(`${fieldName} contains invalid characters`);
  }

  return normalized;
}

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

function normalizeAssetValue(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("data:image/")) {
    if (!isAllowedDataImage(normalized)) {
      throw new Error(`${fieldName} must be a PNG, JPG, WEBP, or GIF image`);
    }

    if (normalized.length > MAX_BASE64_LENGTH) {
      throw new Error(`${fieldName} is too large`);
    }

    return normalized;
  }

  if (
    isUploadedAssetPath(normalized) ||
    normalized.startsWith("/assets/") ||
    /^https?:\/\//i.test(normalized)
  ) {
    if (normalized.length > 2048) {
      throw new Error(`${fieldName} is too long`);
    }

    return normalized;
  }

  throw new Error(`${fieldName} must be an uploaded image or image URL`);
}

function normalizeFeedPostImages(images) {
  const list = Array.isArray(images) ? images : [];
  if (list.length > MAX_IMAGE_COUNT) {
    throw new Error(`A maximum of ${MAX_IMAGE_COUNT} images is allowed`);
  }

  return list.map((item, index) => {
    const source = typeof item === "string" ? item : item && (item.src || item.url);
    return normalizeAssetValue(source, `Update image ${index + 1}`);
  });
}

function normalizeProductImages(images) {
  const list = Array.isArray(images) ? images : [];
  if (list.length > MAX_IMAGE_COUNT) {
    throw new Error(`A maximum of ${MAX_IMAGE_COUNT} images is allowed`);
  }

  return list.map((item, index) => {
    const src = String((item && (item.src || item.url)) || "").trim();
    if (!src) {
      throw new Error(`Image ${index + 1} is missing source data`);
    }

    if (src.startsWith("data:image/")) {
      if (!isAllowedDataImage(src)) {
        throw new Error(`Image ${index + 1} must be a PNG, JPG, WEBP, or GIF image`);
      }

      if (src.length > MAX_BASE64_LENGTH) {
        throw new Error(`Image ${index + 1} is too large`);
      }

      return { src };
    }

    if (!isUploadedAssetPath(src)) {
      throw new Error(`Image ${index + 1} must be a base64 image or uploaded asset`);
    }

    return { src };
  });
}

function assertModeratedPublicText(value, fieldName, options = {}) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  const maxLinks = Number.isFinite(Number(options.maxLinks)) ? Number(options.maxLinks) : 2;
  const urlMatches = normalized.match(URL_MATCHER) || [];
  if (urlMatches.length > maxLinks) {
    throw new Error(`${fieldName} has too many links`);
  }

  if (FLAGGED_PUBLIC_CONTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(`${fieldName} violates moderation rules`);
  }

  return normalized;
}

function normalizeCatalogStatus(value, fallback = "published") {
  return normalizeChoice(
    value || fallback,
    CATALOG_ITEM_STATUSES,
    "Product status must be draft, published, or archived"
  );
}

function normalizeCatalogVisibility(value, fallback = "public") {
  return normalizeChoice(
    value || fallback,
    CATALOG_VISIBILITY_STATUSES,
    "Product visibility must be public, unlisted, or private"
  );
}

function normalizeVariantAttributes(attributes, label) {
  const source =
    attributes && typeof attributes === "object" && !Array.isArray(attributes) ? attributes : {};
  const entries = Object.entries(source)
    .map(([key, value]) => {
      const normalizedKey = normalizeText(key, 32, "Variant attribute name")
        .toLowerCase()
        .replace(/\s+/g, "_");
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
    throw new Error(`A maximum of ${MAX_VARIANT_COUNT} variants is allowed`);
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
      throw new Error(`Variant ${index + 1} duplicates another variant label`);
    }
    seenLabels.add(normalizedLabelKey);

    const sku = normalizeText(variant && variant.sku, 120, `Variant ${index + 1} SKU`).toUpperCase();
    if (sku) {
      if (seenSkus.has(sku)) {
        throw new Error(`Variant ${index + 1} duplicates another SKU`);
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

function normalizeCatalogProduct(product, options = {}) {
  const source = product || {};
  const { requireCoreFields = false } = options;
  const price = normalizeNumber(source.price, "Product price", {
    minimum: 0,
    maximum: 1_000_000,
    fallback: 0,
  });

  return {
    name: normalizeText(source.name, 120, "Product name", {
      required: requireCoreFields,
      minLength: requireCoreFields ? 2 : 0,
    }),
    description: normalizeText(source.description, 2000, "Product description", {
      required: requireCoreFields,
      minLength: requireCoreFields ? 6 : 0,
    }),
    price,
    delivery: normalizeText(source.delivery, 180, "Delivery information"),
    location: normalizeText(source.location, 120, "Location"),
    transportFee: normalizeNumber(source.transportFee, "Transport fee", {
      minimum: 0,
      maximum: 100_000,
      fallback: 0,
    }),
    status: normalizeCatalogStatus(source.status, "published"),
    visibility: normalizeCatalogVisibility(source.visibility, "public"),
    stockQuantity: normalizeNumber(source.stockQuantity, "Stock quantity", {
      minimum: 0,
      maximum: 1_000_000,
      fallback: 0,
    }),
    variants: normalizeProductVariants(source.variants, price),
    images: normalizeProductImages(source.images),
  };
}

function normalizeMetadataObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeOptionalTemplateKey(value) {
  return value ? normalizeTemplateKey(value) : "";
}

module.exports = {
  BUYER_ADDRESS_TYPES,
  CATALOG_ITEM_STATUSES,
  CATALOG_VISIBILITY_STATUSES,
  CONTENT_REPORT_REASONS,
  ENGAGEMENT_TARGET_TYPES,
  FEED_REACTION_TYPES,
  FEED_SCOPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  STORE_VISIBILITY_STATUSES,
  assertModeratedPublicText,
  createNormalizedSchema,
  normalizeAssetValue,
  normalizeBooleanFlag,
  normalizeCatalogProduct,
  normalizeCatalogStatus,
  normalizeCatalogVisibility,
  normalizeChoice,
  normalizeColor,
  normalizeEmail,
  normalizeFeedPostImages,
  normalizeHandle,
  normalizeMetadataObject,
  normalizeNumber,
  normalizeOptionalEmail,
  normalizeOptionalTemplateKey,
  normalizePositiveInteger,
  normalizeProductImages,
  normalizeProductVariants,
  normalizeSocialValue,
  normalizeStringArray,
  normalizeText,
  parseWithSchema,
};
