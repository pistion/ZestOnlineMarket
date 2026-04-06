const path = require("path");

const { paths } = require("../config/env");
const { transaction } = require("../config/db");
const {
  createCatalogItem,
  findCatalogItemByPublicId,
  findCatalogMedia,
  findFirstCatalogItemByStoreId,
  replaceCatalogMedia,
  replaceProductVariants,
  upsertCatalogInventory,
  updateCatalogItem,
} = require("../repositories/catalog.repository");
const { publishCatalogFeedItem } = require("../repositories/feed.repository");
const {
  findStoreByUserId,
  updateStoreVisibilityByUserId,
  upsertStoreByUserId,
} = require("../repositories/store.repository");
const { resolveStoreWriteSource } = require("../repositories/repository-source");
const { buildRealStorePayload, resolveStorePayloadByHandle } = require("../services/storefront.service");
const { sendSuccess, createHttpError } = require("../utils/api-response");
const { deleteUploadedFiles, saveBase64ImageToFolder } = require("../utils/image.util");
const {
  normalizeHandle,
  validateSellerStoreDraftPayload,
  validateStorePayload,
  validateStoreVisibilityPayload,
} = require("../utils/request-validation");

const DRAFT_STORE_NAME_PREFIX = "Draft seller store";
const DRAFT_HANDLE_PREFIX = "draft-seller-";

function hasProductPayload(product = {}) {
  return Boolean(
    product.name ||
      product.description ||
      product.price > 0 ||
      product.stockQuantity > 0 ||
      product.delivery ||
      product.location ||
      product.transportFee > 0 ||
      (Array.isArray(product.variants) && product.variants.length) ||
      product.images.length
  );
}

function sumVariantStock(variants = []) {
  return (Array.isArray(variants) ? variants : []).reduce(
    (total, variant) => total + (Number((variant && variant.stockQuantity) || 0) || 0),
    0
  );
}

function isUploadedAssetUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function isDraftPlaceholderHandle(value) {
  return String(value || "").trim().toLowerCase().startsWith(DRAFT_HANDLE_PREFIX);
}

function isDraftPlaceholderStoreName(value) {
  return String(value || "").trim().toLowerCase().startsWith(DRAFT_STORE_NAME_PREFIX.toLowerCase());
}

function buildDraftPlaceholderHandle(userId) {
  return `${DRAFT_HANDLE_PREFIX}${userId}`;
}

function buildDraftPlaceholderStoreName(userId) {
  return `${DRAFT_STORE_NAME_PREFIX} ${userId}`;
}

function tryNormalizeDraftHandle(value) {
  try {
    return normalizeHandle(value);
  } catch (_) {
    return "";
  }
}

function normalizeVisibilityStatus(value, fallback = "draft") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["draft", "published", "unpublished"].includes(normalized) ? normalized : fallback;
}

function buildDraftState(payload) {
  return {
    templateKey: payload.templateKey,
    setupStep: payload.setupStep,
    savedAt: new Date().toISOString(),
    store: payload.store,
    product: payload.product,
  };
}

function buildDraftStoreSeed(existingStoreRow, userId, payload) {
  const existingHandle =
    existingStoreRow && !isDraftPlaceholderHandle(existingStoreRow.handle) ? existingStoreRow.handle : "";
  const existingStoreName =
    existingStoreRow && !isDraftPlaceholderStoreName(existingStoreRow.storeName)
      ? existingStoreRow.storeName
      : "";

  return {
    userId,
    storeName: payload.store.storeName || existingStoreName || buildDraftPlaceholderStoreName(userId),
    handle:
      tryNormalizeDraftHandle(payload.store.handle) ||
      existingHandle ||
      buildDraftPlaceholderHandle(userId),
    templateKey: payload.templateKey || (existingStoreRow && existingStoreRow.templateKey) || "products",
    tagline: payload.store.tagline,
    about: payload.store.about,
    accentColor: payload.store.accentColor || "#2563eb",
    avatarUrl: payload.store.avatarUrl,
    coverUrl: payload.store.coverUrl,
    instagram: payload.store.socials.instagram,
    facebook: payload.store.socials.facebook,
    tiktok: payload.store.socials.tiktok,
    xhandle: payload.store.socials.xhandle,
    profileCompleted: false,
    visibilityStatus: "draft",
    setupStep: payload.setupStep,
    setupState: buildDraftState(payload),
  };
}

