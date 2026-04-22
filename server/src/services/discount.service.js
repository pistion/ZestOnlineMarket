const { ensureBuyerProfileByUserId } = require("../repositories/buyer.repository");
const {
  create,
  createOrderDiscountRecord,
  findByCode,
  findByIdForStore,
  incrementUseCount,
  listByStore,
  update,
} = require("../repositories/discount.repository");
const { findStoreByUserId } = require("../repositories/store.repository");
const { buildValidatedCartCheckoutContext } = require("./cart.service");
const { createHttpError } = require("../utils/api-response");

function roundMoney(value) {
  return Number((Number(value || 0) || 0).toFixed(2));
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, "Discount dates must be valid timestamps");
  }

  return date.toISOString();
}

function normalizePayload(payload = {}) {
  const normalized = {
    ...payload,
    startsAt: parseTimestamp(payload.startsAt),
    endsAt: parseTimestamp(payload.endsAt),
  };

  if (normalized.discountType === "percentage" && (normalized.amount <= 0 || normalized.amount > 100)) {
    throw createHttpError(400, "Percentage discounts must be between 0 and 100");
  }

  if (normalized.discountType !== "percentage" && normalized.amount < 0) {
    throw createHttpError(400, "Discount amount must be greater than or equal to zero");
  }

  if (normalized.startsAt && normalized.endsAt && normalized.startsAt > normalized.endsAt) {
    throw createHttpError(400, "Discount start date must be before the end date");
  }

  return normalized;
}

function assertSellerUser(user) {
  if (!user || user.role !== "seller") {
    throw createHttpError(403, "Seller-only route");
  }
}

function assertBuyerUser(user) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer-only route");
  }
}

function isDiscountAvailable(discount, now = new Date()) {
  if (!discount || !discount.active) {
    return false;
  }
  if (discount.maxUses != null && Number(discount.useCount || 0) >= Number(discount.maxUses || 0)) {
    return false;
  }

  const nowValue = now.getTime();
  if (discount.startsAt) {
    const startsAt = new Date(discount.startsAt).getTime();
    if (!Number.isNaN(startsAt) && startsAt > nowValue) {
      return false;
    }
  }
  if (discount.endsAt) {
    const endsAt = new Date(discount.endsAt).getTime();
    if (!Number.isNaN(endsAt) && endsAt < nowValue) {
      return false;
    }
  }

  return true;
}

function calculateDiscountAmount(discount, subtotalAmount, shippingAmount) {
  const subtotal = roundMoney(subtotalAmount);
  const shipping = roundMoney(shippingAmount);
  if (discount.discountType === "percentage") {
    return roundMoney(Math.min(subtotal, subtotal * (Number(discount.amount || 0) / 100)));
  }
  if (discount.discountType === "free_shipping") {
    return roundMoney(shipping);
  }
  return roundMoney(Math.min(subtotal + shipping, Number(discount.amount || 0)));
}

function buildAdjustedGroup(group, discount, amountApplied) {
  const originalTotal = roundMoney(group.totalAmount);
  return {
    store: group.store,
    originalTotal,
    adjustedTotal: roundMoney(Math.max(0, originalTotal - amountApplied)),
    subtotalAmount: roundMoney(group.subtotalAmount),
    taxAmount: roundMoney(group.taxAmount),
    shippingAmount: roundMoney(group.shippingAmount),
    itemCount: group.itemCount,
    lineItemCount: group.lineItemCount,
    amountApplied,
    discount: {
      id: discount.id,
      code: discount.code,
      title: discount.title,
      discountType: discount.discountType,
      amount: discount.amount,
    },
  };
}

function validateDiscountAgainstGroup(discount, group, now = new Date()) {
  if (!discount) {
    throw createHttpError(404, "Discount code was not found");
  }
  if (!isDiscountAvailable(discount, now)) {
    throw createHttpError(409, "This discount is inactive, expired, or fully used");
  }
  if (!group || Number(group.store.id || 0) !== Number(discount.storeId || 0)) {
    throw createHttpError(409, "This discount does not apply to the current cart");
  }
  if (Number(group.subtotalAmount || 0) < Number(discount.minOrderAmount || 0)) {
    throw createHttpError(
      409,
      `This discount requires a minimum order of K${Number(discount.minOrderAmount || 0).toFixed(2)}`
    );
  }

  const amountApplied = calculateDiscountAmount(
    discount,
    group.subtotalAmount,
    group.shippingAmount
  );
  if (amountApplied <= 0) {
    throw createHttpError(409, "This discount does not reduce the current order");
  }

  return amountApplied;
}

