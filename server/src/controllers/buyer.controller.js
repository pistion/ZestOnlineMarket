const path = require("path");

const { paths } = require("../config/env");
const { transaction } = require("../config/db");
const {
  renderCompatibilityProductViewer,
  renderCheckoutPage,
  renderPage,
} = require("./page.controller");
const { buildFeedPayload } = require("../services/feed.service");
const {
  addBuyerWishlistEntry,
  buildBuyerSettingsWorkspace,
  buildBuyerSnapshot,
  createBuyerAddressEntry,
  deleteBuyerAddressEntry,
  followBuyerStore,
  listBuyerRecentlyViewedWorkspace,
  listBuyerWishlistWorkspace,
  recordBuyerInteraction,
  removeBuyerWishlistEntry,
  saveBuyerAccountSettings,
  saveBuyerSetup,
  unfollowBuyerStore,
  updateBuyerAddressEntry,
} = require("../services/buyer.service");
const { createHttpError, sendSuccess } = require("../utils/api-response");
const { deleteUploadedFiles, saveBase64ImageToFolder } = require("../utils/image.util");
const {
  normalizeHandle,
  validateBuyerAddressPayload,
  validateBuyerInteractionPayload,
  validateFeedQueryPayload,
  validateBuyerProfilePayload,
  validateBuyerSettingsPayload,
  validateBuyerWishlistPayload,
} = require("../utils/request-validation");
const {
  resolveBuyerAppPath,
  resolveBuyerHomePath,
} = require("../services/account-routing.service");

const renderBuyerProfileView = renderPage("buyerProfile");
const renderBuyerSettingsView = renderPage("buyerSettings");
const renderBuyerWizardView = renderPage("buyerWizard");

function isUploadedAssetUrl(value) {
  return typeof value === "string" && value.startsWith("/uploads/");
}

function saveBuyerProfileAsset(userId, source, filePrefix, fieldLabel) {
  const normalizedSource = String(source || "").trim();
  if (!normalizedSource) {
    return {
      finalUrl: "",
      createdUrl: "",
    };
  }

  if (
    isUploadedAssetUrl(normalizedSource) ||
    normalizedSource.startsWith("/assets/") ||
    /^https?:\/\//i.test(normalizedSource)
  ) {
    return {
      finalUrl: normalizedSource,
      createdUrl: "",
    };
  }

  const buyerFolder = path.join(paths.uploadsDir, String(userId), "buyer");
  const savedUrl = saveBase64ImageToFolder(normalizedSource, buyerFolder, filePrefix);
  if (!savedUrl) {
    throw createHttpError(400, `${fieldLabel} is invalid`);
  }

  return {
    finalUrl: savedUrl,
    createdUrl: savedUrl,
  };
}