function saveStoreAsset(userId, source, fileNamePrefix, fieldLabel) {
  const normalizedSource = String(source || "").trim();
  if (!normalizedSource) {
    return {
      finalUrl: "",
      createdUrl: "",
    };
  }

  if (isUploadedAssetUrl(normalizedSource) || normalizedSource.startsWith("/assets/")) {
    return {
      finalUrl: normalizedSource,
      createdUrl: "",
    };
  }

  if (/^https?:\/\//i.test(normalizedSource)) {
    return {
      finalUrl: normalizedSource,
      createdUrl: "",
    };
  }

  const storeFolder = path.join(paths.uploadsDir, String(userId), "store");
  const savedUrl = saveBase64ImageToFolder(normalizedSource, storeFolder, fileNamePrefix);
  if (!savedUrl) {
    throw createHttpError(400, `${fieldLabel} is invalid`);
  }

  return {
    finalUrl: savedUrl,
    createdUrl: savedUrl,
  };
}

async function saveProductImagesFromBase64(userId, productId, images, options = {}) {
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
      const imageSource = String((image && image.src) || "").trim();
      if (imageSource.startsWith("/uploads/")) {
        finalUrls.push(imageSource);
        return;
      }

      const savedUrl = saveBase64ImageToFolder(imageSource, productFolder, `p${productId}_${index}`);
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

async function buildStorePayload(storeRow) {
  const payload = await buildRealStorePayload(storeRow);
  if (
    !storeRow ||
    storeRow.profileCompleted ||
    !storeRow.setupState ||
    typeof storeRow.setupState !== "object"
  ) {
    return {
      ...payload,
      meta: {
        ...(payload.meta || {}),
        setupStep: (storeRow && storeRow.setupStep) || 1,
        visibilityStatus: (storeRow && storeRow.visibilityStatus) || "draft",
      },
    };
  }

  const draftState = storeRow.setupState;
  const storeDraft = draftState.store || {};
  const productDraft = draftState.product || {};
  const fallbackStore = payload.store || {};
  const fallbackProduct = payload.product || {};
  const draftImages = Array.isArray(productDraft.images)
    ? productDraft.images
        .map((image, index) => {
          const source = String((image && (image.src || image.url)) || "").trim();
          if (!source) {
            return null;
          }

          return {
            id: `draft-${index + 1}`,
            url: source,
            src: source,
            sortOrder: index,
            name: image.name || `draft-image-${index + 1}`,
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...payload,
    store: {
      ...fallbackStore,
      storeName:
        storeDraft.storeName ||
        (!isDraftPlaceholderStoreName(fallbackStore.storeName) ? fallbackStore.storeName : ""),
      handle:
        storeDraft.handle ||
        (!isDraftPlaceholderHandle(fallbackStore.handle) ? fallbackStore.handle : ""),
      templateKey: draftState.templateKey || fallbackStore.templateKey || "products",
      tagline: storeDraft.tagline || fallbackStore.tagline || "",
      about: storeDraft.about || fallbackStore.about || "",
      accentColor: storeDraft.accentColor || fallbackStore.accentColor || "#2563eb",
      avatarUrl: storeDraft.avatarUrl || fallbackStore.avatarUrl || "",
      coverUrl: storeDraft.coverUrl || fallbackStore.coverUrl || "",
      socials: {
        instagram:
          (storeDraft.socials && storeDraft.socials.instagram) ||
          (fallbackStore.socials && fallbackStore.socials.instagram) ||
          "",
        facebook:
          (storeDraft.socials && storeDraft.socials.facebook) ||
          (fallbackStore.socials && fallbackStore.socials.facebook) ||
          "",
        tiktok:
          (storeDraft.socials && storeDraft.socials.tiktok) ||
          (fallbackStore.socials && fallbackStore.socials.tiktok) ||
          "",
        xhandle:
          (storeDraft.socials && storeDraft.socials.xhandle) ||
          (fallbackStore.socials && fallbackStore.socials.xhandle) ||
          "",
      },
    },
    product: {
      ...fallbackProduct,
      name: productDraft.name || fallbackProduct.name || "",
      description: productDraft.description || fallbackProduct.description || "",
      price:
        productDraft.price === 0 || productDraft.price
          ? productDraft.price
          : fallbackProduct.price || 0,
      delivery: productDraft.delivery || fallbackProduct.delivery || "",
      location: productDraft.location || fallbackProduct.location || "",
      transportFee:
        productDraft.transportFee === 0 || productDraft.transportFee
          ? productDraft.transportFee
          : fallbackProduct.transportFee || 0,
      stockQuantity:
        productDraft.stockQuantity === 0 || productDraft.stockQuantity
          ? productDraft.stockQuantity
          : fallbackProduct.stockQuantity || 0,
      status: productDraft.status || fallbackProduct.status || "published",
      visibility: productDraft.visibility || fallbackProduct.visibility || "public",
      variants: Array.isArray(productDraft.variants)
        ? productDraft.variants
        : Array.isArray(fallbackProduct.variants)
          ? fallbackProduct.variants
          : [],
      images: draftImages.length
        ? draftImages.map((image) => ({ src: image.src }))
        : fallbackProduct.images || [],
    },
    images: draftImages.length ? draftImages : payload.images || [],
    meta: {
      ...(payload.meta || {}),
      setupStep: Number(draftState.setupStep || storeRow.setupStep || 1) || 1,
      visibilityStatus: storeRow.visibilityStatus || "draft",
    },
  };
}

async function saveStoreDraft(req, res, next) {
  const userId = req.user.id;
  const writeSource = resolveStoreWriteSource();

  try {
    const payload = validateSellerStoreDraftPayload(req.body);
    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };
      const existingStoreRow = await findStoreByUserId(userId, repoOptions);
      if (existingStoreRow && existingStoreRow.profileCompleted) {
        throw createHttpError(409, "Published stores should be edited from store settings");
      }

      const draftSeed = buildDraftStoreSeed(existingStoreRow, userId, payload);
      await upsertStoreByUserId(draftSeed, repoOptions);
      return findStoreByUserId(userId, repoOptions);
    });

    return sendSuccess(
      res,
      {
        templateKey: (result && result.templateKey) || payload.templateKey,
        setupStep: Number((result && result.setupStep) || payload.setupStep || 1) || 1,
        visibilityStatus: (result && result.visibilityStatus) || "draft",
      },
      "Seller draft saved"
    );
  } catch (error) {
    return next(error);
  }
}

