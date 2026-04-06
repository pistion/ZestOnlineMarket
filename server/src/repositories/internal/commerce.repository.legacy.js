const { createHttpError } = require("../../utils/api-response");
const { getPostgresExecutor } = require("../repository-source");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapOrderItem(row) {
  const productId = toNumber(row.catalog_item_id || row.product_id || row.productId, 0);
  const variantId = toNumber(row.variant_id || row.variantId, 0);
  const imageUrl = String(row.media_url || row.thumbnail || "").trim();

  return {
    id: toNumber(row.order_item_id || row.id, 0),
    productId: productId || null,
    variantId: variantId || null,
    title: String(row.title_snapshot || row.title || "Order item").trim(),
    variantLabel: String(row.variant_label_snapshot || "").trim(),
    variantSku: String(row.variant_sku_snapshot || "").trim(),
    quantity: toNumber(row.quantity, 0),
    unitPrice: toMoney(row.unit_price_snapshot),
    lineTotal: toMoney(row.line_total_amount),
    imageUrl,
    productPath: productId ? `/products/${productId}` : "",
  };
}

function buildOrderTimeline(order) {
  const timeline = [
    {
      key: "placed",
      label: "Order placed",
      time: order.placedAt || order.createdAt || null,
      active: true,
    },
  ];

  if (order.paymentStatus === "paid" || ["paid", "shipped", "delivered", "refunded"].includes(order.status)) {
    timeline.push({
      key: "paid",
      label: "Payment confirmed",
      time: order.payment && order.payment.createdAt ? order.payment.createdAt : order.createdAt,
      active: true,
    });
  }

  if (order.shipment && order.shipment.shippedAt) {
    timeline.push({
      key: "shipped",
      label: "Order shipped",
      time: order.shipment.shippedAt,
      active: true,
    });
  }

  if (order.shipment && order.shipment.deliveredAt) {
    timeline.push({
      key: "delivered",
      label: "Delivered",
      time: order.shipment.deliveredAt,
      active: true,
    });
  }

  if (order.status === "refunded") {
    timeline.push({
      key: "refunded",
      label: "Refunded",
      time:
        (order.refund && order.refund.createdAt) ||
        (order.payment && order.payment.updatedAt) ||
        order.updatedAt ||
        null,
      active: true,
    });
  }

  return timeline;
}

function mapOrderEnvelope(base) {
  if (!base) {
    return null;
  }

  const itemCount = Array.isArray(base.items) ? base.items.length : 0;
  const firstItem = itemCount ? base.items[0] : null;

  return {
    ...base,
    itemCount,
    primaryItem: firstItem,
    timeline: buildOrderTimeline(base),
  };
}

function groupOrders(rows = []) {
  const orderMap = new Map();

  rows.forEach((row) => {
    const orderId = toNumber(row.order_id || row.id, 0);
    if (!orderId) {
      return;
    }

    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        id: orderId,
        orderNumber: String(row.order_number || `ORD-${orderId}`).trim(),
        status: String(row.status || "pending").trim(),
        paymentStatus: String(row.payment_status || "pending").trim(),
        currency: String(row.currency || "PGK").trim(),
        subtotalAmount: toMoney(row.subtotal_amount),
        taxAmount: toMoney(row.tax_amount),
        shippingAmount: toMoney(row.shipping_amount),
        totalAmount: toMoney(row.total_amount),
        refundAmount: toMoney(row.refund_amount),
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        placedAt: row.placed_at || row.created_at || null,
        deliveryMethod: String(row.delivery_method || "").trim(),
        deliveryAddress: String(row.delivery_address || "").trim(),
        deliveryCity: String(row.delivery_city || "").trim(),
        deliveryNotes: String(row.delivery_notes || "").trim(),
        customer: {
          profileId: toNumber(row.customer_profile_id, 0) || null,
          name: String(row.customer_name || row.profile_full_name || row.user_email || "Buyer").trim(),
          email: String(row.customer_email || row.user_email || "").trim(),
          phone: String(row.customer_phone || row.profile_phone || "").trim(),
        },
        store: {
          id: toNumber(row.store_id, 0) || null,
          handle: String(row.handle || "").trim(),
          storeName: String(row.store_name || "").trim(),
          storePath: row.handle ? `/stores/${encodeURIComponent(String(row.handle).trim())}` : "",
        },
        payment: row.order_payment_id
          ? {
              id: toNumber(row.order_payment_id, 0),
              provider: String(row.payment_provider || row.provider || "").trim(),
              status: String(row.order_payment_status || row.payment_status || "pending").trim(),
              transactionReference: String(row.transaction_reference || row.payment_reference || "").trim(),
              amount: toMoney(row.payment_amount || row.total_amount),
              currency: String(row.payment_currency || row.currency || "PGK").trim(),
              createdAt: row.payment_created_at || null,
              updatedAt: row.payment_updated_at || null,
            }
          : null,
        shipment: row.order_shipment_id
          ? {
              id: toNumber(row.order_shipment_id, 0),
              trackingNumber: String(row.tracking_number || "").trim(),
              carrier: String(row.carrier || "").trim(),
              shippedAt: row.shipped_at || null,
              deliveredAt: row.delivered_at || null,
              deliveryEstimate: row.delivery_estimate || null,
            }
          : null,
        refund: row.refund_id
          ? {
              id: toNumber(row.refund_id, 0),
              amount: toMoney(row.refund_amount_row),
              reason: String(row.refund_reason || "").trim(),
              status: String(row.refund_status || "").trim(),
              createdAt: row.refund_created_at || null,
            }
          : null,
        items: [],
      });
    }

    const order = orderMap.get(orderId);
    const itemId = toNumber(row.order_item_id, 0);
    if (itemId && !order.items.some((item) => item.id === itemId)) {
      order.items.push(mapOrderItem(row));
    }
  });

  return [...orderMap.values()].map(mapOrderEnvelope);
}

