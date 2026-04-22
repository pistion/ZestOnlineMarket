const {
  ensureBuyerProfileByUserId,
} = require("../repositories/buyer.repository");
const {
  findCatalogItemByPublicId,
  findCatalogMedia,
  listProductVariants,
} = require("../repositories/catalog.repository");
const {
  addItem,
  clearCart,
  findCartItem,
  findCartItemBySelection,
  getCartWithTotals,
  getOrCreateCart,
  removeItem,
  removeItems,
  updateItemQty,
} = require("../repositories/cart.repository");
const { findStoreById } = require("../repositories/store.repository");
const { createHttpError } = require("../utils/api-response");
const {
  mapProductImages,
  mapProductRow,
  mapProductVariantRow,
  mapStoreRow,
} = require("../utils/store-mappers");

const CART_TAX_RATE = 0.1;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Number((Number(value || 0) || 0).toFixed(2));
}

function assertBuyerUser(user) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer-only route");
  }
}

function isTransactionalOptions(options = {}) {
  return Boolean(options && options.transaction && options.transaction.trx);
}

async function resolveBuyerProfile(user, options = {}) {
  assertBuyerUser(user);
  const profile = await ensureBuyerProfileByUserId(user.id, options);
  if (!profile || !profile.id) {
    throw createHttpError(400, "Finish your buyer profile before using the cart");
  }

  return profile;
}

async function resolveCatalogSelection(input, options = {}) {
  const productId = toNumber(input.productId, 0);
  const requestedVariantId = toNumber(input.variantId, 0);
  const quantity = Math.max(1, toNumber(input.quantity, 1));

  if (!productId) {
    throw createHttpError(400, "Choose a listing before using the cart");
  }

  const productRow = await findCatalogItemByPublicId(productId, {
    ...options,
    publicOnly: true,
  });
  if (!productRow) {
    throw createHttpError(404, "That listing is no longer available");
  }

  let storeRow;
  let imageRows;
  let variantRows;

  if (isTransactionalOptions(options)) {
    storeRow = await findStoreById(productRow.storeId, options);
    imageRows = await findCatalogMedia(productId, options);
    variantRows = await listProductVariants(productId, options);
  } else {
    [storeRow, imageRows, variantRows] = await Promise.all([
      findStoreById(productRow.storeId, options),
      findCatalogMedia(productId, options),
      listProductVariants(productId, options),
    ]);
  }

  if (!storeRow) {
    throw createHttpError(404, "The seller for this listing could not be found");
  }

  const variants = variantRows.map((variant) => mapProductVariantRow(variant));
  const selectedVariant =
    (requestedVariantId && variants.find((variant) => Number(variant.id) === requestedVariantId)) ||
    variants.find((variant) => Number(variant.stockQuantity || 0) > 0) ||
    variants[0] ||
    null;

  if (requestedVariantId && !selectedVariant) {
    throw createHttpError(409, "The selected option is no longer available");
  }

  const availableStock = selectedVariant
    ? toNumber(selectedVariant.stockQuantity, 0)
    : toNumber(productRow.stockQuantity, 0);

  if (availableStock <= 0) {
    throw createHttpError(409, "This item is out of stock");
  }

  if (availableStock < quantity) {
    throw createHttpError(409, "The requested quantity exceeds available stock");
  }

  const unitPrice =
    selectedVariant && selectedVariant.priceOverride != null
      ? roundMoney(selectedVariant.priceOverride)
      : roundMoney(productRow.price || 0);

  return {
    product: mapProductRow({
      ...productRow,
      variants,
    }),
    store: mapStoreRow(storeRow),
    images: mapProductImages(imageRows),
    variants,
    selectedVariant,
    quantity,
    availableStock,
    unitPrice,
    shippingAmount: roundMoney(productRow.transportFee || 0),
  };
}

