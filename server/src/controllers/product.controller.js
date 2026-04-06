const path = require("path");

const { paths } = require("../config/env");
const { transaction } = require("../config/db");
const {
  createCatalogItem,
  deleteCatalogItem,
  findCatalogItemByPublicId,
  findCatalogItemByPublicIdAndStoreId,
  findCatalogMedia,
  listProductVariants,
  listPublicCatalogItems,
  listStoreCatalogItems,
  replaceCatalogMedia,
  replaceProductVariants,
  upsertCatalogInventory,
  updateCatalogItem,
} = require("../repositories/catalog.repository");
const {
  deleteFeedItemsByCatalogItemId,
  listFeedItemsByCatalogItemId,
  publishCatalogFeedItem,
} = require("../repositories/feed.repository");
const {
  deleteEngagementForTarget,
  deleteFeedReactionsForFeedItem,
} = require("../repositories/engagement.repository");
const { findStoreById, findStoreByUserId } = require("../repositories/store.repository");
const { resolveCatalogSource } = require("../repositories/repository-source");
const { sendSuccess, createHttpError } = require("../utils/api-response");
const { deleteUploadedFiles, saveBase64ImageToFolder } = require("../utils/image.util");
const { validateProductPayload } = require("../utils/request-validation");
const { mapProductImages, mapProductRow, mapStoreRow, mapProductVariantRow } = require("../utils/store-mappers");

function isUploadedAssetUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function isLiveCatalogListing(product) {
  return (
    String((product && product.status) || "").trim().toLowerCase() === "published" &&
    String((product && product.visibility) || "").trim().toLowerCase() === "public"
  );
}

function sumVariantStock(variants = []) {
  return (Array.isArray(variants) ? variants : []).reduce(
    (total, variant) => total + (Number((variant && variant.stockQuantity) || 0) || 0),
    0
  );
}

async function buildProductPayload(productRow, options = {}) {
  const [imageRows, variantRows] = await Promise.all([
    findCatalogMedia(productRow.id, options),
    listProductVariants(productRow.id, options),
  ]);

  return {
    ...mapProductRow({
      ...productRow,
      variants: variantRows.map((variant) => mapProductVariantRow(variant)),
    }),
    images: mapProductImages(imageRows),
  };
}

async function removeCatalogFeedArtifacts(catalogItemId, options = {}) {
  const linkedFeedItems = await listFeedItemsByCatalogItemId(catalogItemId, options);
  for (const item of linkedFeedItems) {
    const feedItemId = Number(item.feedItemId || item.id || 0);
    if (!feedItemId) {
      continue;
    }

    await deleteEngagementForTarget("feed_item", feedItemId, options);
    await deleteFeedReactionsForFeedItem(feedItemId, options);
  }

  await deleteFeedItemsByCatalogItemId(catalogItemId, options);
}

async function syncCatalogFeedState({ storeId, productRow, imageUrls, payload }, options = {}) {
  if (!productRow || !productRow.id) {
    return;
  }

  if (!isLiveCatalogListing(productRow)) {
    await removeCatalogFeedArtifacts(productRow.id, options);
    return;
  }

  await publishCatalogFeedItem(
    {
      storeId,
      catalogItemId: productRow.id,
      title: productRow.name || productRow.title || payload.name,
      description: productRow.description || payload.description,
      price: productRow.price || payload.price,
      delivery: productRow.delivery || payload.delivery,
      location: productRow.location || payload.location,
      images: imageUrls || [],
    },
    options
  );
}

async function persistProductImages(userId, productId, images, options = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    await replaceCatalogMedia(productId, [], options);
    return {
      finalUrls: [],
      createdUrls: [],
    };
  }

  const productFolder = path.join(paths.uploadsDir, String(userId), String(productId));
  const finalUrls = [];
  const createdUrls = [];

  try {
    images.forEach((image, index) => {
      const source = String((image && image.src) || "").trim();
      if (isUploadedAssetUrl(source)) {
        finalUrls.push(source);
        return;
      }

      const savedUrl = saveBase64ImageToFolder(source, productFolder, `p${productId}_${index}`);
      if (!savedUrl) {
        throw createHttpError(400, `Image ${index + 1} is invalid`);
      }

      finalUrls.push(savedUrl);
      createdUrls.push(savedUrl);
    });

    await replaceCatalogMedia(productId, finalUrls, options);
    return {
      finalUrls,
      createdUrls,
    };
  } catch (error) {
    if (createdUrls.length > 0) {
      deleteUploadedFiles(createdUrls);
    }

    throw error;
  }
}