async function findStoreOwnerRecordByUserId(userId, options = {}) {
  const knex = getPostgresExecutor(options);
  const row = await knex("stores")
    .select("id", "handle", "store_name")
    .where({ owner_user_id: userId })
    .first();

  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0),
    handle: String(row.handle || "").trim(),
    storeName: String(row.store_name || "").trim(),
  };
}

async function lockBaseInventoryItem(catalogItemId, options = {}) {
  const knex = getPostgresExecutor(options);
  return knex("inventory_items")
    .where({ catalog_item_id: catalogItemId })
    .whereNull("variant_id")
    .forUpdate()
    .first();
}

async function lockVariantInventoryItem(catalogItemId, variantId, options = {}) {
  const knex = getPostgresExecutor(options);
  return knex("inventory_items")
    .where({
      catalog_item_id: catalogItemId,
      variant_id: variantId,
    })
    .forUpdate()
    .first();
}

async function adjustBaseInventorySnapshot(catalogItemId, totalOnHand, metadata, options = {}) {
  const knex = getPostgresExecutor(options);
  const baseInventory = await lockBaseInventoryItem(catalogItemId, options);

  if (baseInventory && baseInventory.id) {
    await knex("inventory_items")
      .where({ id: baseInventory.id })
      .update({
        total_on_hand: totalOnHand,
        updated_at: knex.fn.now(),
      });

    if (metadata && metadata.logBaseChange) {
      await knex("inventory_logs").insert({
        inventory_item_id: baseInventory.id,
        adjustment_type: metadata.adjustmentType || "manual",
        quantity_change: metadata.quantityChange || 0,
        metadata: metadata.payload || {},
      });
    }

    return baseInventory.id;
  }

  const insertedRows = await knex("inventory_items")
    .insert({
      catalog_item_id: catalogItemId,
      variant_id: null,
      total_on_hand: totalOnHand,
    })
    .returning(["id"]);

  return insertedRows[0] ? toNumber(insertedRows[0].id, 0) : 0;
}

