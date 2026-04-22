(function () {
  const groupsEl = document.getElementById("cart-store-groups");
  const subtotalEl = document.getElementById("cart-subtotal");
  const taxEl = document.getElementById("cart-tax");
  const shippingEl = document.getElementById("cart-shipping");
  const totalEl = document.getElementById("cart-total");
  const itemCountEl = document.getElementById("cart-item-count");
  const noteEl = document.getElementById("cart-summary-note");
  const checkoutBtn = document.getElementById("cart-checkout-btn");
  const clearBtn = document.getElementById("cart-clear-btn");
  const statusPanelEl = document.getElementById("cartPageStatusPanel");
  const statusTextEl = document.getElementById("cartPageStatusText");

  const cartPagePath = window.location.pathname;
  const checkoutPagePath = document.body.dataset.checkoutPagePath || "/buyer/checkout";
  const incomingProductId = Number(document.body.dataset.cartProductId || 0);
  const incomingVariantId = Number(document.body.dataset.cartVariantId || 0);

  function currency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(mode = "empty", message = "") {
    if (!statusPanelEl || !statusTextEl) {
      return;
    }

    const variant =
      mode === "error"
        ? "ui-state--error"
        : mode === "success"
          ? "ui-state--success"
          : "ui-state--empty";

    statusPanelEl.className = `ui-state ${variant} buyer-cart-status`;
    statusTextEl.textContent = message;
  }

  function renderEmptyState() {
    if (!groupsEl) {
      return;
    }

    groupsEl.innerHTML = `
      <div class="ui-state ui-state--empty">
        <p class="ui-state__copy">Your cart is empty. Browse the marketplace or the feed to add listings here.</p>
      </div>
    `;
  }

  function updateSummary(workspace) {
    const cart = (workspace && workspace.cart) || {};
    if (subtotalEl) {
      subtotalEl.textContent = currency(cart.subtotalAmount);
    }
    if (taxEl) {
      taxEl.textContent = currency(cart.taxAmount);
    }
    if (shippingEl) {
      shippingEl.textContent = currency(cart.shippingAmount);
    }
    if (totalEl) {
      totalEl.textContent = currency(cart.totalAmount);
    }
    if (itemCountEl) {
      itemCountEl.textContent = String(cart.itemCount || 0);
    }
    if (checkoutBtn) {
      checkoutBtn.disabled = !cart.readyItemCount || cart.hasCheckoutIssues;
    }
    if (clearBtn) {
      clearBtn.disabled = !cart.itemCount;
    }
    if (noteEl) {
      noteEl.textContent = cart.hasCheckoutIssues
        ? "Some items need attention before checkout. Remove unavailable listings or lower the quantity."
        : "We use the cart snapshot totals here so price changes do not silently change your order.";
    }
  }

  function renderWorkspace(workspace) {
    updateSummary(workspace);

    if (!groupsEl) {
      return;
    }

    if (!workspace || !workspace.items || !workspace.items.length) {
      renderEmptyState();
      setStatus("empty", "Your cart is empty. Add a listing to start building your order.");
      return;
    }

    groupsEl.innerHTML = (workspace.storeGroups || [])
      .map(
        (group) => `
          <section class="buyer-cart-store">
            <header class="buyer-cart-store__header">
              <div>
                <h3>${escapeHtml(group.store.storeName || "Marketplace seller")}</h3>
                <p>${group.itemCount} item${group.itemCount === 1 ? "" : "s"} saved${group.hasCheckoutIssues ? " with issues" : ""}</p>
              </div>
              <p class="buyer-cart-store__meta">${currency(group.totalAmount)}</p>
            </header>
            <div class="buyer-cart-store__body">
              ${(group.items || [])
                .map(
                  (item) => `
                    <article class="buyer-cart-item${item.status !== "ready" ? " buyer-cart-item--invalid" : ""}">
                      <img
                        class="buyer-cart-item__image"
                        src="${escapeHtml(item.image || "/assets/img/buyer/product-viewer/product-1.jpg")}"
                        alt="${escapeHtml(item.title)}"
                      >
                      <div class="buyer-cart-item__details">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p class="buyer-cart-item__meta">
                          ${escapeHtml(item.variantLabel || "Standard listing")}
                          ${item.deliveryMethod ? ` / ${escapeHtml(item.deliveryMethod)}` : ""}
                        </p>
                        ${item.status !== "ready" ? `<p class="buyer-cart-item__issue">${escapeHtml(item.issue || "Needs attention before checkout.")}</p>` : ""}
                      </div>
                      <div class="buyer-cart-item__quantity">
                        <button class="buyer-cart-item__qty-btn" type="button" data-cart-delta="-1" data-cart-item-id="${item.id}" ${item.status !== "ready" ? "disabled" : ""}>-</button>
                        <strong>${item.quantity}</strong>
                        <button class="buyer-cart-item__qty-btn" type="button" data-cart-delta="1" data-cart-item-id="${item.id}" ${item.status !== "ready" ? "disabled" : ""}>+</button>
                      </div>
                      <div class="buyer-cart-item__aside">
                        <div class="buyer-cart-item__price">${currency(item.lineTotal)}</div>
                        <button class="buyer-cart-item__remove" type="button" data-cart-remove-id="${item.id}">Remove</button>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>
        `
      )
      .join("");

    if (workspace.cart && workspace.cart.hasCheckoutIssues) {
      setStatus("error", "Some saved items need attention before checkout. Remove them or adjust the quantity.");
      return;
    }

    setStatus(
      "success",
      `${workspace.cart.readyItemCount} item${workspace.cart.readyItemCount === 1 ? "" : "s"} ready to move into checkout.`
    );
  }

  async function loadCart() {
    if (!window.ZestCart || typeof window.ZestCart.fetchCart !== "function") {
      setStatus("error", "The buyer cart could not be loaded.");
      return;
    }

    const workspace = await window.ZestCart.fetchCart({
      force: true,
    });
    renderWorkspace(workspace);
  }

  async function syncIncomingProduct() {
    if (!incomingProductId || !window.ZestCart || typeof window.ZestCart.addToCart !== "function") {
      return false;
    }

    setStatus("empty", "Adding the selected listing to your cart.");
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
    window.location.replace(cartPagePath);
    return true;
  }

  document.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-cart-remove-id]");
    if (removeButton) {
      try {
        await window.ZestCart.removeItem(removeButton.getAttribute("data-cart-remove-id"));
        await loadCart();
      } catch (error) {
        setStatus("error", error.message || "We could not remove that item.");
      }
      return;
    }

    const quantityButton = event.target.closest("[data-cart-delta]");
    if (quantityButton) {
      const itemId = Number(quantityButton.getAttribute("data-cart-item-id") || 0);
      const delta = Number(quantityButton.getAttribute("data-cart-delta") || 0);
      const workspace = window.ZestCart && typeof window.ZestCart.getState === "function"
        ? window.ZestCart.getState()
        : null;
      const item = workspace && Array.isArray(workspace.items)
        ? workspace.items.find((candidate) => Number(candidate.id) === itemId)
        : null;
      if (!item) {
        return;
      }

      const nextQuantity = Math.max(1, Number(item.quantity || 1) + delta);
      try {
        await window.ZestCart.updateItemQuantity(itemId, nextQuantity);
        await loadCart();
      } catch (error) {
        setStatus("error", error.message || "We could not update that quantity.");
      }
    }
  });

  clearBtn?.addEventListener("click", async () => {
    try {
      await window.ZestCart.clearCart();
      await loadCart();
    } catch (error) {
      setStatus("error", error.message || "We could not clear your cart.");
    }
  });

  checkoutBtn?.addEventListener("click", () => {
    window.location.href = checkoutPagePath;
  });

  window.addEventListener("zest:cart-changed", (event) => {
    if (event && event.detail) {
      renderWorkspace(event.detail);
    }
  });

  syncIncomingProduct()
    .then((redirected) => {
      if (!redirected) {
        return loadCart();
      }

      return null;
    })
    .catch((error) => {
      setStatus("error", error.message || "We could not update your cart.");
    });
})();
