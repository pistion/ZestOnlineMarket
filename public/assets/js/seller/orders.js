(function () {
  const endpoint = document.body.dataset.sellerOrdersEndpoint || "/api/seller/orders";
  const statusPanel = document.getElementById("sellerOrdersStatusPanel");
  const statusText = document.getElementById("sellerOrdersStatusText");
  const ordersList = document.getElementById("sellerOrdersList");
  const totalMetric = document.getElementById("sellerOrdersTotalMetric");
  const paidMetric = document.getElementById("sellerOrdersPaidMetric");
  const shippedMetric = document.getElementById("sellerOrdersShippedMetric");
  const revenueMetric = document.getElementById("sellerOrdersRevenueMetric");

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

  function formatDate(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      throw new Error((payload && payload.message) || "Could not load seller orders");
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
    } seller-orders-status`;
    statusText.textContent = message;
  }

  async function patchOrder(orderId, payload) {
    await fetchJson(`/api/seller/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  function renderOrders(orders) {
    if (!ordersList) {
      return;
    }

    if (!orders.length) {
      ordersList.innerHTML = `
        <div class="ui-state ui-state--empty">
          <p class="ui-eyebrow">No orders yet</p>
          <h2 class="ui-state__title">Your fulfillment queue is empty</h2>
          <p class="ui-state__copy">Once buyers complete checkout, their orders will appear here for shipment and delivery tracking.</p>
        </div>
      `;
      return;
    }

    ordersList.innerHTML = orders
      .map((order) => `
        <article class="seller-order-card" data-order-id="${order.id}">
          <div class="seller-order-card__head">
            <div>
              <div class="seller-order-card__eyebrow">${escapeHtml(order.orderNumber || `Order #${order.id}`)}</div>
              <h2 class="seller-order-card__title">${escapeHtml(order.customer && order.customer.name ? order.customer.name : "Buyer")}</h2>
            </div>
            <div class="seller-order-status">${escapeHtml(order.status)}</div>
          </div>
          <div class="seller-order-card__body">
            <div class="seller-order-customer">
              <strong>${escapeHtml(order.customer && order.customer.email ? order.customer.email : "No email")}</strong>
              <span>${escapeHtml(order.deliveryAddress || "No delivery address captured")}</span>
              <span>${escapeHtml(order.deliveryCity || "Delivery city pending")}</span>
              <span>${escapeHtml(formatCurrency(order.totalAmount))} · ${escapeHtml(formatDate(order.placedAt || order.createdAt))}</span>
              <div class="seller-order-items">
                ${(Array.isArray(order.items) ? order.items : [])
                  .map(
                    (item) => `
                      <div class="seller-order-item">
                        <div>
                          <strong>${escapeHtml(item.title)}</strong>
                          <div class="seller-order-item__meta">${escapeHtml(item.variantLabel || "Standard")} · Qty ${escapeHtml(item.quantity)}</div>
                        </div>
                        <strong>${escapeHtml(formatCurrency(item.lineTotal))}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </div>
            <div class="seller-order-actions">
              <div class="seller-order-actions__group">
                <input class="seller-order-input" data-tracking-input="${order.id}" type="text" placeholder="Tracking number" value="${escapeHtml(order.shipment && order.shipment.trackingNumber ? order.shipment.trackingNumber : "")}">
                <input class="seller-order-input" data-carrier-input="${order.id}" type="text" placeholder="Carrier" value="${escapeHtml(order.shipment && order.shipment.carrier ? order.shipment.carrier : "")}">
              </div>
              <div class="seller-order-actions__grid">
                ${order.status === "paid" ? `<button class="btn btn-primary btn-inline" data-status-action="shipped" data-order-id="${order.id}">Mark shipped</button>` : ""}
                ${order.status === "shipped" ? `<button class="btn btn-primary btn-inline" data-status-action="delivered" data-order-id="${order.id}">Mark delivered</button>` : ""}
                ${["paid", "shipped", "delivered"].includes(order.status) ? `<button class="btn btn-secondary btn-inline" data-status-action="refunded" data-order-id="${order.id}">Refund order</button>` : ""}
              </div>
            </div>
          </div>
          <div class="seller-order-card__footer">
            <span>${escapeHtml(order.payment && order.payment.provider ? order.payment.provider : "Payment pending")}</span>
            <span>${escapeHtml(order.shipment && order.shipment.trackingNumber ? order.shipment.trackingNumber : "No tracking assigned")}</span>
          </div>
        </article>
      `)
      .join("");
  }

  async function loadOrders(message) {
    if (!message) {
      setStatus("loading", "Loading seller orders.");
    }

    const payload = await fetchJson(endpoint);
    const metrics = payload.metrics || {};
    const orders = Array.isArray(payload.orders) ? payload.orders : [];

    if (totalMetric) {
      totalMetric.textContent = String(metrics.totalOrders || orders.length || 0);
    }
    if (paidMetric) {
      paidMetric.textContent = String(metrics.paidOrders || 0);
    }
    if (shippedMetric) {
      shippedMetric.textContent = String(metrics.shippedOrders || 0);
    }
    if (revenueMetric) {
      revenueMetric.textContent = formatCurrency(metrics.netRevenue || 0);
    }

    renderOrders(orders);
    setStatus("success", message || (orders.length ? "Seller orders are up to date." : "No orders yet."));
  }

  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-status-action]");
    if (!action) {
      return;
    }

    const orderId = Number(action.dataset.orderId || 0);
    const status = String(action.dataset.statusAction || "").trim();
    if (!orderId || !status) {
      return;
    }

    const trackingInput = document.querySelector(`[data-tracking-input="${orderId}"]`);
    const carrierInput = document.querySelector(`[data-carrier-input="${orderId}"]`);

    try {
      setStatus("loading", "Updating order status.");
      await patchOrder(orderId, {
        status,
        trackingNumber: trackingInput ? trackingInput.value : "",
        carrier: carrierInput ? carrierInput.value : "",
        refundReason: status === "refunded" ? "Seller-initiated refund" : "",
      });
      await loadOrders(`Order ${status} successfully.`);
    } catch (error) {
      setStatus("error", error.message || "Could not update that order.");
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadOrders().catch((error) => {
      setStatus("error", error.message || "Could not load seller orders.");
    });
  });
})();