async function adjustInventoryForSale({ catalogItemId, variantId, quantity, orderNumber }, options = {}) {
  const knex = getPostgresExecutor(options);
  const normalizedQuantity = toNumber(quantity, 0);
  if (normalizedQuantity <= 0) {
    throw createHttpError(400, "Order quantity must be greater than zero");
  }

  if (variantId) {
    const variantInventory = await lockVariantInventoryItem(catalogItemId, variantId, options);
    if (!variantInventory) {
      throw createHttpError(409, "This product option is no longer available");
    }

    const currentVariantStock = toNumber(variantInventory.total_on_hand, 0);
    if (currentVariantStock < normalizedQuantity) {
      throw createHttpError(409, "Not enough stock is available for the selected option");
    }

    const nextVariantStock = currentVariantStock - normalizedQuantity;
    await knex("inventory_items")
      .where({ id: variantInventory.id })
      .update({
        total_on_hand: nextVariantStock,
        updated_at: knex.fn.now(),
      });

    await knex("product_variants")
      .where({ id: variantId })
      .update({
        stock_quantity: nextVariantStock,
        updated_at: knex.fn.now(),
      });

    await knex("inventory_logs").insert({
      inventory_item_id: variantInventory.id,
      adjustment_type: "sale",
      quantity_change: normalizedQuantity * -1,
      metadata: {
        scope: "commerce_order",
        orderNumber,
      },
    });

    const remainingVariantRows = await knex("product_variants")
      .select("stock_quantity")
      .where({ catalog_item_id: catalogItemId });
    const baseTotal = remainingVariantRows.reduce(
      (total, row) => total + toNumber(row.stock_quantity, 0),
      0
    );
    await adjustBaseInventorySnapshot(catalogItemId, baseTotal, null, options);
    return baseTotal;
  }

  const baseInventory = await lockBaseInventoryItem(catalogItemId, options);
  if (!baseInventory) {
    throw createHttpError(409, "This item is currently unavailable");
  }

  const currentStock = toNumber(baseInventory.total_on_hand, 0);
  if (currentStock < normalizedQuantity) {
    throw createHttpError(409, "Not enough stock is available");
  }

  const nextStock = currentStock - normalizedQuantity;
  await knex("inventory_items")
    .where({ id: baseInventory.id })
    .update({
      total_on_hand: nextStock,
      updated_at: knex.fn.now(),
    });

  await knex("inventory_logs").insert({
    inventory_item_id: baseInventory.id,
    adjustment_type: "sale",
    quantity_change: normalizedQuantity * -1,
    metadata: {
      scope: "commerce_order",
      orderNumber,
    },
  });

  return nextStock;
}

async function restoreInventoryForRefund(items = [], orderNumber, options = {}) {
  const knex = getPostgresExecutor(options);

  for (const item of items) {
    const catalogItemId = toNumber(item.productId || item.catalogItemId, 0);
    const variantId = toNumber(item.variantId, 0);
    const quantity = toNumber(item.quantity, 0);

    if (!catalogItemId || quantity <= 0) {
      continue;
    }

    if (variantId) {
      const variantInventory = await lockVariantInventoryItem(catalogItemId, variantId, options);
      if (!variantInventory) {
        continue;
      }

      const nextVariantStock = toNumber(variantInventory.total_on_hand, 0) + quantity;
      await knex("inventory_items")
        .where({ id: variantInventory.id })
        .update({
          total_on_hand: nextVariantStock,
          updated_at: knex.fn.now(),
        });

      await knex("product_variants")
        .where({ id: variantId })
        .update({
          stock_quantity: nextVariantStock,
          updated_at: knex.fn.now(),
        });

      await knex("inventory_logs").insert({
        inventory_item_id: variantInventory.id,
        adjustment_type: "refund",
        quantity_change: quantity,
        metadata: {
          scope: "commerce_refund",
          orderNumber,
        },
      });

      const remainingVariantRows = await knex("product_variants")
        .select("stock_quantity")
        .where({ catalog_item_id: catalogItemId });
      const baseTotal = remainingVariantRows.reduce(
        (total, row) => total + toNumber(row.stock_quantity, 0),
        0
      );
      await adjustBaseInventorySnapshot(catalogItemId, baseTotal, null, options);
      continue;
    }

    const baseInventory = await lockBaseInventoryItem(catalogItemId, options);
    if (!baseInventory) {
      continue;
    }

    const nextStock = toNumber(baseInventory.total_on_hand, 0) + quantity;
    await knex("inventory_items")
      .where({ id: baseInventory.id })
      .update({
        total_on_hand: nextStock,
        updated_at: knex.fn.now(),
      });

    await knex("inventory_logs").insert({
      inventory_item_id: baseInventory.id,
      adjustment_type: "refund",
      quantity_change: quantity,
      metadata: {
        scope: "commerce_refund",
        orderNumber,
      },
    });
  }
}