async function listSellerDiscounts(user, options = {}) {
  assertSellerUser(user);
  const store = await findStoreByUserId(user.id, options);
  if (!store || !store.id) {
    throw createHttpError(400, "Create your store before managing discounts");
  }

  return {
    store,
    discounts: await listByStore(store.id, options),
  };
}

async function createSellerDiscount(user, payload = {}, options = {}) {
  assertSellerUser(user);
  const store = await findStoreByUserId(user.id, options);
  if (!store || !store.id) {
    throw createHttpError(400, "Create your store before managing discounts");
  }

  const normalized = normalizePayload(payload);
  return create(store.id, normalized, options);
}

async function updateSellerDiscount(user, discountId, payload = {}, options = {}) {
  assertSellerUser(user);
  const store = await findStoreByUserId(user.id, options);
  if (!store || !store.id) {
    throw createHttpError(400, "Create your store before managing discounts");
  }

  const existing = await findByIdForStore(discountId, store.id, options);
  if (!existing) {
    throw createHttpError(404, "Discount not found");
  }

  const normalized = normalizePayload(payload);
  return update(discountId, store.id, normalized, options);
}

async function validateDiscountForCheckout(user, code, options = {}) {
  assertBuyerUser(user);
  const profile = await ensureBuyerProfileByUserId(user.id, options);
  if (!profile || !profile.id) {
    throw createHttpError(400, "Finish your buyer profile before using discounts");
  }

  const cartContext = await buildValidatedCartCheckoutContext(user, options);
  if (!cartContext.readyItems.length) {
    throw createHttpError(409, "Your cart is empty");
  }

  const discount = await findByCode(code, options);
  const group = (cartContext.storeGroups || []).find(
    (entry) => Number(entry.store.id || 0) === Number(discount && discount.storeId || 0)
  );
  const amountApplied = validateDiscountAgainstGroup(discount, group);
  const adjustedGroup = buildAdjustedGroup(group, discount, amountApplied);

  return {
    discount: adjustedGroup.discount,
    store: adjustedGroup.store,
    amountApplied,
    cartTotals: {
      subtotalAmount: roundMoney(cartContext.cart.subtotalAmount),
      taxAmount: roundMoney(cartContext.cart.taxAmount),
      shippingAmount: roundMoney(cartContext.cart.shippingAmount),
      totalAmount: roundMoney(cartContext.cart.totalAmount),
      adjustedTotalAmount: roundMoney(Math.max(0, Number(cartContext.cart.totalAmount || 0) - amountApplied)),
    },
    group: adjustedGroup,
  };
}

async function resolveApplicableDiscount(code, group, options = {}) {
  if (!code) {
    return null;
  }

  const discount = await findByCode(code, options);
  const amountApplied = validateDiscountAgainstGroup(discount, group);

  return {
    discount,
    amountApplied,
  };
}

async function commitDiscountUsage(orderId, discountResolution, options = {}) {
  if (!discountResolution || !discountResolution.discount || !discountResolution.amountApplied) {
    return null;
  }

  const incremented = await incrementUseCount(discountResolution.discount.id, options);
  if (!incremented) {
    throw createHttpError(409, "This discount can no longer be used");
  }

  await createOrderDiscountRecord(
    {
      orderId,
      discountId: discountResolution.discount.id,
      codeSnapshot: discountResolution.discount.code,
      discountType: discountResolution.discount.discountType,
      amountApplied: discountResolution.amountApplied,
    },
    options
  );

  return incremented;
}

module.exports = {
  buildAdjustedGroup,
  calculateDiscountAmount,
  commitDiscountUsage,
  createSellerDiscount,
  isDiscountAvailable,
  listSellerDiscounts,
  resolveApplicableDiscount,
  updateSellerDiscount,
  validateDiscountAgainstGroup,
  validateDiscountForCheckout,
};
