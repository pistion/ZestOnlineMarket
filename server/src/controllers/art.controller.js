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
  replaceCatalogMedia,
  replaceProductVariants,
  upsertCatalogInventory,
  updateCatalogItem,
} = require("../repositories/catalog.repository");
const {
  createArtListingMeta,
  findArtListingByIdAndStoreId,
  updateArtListingMeta,
  upsertArtStoreSettings,
} = require("../repositories/art.repository");
const {
  deleteFeedItemsByCatalogItemId,
  listFeedItemsByCatalogItemId,
  publishCatalogFeedItem,
} = require("../repositories/feed.repository");
const {
  deleteEngagementForTarget,
  deleteFeedReactionsForFeedItem,
} = require("../repositories/engagement.repository");
const { findStoreByUserId } = require("../repositories/store.repository");
const { resolveCatalogSource } = require("../repositories/repository-source");
const {
  assertArtStore,
  buildPublicArtStorePayload,
  buildSellerArtStorePayload,
} = require("../services/art.service");
const { sendSuccess, createHttpError } = require("../utils/api-response");
const { deleteUploadedFiles, saveBase64ImageToFolder } = require("../utils/image.util");

function isUploadedAssetUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function isLiveArtListing(product) {
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

async function syncArtFeedState({ storeId, productRow, imageUrls, payload }, options = {}) {
  if (!productRow || !productRow.id) {
    return;
  }

  if (!isLiveArtListing(productRow)) {
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

async function persistArtImages(userId, catalogItemId, images, options = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    await replaceCatalogMedia(catalogItemId, [], options);
    return {
      finalUrls: [],
      createdUrls: [],
    };
  }

  const productFolder = path.join(paths.uploadsDir, String(userId), "art", String(catalogItemId));
  const finalUrls = [];
  const createdUrls = [];

  try {
    images.forEach((image, index) => {
      const source = String((image && image.src) || "").trim();
      if (isUploadedAssetUrl(source)) {
        finalUrls.push(source);
        return;
      }

      const savedUrl = saveBase64ImageToFolder(source, productFolder, `art_${catalogItemId}_${index}`);
      if (!savedUrl) {
        throw createHttpError(400, `Artwork image ${index + 1} is invalid`);
      }

      finalUrls.push(savedUrl);
      createdUrls.push(savedUrl);
    });

    await replaceCatalogMedia(catalogItemId, finalUrls, options);
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

async function resolveSellerArtStore(userId, options = {}) {
  const storeRow = await findStoreByUserId(userId, options);
  return assertArtStore(storeRow);
}

async function getSellerArtStore(req, res, next) {
  try {
    const payload = await buildSellerArtStorePayload(req.user.id);
    return sendSuccess(
      res,
      {
        store: payload.store,
        artSettings: payload.artSettings,
        product: payload.product,
        images: payload.images,
        products: payload.products,
        meta: payload.meta,
      },
      payload.message || "Art store loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function getPublicArtStore(req, res, next) {
  try {
    const { handle } = req.params;
    const payload = await buildPublicArtStorePayload(handle);
    return sendSuccess(
      res,
      {
        store: payload.store,
        artSettings: payload.artSettings,
        product: payload.product,
        images: payload.images,
        products: payload.products,
        meta: payload.meta,
      },
      payload.message || "Art store loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function saveSellerArtSettings(req, res, next) {
  const userId = req.user.id;
  const writeSource = resolveCatalogSource();

  try {
    const storeRow = await resolveSellerArtStore(userId);
    const payload = req.body;

    await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };
      await upsertArtStoreSettings(storeRow.id, payload, repoOptions);
    }, { source: writeSource });

    const refreshed = await buildSellerArtStorePayload(userId);
    return sendSuccess(
      res,
      {
        store: refreshed.store,
        artSettings: refreshed.artSettings,
        products: refreshed.products,
        meta: refreshed.meta,
      },
      "Art studio settings saved"
    );
  } catch (error) {
    return next(error);
  }
}

async function createSellerArtListing(req, res, next) {
  const userId = req.user.id;
  const writeSource = resolveCatalogSource();
  let createdImageUrls = [];

  try {
    const storeRow = await resolveSellerArtStore(userId);
    const payload = req.body;

    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };

      const createResult = await createCatalogItem(
        {
          storeId: storeRow.id,
          itemType: "art",
          name: payload.name || payload.title,
          description: payload.description,
          status: payload.status,
          visibility: payload.visibility,
          price: payload.price,
          delivery: payload.delivery,
          location: payload.location,
          transportFee: payload.transportFee,
        },
        repoOptions
      );

      const productRow = await findCatalogItemByPublicId(createResult.lastID, repoOptions);
      if (!productRow) {
        throw createHttpError(500, "Failed to resolve art listing");
      }

      const imageResult = await persistArtImages(userId, productRow.id, payload.images, repoOptions);
      createdImageUrls = imageResult.createdUrls || [];

      const variantRows = await replaceProductVariants(productRow.id, payload.variants, repoOptions);
      const effectiveStockQuantity = variantRows.length ? sumVariantStock(variantRows) : payload.stockQuantity;
      await upsertCatalogInventory(productRow.id, effectiveStockQuantity, repoOptions);
      await createArtListingMeta(
        {
          storeId: storeRow.id,
          catalogItemId: productRow.id,
          medium: payload.medium,
          artCategory: payload.artCategory,
          collectionName: payload.collectionName,
          featured: payload.featured,
          commissionOpen: payload.commissionOpen,
        },
        repoOptions
      );

      const refreshedProductRow = await findCatalogItemByPublicId(productRow.id, repoOptions);
      await syncArtFeedState(
        {
          storeId: storeRow.id,
          productRow: refreshedProductRow,
          imageUrls: imageResult.finalUrls || [],
          payload,
        },
        repoOptions
      );
    }, { source: writeSource });

    const refreshed = await buildSellerArtStorePayload(userId);
    return sendSuccess(
      res,
      {
        store: refreshed.store,
        artSettings: refreshed.artSettings,
        products: refreshed.products,
        meta: refreshed.meta,
      },
      "Art listing created successfully"
    );
  } catch (error) {
    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }
    return next(error);
  }
}

async function updateSellerArtListing(req, res, next) {
  const userId = req.user.id;
  const { artListingId } = req.params;
  const writeSource = resolveCatalogSource();
  let createdImageUrls = [];

  try {
    const storeRow = await resolveSellerArtStore(userId);
    const existingListing = await findArtListingByIdAndStoreId(artListingId, storeRow.id);
    if (!existingListing) {
      return res.status(404).json({
        success: false,
        message: "Art listing not found",
      });
    }

    const payload = req.body;
    const previousImageUrls = (existingListing.images || []).map((image) => image.url || image.src).filter(Boolean);

    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };

      await updateCatalogItem(
        existingListing.id,
        {
          name: payload.name || payload.title,
          description: payload.description,
          status: payload.status,
          visibility: payload.visibility,
          price: payload.price,
          delivery: payload.delivery,
          location: payload.location,
          transportFee: payload.transportFee,
        },
        repoOptions
      );

      const productRow = await findCatalogItemByPublicIdAndStoreId(existingListing.id, storeRow.id, repoOptions);
      if (!productRow) {
        throw createHttpError(500, "Failed to resolve art listing");
      }

      const imageResult = await persistArtImages(userId, productRow.id, payload.images, repoOptions);
      createdImageUrls = imageResult.createdUrls || [];

      const variantRows = await replaceProductVariants(productRow.id, payload.variants, repoOptions);
      const effectiveStockQuantity = variantRows.length ? sumVariantStock(variantRows) : payload.stockQuantity;
      await upsertCatalogInventory(productRow.id, effectiveStockQuantity, repoOptions);
      await updateArtListingMeta(
        artListingId,
        storeRow.id,
        {
          medium: payload.medium,
          artCategory: payload.artCategory,
          collectionName: payload.collectionName,
          featured: payload.featured,
          commissionOpen: payload.commissionOpen,
        },
        repoOptions
      );

      const refreshedProductRow = await findCatalogItemByPublicId(productRow.id, repoOptions);
      await syncArtFeedState(
        {
          storeId: storeRow.id,
          productRow: refreshedProductRow,
          imageUrls: imageResult.finalUrls || [],
          payload,
        },
        repoOptions
      );

      return {
        finalImageUrls: imageResult.finalUrls || [],
      };
    }, { source: writeSource });

    const removedImageUrls = previousImageUrls.filter((url) => !result.finalImageUrls.includes(url));
    if (removedImageUrls.length > 0) {
      deleteUploadedFiles(removedImageUrls);
    }

    const refreshed = await buildSellerArtStorePayload(userId);
    return sendSuccess(
      res,
      {
        store: refreshed.store,
        artSettings: refreshed.artSettings,
        products: refreshed.products,
        meta: refreshed.meta,
      },
      "Art listing updated successfully"
    );
  } catch (error) {
    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }
    return next(error);
  }
}

