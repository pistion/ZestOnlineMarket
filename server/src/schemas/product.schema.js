const {
  createNormalizedSchema,
  normalizeCatalogProduct,
  normalizePositiveInteger,
} = require("./shared.schema");

const productBodySchema = createNormalizedSchema((body) =>
  normalizeCatalogProduct((body && (body.product || body)) || {}, {
    requireCoreFields: true,
  })
);

const productParamsSchema = createNormalizedSchema((params) => ({
  productId: normalizePositiveInteger(params && params.productId, "Product id"),
}));

module.exports = {
  productBodySchema,
  productParamsSchema,
};