function normalizePositiveId(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} is invalid`);
  }

  return parsed;
}

async function persistBuyerAccountState(req, res, payload, saveFn, message, options = {}) {
  const userId = req.user.id;
  let createdAvatarUrls = [];
  let oldAssetUrls = [];
  let finalAvatarUrl = "";
  let finalCoverUrl = "";

  const result = await transaction(
    async (txContext) => {
      const avatarResult = saveBuyerProfileAsset(
        userId,
        payload.avatarUrl,
        "buyer-avatar",
        "Profile photo"
      );
      const coverResult = saveBuyerProfileAsset(
        userId,
        payload.coverUrl,
        "buyer-cover",
        "Cover photo"
      );
      createdAvatarUrls = [avatarResult.createdUrl, coverResult.createdUrl].filter(Boolean);
      oldAssetUrls = [
        req.buyerProfile && isUploadedAssetUrl(req.buyerProfile.avatarUrl)
          ? req.buyerProfile.avatarUrl
          : "",
        req.buyerProfile && isUploadedAssetUrl(req.buyerProfile.coverUrl)
          ? req.buyerProfile.coverUrl
          : "",
      ].filter(Boolean);
      finalAvatarUrl = avatarResult.finalUrl;
      finalCoverUrl = coverResult.finalUrl;

      return saveFn(
        req.user,
        {
          ...payload,
          avatarUrl: avatarResult.finalUrl,
          coverUrl: coverResult.finalUrl,
        },
        {
          transaction: txContext,
          ...options,
        }
      );
    },
    { scope: "identity" }
  ).catch((error) => {
    if (createdAvatarUrls.length > 0) {
      deleteUploadedFiles(createdAvatarUrls);
    }
    throw error;
  });

  const finalAssetUrls = [finalAvatarUrl, finalCoverUrl].filter(Boolean);
  const staleAssetUrls = [...new Set(oldAssetUrls)].filter((url) => !finalAssetUrls.includes(url));
  if (staleAssetUrls.length > 0) {
    deleteUploadedFiles(staleAssetUrls);
  }

  return sendSuccess(
    res,
    {
      profile: result.profile,
      preferences: result.preferences,
      redirectTo: resolveBuyerAppPath(result.profile),
      profileCompleted: Boolean(result.profile && result.profile.profileCompleted),
    },
    message
  );
}

async function renderBuyerProfilePage(req, res, next) {
  try {
    return renderBuyerProfileView(req, res);
  } catch (error) {
    return next(error);
  }
}

async function renderBuyerSettingsPage(req, res, next) {
  try {
    return renderBuyerSettingsView(req, res);
  } catch (error) {
    return next(error);
  }
}

async function renderBuyerWizardPage(req, res, next) {
  try {
    if (req.buyerProfile && req.buyerProfile.profileCompleted) {
      return res.redirect(302, resolveBuyerHomePath());
    }

    return renderBuyerWizardView(req, res);
  } catch (error) {
    return next(error);
  }
}

async function getBuyerMe(req, res, next) {
  try {
    const payload = await buildBuyerSnapshot(req.user);
    return sendSuccess(res, payload, "Buyer profile loaded");
  } catch (error) {
    return next(error);
  }
}

async function getBuyerSettings(req, res, next) {
  try {
    const payload = await buildBuyerSettingsWorkspace(req.user);
    return sendSuccess(res, payload, "Buyer settings loaded");
  } catch (error) {
    return next(error);
  }
}

async function getBuyerFollowing(req, res, next) {
  try {
    const payload = await buildBuyerSnapshot(req.user);
    return sendSuccess(
      res,
      {
        following: payload.following,
        stats: {
          following: payload.stats.following,
          savedStores: payload.stats.savedStores,
        },
      },
      "Buyer following loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function getBuyerPurchases(req, res, next) {
  try {
    const payload = await buildBuyerSnapshot(req.user);
    return sendSuccess(
      res,
      {
        purchases: payload.purchases,
        stats: {
          purchases: payload.stats.purchases,
        },
      },
      "Buyer purchases loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function getBuyerWishlist(req, res, next) {
  try {
    const payload = await listBuyerWishlistWorkspace(req.user);
    return sendSuccess(res, payload, "Buyer wishlist loaded");
  } catch (error) {
    return next(error);
  }
}

async function getBuyerRecentlyViewed(req, res, next) {
  try {
    const payload = await listBuyerRecentlyViewedWorkspace(req.user);
    return sendSuccess(res, payload, "Recently viewed listings loaded");
  } catch (error) {
    return next(error);
  }
}

async function getBuyerAddresses(req, res, next) {
  try {
    const payload = await buildBuyerSettingsWorkspace(req.user);
    return sendSuccess(
      res,
      {
        addresses: payload.addresses || [],
        stats: {
          addresses: payload.stats.addresses || 0,
        },
      },
      "Buyer addresses loaded"
    );
  } catch (error) {
    return next(error);
  }
}

async function getBuyerFeed(req, res, next) {
  try {
    const queryOptions = validateFeedQueryPayload(req.query || {});
    const payload = await buildFeedPayload(req.user, {
      includeFallbackItems: false,
      ...queryOptions,
    });
    return sendSuccess(res, payload, "Buyer feed loaded");
  } catch (error) {
    return next(error);
  }
}

async function postBuyerFollowing(req, res, next) {
  try {
    const handle = normalizeHandle(req.params.handle);
    const payload = await followBuyerStore(req.user, handle);
    if (!payload) {
      throw createHttpError(404, "Store not found");
    }

    return sendSuccess(
      res,
      {
        following: payload.following,
        handles: payload.handles,
        followingList: payload.followingList,
      },
      "Store followed"
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteBuyerFollowing(req, res, next) {
  try {
    const handle = normalizeHandle(req.params.handle);
    const payload = await unfollowBuyerStore(req.user, handle);
    return sendSuccess(
      res,
      {
        following: payload ? payload.following : false,
        handles: payload ? payload.handles : [],
        followingList: payload ? payload.followingList : [],
      },
      "Store unfollowed"
    );
  } catch (error) {
    return next(error);
  }
}

async function postBuyerInteraction(req, res, next) {
  try {
    const payload = await recordBuyerInteraction(
      req.user || null,
      validateBuyerInteractionPayload(req.body || {})
    );
    return sendSuccess(
      res,
      {
        tracked: payload.tracked,
        preferences: payload.preferences,
      },
      payload.tracked ? "Buyer interaction tracked" : "Buyer interaction ignored"
    );
  } catch (error) {
    return next(error);
  }
}

async function postBuyerWishlist(req, res, next) {
  try {
    const payload = validateBuyerWishlistPayload(req.body);
    const result = await addBuyerWishlistEntry(req.user, payload.productId);
    if (!result) {
      throw createHttpError(404, "Listing not found");
    }

    return sendSuccess(res, result, "Listing saved to wishlist");
  } catch (error) {
    return next(error);
  }
}

async function deleteBuyerWishlist(req, res, next) {
  try {
    const productId = normalizePositiveId(req.params.productId, "Product id");
    const result = await removeBuyerWishlistEntry(req.user, productId);
    return sendSuccess(res, result, "Listing removed from wishlist");
  } catch (error) {
    return next(error);
  }
}

async function postBuyerAddress(req, res, next) {
  try {
    const payload = validateBuyerAddressPayload(req.body);
    const result = await createBuyerAddressEntry(req.user, payload);
    return sendSuccess(res, result, "Address saved");
  } catch (error) {
    return next(error);
  }
}

async function patchBuyerAddress(req, res, next) {
  try {
    const addressId = normalizePositiveId(req.params.addressId, "Address id");
    const payload = validateBuyerAddressPayload(req.body);
    const result = await updateBuyerAddressEntry(req.user, addressId, payload);
    if (!result.address) {
      throw createHttpError(404, "Address not found");
    }

    return sendSuccess(res, result, "Address updated");
  } catch (error) {
    return next(error);
  }
}

async function destroyBuyerAddress(req, res, next) {
  try {
    const addressId = normalizePositiveId(req.params.addressId, "Address id");
    const result = await deleteBuyerAddressEntry(req.user, addressId);
    if (!result.removed) {
      throw createHttpError(404, "Address not found");
    }

    return sendSuccess(res, result, "Address removed");
  } catch (error) {
    return next(error);
  }
}

async function saveBuyerProfile(req, res, next) {
  try {
    const payload = validateBuyerProfilePayload(req.body);
    return await persistBuyerAccountState(
      req,
      res,
      payload,
      saveBuyerSetup,
      "Buyer profile setup saved"
    );
  } catch (error) {
    return next(error);
  }
}

async function patchBuyerSettings(req, res, next) {
  try {
    const payload = validateBuyerSettingsPayload(req.body);
    return await persistBuyerAccountState(
      req,
      res,
      payload,
      saveBuyerAccountSettings,
      "Buyer settings saved"
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  deleteBuyerFollowing,
  deleteBuyerWishlist,
  destroyBuyerAddress,
  getBuyerAddresses,
  getBuyerFeed,
  getBuyerFollowing,
  getBuyerMe,
  getBuyerPurchases,
  getBuyerRecentlyViewed,
  getBuyerSettings,
  getBuyerWishlist,
  patchBuyerAddress,
  patchBuyerSettings,
  postBuyerAddress,
  postBuyerFollowing,
  postBuyerInteraction,
  postBuyerWishlist,
  renderBuyerCheckoutPage: renderCheckoutPage,
  renderBuyerCompatibilityProductViewer: renderCompatibilityProductViewer,
  renderBuyerProfilePage,
  renderBuyerSettingsPage,
  renderBuyerWizardPage,
  saveBuyerProfile,
};
