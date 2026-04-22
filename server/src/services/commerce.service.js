const { transaction } = require("../config/db");
const {
  ensureBuyerProfileByUserId,
  listBuyerAddresses,
  recordBuyerPreferenceSignal,
} = require("../repositories/buyer.repository");
const {
  buildValidatedCartCheckoutContext,
  removeBuyerCartItems,
} = require("./cart.service");
const { findCatalogItemByPublicId, findCatalogMedia, listProductVariants } = require("../repositories/catalog.repository");
const {
  adjustInventoryForSale,
  createOrderRecord,
  findBuyerOrderByProfileId,
  findSellerOrderByStoreId,
  findStoreOwnerRecordByUserId,
  getSellerOrderMetricsByStoreId,
  listBuyerOrdersByProfileId,
  listSellerOrdersByStoreId,
  restoreInventoryForRefund,
  updateOrderStatusByStoreId,
} = require("../repositories/commerce.repository");
const { findStoreById, findStoreOwnerContactByStoreId } = require("../repositories/store.repository");
const { commitDiscountUsage, resolveApplicableDiscount } = require("./discount.service");
const { sendTemplateMail } = require("./email.service");
const { createHttpError } = require("../utils/api-response");
const { mapProductImages, mapProductRow, mapProductVariantRow, mapStoreRow } = require("../utils/store-mappers");

const PGK_TAX_RATE = 0.1;
const ORDER_STATUS_TRANSITIONS = Object.freeze({
  pending: new Set(["paid", "cancelled"]),
  paid: new Set(["shipped", "refunded", "cancelled"]),
  shipped: new Set(["delivered", "refunded"]),
  delivered: new Set(["refunded"]),
  refunded: new Set(),
  cancelled: new Set(),
});

