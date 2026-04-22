const {
  createNormalizedSchema,
  normalizeBooleanFlag,
  normalizeCatalogProduct,
  normalizeHandle,
  normalizeOptionalEmail,
  normalizePositiveInteger,
  normalizeStringArray,
  normalizeText,
} = require("./shared.schema");

function normalizeArtStoreSettingsPayload(body) {
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

function normalizeArtListingPayload(body) {
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

const artStoreSettingsBodySchema = createNormalizedSchema(normalizeArtStoreSettingsPayload);
const artListingBodySchema = createNormalizedSchema(normalizeArtListingPayload);
const artStoreHandleParamsSchema = createNormalizedSchema((params) => ({
  handle: normalizeHandle(params && params.handle),
}));
const artListingParamsSchema = createNormalizedSchema((params) => ({
  artListingId: normalizePositiveInteger(params && params.artListingId, "Art listing id"),
}));

module.exports = {
  artListingBodySchema,
  artListingParamsSchema,
  artStoreHandleParamsSchema,
  artStoreSettingsBodySchema,
};
