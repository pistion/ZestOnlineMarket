(function () {
  const endpoint = document.body.dataset.buyerOrdersEndpoint || "/api/buyer/orders";
  const statusPanel = document.getElementById("buyerOrdersStatusPanel");
  const statusText = document.getElementById("buyerOrdersStatusText");
  const ordersList = document.getElementById("buyerOrdersList");
  const totalMetric = document.getElementById("buyerOrdersTotalMetric");
  const activeMetric = document.getElementById("buyerOrdersActiveMetric");
  const refundedMetric = document.getElementById("buyerOrdersRefundedMetric");
  const cartMetric = document.getElementById("buyerOrdersCartMetric");

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
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function readCartCount() {
    if (!window.ZestCart || typeof window.ZestCart.cartCount !== "function") {
      return 0;
    }

    return window.ZestCart.cartCount();
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
      throw new Error((payload && payload.message) || "Could not load orders");
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
    } orders-status-panel`;
    statusText.textContent = message;
  }

  function renderEmpty() {
    ordersList.innerHTML = `
      <div class="ui-state ui-state--empty">
        <p class="ui-eyebrow">No orders yet</p>
        <h2 class="ui-state__title">Your order history will appear here</h2>
        <p class="ui-state__copy">Browse the marketplace, open a listing, and complete checkout to create your first order.</p>
      </div>
    `;
  }

  function renderOrders(orders) {
    if (!ordersList) {
      return;
    }

    if (!orders.length) {
      renderEmpty();
      return;
    }

    ordersList.innerHTML = orders
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items.slice(0, 2) : [];
        const moreCount = Math.max((order.itemCount || 0) - items.length, 0);

        return `
          <article class="buyer-order-card" data-href="/buyer/purchases/${order.id}">
            <div class="buyer-order-card__head">
              <div>
                <div class="buyer-order-card__eyebrow">${escapeHtml(order.orderNumber || `Order #${order.id}`)}</div>
                <h2 class="buyer-order-card__title">${escapeHtml(order.store && order.store.storeName ? order.store.storeName : "Marketplace seller")}</h2>
              </div>
              <div class="buyer-order-card__status">${escapeHtml(order.status || "pending")}</div>
            </div>
            <div class="buyer-order-card__body">
              <div class="buyer-order-items-preview">
                ${items
                  .map(
                    (item) => `
                      <div class="buyer-order-item-preview">
                        <div class="buyer-order-item-preview__image"${
                          item.imageUrl
                            ? ` style="background-image:url('${String(item.imageUrl).replace(/'/g, "\\'")}');"`
                            : ""
                        }></div>
                        <div>
                          <div class="buyer-order-item-preview__title">${escapeHtml(item.title)}</div>
                          <div class="buyer-order-item-preview__meta">
                            ${escapeHtml(item.variantLabel || "Standard")} · Qty ${escapeHtml(item.quantity)} · ${escapeHtml(formatCurrency(item.lineTotal))}
                          </div>
                        </div>
                      </div>
                    `
                  )
                  .join("")}
                ${
                  moreCount
                    ? `<div class="buyer-order-item-preview__meta">+${escapeHtml(moreCount)} more item${moreCount === 1 ? "" : "s"}</div>`
                    : ""
                }
              </div>
              <div class="buyer-order-card__summary">
                <div class="buyer-order-card__summary-row"><span>Placed</span><strong>${escapeHtml(formatDate(order.placedAt || order.createdAt))}</strong></div>
                <div class="buyer-order-card__summary-row"><span>Payment</span><strong>${escapeHtml(order.payment && order.payment.provider ? order.payment.provider : "Payment")}</strong></div>
                <div class="buyer-order-card__summary-row"><span>Total</span><strong>${escapeHtml(formatCurrency(order.totalAmount))}</strong></div>
              </div>
            </div>
            <div class="buyer-order-card__foot">
              <span>${escapeHtml(order.deliveryMethod || "Seller-arranged delivery")}</span>
              <a class="btn btn-primary btn-inline" href="/buyer/purchases/${order.id}">View order</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadOrders() {
    setStatus("loading", "Loading your order history.");

    if (cartMetric) {
      cartMetric.textContent = String(readCartCount());
    }

    try {
      const payload = await fetchJson(endpoint);
      const orders = Array.isArray(payload.orders) ? payload.orders : [];
      const metrics = payload.metrics || {};

      if (totalMetric) {
        totalMetric.textContent = String(metrics.totalOrders || orders.length || 0);
      }
      if (activeMetric) {
        activeMetric.textContent = String(metrics.activeOrders || 0);
      }
      if (refundedMetric) {
        refundedMetric.textContent = String(metrics.refundedOrders || 0);
      }
      if (cartMetric) {
        cartMetric.textContent = String(readCartCount());
      }

      renderOrders(orders);
      setStatus("success", orders.length ? "Your orders are up to date." : "No orders yet.");
    } catch (error) {
      renderEmpty();
      setStatus("error", error.message || "Could not load your orders.");
    }
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-href]");
    if (!card || event.target.closest("a, button")) {
      return;
    }

    const href = card.getAttribute("data-href");
    if (href) {
      window.location.href = href;
    }
  });

  window.addEventListener("zest:cart-changed", () => {
    if (cartMetric) {
      cartMetric.textContent = String(readCartCount());
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
  });
})();