function buildLineFromSnapshot(item, overrides = {}) {
  const quantity = Math.max(1, toNumber(item.quantity, 1));
  const unitPrice = roundMoney(item.unitPrice);
  const shippingAmount = roundMoney(item.shippingAmount);
  const lineSubtotal = roundMoney(unitPrice * quantity);
  const lineTax = roundMoney(lineSubtotal * CART_TAX_RATE);
  const lineTotal = roundMoney(lineSubtotal + lineTax + shippingAmount);

  return {
    id: item.id,
    cartItemId: item.id,
    productId: item.productId,
    variantId: item.variantId || null,
    storeId: item.storeId || null,
    quantity,
    unitPrice,
    shippingAmount,
    lineSubtotal,
    lineTax,
    lineTotal,
    currency: item.currency || "PGK",
    title: item.title || "Cart item",
    variantLabel: item.variantLabel || "",
    variantSku: item.variantSku || "",
    image: item.imageUrl || "",
    storeName: item.storeName || "",
    storeHandle: item.storeHandle || "",
    storePath: item.storeHandle ? `/stores/${encodeURIComponent(item.storeHandle)}` : "/marketplace",
    productPath: item.productId ? `/products/${item.productId}` : "/marketplace",
    deliveryMethod: item.deliveryMethod || "",
    status: "ready",
    issue: "",
    availableStock: null,
    ...overrides,
  };
}

async function validateCartLine(item, options = {}) {
  try {
    const current = await resolveCatalogSelection(
      {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      },
      options
    );

    return buildLineFromSnapshot(item, {
      status: "ready",
      availableStock: current.availableStock,
      productPath: current.product.id ? `/products/${current.product.id}` : "/marketplace",
      storePath: current.store.handle ? `/stores/${encodeURIComponent(current.store.handle)}` : "/marketplace",
      storeName: current.store.storeName || item.storeName || "",
      storeHandle: current.store.handle || item.storeHandle || "",
      image:
        (current.images[0] && (current.images[0].url || current.images[0].src)) ||
        item.imageUrl ||
        "",
    });
  } catch (error) {
    return buildLineFromSnapshot(item, {
      status: "invalid",
      issue: error && error.message ? error.message : "This item needs attention before checkout.",
      availableStock: 0,
    });
  }
}

function summarizeValidatedItems(items = []) {
  const readyItems = items.filter((item) => item.status === "ready");
  const totals = readyItems.reduce(
    (summary, item) => ({
      subtotalAmount: roundMoney(summary.subtotalAmount + item.lineSubtotal),
      taxAmount: roundMoney(summary.taxAmount + item.lineTax),
      shippingAmount: roundMoney(summary.shippingAmount + item.shippingAmount),
      totalAmount: roundMoney(summary.totalAmount + item.lineTotal),
    }),
    {
      subtotalAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 0,
    }
  );

  return {
    ...totals,
    itemCount: readyItems.reduce((count, item) => count + item.quantity, 0),
    lineItemCount: readyItems.length,
    readyItemCount: readyItems.length,
    invalidItemCount: items.filter((item) => item.status !== "ready").length,
    uniqueStoreCount: new Set(readyItems.map((item) => item.storeId).filter(Boolean)).size,
  };
}

function groupCartItems(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const key = item.storeId || `snapshot:${item.storeHandle || item.storeName || "store"}`;
    if (!groups.has(key)) {
      groups.set(key, {
        store: {
          id: item.storeId || null,
          handle: item.storeHandle || "",
          storeName: item.storeName || "Marketplace seller",
          storePath: item.storePath || "/marketplace",
        },
        items: [],
      });
    }

    groups.get(key).items.push(item);
  });

  return [...groups.values()].map((group) => {
    const totals = summarizeValidatedItems(group.items);
    return {
      ...group,
      hasCheckoutIssues: totals.invalidItemCount > 0,
      subtotalAmount: totals.subtotalAmount,
      taxAmount: totals.taxAmount,
      shippingAmount: totals.shippingAmount,
      totalAmount: totals.totalAmount,
      itemCount: totals.itemCount,
      lineItemCount: totals.lineItemCount,
    };
  });
}

async function getBuyerCartWorkspace(user, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const rawCart = await getCartWithTotals(profile.id, options);
  let items;
  if (isTransactionalOptions(options)) {
    items = [];
    for (const item of rawCart.items || []) {
      items.push(await validateCartLine(item, options));
    }
  } else {
    items = await Promise.all((rawCart.items || []).map((item) => validateCartLine(item, options)));
  }
  const totals = summarizeValidatedItems(items);

  return {
    cart: {
      id: rawCart.id,
      customerProfileId: profile.id,
      status: rawCart.status,
      currency: rawCart.currency || "PGK",
      createdAt: rawCart.createdAt,
      updatedAt: rawCart.updatedAt,
      hasCheckoutIssues: totals.invalidItemCount > 0,
      ...totals,
    },
    items,
    storeGroups: groupCartItems(items),
  };
}

