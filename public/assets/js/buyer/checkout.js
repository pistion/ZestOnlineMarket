const cartItemsEl = document.getElementById("cart-items");
const subtotalEl = document.getElementById("subtotal");
const gstEl = document.getElementById("gst");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");
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

const summaryEndpoint = document.body.dataset.checkoutSummaryEndpoint || "/api/buyer/checkout/summary";
const orderEndpoint = document.body.dataset.checkoutOrderEndpoint || "/api/buyer/checkout/orders";
const ordersPath = document.body.dataset.buyerOrdersPath || "/buyer/purchases";
const CART_STORAGE_KEY = "zest_cart_v1";

let cart = [];
let selectedPayment = null;
let savedAddresses = [];
let checkoutMode = "cart";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function currency(value) {
  return `K${Number(value || 0).toFixed(2)}`;
}

function getProductId() {
  return Number(document.body.dataset.checkoutProductId || 0);
}

function getVariantId() {
  return Number(document.body.dataset.checkoutVariantId || 0);
}

function isDirectCheckout() {
  return getProductId() > 0;
}

function buildCartKey(productId, variantId) {
  return `${Number(productId || 0)}:${Number(variantId || 0)}`;
}

function readStoredCart() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeStoredCart(items) {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (_error) {
    return false;
  }
}

function removeStoredCartItem(key) {
  const nextItems = readStoredCart().filter((item) => buildCartKey(item.id, item.variantId) !== key);
  return writeStoredCart(nextItems);
}

function upsertStoredCartItem(nextItem) {
  const items = readStoredCart();
  const key = buildCartKey(nextItem.id, nextItem.variantId);
  const existingIndex = items.findIndex((item) => buildCartKey(item.id, item.variantId) === key);
  const payload = {
    id: Number(nextItem.id || 0),
    variantId: Number(nextItem.variantId || 0),
    quantity: Math.max(1, Number(nextItem.quantity || 1)),
    name: nextItem.name || "Product",
    price: Number(nextItem.price || 0),
    image: nextItem.image || "https://via.placeholder.com/60?text=Item",
    storeName: nextItem.storeName || "",
    storePath: nextItem.storePath || "/marketplace",
    productPath: nextItem.productPath || "/marketplace",
    variantLabel: nextItem.variantLabel || "",
  };

  if (existingIndex >= 0) {
    items[existingIndex] = payload;
  } else {
    items.push(payload);
  }

  return writeStoredCart(items);
}