async function createOrderRecord(payload, options = {}) {
  const knex = getPostgresExecutor(options);
  const [orderRow] = await knex("orders")
    .insert({
      order_number: payload.orderNumber,
      customer_profile_id: payload.customerProfileId,
      store_id: payload.storeId,
      status: payload.status,
      total_amount: payload.totalAmount,
      currency: payload.currency || "PGK",
      subtotal_amount: payload.subtotalAmount,
      tax_amount: payload.taxAmount,
      shipping_amount: payload.shippingAmount,
      refund_amount: payload.refundAmount || 0,
      payment_status: payload.paymentStatus,
      payment_provider: payload.paymentProvider,
      payment_reference: payload.paymentReference || null,
      customer_name: payload.customerName,
      customer_email: payload.customerEmail,
      customer_phone: payload.customerPhone,
      delivery_method: payload.deliveryMethod,
      delivery_address: payload.deliveryAddress,
      delivery_city: payload.deliveryCity,
      delivery_notes: payload.deliveryNotes,
      placed_at: payload.placedAt || knex.fn.now(),
    })
    .returning(["id"]);

  const orderId = orderRow ? toNumber(orderRow.id, 0) : 0;
  if (!orderId) {
    throw createHttpError(500, "Could not create the order");
  }

  await knex("order_items").insert(
    payload.items.map((item) => ({
      order_id: orderId,
      catalog_item_id: item.catalogItemId,
      variant_id: item.variantId || null,
      quantity: item.quantity,
      unit_price_snapshot: item.unitPrice,
      title_snapshot: item.title,
      variant_label_snapshot: item.variantLabel || null,
      variant_sku_snapshot: item.variantSku || null,
      line_total_amount: item.lineTotal,
    }))
  );

  const [paymentRow] = await knex("order_payments")
    .insert({
      order_id: orderId,
      provider: payload.paymentProvider,
      transaction_reference: payload.paymentReference || null,
      amount: payload.totalAmount,
      currency: payload.currency || "PGK",
      status: payload.paymentStatus,
    })
    .returning(["id"]);

  if (payload.status === "shipped" || payload.shipment) {
    await knex("order_shipments").insert({
      order_id: orderId,
      tracking_number: payload.shipment && payload.shipment.trackingNumber ? payload.shipment.trackingNumber : null,
      carrier: payload.shipment && payload.shipment.carrier ? payload.shipment.carrier : null,
      shipped_at: payload.shipment && payload.shipment.shippedAt ? payload.shipment.shippedAt : null,
      delivery_estimate:
        payload.shipment && payload.shipment.deliveryEstimate ? payload.shipment.deliveryEstimate : null,
      delivered_at:
        payload.shipment && payload.shipment.deliveredAt ? payload.shipment.deliveredAt : null,
    });
  }

  await knex("sales_transactions").insert({
    order_id: orderId,
    store_id: payload.storeId,
    gross_amount: payload.totalAmount,
  });

  return {
    orderId,
    orderPaymentId: paymentRow ? toNumber(paymentRow.id, 0) : 0,
  };
}

async function listBuyerOrdersByProfileId(customerProfileId, options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("orders as o")
    .leftJoin("customer_profiles as cp", "cp.id", "o.customer_profile_id")
    .leftJoin("users as u", "u.id", "cp.user_id")
    .leftJoin("stores as s", "s.id", "o.store_id")
    .leftJoin("order_items as oi", "oi.order_id", "o.id")
    .leftJoin("catalog_items as ci", "ci.id", "oi.catalog_item_id")
    .leftJoin("catalog_media as cm", function joinMedia() {
      this.on("cm.catalog_item_id", "=", "ci.id").andOn("cm.is_cover", "=", knex.raw("true"));
    })
    .leftJoin("order_payments as op", "op.order_id", "o.id")
    .leftJoin("order_shipments as os", "os.order_id", "o.id")
    .leftJoin("refunds as r", "r.order_payment_id", "op.id")
    .select(
      "o.id as order_id",
      "o.order_number",
      "o.customer_profile_id",
      "o.store_id",
      "o.status",
      "o.total_amount",
      "o.subtotal_amount",
      "o.tax_amount",
      "o.shipping_amount",
      "o.refund_amount",
      "o.currency",
      "o.payment_status",
      "o.payment_provider",
      "o.payment_reference",
      "o.customer_name",
      "o.customer_email",
      "o.customer_phone",
      "o.delivery_method",
      "o.delivery_address",
      "o.delivery_city",
      "o.delivery_notes",
      "o.created_at",
      "o.updated_at",
      "o.placed_at",
      "cp.full_name as profile_full_name",
      "cp.phone as profile_phone",
      "u.email as user_email",
      "s.handle",
      "s.store_name",
      "oi.id as order_item_id",
      "oi.catalog_item_id",
      "oi.variant_id",
      "oi.quantity",
      "oi.unit_price_snapshot",
      "oi.title_snapshot",
      "oi.variant_label_snapshot",
      "oi.variant_sku_snapshot",
      "oi.line_total_amount",
      "ci.title",
      "cm.media_url",
      "op.id as order_payment_id",
      "op.provider",
      "op.status as order_payment_status",
      "op.transaction_reference",
      "op.amount as payment_amount",
      "op.currency as payment_currency",
      "op.created_at as payment_created_at",
      "op.updated_at as payment_updated_at",
      "os.id as order_shipment_id",
      "os.tracking_number",
      "os.carrier",
      "os.shipped_at",
      "os.delivered_at",
      "os.delivery_estimate",
      "r.id as refund_id",
      "r.refund_amount as refund_amount_row",
      "r.reason as refund_reason",
      "r.status as refund_status",
      "r.created_at as refund_created_at"
    )
    .where("o.customer_profile_id", customerProfileId)
    .orderBy("o.created_at", "desc")
    .orderBy("o.id", "desc");

  return groupOrders(rows);
}

