const {
  findStoreByHandle,
  findStoreByUserId,
} = require("../repositories/store.repository");
const {
  findArtStoreSettingsByStoreId,
  listArtListingsByStoreId,
} = require("../repositories/art.repository");
const { createHttpError } = require("../utils/api-response");
const { mapStoreRow } = require("../utils/store-mappers");

function isArtStore(store) {
  return Boolean(store) && String(store.templateKey || "").trim().toLowerCase() === "art";
}

function assertArtStore(store, status = 400) {
  if (!store) {
    throw createHttpError(404, "Art store not found");
  }

  if (!isArtStore(store)) {
    throw createHttpError(status, "This seller store is not using the art engine");
  }

  return store;
}

async function buildArtStorePayload(store, options = {}) {
  const artStore = assertArtStore(store);
  const publicOnly = Boolean(options.publicOnly);
  const [artSettings, products] = await Promise.all([
    findArtStoreSettingsByStoreId(artStore.id, options),
    listArtListingsByStoreId(artStore.id, {
      ...options,
      publicOnly,
    }),
  ]);

  return {
    success: true,
    message: "Art store loaded",
    store: mapStoreRow(artStore),
    artSettings,
    product: products[0] || null,
    images: products[0] ? products[0].images || [] : [],
    products,
    meta: {
      isEditable: !publicOnly,
      visibilityStatus: artStore.visibilityStatus || "draft",
      setupStep: artStore.setupStep || 1,
      engineKey: "art",
    },
  };
}

async function buildSellerArtStorePayload(userId, options = {}) {
  const store = await findStoreByUserId(userId, options);
  return buildArtStorePayload(store, options);
}

async function buildPublicArtStorePayload(handle, options = {}) {
  const store = await findStoreByHandle(handle, options);
  return buildArtStorePayload(store, {
    ...options,
    publicOnly: true,
  });
}

module.exports = {
  assertArtStore,
  buildArtStorePayload,
  buildPublicArtStorePayload,
  buildSellerArtStorePayload,
  isArtStore,
};