async function deleteSellerArtListing(req, res, next) {
  const userId = req.user.id;
  const { artListingId } = req.params;
  const writeSource = resolveCatalogSource();

  try {
    const storeRow = await resolveSellerArtStore(userId);
    const existingListing = await findArtListingByIdAndStoreId(artListingId, storeRow.id);
    if (!existingListing) {
      return res.status(404).json({
        success: false,
        message: "Art listing not found",
      });
    }

    const previousImageUrls = (existingListing.images || []).map((image) => image.url || image.src).filter(Boolean);

    await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };

      const linkedFeedItems = await listFeedItemsByCatalogItemId(existingListing.id, repoOptions);
      await deleteEngagementForTarget("catalog_item", existingListing.id, repoOptions);

      for (const item of linkedFeedItems) {
        const feedItemId = Number(item.feedItemId || item.id || 0);
        if (!feedItemId) {
          continue;
        }

        await deleteEngagementForTarget("feed_item", feedItemId, repoOptions);
        await deleteFeedReactionsForFeedItem(feedItemId, repoOptions);
      }

      await deleteFeedItemsByCatalogItemId(existingListing.id, repoOptions);
      await deleteCatalogItem(existingListing.id, repoOptions);
    }, { source: writeSource });

    if (previousImageUrls.length > 0) {
      deleteUploadedFiles(previousImageUrls);
    }

    const refreshed = await buildSellerArtStorePayload(userId);
    return sendSuccess(
      res,
      {
        deletedArtListingId: artListingId,
        products: refreshed.products,
        artSettings: refreshed.artSettings,
        meta: refreshed.meta,
      },
      "Art listing deleted successfully"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSellerArtListing,
  deleteSellerArtListing,
  getPublicArtStore,
  getSellerArtStore,
  saveSellerArtSettings,
  updateSellerArtListing,
};
