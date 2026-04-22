const cartItemsEl = document.getElementById("cart-items");
const subtotalEl = document.getElementById("subtotal");
const gstEl = document.getElementById("gst");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
const discountRowEl = document.getElementById("discountRow");
const discountAmountEl = document.getElementById("discountAmount");
const checkoutBtn = document.getElementById("checkout-btn");
const statusPanelEl = document.getElementById("checkoutStatusPanel");
const statusEl = document.getElementById("checkoutStatusText");
const backToProductEl = document.getElementById("back-to-product");
const selectedVariantRow = document.getElementById("selected-variant-row");
const selectedSummaryLabelEl = document.getElementById("selected-summary-label");
const selectedVariantSummary = document.getElementById("selected-variant-summary");
const customerNameEl = document.getElementById("checkout-customer-name");
const customerEmailEl = document.getElementById("checkout-customer-email");
const customerPhoneEl = document.getElementById("checkout-customer-phone");
const savedAddressEl = document.getElementById("checkout-saved-address");
const deliveryMethodEl = document.getElementById("checkout-delivery-method");
const deliveryAddressEl = document.getElementById("checkout-delivery-address");
const deliveryCityEl = document.getElementById("checkout-delivery-city");
const deliveryNotesEl = document.getElementById("checkout-delivery-notes");
const applyCouponBtn = document.getElementById("apply-coupon-btn");
const couponInputEl = document.getElementById("coupon");
const couponFeedbackEl = document.getElementById("coupon-feedback");
const refreshCartBtn = document.getElementById("update-cart-btn");

const summaryEndpoint = document.body.dataset.checkoutSummaryEndpoint || "/api/buyer/checkout/summary";
const orderEndpoint = document.body.dataset.checkoutOrderEndpoint || "/api/buyer/checkout/orders";
const discountValidateEndpoint = "/api/discounts/validate";
const cartPagePath = document.body.dataset.buyerCartPath || "/buyer/cart";
const ordersPath = document.body.dataset.buyerOrdersPath || "/buyer/purchases";
const incomingProductId = Number(document.body.dataset.checkoutProductId || 0);
const incomingVariantId = Number(document.body.dataset.checkoutVariantId || 0);

let selectedPayment = null;
let savedAddresses = [];
let appliedDiscountPreview = null;
let workspace = {
  cart: {
    itemCount: 0,
    readyItemCount: 0,
    hasCheckoutIssues: false,
    subtotalAmount: 0,
    taxAmount: 0,
    shippingAmount: 0,
    totalAmount: 0,
  },
  items: [],
  storeGroups: [],
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function currency(value) {
  return `K${Number(value || 0).toFixed(2)}`;
}

function setCheckoutStatus(mode = "empty", message = "") {
  if (!statusPanelEl || !statusEl) {
    return;
  }

  const variant =
    mode === "error"
      ? "ui-state--error"
      : mode === "success"
        ? "ui-state--success"
        : "ui-state--empty";

  statusPanelEl.className = `ui-state ${variant} checkout-status-panel`;
  statusEl.textContent = message;
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
    throw new Error((payload && payload.message) || "Request failed");
  }

  return payload;
}

function setFieldValue(element, value) {
  if (element) {
    element.value = value || "";
  }
}

function renderSavedAddresses(addresses) {
  if (!savedAddressEl) {
    return;
  }

  savedAddresses = Array.isArray(addresses) ? addresses : [];
  savedAddressEl.innerHTML = [
    '<option value="">Choose a saved address</option>',
    ...savedAddresses.map(
      (address) =>
        `<option value="${address.id}">${address.addressType.toUpperCase()} - ${address.summary || address.addressLine1}</option>`
    ),
  ].join("");
}

function applySavedAddress(addressId) {
  const selected = savedAddresses.find((address) => Number(address.id) === Number(addressId || 0));
  if (!selected) {
    return;
  }

  setFieldValue(deliveryAddressEl, [selected.addressLine1, selected.addressLine2].filter(Boolean).join(", "));
  setFieldValue(deliveryCityEl, selected.city || "");
}

