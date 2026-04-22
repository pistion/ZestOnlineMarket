(function () {
  if (window.__zestSearchInitialized) {
    return;
  }
  window.__zestSearchInitialized = true;

  const toast = window.ZestToast || {
    error() {},
  };
  const endpoint = document.body.dataset.searchEndpoint || "/api/search";
  const searchPagePath = "/search";

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

  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      throw new Error((payload && payload.message) || "Search request failed");
    }

    return payload;
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fn(...args);
      }, delay);
    };
  }

  function renderSuggestionList(container, items) {
    if (!container) {
      return;
    }

    if (!Array.isArray(items) || !items.length) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    container.hidden = false;
    container.innerHTML = items
      .map((item) => {
        const imageUrl = item.imageUrl || "/assets/img/buyer/product-viewer/product-1.jpg";
        return `
          <a class="codex-layout-search__suggestion" href="${escapeHtml(item.path || searchPagePath)}">
            <img class="codex-layout-search__thumb" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}">
            <span class="codex-layout-search__text">
              <span class="codex-layout-search__title">${escapeHtml(item.title)}</span>
              <span class="codex-layout-search__meta">${escapeHtml(item.subtitle || item.kind || "")}</span>
            </span>
          </a>
        `;
      })
      .join("");
  }

  function initHeaderSearch() {
    const form = document.querySelector("[data-global-search-form]");
    const input = document.querySelector("[data-global-search-input]");
    const suggestions = document.querySelector("[data-global-search-suggestions]");
    if (!form || !input || !suggestions) {
      return;
    }

    if (window.location.pathname === searchPagePath) {
      const params = new URLSearchParams(window.location.search);
      input.value = params.get("q") || "";
    }

    const loadSuggestions = debounce(async () => {
      const value = String(input.value || "").trim();
      if (value.length < 2) {
        renderSuggestionList(suggestions, []);
        return;
      }

      try {
        const payload = await fetchJson(
          `${endpoint}?${new URLSearchParams({ q: value, limit: "5", type: "all" }).toString()}`
        );
        renderSuggestionList(suggestions, payload.suggestions || []);
      } catch (_error) {
        renderSuggestionList(suggestions, []);
      }
    }, 300);

    input.addEventListener("input", loadSuggestions);
    input.addEventListener("focus", loadSuggestions);
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        renderSuggestionList(suggestions, []);
      }, 160);
    });
    form.addEventListener("submit", (event) => {
      if (!String(input.value || "").trim()) {
        event.preventDefault();
      }
    });
  }

  function renderProductCard(item) {
    return `
      <article class="search-card">
        <div class="search-card__media">
          <img src="${escapeHtml(item.imageUrl || "/assets/img/buyer/product-viewer/product-1.jpg")}" alt="${escapeHtml(item.title)}">
        </div>
        <div class="search-card__body">
          <div class="search-card__meta">
            <span>${escapeHtml(item.templateKey || "products")}</span>
            <span>${Number(item.reviewCount || 0)} reviews</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="search-card__copy">${escapeHtml(item.description || "Open the listing to see the full details.")}</p>
          <div class="search-card__meta">
            <span>${escapeHtml(item.storeName || "Store")}</span>
            <span>${escapeHtml(item.location || item.delivery || "Marketplace listing")}</span>
          </div>
          <strong class="search-card__price">${currency(item.price)}</strong>
          <div class="search-card__actions">
            <a class="search-link" href="${escapeHtml(item.storePath || searchPagePath)}">Open store</a>
            <a class="search-link search-link--primary" href="${escapeHtml(item.productPath || searchPagePath)}">View product</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderStoreCard(item) {
    return `
      <article class="search-store-card">
        <div class="search-store-card__cover">
          <img src="${escapeHtml(item.coverUrl || item.logoUrl || "/assets/img/buyer/product-viewer/product-1.jpg")}" alt="${escapeHtml(item.title)}">
        </div>
        <div class="search-store-card__body">
          <div class="search-store-card__meta">
            <span>${escapeHtml(item.templateKey || "products")}</span>
            <span>${Number(item.productCount || 0)} listings</span>
            <span>${Number(item.reviewCount || 0)} reviews</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="search-store-card__copy">${escapeHtml(item.tagline || item.description || "Explore this storefront.")}</p>
          <div class="search-store-card__meta">
            <span>@${escapeHtml(item.handle || "")}</span>
            <span>${Number(item.followerCount || 0)} followers</span>
          </div>
          <div class="search-store-card__actions">
            <a class="search-link search-link--primary" href="${escapeHtml(item.path || searchPagePath)}">Open store</a>
          </div>
        </div>
      </article>
    `;
  }

  function initSearchPage() {
    const root = document.querySelector("[data-search-root]");
    if (!root) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const refs = {
      form: root.querySelector("[data-search-form]"),
      query: root.querySelector("#searchPageQuery"),
      type: root.querySelector("#searchType"),
      category: root.querySelector("#searchCategory"),
      store: root.querySelector("#searchStore"),
      minPrice: root.querySelector("#searchMinPrice"),
      maxPrice: root.querySelector("#searchMaxPrice"),
      rating: root.querySelector("#searchRating"),
      reset: root.querySelector("[data-search-reset]"),
      title: root.querySelector("#searchResultsTitle"),
      meta: root.querySelector("#searchResultsMeta"),
      state: root.querySelector("#searchState"),
      suggestions: root.querySelector("#searchSuggestions"),
      productsSection: root.querySelector("#searchProductsSection"),
      productsCount: root.querySelector("#searchProductsCount"),
      productsGrid: root.querySelector("#searchProductsGrid"),
      storesSection: root.querySelector("#searchStoresSection"),
      storesCount: root.querySelector("#searchStoresCount"),
      storesGrid: root.querySelector("#searchStoresGrid"),
      pagination: root.querySelector("#searchPagination"),
      paginationLabel: root.querySelector("#searchPaginationLabel"),
      prev: root.querySelector('[data-search-page="prev"]'),
      next: root.querySelector('[data-search-page="next"]'),
    };

    const state = {
      page: 1,
      lastPayload: null,
    };

    [
      ["q", refs.query],
      ["type", refs.type],
      ["category", refs.category],
      ["store", refs.store],
      ["min_price", refs.minPrice],
      ["max_price", refs.maxPrice],
      ["rating", refs.rating],
    ].forEach(([key, element]) => {
      if (element) {
        element.value = params.get(key) || "";
      }
    });

    function buildParams(nextPage = 1) {
      const nextParams = new URLSearchParams();
      const entries = [
        ["q", refs.query && refs.query.value],
        ["type", refs.type && refs.type.value],
        ["category", refs.category && refs.category.value],
        ["store", refs.store && refs.store.value],
        ["min_price", refs.minPrice && refs.minPrice.value],
        ["max_price", refs.maxPrice && refs.maxPrice.value],
        ["rating", refs.rating && refs.rating.value],
      ];

      entries.forEach(([key, value]) => {
        const normalized = String(value || "").trim();
        if (normalized) {
          nextParams.set(key, normalized);
        }
      });

      nextParams.set("page", String(nextPage));
      nextParams.set("limit", "12");
      return nextParams;
    }

    function syncUrl(nextParams) {
      window.history.replaceState({}, "", `${searchPagePath}?${nextParams.toString()}`);
    }

    function renderState(payload) {
      state.lastPayload = payload;
      const products = (payload && payload.products && payload.products.items) || [];
      const stores = (payload && payload.stores && payload.stores.items) || [];
      const productPages = payload && payload.products ? Number(payload.products.totalPages || 0) : 0;
      const storePages = payload && payload.stores ? Number(payload.stores.totalPages || 0) : 0;
      const totalPages = Math.max(productPages, storePages, 1);

      refs.title.textContent = payload.totalResults
        ? `${payload.totalResults} result${payload.totalResults === 1 ? "" : "s"}`
        : payload.meta && payload.meta.shortQuery
          ? "Type at least two characters"
          : "No results yet";
      refs.meta.textContent = payload.query
        ? `Showing ranked results for "${payload.query}".`
        : "Search products and stores to start exploring.";

      if (payload.suggestions && payload.suggestions.length) {
        refs.suggestions.hidden = false;
        refs.suggestions.innerHTML = payload.suggestions
          .map(
            (item) =>
              `<a class="search-suggestion-chip" href="${escapeHtml(item.path || searchPagePath)}">${escapeHtml(item.title)}</a>`
          )
          .join("");
      } else {
        refs.suggestions.hidden = true;
        refs.suggestions.innerHTML = "";
      }

      if (!payload.meta.hasQuery && !payload.meta.hasActiveFilters) {
        refs.state.hidden = false;
        refs.state.innerHTML = "<p>Use the search box above or the filters on the left to explore listings and storefronts.</p>";
      } else if (payload.meta.shortQuery) {
        refs.state.hidden = false;
        refs.state.innerHTML = "<p>Type at least two characters to get ranked suggestions and full results.</p>";
      } else if (!payload.totalResults) {
        refs.state.hidden = false;
        refs.state.innerHTML = "<p>No results matched those filters. Try widening the price range or clearing a filter.</p>";
      } else {
        refs.state.hidden = true;
        refs.state.innerHTML = "";
      }

      refs.productsSection.hidden = !products.length;
      refs.productsCount.textContent = String(payload.products.total || products.length || 0);
      refs.productsGrid.innerHTML = products.map(renderProductCard).join("");

      refs.storesSection.hidden = !stores.length;
      refs.storesCount.textContent = String(payload.stores.total || stores.length || 0);
      refs.storesGrid.innerHTML = stores.map(renderStoreCard).join("");

      refs.pagination.hidden = !payload.totalResults;
      refs.paginationLabel.textContent = `Page ${state.page} of ${totalPages}`;
      refs.prev.disabled = state.page <= 1;
      refs.next.disabled = state.page >= totalPages;
    }

    async function loadResults(nextPage = 1) {
      state.page = nextPage;
      const nextParams = buildParams(nextPage);
      syncUrl(nextParams);
      refs.state.hidden = false;
      refs.state.innerHTML = "<p>Loading search results...</p>";

      try {
        const payload = await fetchJson(`${endpoint}?${nextParams.toString()}`);
        renderState(payload);
      } catch (error) {
        refs.state.hidden = false;
        refs.state.innerHTML = "<p>We could not load search results right now.</p>";
        toast.error(error.message || "Search failed.");
      }
    }

    refs.form.addEventListener("submit", (event) => {
      event.preventDefault();
      loadResults(1);
    });

    refs.reset.addEventListener("click", () => {
      [refs.query, refs.type, refs.category, refs.store, refs.minPrice, refs.maxPrice, refs.rating].forEach((element) => {
        if (element) {
          element.value = "";
        }
      });
      if (refs.type) {
        refs.type.value = "all";
      }
      if (refs.rating) {
        refs.rating.value = "0";
      }
      loadResults(1);
    });

    refs.prev.addEventListener("click", () => {
      if (state.page > 1) {
        loadResults(state.page - 1);
      }
    });

    refs.next.addEventListener("click", () => {
      const productPages = state.lastPayload && state.lastPayload.products
        ? Number(state.lastPayload.products.totalPages || 0)
        : 0;
      const storePages = state.lastPayload && state.lastPayload.stores
        ? Number(state.lastPayload.stores.totalPages || 0)
        : 0;
      const totalPages = Math.max(productPages, storePages, 1);
      if (state.page < totalPages) {
        loadResults(state.page + 1);
      }
    });

    loadResults(Number(params.get("page") || 1));
  }

  initHeaderSearch();
  initSearchPage();
})();