const PAYMENT_PROVIDERS = Object.freeze({
  "bsp-pay": {
    key: "bsp-pay",
    label: "BSP Pay",
    helper: "Fast local checkout",
    async charge({ amount, currency, orderNumber }) {
      return {
        provider: "bsp-pay",
        status: "paid",
        amount,
        currency,
        transactionReference: `BSP-${orderNumber}`,
      };
    },
  },
  paypal: {
    key: "paypal",
    label: "PayPal",
    helper: "Card or PayPal balance",
    async charge({ amount, currency, orderNumber }) {
      return {
        provider: "paypal",
        status: "paid",
        amount,
        currency,
        transactionReference: `PAYPAL-${orderNumber}`,
      };
    },
  },
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Number((Number(value || 0) || 0).toFixed(2));
}

function buildOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const nonce = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ZEST-${stamp}-${nonce}`;
}

function buildDiscountGroupPreview({ store, items, subtotalAmount, taxAmount, shippingAmount }) {
  return {
    store,
    items,
    itemCount: (items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    lineItemCount: Array.isArray(items) ? items.length : 0,
    subtotalAmount: roundMoney(subtotalAmount),
    taxAmount: roundMoney(taxAmount),
    shippingAmount: roundMoney(shippingAmount),
    totalAmount: roundMoney(subtotalAmount + taxAmount + shippingAmount),
  };
}

async function sendNewOrderEmails(order) {
  if (!order) {
    return;
  }

  const customer = order.customer || {};
  const store = order.store || {};
  const storeContact = store && store.id ? await findStoreOwnerContactByStoreId(store.id) : null;
  const mailJobs = [
    sendTemplateMail({
      to: customer.email,
      subject: `Order confirmed: ${order.orderNumber}`,
      template: "order-confirmation",
      data: {
        customerName: customer.name,
        orderNumber: order.orderNumber,
        storeName: store.storeName,
        totalAmount: order.totalAmount,
      },
    }),
  ];

  if (storeContact && storeContact.email) {
    mailJobs.push(
      sendTemplateMail({
        to: storeContact.email,
        subject: `New order: ${order.orderNumber}`,
        template: "seller-new-order",
        data: {
          sellerName: storeContact.fullName,
          storeName: store.storeName,
          orderNumber: order.orderNumber,
          customerName: customer.name,
          customerEmail: customer.email,
          totalAmount: order.totalAmount,
        },
      })
    );
  }

  await Promise.allSettled(mailJobs);
}

async function sendOrderStatusEmail(order, status) {
  if (!order || !order.customer || !order.customer.email) {
    return;
  }

  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (!["shipped", "delivered"].includes(normalizedStatus)) {
    return;
  }

  await sendTemplateMail({
    to: order.customer.email,
    subject:
      normalizedStatus === "delivered"
        ? `Order delivered: ${order.orderNumber}`
        : `Order shipped: ${order.orderNumber}`,
    template: "order-shipped",
    data: {
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      statusLabel: normalizedStatus === "delivered" ? "Delivered" : "Shipped",
      trackingNumber: order.shipment && order.shipment.trackingNumber ? order.shipment.trackingNumber : "",
      carrier: order.shipment && order.shipment.carrier ? order.shipment.carrier : "",
    },
  });
}

function resolvePaymentProvider(paymentMethod) {
  const normalized = String(paymentMethod || "").trim().toLowerCase();
  const provider = PAYMENT_PROVIDERS[normalized];
  if (!provider) {
    throw createHttpError(400, "Choose a supported payment method");
  }

  return provider;
}

function listPaymentMethods() {
  return Object.values(PAYMENT_PROVIDERS).map((provider) => ({
    key: provider.key,
    label: provider.label,
    helper: provider.helper,
  }));
}

function buildCheckoutDefaults(user, buyerProfile, preferredAddress, deliveryMethod = "seller-arranged") {
  const preferredAddressLines = preferredAddress
    ? [preferredAddress.addressLine1, preferredAddress.addressLine2].filter(Boolean).join(", ")
    : "";

  return {
    customerName:
      (buyerProfile && (buyerProfile.fullName || buyerProfile.displayName)) || "",
    customerEmail:
      (buyerProfile && buyerProfile.email) || String(user.email || "").trim(),
    customerPhone: (buyerProfile && buyerProfile.phone) || "",
    deliveryMethod: String(deliveryMethod || "").trim() || "seller-arranged",
    deliveryAddress: preferredAddressLines,
    deliveryCity: preferredAddress ? preferredAddress.city || "" : "",
    deliveryNotes: "",
  };
}

async function resolveCheckoutContext(input, options = {}) {
  const productId = toNumber(input.productId, 0);
  const requestedVariantId = toNumber(input.variantId, 0);
  const quantity = Math.max(1, toNumber(input.quantity, 1));

  if (!productId) {
    throw createHttpError(400, "A product is required before checkout");
  }

  const productRow = await findCatalogItemByPublicId(productId, { ...options, publicOnly: true });
  const imageRows = await findCatalogMedia(productId, options);
  const variantRows = await listProductVariants(productId, options);

  if (!productRow) {
    throw createHttpError(404, "That listing is no longer available");
  }

  const storeRow = await findStoreById(productRow.storeId, options);
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

  const unitPrice =
    selectedVariant && selectedVariant.priceOverride != null
      ? Number(selectedVariant.priceOverride || 0)
      : Number(productRow.price || 0);
  const availableStock = selectedVariant
    ? toNumber(selectedVariant.stockQuantity, 0)
    : toNumber(productRow.stockQuantity, 0);

  if (availableStock <= 0) {
    throw createHttpError(409, "This item is out of stock");
  }

  if (availableStock < quantity) {
    throw createHttpError(409, "The requested quantity exceeds available stock");
  }

  const shippingAmount = roundMoney(productRow.transportFee || 0);
  const subtotalAmount = roundMoney(unitPrice * quantity);
  const taxAmount = roundMoney(subtotalAmount * PGK_TAX_RATE);
  const totalAmount = roundMoney(subtotalAmount + taxAmount + shippingAmount);

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
    unitPrice: roundMoney(unitPrice),
    availableStock,
    subtotalAmount,
    taxAmount,
    shippingAmount,
    totalAmount,
  };
}

async function buildCheckoutPreview(user, input = {}, options = {}) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer checkout is only available to buyer accounts");
  }

  const [buyerProfile, savedAddresses] = await Promise.all([
    ensureBuyerProfileByUserId(user.id, options),
    listBuyerAddresses(user.id, options),
  ]);
  const preferredAddress =
    savedAddresses.find((address) => address.addressType === "shipping") ||
    savedAddresses[0] ||
    null;

  if (toNumber(input.productId, 0) > 0) {
    const context = await resolveCheckoutContext(input, options);

    return {
      mode: "direct",
      profile: buyerProfile,
      store: context.store,
      product: context.product,
      images: context.images,
      selectedVariant: context.selectedVariant,
      quantity: context.quantity,
      pricing: {
        unitPrice: context.unitPrice,
        subtotalAmount: context.subtotalAmount,
        taxAmount: context.taxAmount,
        shippingAmount: context.shippingAmount,
        totalAmount: context.totalAmount,
        currency: "PGK",
      },
      availableStock: context.availableStock,
      paymentMethods: listPaymentMethods(),
      savedAddresses,
      defaults: buildCheckoutDefaults(
        user,
        buyerProfile,
        preferredAddress,
        context.product.delivery
      ),
    };
  }

  const cartContext = await buildValidatedCartCheckoutContext(user, options);
  const firstReadyItem = cartContext.readyItems[0] || null;

  return {
    mode: "cart",
    profile: buyerProfile,
    cart: cartContext.cart,
    items: cartContext.items,
    storeGroups: cartContext.storeGroups,
    hasCheckoutIssues: cartContext.invalidItems.length > 0,
    paymentMethods: listPaymentMethods(),
    savedAddresses,
    defaults: buildCheckoutDefaults(
      user,
      buyerProfile,
      preferredAddress,
      firstReadyItem ? firstReadyItem.deliveryMethod : "seller-arranged"
    ),
  };
}

async function createBuyerOrder(user, body = {}) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer checkout is only available to buyer accounts");
  }

  const payload = body || {};
  const buyerProfile = await ensureBuyerProfileByUserId(user.id);
  if (!buyerProfile || !buyerProfile.id) {
    throw createHttpError(400, "Finish your buyer profile before placing an order");
  }

  const provider = resolvePaymentProvider(payload.paymentMethod);
  if (!toNumber(payload.productId, 0)) {
    const orderResult = await transaction(
      async (txContext) => {
        const txOptions = {
          source: "postgres",
          transaction: txContext,
        };
        const cartContext = await buildValidatedCartCheckoutContext(user, txOptions);
        if (!cartContext.readyItems.length) {
          throw createHttpError(409, "Your cart is empty. Add an item before placing an order");
        }
        if (cartContext.invalidItems.length) {
          throw createHttpError(409, "Some cart items need attention before checkout");
        }

        const groupedItems = new Map();
        const interactionSignals = [];

        for (const item of cartContext.readyItems) {
          const liveContext = await resolveCheckoutContext(
            {
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            },
            txOptions
          );

          const storeId = liveContext.store.id;
          if (!groupedItems.has(storeId)) {
            groupedItems.set(storeId, {
              store: liveContext.store,
              items: [],
            });
          }

          groupedItems.get(storeId).items.push({
            cartItemId: item.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            shippingAmount: item.shippingAmount,
            title: item.title,
            variantLabel: item.variantLabel || "",
            variantSku: item.variantSku || "",
          });

          interactionSignals.push({
            action: "purchase_item",
            source: "cart-checkout",
            catalogItemId: item.productId,
            storeId: liveContext.store.id,
            storeHandle: liveContext.store.handle,
            templateKey: liveContext.store.templateKey,
            itemType: liveContext.product.itemType,
          });
        }

        const createdOrderIds = [];
        const purchasedCartItemIds = [];

        for (const group of groupedItems.values()) {
          const orderNumber = buildOrderNumber();
          const subtotalAmount = roundMoney(
            group.items.reduce((sum, item) => sum + roundMoney(item.unitPrice * item.quantity), 0)
          );
          const taxAmount = roundMoney(subtotalAmount * PGK_TAX_RATE);
          const shippingAmount = roundMoney(
            group.items.reduce((sum, item) => sum + roundMoney(item.shippingAmount), 0)
          );
          const discountResolution = await resolveApplicableDiscount(
            payload.couponCode,
            buildDiscountGroupPreview({
              store: group.store,
              items: group.items,
              subtotalAmount,
              taxAmount,
              shippingAmount,
            }),
            txOptions
          );
          const discountAmount = roundMoney(discountResolution && discountResolution.amountApplied);
          const totalAmount = roundMoney(
            Math.max(0, subtotalAmount + taxAmount + shippingAmount - discountAmount)
          );
          const paymentCharge = await provider.charge({
            amount: totalAmount,
            currency: "PGK",
            orderNumber,
          });

          for (const item of group.items) {
            await adjustInventoryForSale(
              {
                catalogItemId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                orderNumber,
              },
              txOptions
            );
          }

          const created = await createOrderRecord(
            {
              orderNumber,
              customerProfileId: buyerProfile.id,
              storeId: group.store.id,
              status: paymentCharge.status === "paid" ? "paid" : "pending",
              subtotalAmount,
              taxAmount,
              shippingAmount,
              totalAmount,
              paymentStatus: paymentCharge.status,
              paymentProvider: paymentCharge.provider,
              paymentReference: paymentCharge.transactionReference,
              customerName: payload.customerName,
              customerEmail: payload.customerEmail,
              customerPhone: payload.customerPhone,
              deliveryMethod: payload.deliveryMethod,
              deliveryAddress: payload.deliveryAddress,
              deliveryCity: payload.deliveryCity,
              deliveryNotes: payload.deliveryNotes,
              currency: paymentCharge.currency,
              items: group.items.map((item) => ({
                catalogItemId: item.productId,
                variantId: item.variantId || null,
                title: item.title,
                variantLabel: item.variantLabel,
                variantSku: item.variantSku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: roundMoney(item.unitPrice * item.quantity),
              })),
            },
            txOptions
          );

          await commitDiscountUsage(created.orderId, discountResolution, txOptions);
          createdOrderIds.push(created.orderId);
          purchasedCartItemIds.push(...group.items.map((item) => item.cartItemId));
        }

        await removeBuyerCartItems(user, purchasedCartItemIds, txOptions);

        return {
          buyerProfileId: buyerProfile.id,
          orderIds: createdOrderIds,
          signals: interactionSignals,
        };
      },
      { source: "postgres" }
    );

    const orders = await listBuyerOrdersByProfileId(buyerProfile.id);
    const createdOrders = orderResult.orderIds
      .map((orderId) => orders.find((order) => order.id === orderId))
      .filter(Boolean);

    await Promise.allSettled(createdOrders.map((order) => sendNewOrderEmails(order)));

    for (const signal of orderResult.signals || []) {
      await recordBuyerPreferenceSignal(user.id, signal, {
        source: "postgres",
      });
    }

    return {
      orders: createdOrders,
      orderCount: createdOrders.length,
    };
  }

  const orderResult = await transaction(
    async (txContext) => {
      const txOptions = {
        source: "postgres",
        transaction: txContext,
      };
      const context = await resolveCheckoutContext(payload, txOptions);
      const orderNumber = buildOrderNumber();
      const discountResolution = await resolveApplicableDiscount(
        payload.couponCode,
        buildDiscountGroupPreview({
          store: context.store,
          items: [
            {
              productId: context.product.id,
              variantId: context.selectedVariant ? context.selectedVariant.id : null,
              quantity: context.quantity,
              unitPrice: context.unitPrice,
              shippingAmount: context.shippingAmount,
              title: context.product.title || context.product.name,
              variantLabel: context.selectedVariant ? context.selectedVariant.label : "",
              variantSku: context.selectedVariant ? context.selectedVariant.sku : "",
            },
          ],
          subtotalAmount: context.subtotalAmount,
          taxAmount: context.taxAmount,
          shippingAmount: context.shippingAmount,
        }),
        txOptions
      );
      const discountAmount = roundMoney(discountResolution && discountResolution.amountApplied);
      const orderTotalAmount = roundMoney(Math.max(0, context.totalAmount - discountAmount));
      const paymentCharge = await provider.charge({
        amount: orderTotalAmount,
        currency: "PGK",
        orderNumber,
      });

      await adjustInventoryForSale(
        {
          catalogItemId: context.product.id,
          variantId: context.selectedVariant ? context.selectedVariant.id : null,
          quantity: context.quantity,
          orderNumber,
        },
        txOptions
      );

      const created = await createOrderRecord(
        {
          orderNumber,
          customerProfileId: buyerProfile.id,
          storeId: context.store.id,
          status: paymentCharge.status === "paid" ? "paid" : "pending",
          subtotalAmount: context.subtotalAmount,
          taxAmount: context.taxAmount,
          shippingAmount: context.shippingAmount,
          totalAmount: orderTotalAmount,
          paymentStatus: paymentCharge.status,
          paymentProvider: paymentCharge.provider,
          paymentReference: paymentCharge.transactionReference,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          deliveryMethod: payload.deliveryMethod,
          deliveryAddress: payload.deliveryAddress,
          deliveryCity: payload.deliveryCity,
          deliveryNotes: payload.deliveryNotes,
          currency: paymentCharge.currency,
          items: [
            {
              catalogItemId: context.product.id,
              variantId: context.selectedVariant ? context.selectedVariant.id : null,
              title: context.product.title || context.product.name,
              variantLabel: context.selectedVariant ? context.selectedVariant.label : "",
              variantSku: context.selectedVariant ? context.selectedVariant.sku : "",
              quantity: context.quantity,
              unitPrice: context.unitPrice,
              lineTotal: roundMoney(context.unitPrice * context.quantity),
            },
          ],
        },
        txOptions
      );
      await commitDiscountUsage(created.orderId, discountResolution, txOptions);

      return {
        buyerProfileId: buyerProfile.id,
        orderId: created.orderId,
        signal: {
          action: "purchase_item",
          source: "checkout-order",
          catalogItemId: context.product.id,
          storeId: context.store.id,
          storeHandle: context.store.handle,
          templateKey: context.store.templateKey,
          itemType: context.product.itemType,
        },
      };
    },
    { source: "postgres" }
  );

  const order = await findBuyerOrderByProfileId(buyerProfile.id, orderResult.orderId);
  await sendNewOrderEmails(order);
  if (orderResult.signal) {
    await recordBuyerPreferenceSignal(user.id, orderResult.signal, {
      source: "postgres",
    });
  }
  return order;
}

async function listBuyerOrdersForUser(user, options = {}) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer-only route");
  }

  const buyerProfile = await ensureBuyerProfileByUserId(user.id, options);
  if (!buyerProfile || !buyerProfile.id) {
    return {
      orders: [],
      metrics: {
        totalOrders: 0,
        activeOrders: 0,
        refundedOrders: 0,
      },
    };
  }

  const orders = await listBuyerOrdersByProfileId(buyerProfile.id, options);
  return {
    orders,
    metrics: {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => ["paid", "shipped"].includes(order.status)).length,
      refundedOrders: orders.filter((order) => order.status === "refunded").length,
    },
  };
}

async function getBuyerOrderForUser(user, orderId, options = {}) {
  if (!user || user.role !== "buyer") {
    throw createHttpError(403, "Buyer-only route");
  }

  const buyerProfile = await ensureBuyerProfileByUserId(user.id, options);
  if (!buyerProfile || !buyerProfile.id) {
    return null;
  }

  return findBuyerOrderByProfileId(buyerProfile.id, orderId, options);
}

async function buildSellerOrdersWorkspace(user, options = {}) {
  if (!user || user.role !== "seller") {
    throw createHttpError(403, "Seller-only route");
  }

  const store = await findStoreOwnerRecordByUserId(user.id, options);
  if (!store || !store.id) {
    return {
      store: null,
      metrics: {
        totalOrders: 0,
        pendingOrders: 0,
        paidOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
        grossRevenue: 0,
        refundedRevenue: 0,
        netRevenue: 0,
      },
      orders: [],
    };
  }

  const [metrics, orders] = await Promise.all([
    getSellerOrderMetricsByStoreId(store.id, options),
    listSellerOrdersByStoreId(store.id, options),
  ]);

  return {
    store,
    metrics,
    orders,
  };
}

async function getSellerOrderForUser(user, orderId, options = {}) {
  if (!user || user.role !== "seller") {
    throw createHttpError(403, "Seller-only route");
  }

  const store = await findStoreOwnerRecordByUserId(user.id, options);
  if (!store || !store.id) {
    return null;
  }

  return findSellerOrderByStoreId(store.id, orderId, options);
}

function assertStatusTransition(currentStatus, nextStatus) {
  const current = String(currentStatus || "pending").trim().toLowerCase();
  const next = String(nextStatus || "").trim().toLowerCase();
  const allowed = ORDER_STATUS_TRANSITIONS[current] || new Set();
  if (!allowed.has(next)) {
    throw createHttpError(409, `Cannot move an order from ${current} to ${next}`);
  }
}

async function updateSellerOrderLifecycle(user, orderId, body = {}) {
  if (!user || user.role !== "seller") {
    throw createHttpError(403, "Seller-only route");
  }

  const payload = body || {};
  const store = await findStoreOwnerRecordByUserId(user.id);
  if (!store || !store.id) {
    throw createHttpError(400, "Create your store before managing orders");
  }

  const existingOrder = await findSellerOrderByStoreId(store.id, orderId);
  if (!existingOrder) {
    return null;
  }

  assertStatusTransition(existingOrder.status, payload.status);

  await transaction(
    async (txContext) => {
      const txOptions = {
        source: "postgres",
        transaction: txContext,
      };

      if (payload.status === "refunded" && existingOrder.status !== "refunded") {
        await restoreInventoryForRefund(existingOrder.items || [], existingOrder.orderNumber, txOptions);
      }

      await updateOrderStatusByStoreId(
        store.id,
        orderId,
        {
          ...payload,
          paymentStatus: payload.status === "refunded" ? "refunded" : undefined,
        },
        txOptions
      );
    },
    { source: "postgres" }
  );

  const order = await findSellerOrderByStoreId(store.id, orderId);
  await sendOrderStatusEmail(order, payload.status);
  return order;
}

module.exports = {
  PAYMENT_PROVIDERS,
  buildCheckoutPreview,
  buildSellerOrdersWorkspace,
  createBuyerOrder,
  getBuyerOrderForUser,
  getSellerOrderForUser,
  listBuyerOrdersForUser,
  updateSellerOrderLifecycle,
};
