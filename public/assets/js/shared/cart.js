(function () {
  const EMPTY_WORKSPACE = Object.freeze({
    cart: {
      id: 0,
      itemCount: 0,
      lineItemCount: 0,
      readyItemCount: 0,
      invalidItemCount: 0,
      uniqueStoreCount: 0,
      subtotalAmount: 0,
      taxAmount: 0,
      shippingAmount: 0,
      totalAmount: 0,
      currency: "PGK",
      hasCheckoutIssues: false,
    },
    items: [],
    storeGroups: [],
  });

  const state = {
    workspace: EMPTY_WORKSPACE,
    listeners: new Set(),
    pendingFetch: null,
  };

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

  function getCartEndpoint() {
    return document.body.dataset.cartApiEndpoint || "/api/cart";
  }

  function getCartPagePath() {
    return document.body.dataset.buyerCartPath || "/buyer/cart";
  }

  function getCheckoutPagePath() {
    return document.body.dataset.checkoutPagePath || "/buyer/checkout";
  }

  function normalizeWorkspace(payload) {
    if (!payload || !payload.cart) {
      return EMPTY_WORKSPACE;
    }

    return {
      cart: {
        ...EMPTY_WORKSPACE.cart,
        ...(payload.cart || {}),
      },
      items: Array.isArray(payload.items) ? payload.items : [],
      storeGroups: Array.isArray(payload.storeGroups) ? payload.storeGroups : [],
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
      const error = new Error((payload && payload.message) || "Request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function updateBadges(workspace) {
    const count = Number(workspace && workspace.cart && workspace.cart.itemCount) || 0;
    document.querySelectorAll("[data-cart-badge]").forEach((element) => {
      element.textContent = String(count);
      element.hidden = count <= 0;
    });
  }

  function setDrawerOpen(open) {
    const drawer = document.querySelector("[data-cart-drawer]");
    const backdrop = document.querySelector("[data-cart-drawer-backdrop]");
    const toggle = document.querySelector("[data-cart-toggle]");
    if (!drawer || !backdrop || !toggle) {
      return;
    }

    drawer.hidden = !open;
    backdrop.hidden = !open;
    drawer.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderDrawer(workspace) {
    const stateEl = document.querySelector("[data-cart-drawer-state]");
    const itemsEl = document.querySelector("[data-cart-drawer-items]");
    const totalEl = document.querySelector("[data-cart-drawer-total]");
    const checkoutLink = document.querySelector("[data-cart-drawer-checkout]");
    const cartLink = document.querySelector("[data-cart-drawer-cart]");
    if (!stateEl || !itemsEl || !totalEl) {
      return;
    }

    if (cartLink) {
      cartLink.setAttribute("href", getCartPagePath());
    }
    if (checkoutLink) {
      checkoutLink.setAttribute("href", getCheckoutPagePath());
      checkoutLink.classList.toggle(
        "is-disabled",
        !workspace.cart.readyItemCount || workspace.cart.hasCheckoutIssues
      );
      checkoutLink.setAttribute(
        "aria-disabled",
        !workspace.cart.readyItemCount || workspace.cart.hasCheckoutIssues ? "true" : "false"
      );
    }

    if (!workspace.items.length) {
      stateEl.textContent = "Your buyer cart is empty.";
      itemsEl.innerHTML = "";
      totalEl.textContent = currency(0);
      return;
    }

    stateEl.textContent = workspace.cart.hasCheckoutIssues
      ? "Some saved items need attention before checkout."
      : `${workspace.cart.readyItemCount} item${workspace.cart.readyItemCount === 1 ? "" : "s"} ready to order.`;

    itemsEl.innerHTML = workspace.items
      .slice(0, 4)
      .map(
        (item) => `
          <article class="codex-layout-cart-drawer__item${item.status !== "ready" ? " is-invalid" : ""}">
            <img
              class="codex-layout-cart-drawer__thumb"
              src="${escapeHtml(item.image || "/assets/img/buyer/product-viewer/product-1.jpg")}"
              alt="${escapeHtml(item.title)}"
            >
            <div class="codex-layout-cart-drawer__details">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.storeName || "Marketplace seller")}</span>
              <small>${escapeHtml(item.variantLabel || `Qty ${item.quantity}`)}</small>
              ${item.status !== "ready" ? `<small>${escapeHtml(item.issue || "Needs attention")}</small>` : ""}
            </div>
            <div class="codex-layout-cart-drawer__amount">${currency(item.lineTotal)}</div>
          </article>
        `
      )
      .join("");

    totalEl.textContent = currency(workspace.cart.totalAmount);
  }

  function notify() {
    const workspace = state.workspace || EMPTY_WORKSPACE;
    updateBadges(workspace);
    renderDrawer(workspace);
    state.listeners.forEach((listener) => {
      try {
        listener(workspace);
      } catch (_error) {
        // Ignore listener failures.
      }
    });
    window.dispatchEvent(
      new CustomEvent("zest:cart-changed", {
        detail: workspace,
      })
    );
  }

  function setWorkspace(payload) {
    state.workspace = normalizeWorkspace(payload);
    notify();
    return state.workspace;
  }

  async function fetchCart(options = {}) {
    if (state.pendingFetch && !options.force) {
      return state.pendingFetch;
    }

    state.pendingFetch = fetchJson(getCartEndpoint())
      .then((payload) => setWorkspace(payload))
      .catch((error) => {
        if (error && (error.status === 401 || error.status === 403)) {
          return setWorkspace(EMPTY_WORKSPACE);
        }

        if (!options.silent) {
          throw error;
        }

        return state.workspace;
      })
      .finally(() => {
        state.pendingFetch = null;
      });

    return state.pendingFetch;
  }

  async function addToCart(payload, options = {}) {
    try {
      const response = await fetchJson(`${getCartEndpoint()}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload || {}),
      });

      const workspace = setWorkspace(response);
      if (options.openDrawer !== false) {
        setDrawerOpen(true);
      }
      return workspace;
    } catch (error) {
      if ((error.status === 401 || error.status === 403) && options.authRedirect) {
        window.location.href = options.authRedirect;
        return {
          authRedirected: true,
        };
      }

      throw error;
    }
  }

  async function updateItemQuantity(itemId, quantity) {
    const response = await fetchJson(`${getCartEndpoint()}/items/${Number(itemId || 0)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quantity,
      }),
    });

    return setWorkspace(response);
  }

  async function removeItem(itemId) {
    const response = await fetchJson(`${getCartEndpoint()}/items/${Number(itemId || 0)}`, {
      method: "DELETE",
    });

    return setWorkspace(response);
  }

  async function clearCart() {
    const response = await fetchJson(getCartEndpoint(), {
      method: "DELETE",
    });

    return setWorkspace(response);
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-cart-toggle]")) {
      const drawer = document.querySelector("[data-cart-drawer]");
      setDrawerOpen(Boolean(drawer && drawer.hidden));
      return;
    }

    if (event.target.closest("[data-cart-close]") || event.target.closest("[data-cart-drawer-backdrop]")) {
      setDrawerOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDrawerOpen(false);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateBadges(state.workspace);
    renderDrawer(state.workspace);

    if (
      document.querySelector("[data-cart-toggle]") ||
      document.body.dataset.cartPagePath ||
      document.body.dataset.checkoutPagePath
    ) {
      void fetchCart({
        silent: true,
      });
    }
  });

  window.ZestCart = {
    addToCart,
    cartCount() {
      return Number(state.workspace && state.workspace.cart && state.workspace.cart.itemCount) || 0;
    },
    clearCart,
    closeDrawer() {
      setDrawerOpen(false);
    },
    fetchCart,
    getState() {
      return state.workspace;
    },
    openDrawer() {
      setDrawerOpen(true);
    },
    removeItem,
    subscribe,
    updateItemQuantity,
  };
})();
