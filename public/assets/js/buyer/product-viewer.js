(function () {
  const mainImage = document.getElementById("product-image");
  const thumbnailRow = document.getElementById("thumbnail-row");
  const prevButton = document.getElementById("prev-btn");
  const nextButton = document.getElementById("next-btn");
  const quantityDecrease = document.getElementById("qty-decrease");
  const quantityIncrease = document.getElementById("qty-increase");
  const quantityInput = document.getElementById("qty-input");
  const tabContent = document.getElementById("tab-content");
  const tabLinks = Array.from(document.querySelectorAll(".tab-link"));
  const lightbox = document.getElementById("lightbox");
  const lightboxBackdrop = document.getElementById("lightbox-backdrop");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");
  const viewerStatusPanel = document.getElementById("viewerStatusPanel");
  const viewerStatusText = document.getElementById("viewerStatusText");
  const variantPanel = document.getElementById("viewer-variant-panel");
  const variantList = document.getElementById("viewer-variant-list");
  const variantNote = document.getElementById("viewer-variant-note");
  const selectedVariantMeta = document.getElementById("viewer-meta-selected-option");
  const selectedVariantPill = document.getElementById("viewer-selected-variant-pill");
  const addToCartButton = document.getElementById("add-to-cart-btn");
  const wishlistButton = document.getElementById("viewer-wishlist-btn");
  const stockCopy = document.getElementById("viewer-stock-copy");
  const stockIndicator = document.querySelector(".stock-indicator");
  const reviewsStatusPanel = document.getElementById("reviewsStatusPanel");
  const reviewsStatusText = document.getElementById("reviewsStatusText");
  const reviewsAverageRating = document.getElementById("reviewsAverageRating");
  const reviewsAverageMeta = document.getElementById("reviewsAverageMeta");
  const reviewBreakdown = document.getElementById("reviewBreakdown");
  const reviewForm = document.getElementById("reviewForm");
  const reviewRating = document.getElementById("reviewRating");
  const reviewTitle = document.getElementById("reviewTitle");
  const reviewBody = document.getElementById("reviewBody");
  const reviewSubmitBtn = document.getElementById("reviewSubmitBtn");
  const reviewEligibilityNote = document.getElementById("reviewEligibilityNote");
  const reviewsList = document.getElementById("reviewsList");

  const buyerInteractions = window.ZestBuyerInteractions || null;
  const buyerCart = window.ZestCart || null;
  const buyerWishlist = window.ZestBuyerWishlist || null;

  let productImages = [];
  let currentImageIndex = 0;
  let currentProduct = null;
  let currentStore = null;
  let currentVariant = null;
  let currentQuantity = 1;
  let currentReviewViewer = null;

  function currency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
  }

  function getProductId() {
    return Number(document.body.dataset.productId || 0);
  }

  function getBaseCheckoutPath() {
    return document.body.dataset.checkoutPath || "/buyer/cart";
  }

  function getRequestedVariantId() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("variantId") || 0);
  }

  function getEffectivePrice() {
    if (currentVariant && currentVariant.priceOverride != null) {
      return Number(currentVariant.priceOverride || 0);
    }

    return Number((currentProduct && currentProduct.price) || 0);
  }

  function getEffectiveStock() {
    if (currentVariant) {
      return Number(currentVariant.stockQuantity || 0) || 0;
    }

    return Number((currentProduct && currentProduct.stockQuantity) || 0) || 0;
  }

  function checkoutHref() {
    const basePath = getBaseCheckoutPath();
    const url = new URL(basePath, window.location.origin);
    if (currentProduct && currentProduct.id) {
      url.searchParams.set("productId", String(currentProduct.id));
    }
    if (currentVariant && currentVariant.id) {
      url.searchParams.set("variantId", String(currentVariant.id));
    }

    return `${url.pathname}${url.search}`;
  }

  function setViewerStatus(mode = "hidden", message = "") {
    if (!viewerStatusPanel) {
      return;
    }

    if (mode === "hidden") {
      viewerStatusPanel.hidden = true;
      return;
    }

    const variant =
      mode === "error"
        ? "ui-state--error"
        : mode === "success"
          ? "ui-state--success"
          : "ui-state--empty";

    viewerStatusPanel.hidden = false;
    viewerStatusPanel.className = `ui-state ${variant} product-status`;

    if (viewerStatusText) {
      viewerStatusText.textContent = message;
    }
  }

  function setReviewsStatus(mode = "empty", message = "") {
    if (!reviewsStatusPanel || !reviewsStatusText) {
      return;
    }

    const variant =
      mode === "error"
        ? "ui-state--error"
        : mode === "success"
          ? "ui-state--success"
          : "ui-state--empty";

    reviewsStatusPanel.hidden = mode === "hidden";
    reviewsStatusPanel.className = `ui-state ${variant} product-status`;
    reviewsStatusText.textContent = message;
  }

  function trackBuyerSignal(payload, options = {}) {
    if (!buyerInteractions || typeof buyerInteractions.track !== "function") {
      return;
    }

    buyerInteractions.track(payload, options);
  }

  function syncWishlistButton() {
    if (!wishlistButton || !currentProduct) {
      return;
    }

    const saved = buyerWishlist && typeof buyerWishlist.has === "function"
      ? buyerWishlist.has(currentProduct.id)
      : false;

    wishlistButton.textContent = saved ? "Saved to wishlist" : "Save to wishlist";
    wishlistButton.classList.toggle("is-active", saved);
    wishlistButton.setAttribute("aria-pressed", saved ? "true" : "false");
  }

  function showImage(index) {
    if (!productImages.length) {
      return;
    }

    currentImageIndex = (index + productImages.length) % productImages.length;
    const activeImage = productImages[currentImageIndex];
    const imageUrl = activeImage.url || activeImage.src || activeImage.imageUrl || "";

    if (mainImage) {
      mainImage.src = imageUrl;
      mainImage.alt = activeImage.alt || currentProduct?.title || "Product image";
    }

    if (lightboxImage) {
      lightboxImage.src = imageUrl;
      lightboxImage.alt = activeImage.alt || currentProduct?.title || "Product image";
    }

    thumbnailRow?.querySelectorAll(".thumb").forEach((thumb, thumbIndex) => {
      thumb.classList.toggle("active", thumbIndex === currentImageIndex);
      thumb.setAttribute("aria-current", thumbIndex === currentImageIndex ? "true" : "false");
    });
  }

  function renderThumbnails(images) {
    if (!thumbnailRow) {
      return;
    }

    thumbnailRow.innerHTML = images
      .map((image, index) => {
        const imageUrl = image.url || image.src || image.imageUrl || "";
        const alt = image.alt || `Thumbnail ${index + 1}`;
        const activeClass = index === currentImageIndex ? " active" : "";
        return `
          <button class="thumb-button" type="button" aria-label="View image ${index + 1}">
            <img src="${imageUrl}" class="thumb${activeClass}" data-index="${index}" alt="${alt}">
          </button>
        `;
      })
      .join("");

    thumbnailRow.querySelectorAll(".thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        showImage(Number(thumb.dataset.index || 0));
      });
    });
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (!element) {
      return;
    }

    element.textContent = value;
  }

  function setLink(selector, href, text) {
    const element = document.querySelector(selector);
    if (!element) {
      return;
    }

    element.href = href;
    if (text) {
      element.textContent = text;
    }
  }

  function normalizeVariants() {
    const variants = Array.isArray(currentProduct && currentProduct.variants) ? currentProduct.variants : [];
    return variants.map((variant) => ({
      id: Number(variant.id || 0) || 0,
      label: String(variant.label || "Option").trim() || "Option",
      sku: String(variant.sku || "").trim(),
      priceOverride:
        variant.priceOverride === null || variant.priceOverride === undefined || variant.priceOverride === ""
          ? null
          : Number(variant.priceOverride || 0),
      stockQuantity: Number(variant.stockQuantity || 0) || 0,
    }));
  }

  function setSelectedVariant(variantId) {
    const variants = normalizeVariants();
    if (!variants.length) {
      currentVariant = null;
      if (variantPanel) {
        variantPanel.hidden = true;
      }
      if (selectedVariantMeta) {
        selectedVariantMeta.hidden = true;
      }
      return;
    }

    const requestedId = Number(variantId || 0);
    currentVariant =
      variants.find((variant) => variant.id === requestedId) ||
      variants.find((variant) => variant.stockQuantity > 0) ||
      variants[0];

    if (variantPanel) {
      variantPanel.hidden = false;
    }

    if (selectedVariantMeta) {
      selectedVariantMeta.hidden = false;
    }

    if (selectedVariantPill) {
      selectedVariantPill.textContent = currentVariant.label;
    }

    if (variantNote) {
      variantNote.textContent =
        currentVariant.stockQuantity > 0
          ? `${currentVariant.stockQuantity} available for ${currentVariant.label}.`
          : `${currentVariant.label} is currently out of stock.`;
    }

    if (variantList) {
      variantList.innerHTML = variants
        .map((variant) => {
          const isActive = currentVariant && variant.id === currentVariant.id;
          const stockLabel =
            variant.stockQuantity > 0
              ? `${variant.stockQuantity} in stock`
              : "Out of stock";
          const priceLabel =
            variant.priceOverride != null
              ? currency(variant.priceOverride)
              : currency(currentProduct.price);
          return `
            <button
              class="pill${isActive ? " active" : ""}"
              type="button"
              data-variant-id="${variant.id}"
              aria-pressed="${isActive ? "true" : "false"}"
            >
              ${variant.label} / ${priceLabel} / ${stockLabel}
            </button>
          `;
        })
        .join("");

      variantList.querySelectorAll("[data-variant-id]").forEach((button) => {
        button.addEventListener("click", () => {
          setSelectedVariant(Number(button.getAttribute("data-variant-id") || 0));
          syncPurchaseState();
          renderTabs();
        });
      });
    }
  }

  function syncQuantity() {
    const maxStock = Math.max(getEffectiveStock(), 1);
    currentQuantity = Math.min(Math.max(Number(currentQuantity || 1), 1), maxStock);
    if (quantityInput) {
      quantityInput.value = String(currentQuantity);
    }
  }

  function syncPurchaseState() {
    const price = getEffectivePrice();
    const stock = getEffectiveStock();
    const variantLabel = currentVariant ? currentVariant.label : "Standard listing";
    const badgeCopy = currentVariant ? "Variant selected" : "Live listing";

    setText("#viewer-price-current", currency(price));
    setText("#viewer-price-old", "");
    setText("#viewer-price-badge", badgeCopy);

    if (selectedVariantPill) {
      selectedVariantPill.textContent = variantLabel;
    }

    if (stockCopy) {
      stockCopy.textContent =
        stock > 0
          ? currentVariant
            ? `${variantLabel} is ready now with ${stock} available`
            : `${stock} available right now`
          : currentVariant
            ? `${variantLabel} is currently out of stock`
            : "This listing is currently out of stock";
    }

    if (stockIndicator) {
      stockIndicator.classList.toggle("in-stock", stock > 0);
      stockIndicator.classList.toggle("out-of-stock", stock <= 0);
    }

    if (addToCartButton) {
      addToCartButton.disabled = stock <= 0;
      addToCartButton.textContent = stock > 0 ? "Add to cart" : "Out of stock";
    }

    syncQuantity();
  }

  function renderTabs() {
    if (!tabContent || !currentProduct || !currentStore) {
      return;
    }

    const variants = normalizeVariants();
    const variantSummary = variants.length
      ? `Options: ${variants.map((variant) => `${variant.label} (${variant.stockQuantity})`).join(", ")}`
      : "Standard single-option listing.";
    const specs = currentProduct.description || "Product details will appear here once the seller expands this listing.";
    const shipping = currentProduct.location
      ? `Pickup and dispatch are coordinated from ${currentProduct.location}.`
      : "The seller will confirm pickup and delivery handling once you continue to checkout.";
    const delivery = currentProduct.delivery || "Delivery arrangements are confirmed directly with the seller during checkout.";
    const seller = currentStore.about || "Visit the storefront to learn more about this seller.";

    const tabMap = {
      specs: `${specs}\n\n${variantSummary}`,
      shipping,
      delivery,
      seller,
    };

    const activeTab = tabLinks.find((link) => link.classList.contains("active"))?.dataset.tab || "specs";
    const activeContent = String(tabMap[activeTab] || tabMap.specs)
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("");
    tabContent.innerHTML = activeContent;
  }

  function formatStars(rating) {
    const normalized = Math.max(0, Math.min(5, Number(rating || 0)));
    const filled = "★".repeat(Math.round(normalized));
    const empty = "☆".repeat(Math.max(0, 5 - Math.round(normalized)));
    return `${filled}${empty}`;
  }

  function renderReviewBreakdown(summary) {
    if (!reviewBreakdown) {
      return;
    }

    const breakdown = summary && summary.breakdown ? summary.breakdown : {};
    reviewBreakdown.innerHTML = [5, 4, 3, 2, 1]
      .map((rating) => {
        const count = Number(breakdown[rating] || 0);
        return `
          <div class="review-breakdown__row">
            <span>${rating} star</span>
            <div class="review-breakdown__bar">
              <span style="width:${Math.min(100, count * 12)}%"></span>
            </div>
            <strong>${count}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderEligibility(viewer) {
    currentReviewViewer = viewer || null;
    if (!reviewForm || !reviewEligibilityNote) {
      return;
    }

    reviewForm.hidden = true;
    reviewEligibilityNote.hidden = true;
    reviewEligibilityNote.textContent = "";

    if (!viewer) {
      return;
    }

    if (!viewer.signedIn) {
      reviewEligibilityNote.hidden = false;
      reviewEligibilityNote.textContent = "Sign in with a buyer account after purchase to leave a review.";
      return;
    }

    if (viewer.role !== "buyer") {
      reviewEligibilityNote.hidden = false;
      reviewEligibilityNote.textContent = "Reviews can only be submitted from buyer accounts.";
      return;
    }

    if (viewer.canReview) {
      reviewForm.hidden = false;
      return;
    }

    reviewEligibilityNote.hidden = false;
    reviewEligibilityNote.textContent = viewer.hasReviewed
      ? "You already reviewed this product."
      : viewer.hasDeliveredPurchase
        ? "This review is already on file."
        : "Reviews unlock once your order is marked as delivered.";
  }

  function renderReviewList(items) {
    if (!reviewsList) {
      return;
    }

    if (!Array.isArray(items) || !items.length) {
      reviewsList.innerHTML = `
        <article class="review-empty-card">
          <h3>No reviews yet</h3>
          <p>This product has not received buyer feedback yet.</p>
        </article>
      `;
      return;
    }

    reviewsList.innerHTML = items
      .map((item) => `
        <article class="review-card review-card--enhanced">
          <div class="review-header">
            <div>
              <div class="review-name">${escapeHtml(item.reviewerName || "Buyer")}</div>
              <div class="review-stars">${escapeHtml(formatStars(item.rating))} <span>${Number(item.rating || 0).toFixed(1)}</span></div>
            </div>
            <div class="review-date">${escapeHtml(new Date(item.createdAt || Date.now()).toLocaleDateString())}</div>
          </div>
          ${item.title ? `<h3 class="review-card__title">${escapeHtml(item.title)}</h3>` : ""}
          <p class="review-body">${escapeHtml(item.body || "")}</p>
          <div class="review-footer">
            ${item.isOwner ? `<button class="review-delete-btn" type="button" data-review-delete="${Number(item.id || 0)}">Delete review</button>` : ""}
          </div>
        </article>
      `)
      .join("");
  }

  async function loadReviews() {
    if (!currentProduct || !currentProduct.id) {
      return;
    }

    setReviewsStatus("empty", "Loading review summary and buyer feedback.");
    try {
      const response = await fetch(`/api/products/${currentProduct.id}/reviews`, {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.success === false) {
        throw new Error((data && data.message) || "Could not load reviews");
      }

      const payload = data;
      const summary = payload.summary || {};
      if (reviewsAverageRating) {
        reviewsAverageRating.textContent = Number(summary.averageRating || 0).toFixed(1);
      }
      if (reviewsAverageMeta) {
        reviewsAverageMeta.textContent = `${Number(summary.reviewCount || 0)} review${Number(summary.reviewCount || 0) === 1 ? "" : "s"}`;
      }
      renderReviewBreakdown(summary);
      renderEligibility(payload.viewer || null);
      renderReviewList(payload.reviews || []);
      setReviewsStatus("success", payload.reviews && payload.reviews.length
        ? "Loaded buyer reviews and rating summary."
        : "This product does not have reviews yet.");
    } catch (error) {
      renderEligibility(null);
      renderReviewList([]);
      setReviewsStatus("error", error.message || "Could not load reviews.");
    }
  }

  async function submitReview() {
    if (!currentProduct || !currentProduct.id) {
      return;
    }

    reviewSubmitBtn.disabled = true;
    setReviewsStatus("empty", "Submitting your review.");

    try {
      const response = await fetch(`/api/products/${currentProduct.id}/reviews`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: Number(reviewRating.value || 0),
          title: reviewTitle.value.trim(),
          body: reviewBody.value.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.success === false) {
        throw new Error((data && data.message) || "Could not submit your review");
      }

      reviewForm.reset();
      await loadReviews();
      setReviewsStatus("success", "Your review was submitted.");
    } catch (error) {
      setReviewsStatus("error", error.message || "Could not submit your review.");
    } finally {
      reviewSubmitBtn.disabled = false;
    }
  }

  async function deleteReview(reviewId) {
    if (!currentProduct || !currentProduct.id || !reviewId) {
      return;
    }

    setReviewsStatus("empty", "Removing your review.");
    try {
      const response = await fetch(`/api/products/${currentProduct.id}/reviews/${reviewId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.success === false) {
        throw new Error((data && data.message) || "Could not remove your review");
      }

      await loadReviews();
      setReviewsStatus("success", "Your review was removed.");
    } catch (error) {
      setReviewsStatus("error", error.message || "Could not remove your review.");
    }
  }

  async function loadProduct() {
    const productId = getProductId();
    if (!productId) {
      setViewerStatus("error", "No listing was selected. Return to the marketplace or seller storefront and open a product first.");
      setText("#viewer-product-title", "Product not found");
      setText("#viewer-product-subtitle", "The requested listing could not be identified.");
      setText("#viewer-product-summary", "Return to the marketplace or reopen a seller storefront to choose another listing.");
      document.title = "Product not found | Zest Marketplace";
      return;
    }

    setViewerStatus("loading", "We are loading the latest listing details, media, and store information.");

    const response = await fetch(`/api/products/${productId}`, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error((data && data.message) || "Failed to load product");
    }

    currentProduct = data.product || {};
    currentStore = data.store || {};
    productImages = (data.images || [])
      .map((image) => ({
        ...image,
        url: image.url || image.src || image.imageUrl || "",
      }))
      .filter((image) => image.url);

    if (!productImages.length) {
      productImages = [
        {
          url: "/assets/img/buyer/product-viewer/product-1.jpg",
          alt: currentProduct.title || "Product image",
        },
      ];
    }

    currentImageIndex = 0;
    currentQuantity = 1;
    showImage(0);
    renderThumbnails(productImages);

    const productTitle = currentProduct.title || currentProduct.name || "Live listing";
    const storeName = currentStore.storeName || "Zest Store";
    const storeHandle = currentStore.handle ? `@${currentStore.handle}` : "Seller";
    const summary =
      currentProduct.description ||
      "This listing is ready to review and continue through checkout.";

    setText("#viewer-store-name", storeName);
    setText("#viewer-product-title", productTitle);
    setText("#viewer-product-subtitle", `${storeName} | ${storeHandle}`);
    setText("#viewer-price-current", currency(currentProduct.price));
    setText("#viewer-price-old", "");
    setText("#viewer-price-badge", "Live listing");
    setText("#viewer-product-summary", summary);
    setLink("#viewer-store-link", `/stores/${currentStore.handle || ""}`, storeName);
    setLink("#viewer-store-pill", `/stores/${currentStore.handle || ""}`, "Open store");
    setLink("#back-to-store-btn", `/stores/${currentStore.handle || ""}`, "Back to store");

    setSelectedVariant(getRequestedVariantId());
    syncPurchaseState();
    renderTabs();
    if (buyerWishlist && typeof buyerWishlist.init === "function") {
      await buyerWishlist.init({ silent: true });
    }
    syncWishlistButton();
    document.title = `${productTitle} | Zest Marketplace`;

    trackBuyerSignal(
      {
        action: "view_product",
        source: "product-viewer",
        catalogItemId: currentProduct.id,
        storeHandle: currentStore.handle || "",
        templateKey: currentStore.templateKey || "products",
        itemType: currentProduct.itemType || currentStore.templateKey || "product",
      },
      { fireAndForget: true }
    );

    setViewerStatus(
      "success",
      `Loaded ${productTitle} from ${storeName}. You can review media, choose an option, adjust quantity, and continue to checkout.`
    );
    await loadReviews();
  }

  prevButton?.addEventListener("click", () => {
    showImage(currentImageIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    showImage(currentImageIndex + 1);
  });

  mainImage?.addEventListener("click", () => {
    if (!lightbox || !lightboxImage || !productImages.length) {
      return;
    }

    lightbox.classList.add("open");
    lightboxImage.src = productImages[currentImageIndex].url;
    lightboxImage.alt = productImages[currentImageIndex].alt || currentProduct?.title || "Product image";
  });

  lightboxBackdrop?.addEventListener("click", () => {
    lightbox?.classList.remove("open");
  });

  lightboxClose?.addEventListener("click", () => {
    lightbox?.classList.remove("open");
  });

  quantityDecrease?.addEventListener("click", () => {
    currentQuantity = Math.max(1, Number(currentQuantity || 1) - 1);
    syncQuantity();
  });

  quantityIncrease?.addEventListener("click", () => {
    currentQuantity = Math.min(Math.max(getEffectiveStock(), 1), Number(currentQuantity || 1) + 1);
    syncQuantity();
  });

  tabLinks.forEach((link) => {
    link.addEventListener("click", () => {
      tabLinks.forEach((candidate) => candidate.classList.remove("active"));
      link.classList.add("active");
      renderTabs();
    });
  });

  addToCartButton?.addEventListener("click", async () => {
    if (!currentProduct || !currentProduct.id) {
      return;
    }

    if (!buyerCart || typeof buyerCart.addToCart !== "function") {
      window.location.href = checkoutHref();
      return;
    }

    try {
      const result = await buyerCart.addToCart(
        {
          productId: currentProduct.id,
          variantId: currentVariant ? currentVariant.id : 0,
          quantity: currentQuantity,
        },
        {
          authRedirect: checkoutHref(),
          openDrawer: true,
        }
      );

      if (result && result.authRedirected) {
        return;
      }

      setViewerStatus(
        "success",
        `${currentProduct.title || "Listing"} was added to your cart.`
      );
    } catch (error) {
      setViewerStatus("error", error.message || "We could not add this listing to your cart.");
    }
  });

  reviewForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitReview();
  });

  reviewsList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-delete]");
    if (!button) {
      return;
    }

    void deleteReview(Number(button.getAttribute("data-review-delete") || 0));
  });

  wishlistButton?.addEventListener("click", async () => {
    if (!buyerWishlist || !currentProduct || !currentProduct.id) {
      return;
    }

    try {
      const result = await buyerWishlist.toggle(currentProduct.id);
      if (result && result.authRequired) {
        return;
      }

      syncWishlistButton();
      setViewerStatus(
        "success",
        result && result.saved
          ? "Listing saved to your buyer wishlist."
          : "Listing removed from your buyer wishlist."
      );
    } catch (error) {
      setViewerStatus("error", error.message || "We could not update your wishlist.");
    }
  });

  window.addEventListener("zest:wishlist-changed", () => {
    syncWishlistButton();
  });

  loadProduct().catch(() => {
    setViewerStatus(
      "error",
      "We could not load this listing. Return to the marketplace or reopen the seller storefront."
    );
    setText("#viewer-product-title", "Product unavailable");
    setText("#viewer-product-subtitle", "The listing could not be loaded.");
    setText(
      "#viewer-product-summary",
      "We could not load this listing. Please return to the store and try again."
    );
    document.title = "Product unavailable | Zest Marketplace";
    setReviewsStatus("error", "Reviews could not be loaded because the product is unavailable.");
  });
})();