async function saveStore(req, res, next) {
  const userId = req.user.id;
  const writeSource = resolveStoreWriteSource();
  let createdStoreAssetUrls = [];
  let createdImageUrls = [];
  let replacedImageUrls = [];
  let finalImageUrls = [];
  let oldStoreAssetUrls = [];
  let finalStoreAssetUrls = [];

  try {
    const payload = validateStorePayload(req.body);
    const result = await transaction(async (txContext) => {
      const repoOptions = {
        source: writeSource,
        transaction: txContext,
      };
      const existingStoreRow = await findStoreByUserId(userId, repoOptions);
      const resolvedVisibilityStatus = normalizeVisibilityStatus(
        req.body && req.body.visibilityStatus,
        existingStoreRow && existingStoreRow.profileCompleted
          ? existingStoreRow.visibilityStatus || "published"
          : "published"
      );
      const avatarResult = saveStoreAsset(userId, payload.avatarUrl, "avatar", "Avatar image");
      const coverResult = saveStoreAsset(userId, payload.coverUrl, "cover", "Cover image");

      createdStoreAssetUrls = [avatarResult.createdUrl, coverResult.createdUrl].filter(Boolean);

      await upsertStoreByUserId({
        userId,
        storeName: payload.storeName,
        handle: payload.handle,
        templateKey: payload.templateKey,
        tagline: payload.tagline,
        about: payload.about,
        accentColor: payload.accentColor,
        avatarUrl: avatarResult.finalUrl,
        coverUrl: coverResult.finalUrl,
        instagram: payload.socials.instagram,
        facebook: payload.socials.facebook,
        tiktok: payload.socials.tiktok,
        xhandle: payload.socials.xhandle,
        profileCompleted: true,
        visibilityStatus: resolvedVisibilityStatus,
        setupStep: 4,
        setupState: {
          templateKey: payload.templateKey,
          setupStep: 4,
          store: {
            storeName: payload.storeName,
            handle: payload.handle,
            tagline: payload.tagline,
            about: payload.about,
            accentColor: payload.accentColor,
            avatarUrl: payload.avatarUrl,
            coverUrl: payload.coverUrl,
            socials: payload.socials,
          },
          product: payload.product,
        },
      }, repoOptions);

      const storeRow = await findStoreByUserId(userId, repoOptions);
      if (!storeRow) {
        throw createHttpError(500, "Failed to resolve store");
      }

      if (!hasProductPayload(payload.product)) {
        return {
          createdNewProduct: false,
          hasProduct: false,
          storeHandle: payload.handle,
          oldStoreAssetUrls: [existingStoreRow && existingStoreRow.avatarUrl, existingStoreRow && existingStoreRow.coverUrl]
            .filter((url) => isUploadedAssetUrl(url)),
          finalStoreAssetUrls: [avatarResult.finalUrl, coverResult.finalUrl].filter((url) => isUploadedAssetUrl(url)),
          createdStoreAssetUrls,
          oldImageUrls: [],
          finalImageUrls: [],
          createdImageUrls: [],
        };
      }

      let productRow = await findFirstCatalogItemByStoreId(storeRow.id, repoOptions);
      let createdNewProduct = false;
      let oldImageUrls = [];

      if (!productRow) {
        const createResult = await createCatalogItem({
          storeId: storeRow.id,
          name: payload.product.name,
          description: payload.product.description,
          status: payload.product.status,
          visibility: payload.product.visibility,
          price: payload.product.price,
          delivery: payload.product.delivery,
          location: payload.product.location,
          transportFee: payload.product.transportFee,
        }, repoOptions);

        createdNewProduct = true;
        productRow = await findCatalogItemByPublicId(createResult.lastID, repoOptions);
      } else {
        oldImageUrls = (await findCatalogMedia(productRow.id, repoOptions)).map((image) => image.url);
        await updateCatalogItem(productRow.id, payload.product, repoOptions);
        productRow = await findCatalogItemByPublicId(productRow.id, repoOptions);
      }

      if (!productRow) {
        throw createHttpError(500, "Failed to resolve product");
      }

      const imageResult = await saveProductImagesFromBase64(userId, productRow.id, payload.product.images, repoOptions);
      createdImageUrls = (imageResult.createdUrls || []).slice();
      const variantRows = await replaceProductVariants(productRow.id, payload.product.variants, repoOptions);
      const effectiveStockQuantity = variantRows.length ? sumVariantStock(variantRows) : payload.product.stockQuantity;
      await upsertCatalogInventory(productRow.id, effectiveStockQuantity, repoOptions);
      productRow = await findCatalogItemByPublicId(productRow.id, repoOptions);

      await publishCatalogFeedItem(
        {
          storeId: storeRow.id,
          catalogItemId: productRow.id,
          title: productRow.name || productRow.title || payload.product.name,
          description: productRow.description || payload.product.description,
          price: productRow.price || payload.product.price,
          delivery: productRow.delivery || payload.product.delivery,
          location: productRow.location || payload.product.location,
          images: imageResult.finalUrls || [],
        },
        repoOptions
      );

      return {
        createdNewProduct,
        hasProduct: true,
        storeHandle: payload.handle,
        oldStoreAssetUrls: [existingStoreRow && existingStoreRow.avatarUrl, existingStoreRow && existingStoreRow.coverUrl]
          .filter((url) => isUploadedAssetUrl(url)),
        finalStoreAssetUrls: [avatarResult.finalUrl, coverResult.finalUrl].filter((url) => isUploadedAssetUrl(url)),
        createdStoreAssetUrls,
        oldImageUrls,
        finalImageUrls: imageResult.finalUrls || [],
        createdImageUrls: imageResult.createdUrls || [],
      };
    });

    createdStoreAssetUrls = result.createdStoreAssetUrls || [];
    createdImageUrls = result.createdImageUrls || [];
    oldStoreAssetUrls = result.oldStoreAssetUrls || [];
    finalStoreAssetUrls = result.finalStoreAssetUrls || [];
    replacedImageUrls = result.oldImageUrls || [];
    finalImageUrls = result.finalImageUrls || [];

    if (oldStoreAssetUrls.length > 0) {
      const removedStoreAssetUrls = oldStoreAssetUrls.filter((url) => !finalStoreAssetUrls.includes(url));
      if (removedStoreAssetUrls.length > 0) {
        deleteUploadedFiles(removedStoreAssetUrls);
      }
    }

    if (replacedImageUrls.length > 0) {
      const removedImageUrls = replacedImageUrls.filter((url) => !finalImageUrls.includes(url));
      if (removedImageUrls.length > 0) {
        deleteUploadedFiles(removedImageUrls);
      }
    }

    if (!result.hasProduct) {
      return sendSuccess(res, { storeHandle: result.storeHandle }, "Store saved (no product data)");
    }

    return sendSuccess(
      res,
      {
        storeHandle: result.storeHandle,
      },
      result.createdNewProduct
        ? "Store and first product saved successfully"
        : "Store and product updated successfully"
    );
  } catch (error) {
    if (createdStoreAssetUrls.length > 0) {
      deleteUploadedFiles(createdStoreAssetUrls);
    }

    if (createdImageUrls.length > 0) {
      deleteUploadedFiles(createdImageUrls);
    }

    if (error.message && error.message.includes("UNIQUE constraint failed: stores.handle")) {
      return res.status(400).json({
        success: false,
        message: "Store handle already exists",
      });
    }

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Store handle already exists",
      });
    }

    return next(error);
  }
}