async function addBuyerCartItem(user, body = {}, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const cart = await getOrCreateCart(profile.id, options);
  const selection = await resolveCatalogSelection(body, options);
  const existing = await findCartItemBySelection(
    cart.id,
    selection.product.id,
    selection.selectedVariant ? selection.selectedVariant.id : null,
    options
  );

  if (existing && existing.id) {
    const nextQuantity = Math.max(1, toNumber(existing.quantity, 1) + selection.quantity);
    if (selection.availableStock < nextQuantity) {
      throw createHttpError(409, "The requested quantity exceeds available stock");
    }

    await updateItemQty(cart.id, existing.id, nextQuantity, options);
  } else {
    await addItem(
      cart.id,
      {
        storeId: selection.store.id,
        productId: selection.product.id,
        variantId: selection.selectedVariant ? selection.selectedVariant.id : null,
        quantity: selection.quantity,
        unitPrice: selection.unitPrice,
        shippingAmount: selection.shippingAmount,
        currency: "PGK",
        title: selection.product.title || selection.product.name || "Cart item",
        variantLabel: selection.selectedVariant ? selection.selectedVariant.label : "",
        variantSku: selection.selectedVariant ? selection.selectedVariant.sku : "",
        imageUrl:
          (selection.images[0] && (selection.images[0].url || selection.images[0].src)) ||
          "",
        storeName: selection.store.storeName || "Marketplace seller",
        storeHandle: selection.store.handle || "",
        deliveryMethod: selection.product.delivery || "",
      },
      options
    );
  }

  return getBuyerCartWorkspace(user, options);
}

async function updateBuyerCartItemQuantity(user, itemId, body = {}, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const cart = await getOrCreateCart(profile.id, options);
  const existing = await findCartItem(cart.id, itemId, options);

  if (!existing) {
    throw createHttpError(404, "Cart item not found");
  }

  const nextQuantity = Math.max(1, toNumber(body.quantity, existing.quantity || 1));
  await resolveCatalogSelection(
    {
      productId: existing.productId,
      variantId: existing.variantId,
      quantity: nextQuantity,
    },
    options
  );

  await updateItemQty(cart.id, itemId, nextQuantity, options);
  return getBuyerCartWorkspace(user, options);
}

async function removeBuyerCartItem(user, itemId, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const cart = await getOrCreateCart(profile.id, options);
  const removed = await removeItem(cart.id, itemId, options);
  if (!removed) {
    throw createHttpError(404, "Cart item not found");
  }

  return getBuyerCartWorkspace(user, options);
}

async function clearBuyerCart(user, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const cart = await getOrCreateCart(profile.id, options);
  await clearCart(cart.id, options);
  return getBuyerCartWorkspace(user, options);
}

async function buildValidatedCartCheckoutContext(user, options = {}) {
  const profile = await resolveBuyerProfile(user, options);
  const cart = await getOrCreateCart(profile.id, options);
  const workspace = await getBuyerCartWorkspace(user, options);
  const readyItems = workspace.items.filter((item) => item.status === "ready");
  const invalidItems = workspace.items.filter((item) => item.status !== "ready");

  return {
    profile,
    cartId: cart.id,
    cart: workspace.cart,
    items: workspace.items,
    storeGroups: workspace.storeGroups,
    readyItems,
    invalidItems,
  };
}

module.exports = {
  addBuyerCartItem,
  buildValidatedCartCheckoutContext,
  clearBuyerCart,
  getBuyerCartWorkspace,
  groupCartItems,
  removeBuyerCartItem,
  removeBuyerCartItems: async (user, itemIds = [], options = {}) => {
    const profile = await resolveBuyerProfile(user, options);
    const cart = await getOrCreateCart(profile.id, options);
    return removeItems(cart.id, itemIds, options);
  },
  summarizeValidatedItems,
  updateBuyerCartItemQuantity,
};