function clearCheckoutDefaults() {
  renderSavedAddresses([]);
  setFieldValue(customerNameEl, "");
  setFieldValue(customerEmailEl, "");
  setFieldValue(customerPhoneEl, "");
  setFieldValue(deliveryMethodEl, "");
  setFieldValue(deliveryAddressEl, "");
  setFieldValue(deliveryCityEl, "");
  setFieldValue(deliveryNotesEl, "");
}

function applyCheckoutDefaults(data) {
  const defaults = data && data.defaults ? data.defaults : {};
  renderSavedAddresses((data && data.savedAddresses) || []);
  if (savedAddressEl && Array.isArray(data && data.savedAddresses) && data.savedAddresses.length) {
    savedAddressEl.value = String(data.savedAddresses[0].id || "");
  }

  setFieldValue(customerNameEl, defaults.customerName);
  setFieldValue(customerEmailEl, defaults.customerEmail);
  setFieldValue(customerPhoneEl, defaults.customerPhone);
  setFieldValue(deliveryMethodEl, defaults.deliveryMethod);
  setFieldValue(deliveryAddressEl, defaults.deliveryAddress);
  setFieldValue(deliveryCityEl, defaults.deliveryCity);
  setFieldValue(deliveryNotesEl, defaults.deliveryNotes);
}

function renderEmptyCart(message) {
  if (!cartItemsEl) {
    return;
  }

  cartItemsEl.innerHTML = `
    <div class="ui-state ui-state--empty checkout-empty">
      <p class="ui-eyebrow">Your cart is empty</p>
      <h2 class="ui-state__title">Add a listing before checkout</h2>
      <p class="ui-state__copy">${message}</p>
    </div>
  `;
}

function updateSummaryCopy(currentWorkspace) {
  if (!selectedVariantRow || !selectedVariantSummary || !selectedSummaryLabelEl) {
    return;
  }

  const items = Array.isArray(currentWorkspace && currentWorkspace.items)
    ? currentWorkspace.items
    : [];
  const readyItems = items.filter((item) => item.status === "ready");

  if (!readyItems.length) {
    selectedVariantRow.hidden = true;
    return;
  }

  selectedVariantRow.hidden = false;
  if (readyItems.length === 1 && readyItems[0].variantLabel) {
    selectedSummaryLabelEl.textContent = "Selected option";
    selectedVariantSummary.textContent = readyItems[0].variantLabel;
    return;
  }

  selectedSummaryLabelEl.textContent = "Cart items";
  selectedVariantSummary.textContent = `${currentWorkspace.cart.itemCount || readyItems.length} item${currentWorkspace.cart.itemCount === 1 ? "" : "s"}`;
}

function updateTotals(currentWorkspace) {
  const cart = (currentWorkspace && currentWorkspace.cart) || {};
  const discountAmount = Number(appliedDiscountPreview && appliedDiscountPreview.amountApplied || 0);
  const totalAmount = appliedDiscountPreview && appliedDiscountPreview.cartTotals
    ? Number(appliedDiscountPreview.cartTotals.adjustedTotalAmount || cart.totalAmount || 0)
    : Number(cart.totalAmount || 0);
  if (subtotalEl) {
    subtotalEl.textContent = currency(cart.subtotalAmount);
  }
  if (gstEl) {
    gstEl.textContent = currency(cart.taxAmount);
  }
  if (shippingEl) {
    shippingEl.textContent = currency(cart.shippingAmount);
  }
  if (discountRowEl && discountAmountEl) {
    discountRowEl.hidden = discountAmount <= 0;
    discountAmountEl.textContent = `-${currency(discountAmount)}`;
  }
  if (totalEl) {
    totalEl.textContent = currency(totalAmount);
  }
}

function setCouponFeedback(message, tone = "muted") {
  if (!couponFeedbackEl) {
    return;
  }

  couponFeedbackEl.textContent = message;
  couponFeedbackEl.dataset.tone = tone;
}