async function findBuyerOrderByProfileId(customerProfileId, orderId, options = {}) {
  const orders = await listBuyerOrdersByProfileId(customerProfileId, options);
  return orders.find((order) => order.id === toNumber(orderId, 0)) || null;
}

async function listSellerOrdersByStoreId(storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("orders as o")
    .leftJoin("customer_profiles as cp", "cp.id", "o.customer_profile_id")
    .leftJoin("users as u", "u.id", "cp.user_id")
    .leftJoin("stores as s", "s.id", "o.store_id")
    .leftJoin("order_items as oi", "oi.order_id", "o.id")
    .leftJoin("catalog_items as ci", "ci.id", "oi.catalog_item_id")
    .leftJoin("catalog_media as cm", function joinMedia() {
      this.on("cm.catalog_item_id", "=", "ci.id").andOn("cm.is_cover", "=", knex.raw("true"));
    })
    .leftJoin("order_payments as op", "op.order_id", "o.id")
    .leftJoin("order_shipments as os", "os.order_id", "o.id")
    .leftJoin("refunds as r", "r.order_payment_id", "op.id")
    .select(
      "o.id as order_id",
      "o.order_number",
      "o.customer_profile_id",
      "o.store_id",
      "o.status",
      "o.total_amount",
      "o.subtotal_amount",
      "o.tax_amount",
      "o.shipping_amount",
      "o.refund_amount",
      "o.currency",
      "o.payment_status",
      "o.payment_provider",
      "o.payment_reference",
      "o.customer_name",
      "o.customer_email",
      "o.customer_phone",
      "o.delivery_method",
      "o.delivery_address",
      "o.delivery_city",
      "o.delivery_notes",
      "o.created_at",
      "o.updated_at",
      "o.placed_at",
      "cp.full_name as profile_full_name",
      "cp.phone as profile_phone",
      "u.email as user_email",
      "s.handle",
      "s.store_name",
      "oi.id as order_item_id",
      "oi.catalog_item_id",
      "oi.variant_id",
      "oi.quantity",
      "oi.unit_price_snapshot",
      "oi.title_snapshot",
      "oi.variant_label_snapshot",
      "oi.variant_sku_snapshot",
      "oi.line_total_amount",
      "ci.title",
      "cm.media_url",
      "op.id as order_payment_id",
      "op.provider",
      "op.status as order_payment_status",
      "op.transaction_reference",
      "op.amount as payment_amount",
      "op.currency as payment_currency",
      "op.created_at as payment_created_at",
      "op.updated_at as payment_updated_at",
      "os.id as order_shipment_id",
      "os.tracking_number",
      "os.carrier",
      "os.shipped_at",
      "os.delivered_at",
      "os.delivery_estimate",
      "r.id as refund_id",
      "r.refund_amount as refund_amount_row",
      "r.reason as refund_reason",
      "r.status as refund_status",
      "r.created_at as refund_created_at"
    )
    .where("o.store_id", storeId)
    .orderBy("o.created_at", "desc")
    .orderBy("o.id", "desc");

  return groupOrders(rows);
}

async function findSellerOrderByStoreId(storeId, orderId, options = {}) {
  const orders = await listSellerOrdersByStoreId(storeId, options);
  return orders.find((order) => order.id === toNumber(orderId, 0)) || null;
}

