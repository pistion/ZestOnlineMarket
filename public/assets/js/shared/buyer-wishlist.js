(function () {
  const state = {
    items: [],
    initialized: false,
    signedIn: false,
  };

  function dispatchChange() {
    window.dispatchEvent(
      new CustomEvent("zest:wishlist-changed", {
        detail: {
          items: [...state.items],
          ids: state.items.map((item) => Number(item.productId)).filter(Boolean),
        },
      })
    );
  }

  function buildSignInPath() {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    return `/auth/signin?role=buyer&returnTo=${returnTo}`;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      const error = new Error((payload && payload.message) || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function syncFromPayload(payload) {
    state.items = Array.isArray(payload && payload.wishlist) ? payload.wishlist : [];
    state.signedIn = true;
    state.initialized = true;
    dispatchChange();
    return state.items;
  }

  async function init(options = {}) {
    if (state.initialized && !options.force) {
      return state.items;
    }

    try {
      const payload = await requestJson("/api/buyer/wishlist");
      return syncFromPayload(payload);
    } catch (error) {
      state.items = [];
      state.initialized = true;
      state.signedIn = false;
      if (!options.silent && error.status !== 401 && error.status !== 403) {
        throw error;
      }
      return state.items;
    }
  }

  function list() {
    return [...state.items];
  }

  function ids() {
    return state.items.map((item) => Number(item.productId)).filter(Boolean);
  }

  function has(productId) {
    const targetId = Number(productId || 0);
    return ids().includes(targetId);
  }

  async function add(productId) {
    try {
      const payload = await requestJson("/api/buyer/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: Number(productId || 0),
        }),
      });

      syncFromPayload(payload);
      return {
        saved: true,
        wishlist: list(),
      };
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        window.location.href = buildSignInPath();
        return {
          saved: false,
          authRequired: true,
        };
      }
      throw error;
    }
  }

  async function remove(productId) {
    try {
      const payload = await requestJson(`/api/buyer/wishlist/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });

      syncFromPayload(payload);
      return {
        saved: false,
        wishlist: list(),
      };
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        window.location.href = buildSignInPath();
        return {
          saved: false,
          authRequired: true,
        };
      }
      throw error;
    }
  }

  async function toggle(productId) {
    if (has(productId)) {
      return remove(productId);
    }

    return add(productId);
  }

  window.ZestBuyerWishlist = {
    add,
    has,
    ids,
    init,
    isSignedIn() {
      return state.signedIn;
    },
    list,
    remove,
    toggle,
  };
})();