function setFieldValue(element, value) {
  if (element) {
    element.value = value || "";
  }
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

function updateCheckoutContextCopy() {
  if (!selectedVariantRow || !selectedVariantSummary || !selectedSummaryLabelEl) {
    return;
  }

  const readyItems = cart.filter((item) => item.status === "ready");
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
  selectedVariantSummary.textContent = `${readyItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} item${readyItems.length === 1 && readyItems[0].quantity === 1 ? "" : "s"}`;
}

function aggregateTotals() {
  return cart
    .filter((item) => item.status === "ready")
    .reduce(
      (totals, item) => ({
        subtotal: totals.subtotal + Number(item.lineSubtotal || 0),
        tax: totals.tax + Number(item.lineTax || 0),
        shipping: totals.shipping + Number(item.shippingAmount || 0),
        total: totals.total + Number(item.lineTotal || 0),
      }),
      { subtotal: 0, tax: 0, shipping: 0, total: 0 }
    );
}

function updateTotals() {
  const totals = aggregateTotals();

  if (subtotalEl) {
    subtotalEl.textContent = currency(totals.subtotal);
  }
  if (gstEl) {
    gstEl.textContent = currency(totals.tax);
  }
  if (shippingEl) {
    shippingEl.textContent = currency(totals.shipping);
  }
  if (totalEl) {
    totalEl.textContent = currency(totals.total);
  }
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

function renderCart() {
  if (!cartItemsEl) {
    return;
  }

  if (!cart.length) {
    renderEmptyCart("Open a storefront, browse the feed, or visit the marketplace to add items here.");
    updateCheckoutContextCopy();
    updateTotals();
    return;
  }

  cartItemsEl.innerHTML = cart
    .map((item) => {
      const invalid = item.status !== "ready";
      const itemPrice = invalid ? Number(item.price || 0) * Number(item.quantity || 1) : Number(item.lineTotal || 0);

      return `
        <div class="cart-item${invalid ? " cart-item--invalid" : ""}">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="product-image">
          <div class="product-details">
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.storeName)}</p>
            ${
              item.variantLabel
                ? `<small>${escapeHtml(item.variantLabel)}</small>`
                : ""
            }
            ${
              invalid
                ? `<small class="cart-item__issue">${escapeHtml(item.error || "This item needs attention before checkout.")}</small>`
                : ""
            }
          </div>
          <div class="quantity-controls${invalid ? " is-disabled" : ""}">
            <button class="quantity-btn" data-delta="-1" data-key="${escapeHtml(item.key)}" ${invalid ? "disabled" : ""}>-</button>
            <input type="number" class="quantity-input" value="${escapeHtml(item.quantity)}" min="1" readonly>
            <button class="quantity-btn" data-delta="1" data-key="${escapeHtml(item.key)}" ${invalid ? "disabled" : ""}>+</button>
          </div>
          <div class="cart-item__aside">
            <div class="price">${currency(itemPrice)}</div>
            <button class="cart-remove-btn" type="button" data-remove-key="${escapeHtml(item.key)}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  updateCheckoutContextCopy();
  updateTotals();
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  searchParams.set("productId", String(params.productId));
  searchParams.set("quantity", String(params.quantity));
  if (params.variantId > 0) {
    searchParams.set("variantId", String(params.variantId));
  }

  return `${summaryEndpoint}?${searchParams.toString()}`;
}

function normalizeCheckoutItem(data, fallback = {}) {
  const image = (data.images || [])[0];
  const product = data.product || {};
  const store = data.store || {};
  const selectedVariant = data.selectedVariant || null;
  const productId = Number(product.id || fallback.id || 0);
  const variantId = selectedVariant ? Number(selectedVariant.id || 0) : Number(fallback.variantId || 0);
  const quantity = Math.max(1, Number(data.quantity || fallback.quantity || 1));
  const storeHandle = store.handle || "";

  return {
    key: buildCartKey(productId, variantId),
    id: productId,
    variantId,
    quantity,
    status: "ready",
    name: product.title || product.name || fallback.name || "Product",
    price: Number(data.pricing && data.pricing.unitPrice || fallback.price || product.price || 0),
    lineSubtotal: Number(data.pricing && data.pricing.subtotalAmount || 0),
    lineTax: Number(data.pricing && data.pricing.taxAmount || 0),
    shippingAmount: Number(data.pricing && data.pricing.shippingAmount || 0),
    lineTotal: Number(data.pricing && data.pricing.totalAmount || 0),
    image: (image && (image.url || image.src)) || fallback.image || "https://via.placeholder.com/60?text=Item",
    storeName: store.storeName || fallback.storeName || `@${storeHandle || "store"}`,
    storePath: storeHandle ? `/stores/${storeHandle}` : fallback.storePath || "/marketplace",
    productPath: `/products/${productId}${variantId > 0 ? `?variantId=${variantId}` : ""}`,
    variantLabel: selectedVariant ? selectedVariant.label : fallback.variantLabel || "",
    availableStock: Number(data.availableStock || 0),
  };
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

async function loadDirectCheckout() {
  const productId = getProductId();
  if (!productId) {
    return loadStoredCartCheckout();
  }

  checkoutMode = "direct";
  setCheckoutStatus("empty", "Loading the selected listing, pricing, and store details.");
  const data = await fetchJson(
    buildQuery({
      productId,
      variantId: getVariantId(),
      quantity: 1,
    })
  );

  const item = normalizeCheckoutItem(data, {
    id: productId,
    variantId: getVariantId(),
    quantity: 1,
  });
  cart = [item];
  applyCheckoutDefaults(data);

  if (backToProductEl) {
    backToProductEl.href = item.productPath;
  }

  checkoutBtn.disabled = false;
  renderCart();
  setCheckoutStatus(
    "success",
    `Reviewing checkout for ${item.name} from ${item.storeName}.`
  );
}

async function loadStoredCartCheckout() {
  checkoutMode = "cart";
  const storedItems = readStoredCart();

  if (!storedItems.length) {
    cart = [];
    renderCart();
    checkoutBtn.disabled = true;
    if (backToProductEl) {
      backToProductEl.href = "/marketplace";
    }
    setCheckoutStatus("empty", "Your cart is empty. Add a product first, then return here to review it.");
    return;
  }

  setCheckoutStatus("empty", "Loading the items already saved in your cart.");
  const results = await Promise.all(
    storedItems.map(async (item) => {
      try {
        const data = await fetchJson(
          buildQuery({
            productId: Number(item.id || 0),
            variantId: Number(item.variantId || 0),
            quantity: Math.max(1, Number(item.quantity || 1)),
          })
        );

        return {
          ok: true,
          data,
          item: normalizeCheckoutItem(data, item),
        };
      } catch (error) {
        return {
          ok: false,
          item: {
            key: buildCartKey(item.id, item.variantId),
            id: Number(item.id || 0),
            variantId: Number(item.variantId || 0),
            quantity: Math.max(1, Number(item.quantity || 1)),
            status: "invalid",
            name: item.name || "Product",
            price: Number(item.price || 0),
            lineSubtotal: Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
            lineTax: 0,
            shippingAmount: 0,
            lineTotal: Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)),
            image: item.image || "https://via.placeholder.com/60?text=Item",
            storeName: item.storeName || "Marketplace seller",
            storePath: item.storePath || "/marketplace",
            productPath: item.productPath || "/marketplace",
            variantLabel: item.variantLabel || "",
            error: error.message || "This item is no longer available.",
          },
        };
      }
    })
  );

  cart = results.map((result) => result.item);
  const firstReady = results.find((result) => result.ok);
  if (firstReady && firstReady.data) {
    applyCheckoutDefaults(firstReady.data);
  } else {
    clearCheckoutDefaults();
  }

  const readyItems = cart.filter((item) => item.status === "ready");
  writeStoredCart(
    cart.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      name: item.name,
      price: item.price,
      image: item.image,
      storeName: item.storeName,
      storePath: item.storePath,
      productPath: item.productPath,
      variantLabel: item.variantLabel,
    }))
  );

  if (backToProductEl) {
    backToProductEl.href = readyItems[0] ? readyItems[0].productPath : "/marketplace";
  }

  checkoutBtn.disabled = !readyItems.length;
  renderCart();

  if (!readyItems.length) {
    setCheckoutStatus("error", "Your cart has no valid items left. Remove the unavailable entries and add a fresh listing.");
    return;
  }

  if (cart.some((item) => item.status !== "ready")) {
    setCheckoutStatus("error", "Some cart items need attention. Remove unavailable entries or adjust the list before placing the order.");
    return;
  }

  setCheckoutStatus("success", `Loaded ${readyItems.length} cart item${readyItems.length === 1 ? "" : "s"} for checkout.`);
}

function collectOrderPayload(item) {
  return {
    productId: item.id,
    variantId: item.variantId || 0,
    quantity: item.quantity,
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

async function placeOrder() {
  if (!selectedPayment) {
    setCheckoutStatus("error", "Please choose a payment method before continuing.");
    return;
  }

  const readyItems = cart.filter((item) => item.status === "ready");
  if (!readyItems.length) {
    setCheckoutStatus("error", "There are no valid items ready for checkout.");
    return;
  }

  checkoutBtn.disabled = true;
  setCheckoutStatus(
    "empty",
    readyItems.length === 1 ? "Creating your order and capturing payment." : `Creating ${readyItems.length} orders from your cart.`
  );

  try {
    const results = [];
    const completedKeys = [];
    for (const item of readyItems) {
      const response = await fetchJson(orderEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(collectOrderPayload(item)),
      });
      results.push(response);
      completedKeys.push(item.key);
    }

    if (checkoutMode === "cart") {
      const remainingItems = readStoredCart().filter((item) => !completedKeys.includes(buildCartKey(item.id, item.variantId)));
      writeStoredCart(remainingItems);
    }

    setCheckoutStatus(
      "success",
      results.length === 1 ? "Order created successfully. Redirecting to your order detail." : `${results.length} orders created successfully. Redirecting to your order history.`
    );

    window.setTimeout(() => {
      const destination =
        results.length === 1 && checkoutMode === "direct"
          ? results[0].redirectTo || ordersPath
          : ordersPath;
      window.location.href = destination;
    }, 700);
  } catch (error) {
    checkoutBtn.disabled = false;
    setCheckoutStatus("error", error.message || "We could not create that order.");
  }
}

async function syncQuantity(key, nextQuantity) {
  const item = cart.find((entry) => entry.key === key);
  if (!item) {
    return;
  }

  if (nextQuantity <= 0) {
    removeCartItem(key);
    return;
  }

  if (checkoutMode === "direct") {
    try {
      const data = await fetchJson(
        buildQuery({
          productId: item.id,
          variantId: item.variantId,
          quantity: nextQuantity,
        })
      );
      const updatedItem = normalizeCheckoutItem(data, {
        id: item.id,
        variantId: item.variantId,
        quantity: nextQuantity,
      });
      cart = [updatedItem];
      renderCart();
      checkoutBtn.disabled = false;
      setCheckoutStatus("success", "Checkout quantity updated.");
    } catch (error) {
      setCheckoutStatus("error", error.message || "Could not update quantity.");
    }
    return;
  }

  upsertStoredCartItem({
    ...item,
    quantity: nextQuantity,
  });
  await loadStoredCartCheckout();
}

async function removeCartItem(key) {
  if (checkoutMode === "direct") {
    window.location.href = "/buyer/checkout";
    return;
  }

  removeStoredCartItem(key);
  await loadStoredCartCheckout();
}

document.addEventListener("click", (event) => {
  const quantityBtn = event.target.closest(".quantity-btn");
  if (quantityBtn) {
    const key = quantityBtn.dataset.key;
    const delta = Number(quantityBtn.dataset.delta || 0);
    const item = cart.find((entry) => entry.key === key);
    if (!item || item.status !== "ready") {
      return;
    }

    const maxQuantity = Math.max(1, Number(item.availableStock || 1));
    const nextQuantity = Math.min(maxQuantity, Math.max(1, Number(item.quantity || 1) + delta));
    void syncQuantity(key, nextQuantity);
    return;
  }

  const removeBtn = event.target.closest("[data-remove-key]");
  if (removeBtn) {
    void removeCartItem(removeBtn.dataset.removeKey);
    return;
  }

  const paymentButton = event.target.closest("[data-payment]");
  if (paymentButton) {
    selectedPayment = paymentButton.dataset.payment;
    document.querySelectorAll("[data-payment]").forEach((btn) => {
      btn.classList.toggle("selected", btn === paymentButton);
    });
    checkoutBtn.disabled = cart.filter((item) => item.status === "ready").length <= 0;
  }
});

const couponButton = document.getElementById("apply-coupon-btn");
if (couponButton) {
  couponButton.addEventListener("click", () => {
    const coupon = document.getElementById("coupon");
    const value = coupon ? coupon.value.trim().toUpperCase() : "";
    setCheckoutStatus(
      value === "DISCOUNT10" ? "success" : "error",
      value === "DISCOUNT10"
        ? "Coupon accepted. Discount display is still preview-only."
        : "Coupon not recognized."
    );
  });
}

const refreshButton = document.getElementById("update-cart-btn");
if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    void (isDirectCheckout() ? loadDirectCheckout() : loadStoredCartCheckout());
  });
}

if (savedAddressEl) {
  savedAddressEl.addEventListener("change", (event) => {
    applySavedAddress(event.target.value);
    setCheckoutStatus("success", "Saved address applied to checkout.");
  });
}

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", placeOrder);
}

(async function initCheckout() {
  try {
    if (isDirectCheckout()) {
      await loadDirectCheckout();
    } else {
      await loadStoredCartCheckout();
    }
  } catch (error) {
    cart = [];
    renderCart();
    checkoutBtn.disabled = true;
    setCheckoutStatus(
      "error",
      error && error.message
        ? error.message
        : "We could not load checkout right now. Please return to the product page and try again."
    );
  }
})();