async function buildStoreProductsPayload(storeId) {
  const productRows = await listStoreCatalogItems(storeId);
  return Promise.all(productRows.map(async (productRow) => buildProductPayload(productRow)));
}

async function buildProductDetailPayload(productId) {
  const productRow = await findCatalogItemByPublicId(productId, { publicOnly: true });
  if (!productRow) {
    return null;
  }

  const storeRow = await findStoreById(productRow.storeId);
  if (!storeRow) {
    return null;
  }

  const imageRows = await findCatalogMedia(productRow.id);
  const variantRows = await listProductVariants(productRow.id);
  return {
    success: true,
    message: "Product loaded",
    product: mapProductRow({
      ...productRow,
      variants: variantRows.map((variant) => mapProductVariantRow(variant)),
    }),
    store: mapStoreRow(storeRow),
    images: mapProductImages(imageRows),
  };
}

async function listProducts(req, res, next) {
  try {
    const rows = await listPublicCatalogItems();
    const products = await Promise.all(
      rows.map(async (row) => {
        const imageRows = await findCatalogMedia(row.id);
        return {
          ...mapProductRow(row),
          storeHandle: row.handle || "",
          storeName: row.storeName || "",
          templateKey: row.templateKey || "products",
          thumbnail: row.thumbnail || "",
          images: mapProductImages(imageRows).map((image) => image.url),
        };
      })
    );

    return sendSuccess(res, {
      products,
    }, "Products loaded");
  } catch (error) {
    return next(error);
  }
}

async function getProductDetail(req, res, next) {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const payload = await buildProductDetailPayload(productId);
    if (!payload) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return sendSuccess(
      res,
      {
        product: payload.product,
        store: payload.store,
        images: payload.images,
      },
      payload.message || "Product loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function createSellerProduct(req, res, next) {
  const userId = req.user.id;
  const writeSource = resolveCatalogSource();
  let createdImageUrls = [];

  try {
    const storeRow = await findStoreByUserId(userId);
    if (!storeRow) {
      return res.status(400).json({
        success: false,
        message: "Create your store before adding products",
      });
    }

    const payload = validateProductPayload(req.body);

    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };
      const createResult = await createCatalogItem({
        storeId: storeRow.id,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        visibility: payload.visibility,
        price: payload.price,
        delivery: payload.delivery,
        location: payload.location,
        transportFee: payload.transportFee,
      }, repoOptions);

      const productRow = await findCatalogItemByPublicId(createResult.lastID, repoOptions);
      if (!productRow) {
        throw createHttpError(500, "Failed to resolve product");
      }

      const imageResult = await persistProductImages(userId, productRow.id, payload.images, repoOptions);
      createdImageUrls = imageResult.createdUrls || [];

      const variantRows = await replaceProductVariants(productRow.id, payload.variants, repoOptions);
      const effectiveStockQuantity = variantRows.length ? sumVariantStock(variantRows) : payload.stockQuantity;
      await upsertCatalogInventory(productRow.id, effectiveStockQuantity, repoOptions);
      const refreshedProductRow = await findCatalogItemByPublicId(productRow.id, repoOptions);
      await syncCatalogFeedState(
        {
          storeId: storeRow.id,
          productRow: refreshedProductRow,
          imageUrls: imageResult.finalUrls || [],
          payload,
        },
        repoOptions
      );

      return {
        productRow: refreshedProductRow,
        imageRows: await findCatalogMedia(productRow.id, repoOptions),
        variantRows: await listProductVariants(productRow.id, repoOptions),
      };
    }, { source: writeSource });

    const products = await buildStoreProductsPayload(storeRow.id);

    return sendSuccess(
      res,
      {
        product: mapProductRow({
          ...result.productRow,
          variants: result.variantRows.map((variant) => mapProductVariantRow(variant)),
        }),
        images: mapProductImages(result.imageRows),
        variants: result.variantRows.map((variant) => mapProductVariantRow(variant)),
        products,
      },
      "Product created successfully"
    );
  } catch (error) {
    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }
    return next(error);
  }
}