function renderCart(currentWorkspace) {
  if (!cartItemsEl) {
    return;
  }

  const items = Array.isArray(currentWorkspace && currentWorkspace.items)
    ? currentWorkspace.items
    : [];

  if (!items.length) {
    renderEmptyCart("Open a storefront, browse the feed, or visit the marketplace to add items here.");
    updateSummaryCopy(currentWorkspace);
    updateTotals(currentWorkspace);
    return;
  }

  cartItemsEl.innerHTML = items
    .map((item) => {
      const invalid = item.status !== "ready";
      const canAdjust = !invalid && Number(item.id || 0) > 0;
      return `
        <div class="cart-item${invalid ? " cart-item--invalid" : ""}">
          <img src="${escapeHtml(item.image || "/assets/img/buyer/product-viewer/product-1.jpg")}" alt="${escapeHtml(item.title)}" class="product-image">
          <div class="product-details">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.storeName || "Marketplace seller")}</p>
            ${item.variantLabel ? `<small>${escapeHtml(item.variantLabel)}</small>` : ""}
            ${invalid ? `<small class="cart-item__issue">${escapeHtml(item.issue || "This item needs attention before checkout.")}</small>` : ""}
          </div>
          <div class="quantity-controls${invalid ? " is-disabled" : ""}">
            <button class="quantity-btn" data-delta="-1" data-item-id="${escapeHtml(item.id)}" ${!canAdjust ? "disabled" : ""}>-</button>
            <input type="number" class="quantity-input" value="${escapeHtml(item.quantity)}" min="1" readonly>
            <button class="quantity-btn" data-delta="1" data-item-id="${escapeHtml(item.id)}" ${!canAdjust ? "disabled" : ""}>+</button>
          </div>
          <div class="cart-item__aside">
            <div class="price">${currency(item.lineTotal)}</div>
            <button class="cart-remove-btn" type="button" data-remove-id="${escapeHtml(item.id)}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  updateSummaryCopy(currentWorkspace);
  updateTotals(currentWorkspace);
}

function normalizeDirectWorkspace(data) {
  const product = data.product || {};
  const store = data.store || {};
  const selectedVariant = data.selectedVariant || null;
  const quantity = Math.max(1, Number(data.quantity || 1));
  const image = (data.images || [])[0];
  const unitPrice = Number(data.pricing && data.pricing.unitPrice || 0);
  const subtotalAmount = Number(data.pricing && data.pricing.subtotalAmount || 0);
  const taxAmount = Number(data.pricing && data.pricing.taxAmount || 0);
  const shippingAmount = Number(data.pricing && data.pricing.shippingAmount || 0);
  const totalAmount = Number(data.pricing && data.pricing.totalAmount || 0);

  return {
    cart: {
      itemCount: quantity,
      readyItemCount: 1,
      invalidItemCount: 0,
      hasCheckoutIssues: false,
      subtotalAmount,
      taxAmount,
      shippingAmount,
      totalAmount,
    },
    items: [
      {
        id: 0,
        productId: Number(product.id || 0),
        variantId: selectedVariant ? Number(selectedVariant.id || 0) : 0,
        quantity,
        title: product.title || product.name || "Product",
        storeName: store.storeName || "Marketplace seller",
        storeHandle: store.handle || "",
        productPath: Number(product.id || 0) ? `/products/${product.id}` : "/marketplace",
        storePath: store.handle ? `/stores/${store.handle}` : "/marketplace",
        variantLabel: selectedVariant ? selectedVariant.label : "",
        deliveryMethod: product.delivery || "",
        image: (image && (image.url || image.src)) || "/assets/img/buyer/product-viewer/product-1.jpg",
        lineTotal: totalAmount,
        availableStock: Number(data.availableStock || 0),
        status: "ready",
      },
    ],
    storeGroups: [],
  };
}

async function loadCheckout() {
  setCheckoutStatus("empty", "Loading your saved cart, pricing, and delivery defaults.");
  appliedDiscountPreview = null;
  if (applyCouponBtn) {
    applyCouponBtn.textContent = "Apply";
  }
  setCouponFeedback("Apply a seller coupon to preview the adjusted total before ordering.");
  const data = await fetchJson(summaryEndpoint);
  workspace = data.mode === "direct" ? normalizeDirectWorkspace(data) : data;

  if ((data.savedAddresses || []).length || data.defaults) {
    applyCheckoutDefaults(data);
  } else {
    clearCheckoutDefaults();
  }

  renderCart(workspace);

  const readyItems = workspace.items.filter((item) => item.status === "ready");
  if (backToProductEl) {
    backToProductEl.href = readyItems[0] ? readyItems[0].productPath || cartPagePath : cartPagePath;
  }

  if (!readyItems.length) {
    checkoutBtn.disabled = true;
    setCheckoutStatus("empty", "Your cart is empty. Add an item first, then return here to place the order.");
    return;
  }

  if (workspace.cart && workspace.cart.hasCheckoutIssues) {
    checkoutBtn.disabled = true;
    setCheckoutStatus("error", "Some cart items need attention. Remove unavailable entries before placing the order.");
    return;
  }

  checkoutBtn.disabled = false;
  setCheckoutStatus(
    "success",
    `Loaded ${readyItems.length} ready cart item${readyItems.length === 1 ? "" : "s"} for checkout.`
  );
}

async function syncIncomingProduct() {
  if (!incomingProductId || !window.ZestCart || typeof window.ZestCart.addToCart !== "function") {
    return false;
  }

  setCheckoutStatus("empty", "Adding the selected listing to your cart.");
  await window.ZestCart.addToCart(
    {
      productId: incomingProductId,
      variantId: incomingVariantId > 0 ? incomingVariantId : 0,
      quantity: 1,
    },
    {
      openDrawer: false,
    }
  );
  window.location.replace(window.location.pathname);
  return true;
}

function collectOrderPayload() {
  return {
    couponCode: couponInputEl ? couponInputEl.value.trim() : "",
    paymentMethod: selectedPayment,
    customerName: customerNameEl ? customerNameEl.value.trim() : "",
    customerEmail: customerEmailEl ? customerEmailEl.value.trim() : "",
    customerPhone: customerPhoneEl ? customerPhoneEl.value.trim() : "",
    deliveryMethod: deliveryMethodEl ? deliveryMethodEl.value.trim() : "",
    deliveryAddress: deliveryAddressEl ? deliveryAddressEl.value.trim() : "",
    deliveryCity: deliveryCityEl ? deliveryCityEl.value.trim() : "",
    deliveryNotes: deliveryNotesEl ? deliveryNotesEl.value.trim() : "",
  };
}

async function applyCoupon() {
  const code = couponInputEl ? couponInputEl.value.trim() : "";
  if (!code) {
    appliedDiscountPreview = null;
    updateTotals(workspace);
    setCouponFeedback("Enter a coupon code first.", "warning");
    return;
  }

  applyCouponBtn.disabled = true;
  setCouponFeedback("Validating coupon code...", "muted");

  try {
    const response = await fetchJson(discountValidateEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });

    appliedDiscountPreview = response.preview || null;
    updateTotals(workspace);
    if (applyCouponBtn) {
      applyCouponBtn.textContent = "Applied";
    }
    if (appliedDiscountPreview && appliedDiscountPreview.group && appliedDiscountPreview.discount) {
      setCouponFeedback(
        `${appliedDiscountPreview.discount.code} applied to ${appliedDiscountPreview.group.store.storeName}. Saved ${currency(appliedDiscountPreview.amountApplied)}.`,
        "success"
      );
    } else {
      setCouponFeedback("Coupon applied.", "success");
    }
  } catch (error) {
    appliedDiscountPreview = null;
    updateTotals(workspace);
    setCouponFeedback(error.message || "Coupon validation failed.", "error");
    if (applyCouponBtn) {
      applyCouponBtn.textContent = "Apply";
    }
  } finally {
    applyCouponBtn.disabled = false;
  }
}

async function placeOrder() {
  if (!selectedPayment) {
    setCheckoutStatus("error", "Please choose a payment method before continuing.");
    return;
  }

  if (!workspace.cart.readyItemCount) {
    setCheckoutStatus("error", "There are no valid items ready for checkout.");
    return;
  }

  if (workspace.cart.hasCheckoutIssues) {
    setCheckoutStatus("error", "Remove or fix unavailable items before placing the order.");
    return;
  }

  checkoutBtn.disabled = true;
  setCheckoutStatus(
    "empty",
    workspace.cart.uniqueStoreCount > 1
      ? `Creating ${workspace.cart.uniqueStoreCount} store orders from your cart.`
      : "Creating your order and capturing payment."
  );

  try {
    const response = await fetchJson(orderEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(collectOrderPayload()),
    });

    if (window.ZestCart && typeof window.ZestCart.fetchCart === "function") {
      await window.ZestCart.fetchCart({
        force: true,
        silent: true,
      });
    }

    const createdOrders = Array.isArray(response.orders)
      ? response.orders.length
      : response.order
        ? 1
        : 0;

    setCheckoutStatus(
      "success",
      createdOrders > 1
        ? `${createdOrders} orders were created successfully. Redirecting to your order history.`
        : "Order created successfully. Redirecting to your order detail."
    );

    window.setTimeout(() => {
      window.location.href = response.redirectTo || ordersPath;
    }, 700);
  } catch (error) {
    checkoutBtn.disabled = false;
    setCheckoutStatus("error", error.message || "We could not create that order.");
  }
}

async function syncQuantity(itemId, nextQuantity) {
  if (!itemId || !window.ZestCart || typeof window.ZestCart.updateItemQuantity !== "function") {
    return;
  }

  await window.ZestCart.updateItemQuantity(itemId, nextQuantity);
  await loadCheckout();
}

async function removeCartItem(itemId) {
  if (!itemId || !window.ZestCart || typeof window.ZestCart.removeItem !== "function") {
    return;
  }

  await window.ZestCart.removeItem(itemId);
  await loadCheckout();
}

document.addEventListener("click", async (event) => {
  const quantityBtn = event.target.closest(".quantity-btn");
  if (quantityBtn) {
    const itemId = Number(quantityBtn.dataset.itemId || 0);
    const delta = Number(quantityBtn.dataset.delta || 0);
    const item = Array.isArray(workspace.items)
      ? workspace.items.find((candidate) => Number(candidate.id) === itemId)
      : null;
    if (!item || item.status !== "ready") {
      return;
    }

    const maxQuantity = Math.max(1, Number(item.availableStock || item.quantity || 1));
    const nextQuantity = Math.min(maxQuantity, Math.max(1, Number(item.quantity || 1) + delta));

    try {
      await syncQuantity(itemId, nextQuantity);
    } catch (error) {
      setCheckoutStatus("error", error.message || "Could not update quantity.");
    }
    return;
  }

  const removeBtn = event.target.closest("[data-remove-id]");
  if (removeBtn) {
    try {
      await removeCartItem(Number(removeBtn.dataset.removeId || 0));
    } catch (error) {
      setCheckoutStatus("error", error.message || "Could not remove that cart item.");
    }
    return;
  }

  const paymentButton = event.target.closest("[data-payment]");
  if (paymentButton) {
    selectedPayment = paymentButton.dataset.payment;
    document.querySelectorAll("[data-payment]").forEach((btn) => {
      btn.classList.toggle("selected", btn === paymentButton);
      btn.setAttribute("aria-pressed", btn === paymentButton ? "true" : "false");
    });
  }
});

savedAddressEl?.addEventListener("change", (event) => {
  applySavedAddress(event.target.value);
});

applyCouponBtn?.addEventListener("click", () => {
  void applyCoupon();
});

couponInputEl?.addEventListener("input", () => {
  appliedDiscountPreview = null;
  updateTotals(workspace);
  if (applyCouponBtn) {
    applyCouponBtn.textContent = "Apply";
  }
  setCouponFeedback("Apply a seller coupon to preview the adjusted total before ordering.");
});

refreshCartBtn?.addEventListener("click", () => {
  void loadCheckout().catch((error) => {
    setCheckoutStatus("error", error.message || "We could not refresh your cart.");
  });
});

checkoutBtn?.addEventListener("click", () => {
  void placeOrder();
});

window.addEventListener("zest:cart-changed", (event) => {
  if (event && event.detail && !incomingProductId) {
    workspace = event.detail;
    renderCart(workspace);
    updateSummaryCopy(workspace);
    updateTotals(workspace);
  }
});

syncIncomingProduct()
  .then((redirected) => {
    if (!redirected) {
      return loadCheckout();
    }

    return null;
  })
  .catch((error) => {
    setCheckoutStatus("error", error.message || "We could not load your checkout.");
  });