async function updateOrderStatusByStoreId(storeId, orderId, payload, options = {}) {
  const knex = getPostgresExecutor(options);
  const targetOrderId = toNumber(orderId, 0);
  if (!targetOrderId || !storeId) {
    return null;
  }

  const existing = await knex("orders")
    .select("id", "status", "total_amount", "refund_amount")
    .where({
      id: targetOrderId,
      store_id: storeId,
    })
    .forUpdate()
    .first();

  if (!existing) {
    return null;
  }

  const updates = {
    status: payload.status,
    updated_at: knex.fn.now(),
  };

  if (payload.status === "refunded") {
    updates.payment_status = "refunded";
    updates.refund_amount = existing.total_amount;
  }

  await knex("orders")
    .where({ id: targetOrderId, store_id: storeId })
    .update(updates);

  if (payload.paymentStatus) {
    await knex("order_payments")
      .where({ order_id: targetOrderId })
      .update({
        status: payload.paymentStatus,
        updated_at: knex.fn.now(),
      });
  }

  if (payload.status === "shipped" || payload.status === "delivered") {
    const existingShipment = await knex("order_shipments")
      .select("id")
      .where({ order_id: targetOrderId })
      .first();

    const shipmentUpdate = {
      tracking_number: payload.trackingNumber || null,
      carrier: payload.carrier || null,
      delivery_estimate: payload.deliveryEstimate || null,
      updated_at: knex.fn.now(),
    };

    if (payload.status === "shipped") {
      shipmentUpdate.shipped_at = payload.shippedAt || knex.fn.now();
      shipmentUpdate.delivered_at = null;
    }

    if (payload.status === "delivered") {
      shipmentUpdate.delivered_at = payload.deliveredAt || knex.fn.now();
      if (!payload.shippedAt) {
        shipmentUpdate.shipped_at = knex.fn.now();
      }
    }

    if (existingShipment && existingShipment.id) {
      await knex("order_shipments")
        .where({ order_id: targetOrderId })
        .update(shipmentUpdate);
    } else {
      await knex("order_shipments").insert({
        order_id: targetOrderId,
        tracking_number: payload.trackingNumber || null,
        carrier: payload.carrier || null,
        shipped_at: payload.status === "shipped" ? payload.shippedAt || knex.fn.now() : payload.shippedAt || null,
        delivered_at: payload.status === "delivered" ? payload.deliveredAt || knex.fn.now() : null,
        delivery_estimate: payload.deliveryEstimate || null,
      });
    }
  }

  if (payload.status === "refunded") {
    const payment = await knex("order_payments")
      .select("id")
      .where({ order_id: targetOrderId })
      .first();

    if (payment && payment.id) {
      const existingRefund = await knex("refunds")
        .select("id")
        .where({ order_payment_id: payment.id })
        .first();

      if (existingRefund && existingRefund.id) {
        await knex("refunds")
          .where({ id: existingRefund.id })
          .update({
            refund_amount: existing.total_amount,
            reason: payload.refundReason || "Seller refund",
            status: "completed",
            updated_at: knex.fn.now(),
          });
      } else {
        await knex("refunds").insert({
          order_payment_id: payment.id,
          refund_amount: existing.total_amount,
          reason: payload.refundReason || "Seller refund",
          status: "completed",
        });
      }
    }
  }

  return true;
}

async function getSellerOrderMetricsByStoreId(storeId, options = {}) {
  const knex = getPostgresExecutor(options);
  const result = await knex.raw(
    `
      select
        count(*)::int as total_orders,
        count(*) filter (where o.status = 'pending')::int as pending_orders,
        count(*) filter (where o.status = 'paid')::int as paid_orders,
        count(*) filter (where o.status = 'shipped')::int as shipped_orders,
        count(*) filter (where o.status = 'delivered')::int as delivered_orders,
        count(*) filter (where o.status = 'refunded')::int as refunded_orders,
        coalesce(sum(case when o.status in ('paid', 'shipped', 'delivered', 'refunded') then o.total_amount else 0 end), 0) as gross_revenue,
        coalesce(sum(case when o.status = 'refunded' then o.refund_amount else 0 end), 0) as refunded_revenue
      from orders o
      where o.store_id = ?
    `,
    [storeId]
  );

  const row = result.rows[0] || {};
  const grossRevenue = toMoney(row.gross_revenue);
  const refundedRevenue = toMoney(row.refunded_revenue);

  return {
    totalOrders: toNumber(row.total_orders, 0),
    pendingOrders: toNumber(row.pending_orders, 0),
    paidOrders: toNumber(row.paid_orders, 0),
    shippedOrders: toNumber(row.shipped_orders, 0),
    deliveredOrders: toNumber(row.delivered_orders, 0),
    refundedOrders: toNumber(row.refunded_orders, 0),
    grossRevenue,
    refundedRevenue,
    netRevenue: grossRevenue - refundedRevenue,
  };
}

module.exports = {
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
};
