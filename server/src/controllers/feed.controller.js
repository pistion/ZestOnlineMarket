const path = require("path");

const { paths } = require("../config/env");
const { transaction } = require("../config/db");
const { renderPage } = require("./page.controller");
const { buildFeedPayload } = require("../services/feed.service");
const { findCatalogItemByPublicIdAndStoreId } = require("../repositories/catalog.repository");
const { findStoreByHandle, findStoreByUserId } = require("../repositories/store.repository");
const {
  createStoreFeedItem,
  deleteFeedItemById,
  findStoreFeedItemByIdAndStoreId,
  listStoreFeedItemsByStoreId,
} = require("../repositories/feed.repository");
const {
  deleteEngagementForTarget,
  deleteFeedReactionsForFeedItem,
} = require("../repositories/engagement.repository");
const { resolveCatalogSource } = require("../repositories/repository-source");
const { createHttpError, sendSuccess } = require("../utils/api-response");
const { deleteUploadedFiles, saveBase64ImageToFolder } = require("../utils/image.util");

const renderBuyerFeedPage = renderPage("buyerFeed");
const renderGlobalFeedPage = renderPage("globalFeed");

function isUploadedAssetUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function saveStoreUpdateImages(userId, images) {
  const list = Array.isArray(images) ? images : [];
  if (!list.length) {
    return {
      finalUrls: [],
      createdUrls: [],
    };
  }

  const feedFolder = path.join(paths.uploadsDir, String(userId), "feed");
  const finalUrls = [];
  const createdUrls = [];

  try {
    list.forEach((imageSource, index) => {
      const normalizedSource = String(imageSource || "").trim();
      if (!normalizedSource) {
        return;
      }

      if (isUploadedAssetUrl(normalizedSource)) {
        finalUrls.push(normalizedSource);
        return;
      }

      const savedUrl = saveBase64ImageToFolder(normalizedSource, feedFolder, `feed_${index}`);
      if (!savedUrl) {
        throw new Error(`Update image ${index + 1} is invalid`);
      }

      finalUrls.push(savedUrl);
      createdUrls.push(savedUrl);
    });

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

async function getFeed(req, res, next) {
  try {
    const queryOptions = req.query || {};
    const payload = await buildFeedPayload(req.user || null, queryOptions);
    return sendSuccess(res, payload, "Feed loaded");
  } catch (error) {
    return next(error);
  }
}

async function getMyStoreFeed(req, res, next) {
  try {
    const storeRow = await findStoreByUserId(req.user.id);
    if (!storeRow) {
      return sendSuccess(
        res,
        {
          items: [],
          meta: {
            storeFound: false,
            stage: "chunk-8-seller-posting-model",
          },
        },
        "Store updates loaded"
      );
    }

    const items = await listStoreFeedItemsByStoreId(storeRow.id, {
      limit: 12,
    });

    return sendSuccess(
      res,
      {
        items,
        meta: {
          storeFound: true,
          storeHandle: storeRow.handle,
          stage: "chunk-8-seller-posting-model",
        },
      },
      "Store updates loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function getStoreFeedByHandle(req, res, next) {
  try {
    const { handle } = req.params;
    const storeRow = await findStoreByHandle(handle);
    if (!storeRow) {
      throw createHttpError(404, "Store not found");
    }

    const items = await listStoreFeedItemsByStoreId(storeRow.id, {
      limit: 12,
    });

    return sendSuccess(
      res,
      {
        items,
        meta: {
          storeFound: true,
          storeHandle: storeRow.handle,
          stage: "chunk-8-seller-posting-model",
        },
      },
      "Store updates loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function createSellerFeedPost(req, res, next) {
  let createdImageUrls = [];
  try {
    const storeRow = await findStoreByUserId(req.user.id);
    if (!storeRow) {
      throw createHttpError(400, "Create your store before publishing updates");
    }

    const payload = req.body;
    let linkedCatalogItem = null;
    if (payload.catalogItemId > 0) {
      linkedCatalogItem = await findCatalogItemByPublicIdAndStoreId(payload.catalogItemId, storeRow.id, {
        source: resolveCatalogSource(),
      });

      if (!linkedCatalogItem) {
        throw createHttpError(404, "Linked listing not found for this store");
      }

      if (
        String(linkedCatalogItem.status || "published").trim().toLowerCase() !== "published" ||
        String(linkedCatalogItem.visibility || "public").trim().toLowerCase() !== "public"
      ) {
        throw createHttpError(400, "Only published public listings can be attached to store updates");
      }
    }
    const imageResult = saveStoreUpdateImages(req.user.id, payload.images);
    createdImageUrls = imageResult.createdUrls || [];
    const writeSource = resolveCatalogSource();

    const item = await transaction(
      async (txContext) =>
        createStoreFeedItem(
          {
            storeId: storeRow.id,
            type: payload.type,
            title: payload.title,
            description: payload.description,
            hasExplicitTitle: payload.hasExplicitTitle,
            catalogItemId: linkedCatalogItem ? linkedCatalogItem.id : 0,
            images: imageResult.finalUrls || [],
          },
          {
            source: writeSource,
            transaction: txContext,
          }
        ),
      { source: writeSource }
    );

    const items = await listStoreFeedItemsByStoreId(storeRow.id, {
      limit: 12,
    });

    return sendSuccess(
      res,
      {
        item,
        items,
        meta: {
          storeHandle: storeRow.handle,
          stage: "chunk-8-seller-posting-model",
        },
      },
      "Store update published"
    );
  } catch (error) {
    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }
    return next(error);
  }
}

async function deleteSellerFeedPost(req, res, next) {
  try {
    const { feedItemId } = req.params;
    const storeRow = await findStoreByUserId(req.user.id);
    if (!storeRow) {
      throw createHttpError(400, "Create your store before managing updates");
    }

    const writeSource = resolveCatalogSource();
    const existingItem = await findStoreFeedItemByIdAndStoreId(feedItemId, storeRow.id, {
      source: writeSource,
    });

    if (!existingItem) {
      throw createHttpError(404, "Store update not found");
    }

    if (existingItem.type === "product_published") {
      throw createHttpError(400, "Linked product posts must be managed from listings");
    }

    const uploadedImageUrls = Array.isArray(existingItem.images)
      ? existingItem.images.filter(isUploadedAssetUrl)
      : [];

    await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };

      await deleteEngagementForTarget("feed_item", feedItemId, repoOptions);
      await deleteFeedReactionsForFeedItem(feedItemId, repoOptions);
      await deleteFeedItemById(feedItemId, repoOptions);
    }, { source: writeSource });

    if (uploadedImageUrls.length > 0) {
      deleteUploadedFiles(uploadedImageUrls);
    }

    const items = await listStoreFeedItemsByStoreId(storeRow.id, {
      limit: 12,
    });

    return sendSuccess(
      res,
      {
        deletedFeedItemId: feedItemId,
        items,
        meta: {
          storeHandle: storeRow.handle,
          stage: "chunk-8-seller-posting-model",
        },
      },
      "Store update deleted"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSellerFeedPost,
  deleteSellerFeedPost,
  getFeed,
  getMyStoreFeed,
  getStoreFeedByHandle,
  renderBuyerFeedPage,
  renderGlobalFeedPage,
};