async function getMyStore(req, res, next) {
  try {
    const storeRow = await findStoreByUserId(req.user.id);
    const payload = await buildStorePayload(storeRow);
    return sendSuccess(
      res,
      {
        store: payload.store,
        product: payload.product,
        images: payload.images,
        products: payload.products || [],
        meta: payload.meta,
      },
      payload.message || "Store loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function updateStoreVisibility(req, res, next) {
  try {
    const { visibilityStatus } = validateStoreVisibilityPayload(req.body);
    const storeRow = await findStoreByUserId(req.user.id);
    if (!storeRow) {
      throw createHttpError(404, "Store not found");
    }

    if (visibilityStatus === "published" && !storeRow.profileCompleted) {
      throw createHttpError(400, "Finish seller setup before publishing the storefront");
    }

    await updateStoreVisibilityByUserId(req.user.id, visibilityStatus);
    const updatedStore = await findStoreByUserId(req.user.id);

    return sendSuccess(
      res,
      {
        visibilityStatus:
          (updatedStore && updatedStore.visibilityStatus) || visibilityStatus,
        publishedAt: (updatedStore && updatedStore.publishedAt) || null,
      },
      "Store visibility updated"
    );
  } catch (error) {
    return next(error);
  }
}

async function getStoreByHandle(req, res, next) {
  try {
    const handle = normalizeHandle(req.params.handle);
    const payload = await resolveStorePayloadByHandle(handle);

    if (!payload) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      });
    }

    return sendSuccess(
      res,
      {
        store: payload.store,
        product: payload.product,
        images: payload.images,
        products: payload.products || [],
        meta: payload.meta,
      },
      payload.message || "Store loaded"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  buildStorePayload,
  getMyStore,
  getStoreByHandle,
  saveStoreDraft,
  saveStore,
  updateStoreVisibility,
};