async function updateSellerProduct(req, res, next) {
  const userId = req.user.id;
  const productId = Number(req.params.productId);
  const writeSource = resolveCatalogSource();
  let createdImageUrls = [];

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const storeRow = await findStoreByUserId(userId);
    if (!storeRow) {
      return res.status(400).json({
        success: false,
        message: "Create your store before editing products",
      });
    }

    const existingProduct = await findCatalogItemByPublicIdAndStoreId(productId, storeRow.id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const payload = validateProductPayload(req.body);
    const previousImageUrls = (await findCatalogMedia(existingProduct.id)).map((image) => image.url);

    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };
      await updateCatalogItem(existingProduct.id, payload, repoOptions);
      const productRow = await findCatalogItemByPublicId(existingProduct.id, repoOptions);
      if (!productRow) {
        throw createHttpError(500, "Failed to resolve product");
      }

      const imageResult = await persistProductImages(userId, productRow.id, payload.images, repoOptions);
      createdImageUrls = imageResult.createdUrls || [];

      const variantRows = await replaceProductVariants(productRow.id, payload.variants, repoOptions);
      const effectiveStockQuantity = variantRows.length ? sumVariantStock(variantRows) : payload.stockQuantity;
      await upsertCatalogInventory(productRow.id, effectiveStockQuantity, repoOptions);
      const refreshedProductRow = await findCatalogItemByPublicId(productRow.id, repoOptions);
      await syncCatalogFeedState(
        {
          storeId: storeRow.id,
          productRow: refreshedProductRow,
          imageUrls: imageResult.finalUrls || [],
          payload,
        },
        repoOptions
      );

      return {
        productRow: refreshedProductRow,
        imageRows: await findCatalogMedia(productRow.id, repoOptions),
        variantRows: await listProductVariants(productRow.id, repoOptions),
        finalImageUrls: imageResult.finalUrls || [],
      };
    }, { source: writeSource });

    const removedImageUrls = previousImageUrls.filter((url) => !result.finalImageUrls.includes(url));
    if (removedImageUrls.length > 0) {
      deleteUploadedFiles(removedImageUrls);
    }

    const products = await buildStoreProductsPayload(storeRow.id);

    return sendSuccess(
      res,
      {
        product: mapProductRow({
          ...result.productRow,
          variants: result.variantRows.map((variant) => mapProductVariantRow(variant)),
        }),
        images: mapProductImages(result.imageRows),
        variants: result.variantRows.map((variant) => mapProductVariantRow(variant)),
        products,
      },
      "Product updated successfully"
    );
  } catch (error) {
    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }
    return next(error);
  }
}

async function deleteSellerProduct(req, res, next) {
  const userId = req.user.id;
  const productId = Number(req.params.productId);
  const writeSource = resolveCatalogSource();

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product id",
    });
  }

  try {
    const storeRow = await findStoreByUserId(userId);
    if (!storeRow) {
      return res.status(400).json({
        success: false,
        message: "Create your store before deleting products",
      });
    }

    const existingProduct = await findCatalogItemByPublicIdAndStoreId(productId, storeRow.id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const previousImageUrls = (await findCatalogMedia(existingProduct.id)).map((image) => image.url);

    await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };

      const linkedFeedItems = await listFeedItemsByCatalogItemId(existingProduct.id, repoOptions);
      await deleteEngagementForTarget("catalog_item", existingProduct.id, repoOptions);

      for (const item of linkedFeedItems) {
        const feedItemId = Number(item.feedItemId || item.id || 0);
        if (!feedItemId) {
          continue;
        }

        await deleteEngagementForTarget("feed_item", feedItemId, repoOptions);
        await deleteFeedReactionsForFeedItem(feedItemId, repoOptions);
      }

      await deleteFeedItemsByCatalogItemId(existingProduct.id, repoOptions);
      await deleteCatalogItem(existingProduct.id, repoOptions);
    }, { source: writeSource });

    if (previousImageUrls.length > 0) {
      deleteUploadedFiles(previousImageUrls);
    }

    const products = await buildStoreProductsPayload(storeRow.id);

    return sendSuccess(
      res,
      {
        deletedProductId: existingProduct.id,
        products,
      },
      "Product deleted successfully"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  buildProductDetailPayload,
  createSellerProduct,
  deleteSellerProduct,
  getProductDetail,
  listProducts,
  updateSellerProduct,
};
