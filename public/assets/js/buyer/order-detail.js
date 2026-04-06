(function () {
  const orderId = Number(document.body.dataset.buyerOrderId || 0);
  const endpoint = `/api/buyer/orders/${orderId}`;
  const titleEl = document.getElementById("buyerOrderTitle");
  const copyEl = document.getElementById("buyerOrderCopy");
  const statusPanel = document.getElementById("buyerOrderStatusPanel");
  const statusText = document.getElementById("buyerOrderStatusText");
  const storeLink = document.getElementById("buyerOrderStoreLink");
  const summaryGrid = document.getElementById("buyerOrderSummaryGrid");
  const timelineEl = document.getElementById("buyerOrderTimeline");
  const itemsList = document.getElementById("buyerOrderItemsList");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(value, fallback = "Pending") {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  async function fetchJson(path) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      throw new Error((payload && payload.message) || "Could not load order");
    }

    return payload;
  }

  function setStatus(mode, message) {
    if (!statusPanel || !statusText) {
      return;
    }

    statusPanel.hidden = false;
    statusPanel.className = `ui-state ${
      mode === "error" ? "ui-state--error" : mode === "success" ? "ui-state--success" : "ui-state--empty"
    } order-detail-status`;
    statusText.textContent = message;
  }

  function renderOrder(order) {
    if (!order) {
      throw new Error("Order not found");
    }

    if (titleEl) {
      titleEl.textContent = order.orderNumber || `Order #${order.id}`;
    }
    if (copyEl) {
      copyEl.textContent = `Placed with ${order.store && order.store.storeName ? order.store.storeName : "a marketplace seller"} on ${formatDate(order.placedAt || order.createdAt, "Recently")}.`;
    }
    if (storeLink) {
      storeLink.href = order.store && order.store.storePath ? order.store.storePath : "/marketplace";
    }

    if (summaryGrid) {
      summaryGrid.innerHTML = `
        <div class="order-summary-row"><span>Status</span><strong>${escapeHtml(order.status)}</strong></div>
        <div class="order-summary-row"><span>Payment</span><strong>${escapeHtml(order.payment && order.payment.provider ? order.payment.provider : "Payment")}</strong></div>
        <div class="order-summary-row"><span>Total</span><strong>${escapeHtml(formatCurrency(order.totalAmount))}</strong></div>
        <div class="order-summary-row"><span>Ship to</span><strong>${escapeHtml(order.deliveryCity || "Delivery pending")}</strong></div>
        <div class="order-summary-row"><span>Address</span><strong>${escapeHtml(order.deliveryAddress || "Address pending")}</strong></div>
        <div class="order-summary-row"><span>Tracking</span><strong>${escapeHtml(order.shipment && order.shipment.trackingNumber ? order.shipment.trackingNumber : "Not assigned")}</strong></div>
      `;
    }

    if (timelineEl) {
      const timeline = Array.isArray(order.timeline) ? order.timeline : [];
      timelineEl.innerHTML = timeline.length
        ? timeline
            .map(
              (item) => `
                <div class="order-timeline-item">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(formatDate(item.time, "Pending"))}</strong>
                </div>
              `
            )
            .join("")
        : `<div class="order-timeline-item"><span>Order placed</span><strong>${escapeHtml(formatDate(order.createdAt, "Recently"))}</strong></div>`;
    }

    if (itemsList) {
      const items = Array.isArray(order.items) ? order.items : [];
      itemsList.innerHTML = items
        .map(
          (item) => `
            <div class="order-item-detail">
              <div class="order-item-detail__image"${
                item.imageUrl ? ` style="background-image:url('${String(item.imageUrl).replace(/'/g, "\\'")}');"` : ""
              }></div>
              <div class="order-item-detail__content">
                <div class="order-item-detail__title">${escapeHtml(item.title)}</div>
                <div class="order-item-detail__meta">${escapeHtml(item.variantLabel || "Standard")} · Qty ${escapeHtml(item.quantity)} · ${escapeHtml(formatCurrency(item.lineTotal))}</div>
              </div>
              ${
                item.productPath
                  ? `<a class="btn btn-secondary btn-inline" href="${escapeHtml(item.productPath)}">Open listing</a>`
                  : ""
              }
            </div>
          `
        )
        .join("");
    }
  }

  async function init() {
    if (!orderId) {
      setStatus("error", "This order reference is invalid.");
      return;
    }

    setStatus("loading", "Loading this order.");

    try {
      const payload = await fetchJson(endpoint);
      renderOrder(payload.order);
      setStatus("success", "Order loaded.");
    } catch (error) {
      setStatus("error", error.message || "Could not load this order.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
