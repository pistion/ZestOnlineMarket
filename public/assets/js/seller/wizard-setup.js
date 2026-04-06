document.addEventListener("DOMContentLoaded", () => {
  const TEMPLATE_KEYS = new Set([
    "products",
    "art",
    "music",
    "photography",
    "programmer",
    "classes",
    "consultations",
  ]);
  const TEMPLATE_META = {
    products: {
      label: "Products Store",
      family: "Physical products",
      summary:
        "Built for inventory-led selling with product galleries, catalog-first browsing, and featured drops.",
      previewPath: "/seller/templates/products",
    },
    art: {
      label: "Art and Design",
      family: "Creative services",
      summary:
        "Best for portfolio-led storefronts, commissions, and creative project storytelling.",
      previewPath: "/seller/templates/art",
    },
    music: {
      label: "Music Services",
      family: "Creative services",
      summary:
        "Designed for lessons, production offers, beats, and music-first service promotion.",
      previewPath: "/seller/templates/music",
    },
    photography: {
      label: "Photography Studio",
      family: "Creative services",
      summary:
        "Works well for events, studio shoots, editing packages, and visual-first service offers.",
      previewPath: "/seller/templates/photography",
    },
    programmer: {
      label: "Developer Profile",
      family: "Professional services",
      summary:
        "Made for coding offers, consulting, automations, and portfolio-style proof of work.",
      previewPath: "/seller/templates/programmer",
    },
    classes: {
      label: "Classes Studio",
      family: "Education",
      summary:
        "Structured for lessons, recurring sessions, class highlights, and teaching-led storefronts.",
      previewPath: "/seller/templates/classes",
    },
    consultations: {
      label: "Consultations Studio",
      family: "Education",
      summary:
        "Focused on coaching, one-on-one sessions, expert advice, and appointment-led offerings.",
      previewPath: "/seller/templates/classes",
    },
  };

  function normalizeTemplateKey(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return TEMPLATE_KEYS.has(normalized) ? normalized : "";
  }

  function getRequestedTemplate() {
    const fromBody = normalizeTemplateKey(document.body.dataset.selectedTemplate);
    if (fromBody) {
      return fromBody;
    }

    const params = new URLSearchParams(window.location.search);
    return normalizeTemplateKey(params.get("template"));
  }

  const flowMode = document.body.dataset.sellerFlowMode === "settings" ? "settings" : "onboarding";
  const endpoints = {
    store: document.body.dataset.sellerStoreEndpoint || "/api/store/me",
    draft: document.body.dataset.sellerDraftEndpoint || "/api/seller/store/draft",
    settings: document.body.dataset.sellerSettingsEndpoint || "/api/store",
    visibility: document.body.dataset.sellerVisibilityEndpoint || "/api/seller/store/visibility",
  };
  const paths = {
    dashboard: document.body.dataset.sellerDashboardPath || "/seller/dashboard",
    settings: document.body.dataset.sellerSettingsPath || "/seller/store/settings",
    templateManager:
      document.body.dataset.sellerTemplateManagerPath || "/seller/store/template",
  };

  const state = {
    templateKey: getRequestedTemplate() || "products",
    step: 1,
    profileCompleted: false,
    visibilityStatus: "draft",
    storeName: "",
    handle: "",
    tagline: "",
    about: "",
    accentColor: "#2563eb",
    avatarUrl: "",
    coverUrl: "",
    socials: {
      instagram: "",
      facebook: "",
      tiktok: "",
      xhandle: "",
    },
    product: {
      name: "",
      description: "",
      price: "",
      delivery: "",
      location: "",
      transportFee: "",
      images: [],
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const stepTabs = Array.from(document.querySelectorAll(".step-tab"));
  const stepCards = Array.from(document.querySelectorAll(".step"));
  const actionButtons = Array.from(document.querySelectorAll(".step-actions .btn"));
  const wizardRoot = $("#wizardRoot");
  const finalPreview = $("#finalPreview");
  const wizardStatus = $("#wizardStatus");
  const wizardHeader = $(".wizard-header");
  const wizardTitle = $(".wizard-title");
  const wizardSubtitle = $(".wizard-subtitle");
  const wizardBadge = $(".wizard-badge");
  const wizardTitleBlock = $(".wizard-title-block");
  const templateNameEl = $("#wizardTemplateName");
  const templateDescriptionEl = $("#wizardTemplateDescription");
  const templateFamilyEl = $("#wizardTemplateFamily");
  const templateChangeLink = $("#wizardChangeTemplateLink");
  const templatePreviewLink = $("#wizardPreviewTemplateLink");

  const storeNameInput = $("#storeName");
  const handleInput = $("#handle");
  const taglineInput = $("#tagline");
  const logoFileInput = $("#logoFile");
  const coverFileInput = $("#coverFile");
  const accentColorInput = $("#accentColor");
  const aboutInput = $("#about");
  const instagramInput = $("#instagram");
  const facebookInput = $("#facebook");
  const tiktokInput = $("#tiktok");
  const xhandleInput = $("#xhandle");
  const productNameInput = $("#productName");
  const productDescriptionInput = $("#productDescription");
  const productPriceInput = $("#productPrice");
  const transportFeeInput = $("#transportFee");
  const deliveryInfoInput = $("#deliveryInfo");
  const businessLocationInput = $("#businessLocation");
  const productImagesInput = $("#productImages");

  const pvCover = $("#pvCover");
  const pvAvatar = $("#pvAvatar");
  const pvName = $("#pvName");
  const pvHandle = $("#pvHandle");
  const pvTagline = $("#pvTagline");
  const pvAbout = $("#pvAbout");
  const pvSocialText = $("#pvSocialText");
  const pvProductName = $("#pvProductName");
  const pvProductDescription = $("#pvProductDescription");
  const pvProductPrice = $("#pvProductPrice");
  const pvDeliveryLocation = $("#pvDeliveryLocation");
  const pvBusinessLocation = $("#pvBusinessLocation");
  const pvTransportPrice = $("#pvTransportPrice");
  const pvProductImages = $("#pvProductImages");
  const pvProductImageGrid = $("#pvProductImageGrid");

  const finalCover = $("#finalCover");
  const finalAvatar = $("#finalAvatar");
  const finalName = $("#finalName");
  const finalHandle = $("#finalHandle");
  const finalTagline = $("#finalTagline");
  const finalAbout = $("#finalAbout");
  const finalSocialRow = $("#finalSocialRow");
  const finalProductName = $("#finalProductName");
  const finalProductDescription = $("#finalProductDescription");
  const finalProductPrice = $("#finalProductPrice");
  const finalDeliveryLocation = $("#finalDeliveryLocation");
  const finalBusinessLocation = $("#finalBusinessLocation");
  const finalTransportPrice = $("#finalTransportPrice");
  const finalProductImages = $("#finalProductImages");
  const finalBack = $("#finalBack");
  const finalVisit = $("#finalVisit");
  const finalStatus = $("#finalStatus");

  const productModal = $("#productModal");
  const productClose = document.querySelector(".product-close");
  const productZoomToggle = $("#productZoomToggle");
  const productSlider = $("#productSlider");
  const productPrev = $("#productPrev");
  const productNext = $("#productNext");
  const productIndicators = document.querySelector(".product-modal-indicators");
  const productCaption = $("#productCaption");

  const headerActions = (() => {
    if (!wizardHeader) {
      return null;
    }

    let actions = wizardHeader.querySelector(".wizard-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "wizard-header-actions";
      if (wizardBadge && wizardBadge.parentElement === wizardHeader) {
        wizardHeader.replaceChild(actions, wizardBadge);
        actions.appendChild(wizardBadge);
      } else {
        wizardHeader.appendChild(actions);
      }
    }

    let dashboardLink = actions.querySelector("#wizardDashboardLink");
    if (!dashboardLink) {
      dashboardLink = document.createElement("a");
      dashboardLink.id = "wizardDashboardLink";
      dashboardLink.className = "btn ghost btn-inline";
      dashboardLink.href = paths.dashboard;
      dashboardLink.textContent = "Dashboard";
      actions.prepend(dashboardLink);
    }

    let visibilityBtn = actions.querySelector("#wizardVisibilityBtn");
    if (!visibilityBtn) {
      visibilityBtn = document.createElement("button");
      visibilityBtn.id = "wizardVisibilityBtn";
      visibilityBtn.type = "button";
      visibilityBtn.className = "btn ghost btn-inline";
      visibilityBtn.hidden = true;
      actions.insertBefore(visibilityBtn, dashboardLink.nextSibling);
    }

    let saveHint = wizardTitleBlock && wizardTitleBlock.querySelector("#wizardAutoSaveStatus");
    if (!saveHint && wizardTitleBlock) {
      saveHint = document.createElement("p");
      saveHint.id = "wizardAutoSaveStatus";
      saveHint.className = "wizard-save-hint";
      saveHint.hidden = true;
      wizardTitleBlock.appendChild(saveHint);
    }

    return {
      dashboardLink,
      saveHint,
      visibilityBtn,
    };
  })();

  let modalIndex = 0;
  let zoomed = false;
  let visitInFlight = false;
  let draftSaveTimer = null;
  let lastDraftSnapshot = "";

  function getTemplateMeta(templateKey) {
    return TEMPLATE_META[normalizeTemplateKey(templateKey)] || TEMPLATE_META.products;
  }

  async function apiFetch(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
    };

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.success === false) {
      if (response.status === 401) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/signin?role=seller&returnTo=${returnTo}`;
        throw new Error("Authentication required");
      }
      throw new Error((data && data.message) || `Request failed (${response.status})`);
    }

    return data;
  }

  function getPublicStorePath() {
    const handle = normalizeHandleForPath(state.handle);
    return handle ? `/stores/${encodeURIComponent(handle)}` : "";
  }

  function buildDraftPayload() {
    return {
      templateKey: state.templateKey,
      setupStep: state.step,
      storeName: state.storeName,
      handle: state.handle,
      tagline: state.tagline,
      about: state.about,
      accentColor: state.accentColor,
      avatarUrl: state.avatarUrl,
      coverUrl: state.coverUrl,
      socials: state.socials,
      product: state.product,
    };
  }

  function setAutoSaveStatus(message, tone = "neutral") {
    if (!headerActions || !headerActions.saveHint) {
      return;
    }

    if (!message) {
      headerActions.saveHint.hidden = true;
      headerActions.saveHint.textContent = "";
      headerActions.saveHint.removeAttribute("data-tone");
      return;
    }

    headerActions.saveHint.hidden = false;
    headerActions.saveHint.dataset.tone = tone;
    headerActions.saveHint.textContent = message;
  }

  async function saveDraft(options = {}) {
    if (flowMode !== "onboarding" || visitInFlight) {
      return null;
    }

    const payload = buildDraftPayload();
    const snapshot = JSON.stringify(payload);
    if (!options.force && snapshot === lastDraftSnapshot) {
      return null;
    }

    try {
      if (!options.silent) {
        setAutoSaveStatus("Saving your setup progress...", "neutral");
      }

      const data = await apiFetch(endpoints.draft, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      lastDraftSnapshot = snapshot;
      state.visibilityStatus =
        (data && data.visibilityStatus) || state.visibilityStatus || "draft";

      if (!options.silent) {
        setAutoSaveStatus("Setup progress saved.", "success");
      }

      return data;
    } catch (error) {
      if (!options.silent) {
        setAutoSaveStatus(
          (error && error.message) || "We could not save your setup progress.",
          "error"
        );
      }
      return null;
    }
  }

  function queueDraftSave() {
    if (flowMode !== "onboarding") {
      return;
    }

    window.clearTimeout(draftSaveTimer);
    draftSaveTimer = window.setTimeout(() => {
      saveDraft();
    }, 700);
  }

  async function updateVisibilityStatus(nextStatus) {
    const data = await apiFetch(endpoints.visibility, {
      method: "PATCH",
      body: JSON.stringify({
        visibilityStatus: nextStatus,
      }),
    });

    state.visibilityStatus =
      (data && data.visibilityStatus) || nextStatus || state.visibilityStatus;
    return data;
  }

  function updateModeUi() {
    const templateMeta = getTemplateMeta(state.templateKey);
    if (wizardTitle) {
      wizardTitle.textContent =
        flowMode === "settings" ? "Store settings" : "Open Market - Store Wizard";
    }
    if (wizardSubtitle) {
      wizardSubtitle.textContent =
        flowMode === "settings"
          ? "Update your branding, story, socials, and featured product without breaking your live storefront."
          : "Set up your identity, visuals, social presence, and first featured product. Progress is saved as you move.";
    }
    if (wizardBadge) {
      wizardBadge.textContent = flowMode === "settings" ? "Settings" : "Wizard";
    }
    if (templateNameEl) {
      templateNameEl.textContent = templateMeta.label;
    }
    if (templateDescriptionEl) {
      templateDescriptionEl.textContent = templateMeta.summary;
    }
    if (templateFamilyEl) {
      templateFamilyEl.textContent = templateMeta.family;
    }
    if (templateChangeLink) {
      templateChangeLink.href = paths.templateManager;
      templateChangeLink.textContent =
        flowMode === "settings" ? "Choose another template" : "Change template";
    }
    if (templatePreviewLink) {
      templatePreviewLink.href = templateMeta.previewPath;
      templatePreviewLink.textContent =
        flowMode === "settings" ? "Preview live template" : "Preview template";
      templatePreviewLink.hidden = !state.profileCompleted && flowMode !== "settings";
    }
    if (headerActions && headerActions.dashboardLink) {
      headerActions.dashboardLink.href = paths.dashboard;
      headerActions.dashboardLink.textContent =
        flowMode === "settings" ? "Back to dashboard" : "Dashboard";
    }

    const primaryText =
      flowMode === "settings"
        ? "Save settings"
        : state.visibilityStatus === "published"
          ? "Update and visit store"
          : "Publish and visit store";

    document.querySelectorAll('[data-action="visit-store"]').forEach((button) => {
      button.textContent = primaryText;
    });

    if (finalVisit) {
      finalVisit.textContent = primaryText;
    }

    if (headerActions && headerActions.visibilityBtn) {
      const showVisibility = flowMode === "settings" && state.profileCompleted;
      headerActions.visibilityBtn.hidden = !showVisibility;
      if (showVisibility) {
        headerActions.visibilityBtn.textContent =
          state.visibilityStatus === "published" ? "Unpublish store" : "Publish store";
      }
    }

    if (
      flowMode === "onboarding" &&
      headerActions &&
      headerActions.saveHint &&
      !headerActions.saveHint.textContent
    ) {
      setAutoSaveStatus("Progress saves as you move through the setup.", "neutral");
    }
  }

  function getCleanHandle(raw) {
    const value = String(raw || "").trim().replace(/^@+/, "");
    return value || "";
  }

  function normalizeHandleForPath(raw) {
    const value = String(raw || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

    return value.replace(/[^a-z0-9-]/g, "");
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    return `K ${amount.toFixed(2)}`;
  }

  function setWizardStatus(message, state = "info") {
    [wizardStatus, finalStatus].forEach((element) => {
      if (!element) {
        return;
      }

      if (!message) {
        element.hidden = true;
        element.textContent = "";
        element.removeAttribute("data-state");
        return;
      }

      element.hidden = false;
      element.textContent = message;
      element.dataset.state = state;
    });
  }

  function setVisitButtonsBusy(isBusy) {
    visitInFlight = isBusy;

    const defaultLabel =
      flowMode === "settings"
        ? "Save settings"
        : state.visibilityStatus === "published"
          ? "Update and visit store"
          : "Publish and visit store";

    document.querySelectorAll('[data-action="visit-store"]').forEach((button) => {
      button.disabled = isBusy;
      button.textContent = isBusy ? "Saving store..." : defaultLabel;
    });

    if (finalVisit) {
      finalVisit.disabled = isBusy;
      finalVisit.textContent = isBusy ? "Saving store..." : defaultLabel;
    }
  }

  function readFileToDataURL(file) {
    return new Promise((resolve) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  function setCover(element, coverUrl, accentColor) {
    if (!element) {
      return;
    }

    if (coverUrl) {
      element.style.backgroundImage = `url('${coverUrl}')`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      return;
    }

    element.style.backgroundImage = `linear-gradient(135deg, ${accentColor}, #22c55e)`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
  }

  function setAvatar(element, storeName, avatarUrl) {
    if (!element) {
      return;
    }

    if (avatarUrl) {
      element.style.backgroundImage = `url('${avatarUrl}')`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
      element.textContent = "";
      return;
    }

    element.style.backgroundImage = "";
    element.style.backgroundColor = "#0f172a";
    element.textContent = (storeName || "S").charAt(0).toUpperCase();
  }

  function renderImageGrid(container, images) {
    if (!container) {
      return;
    }

    container.innerHTML = "";
    images.slice(0, 4).forEach((image, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-image-item";
      button.dataset.index = String(index);

      const thumb = document.createElement("div");
      thumb.className = "product-image-thumb";
      thumb.style.backgroundImage = `url('${image.src}')`;
      thumb.style.backgroundSize = "cover";
      thumb.style.backgroundPosition = "center";
      button.appendChild(thumb);
      container.appendChild(button);
    });
  }

  function updatePreview() {
    const storeName = state.storeName.trim() || "Your Store Name";
    const handle = getCleanHandle(state.handle) || "handle";
    const tagline = state.tagline.trim() || "Your short tagline goes here.";
    const about =
      state.about.trim() ||
      "Share a short story about who you are, what you sell, and how you serve your community.";
    const socialSummary = [
      state.socials.instagram,
      state.socials.facebook,
      state.socials.tiktok,
      state.socials.xhandle,
    ]
      .filter(Boolean)
      .join(" | ");

    setCover(pvCover, state.coverUrl, state.accentColor);
    setAvatar(pvAvatar, storeName, state.avatarUrl);
    if (pvName) pvName.textContent = storeName;
    if (pvHandle) pvHandle.textContent = `@${handle}`;
    if (pvTagline) pvTagline.textContent = tagline;
    if (pvAbout) pvAbout.textContent = about;
    if (pvSocialText) {
      pvSocialText.textContent = socialSummary || "Add your handles to make it easy for buyers to follow you.";
    }
    if (pvProductName) pvProductName.textContent = state.product.name.trim() || "Your featured product";
    if (pvProductDescription) {
      pvProductDescription.textContent =
        state.product.description.trim() ||
        "Add a short description so buyers know what they are getting.";
    }
    if (pvProductPrice) pvProductPrice.textContent = formatCurrency(state.product.price);
    if (pvDeliveryLocation) pvDeliveryLocation.textContent = state.product.delivery.trim() || "Not set";
    if (pvBusinessLocation) pvBusinessLocation.textContent = state.product.location.trim() || "Not set";
    if (pvTransportPrice) pvTransportPrice.textContent = formatCurrency(state.product.transportFee);

    if (pvProductImages) {
      pvProductImages.style.display = state.product.images.length ? "block" : "none";
    }
    renderImageGrid(pvProductImageGrid, state.product.images);
  }

  function updateFinalPreview() {
    const storeName = state.storeName.trim() || "Your Store Name";
    const handle = getCleanHandle(state.handle) || "handle";
    const tagline = state.tagline.trim() || "Your short tagline goes here.";
    const about =
      state.about.trim() ||
      "Share a short story about who you are, what you sell, and how you serve your community.";

    setCover(finalCover, state.coverUrl, state.accentColor);
    setAvatar(finalAvatar, storeName, state.avatarUrl);
    if (finalName) finalName.textContent = storeName;
    if (finalHandle) finalHandle.textContent = `@${handle}`;
    if (finalTagline) finalTagline.textContent = tagline;
    if (finalAbout) finalAbout.textContent = about;

    if (finalSocialRow) {
      finalSocialRow.innerHTML = "";
      [
        ["instagram", "fa-instagram"],
        ["facebook", "fa-facebook"],
        ["tiktok", "fa-tiktok"],
        ["xhandle", "fa-x-twitter"],
      ].forEach(([key, icon]) => {
        if (!state.socials[key]) {
          return;
        }

        const pill = document.createElement("span");
        pill.className = "social-pill final-pill";
        pill.innerHTML = `<i class="fa-brands ${icon}"></i><span>${state.socials[key]}</span>`;
        finalSocialRow.appendChild(pill);
      });
    }

    if (finalProductName) finalProductName.textContent = state.product.name.trim() || "Your featured product";
    if (finalProductDescription) {
      finalProductDescription.textContent =
        state.product.description.trim() ||
        "Add a short description so buyers know what they are getting.";
    }
    if (finalProductPrice) finalProductPrice.textContent = formatCurrency(state.product.price);
    if (finalDeliveryLocation) finalDeliveryLocation.textContent = state.product.delivery.trim() || "Not set";
    if (finalBusinessLocation) finalBusinessLocation.textContent = state.product.location.trim() || "Not set";
    if (finalTransportPrice) finalTransportPrice.textContent = formatCurrency(state.product.transportFee);
    renderImageGrid(finalProductImages, state.product.images);
  }

  function goToStep(step) {
    state.step = Math.min(4, Math.max(1, Number(step || 1)));
    stepTabs.forEach((tab) => {
      tab.classList.toggle("active", Number(tab.dataset.step) === state.step);
    });
    stepCards.forEach((card) => {
      card.classList.toggle("active", Number(card.dataset.step) === state.step);
    });
    updatePreview();
    updateModeUi();
  }

  async function saveStoreToBackend() {
    return apiFetch(endpoints.settings, {
      method: "POST",
      body: JSON.stringify({
        storeName: state.storeName,
        handle: state.handle,
        templateKey: state.templateKey,
        tagline: state.tagline,
        about: state.about,
        accentColor: state.accentColor,
        avatarUrl: state.avatarUrl,
        coverUrl: state.coverUrl,
        socials: state.socials,
        product: state.product,
        visibilityStatus:
          flowMode === "settings"
            ? state.visibilityStatus || "published"
            : "published",
      }),
    });
  }

  async function openStorefront() {
    if (visitInFlight) {
      return;
    }

    setWizardStatus(
      flowMode === "settings"
        ? "Saving your store settings..."
        : "Saving your store and opening the public storefront...",
      "info"
    );
    setVisitButtonsBusy(true);

    try {
      if (flowMode === "onboarding") {
        await saveDraft({ force: true, silent: true });
      }

      const result = await saveStoreToBackend();
      const handle = normalizeHandleForPath((result && result.storeHandle) || state.handle);
      state.profileCompleted = true;
      state.visibilityStatus = "published";
      updateModeUi();
      setWizardStatus("");
      if (flowMode === "settings") {
        setAutoSaveStatus("Store settings saved.", "success");
        return;
      }

      window.location.href = handle ? `/stores/${encodeURIComponent(handle)}` : "/seller/store";
    } catch (error) {
      setWizardStatus(
        (error && error.message) || "We could not save your store just now. Please review your details and try again.",
        "error"
      );
    } finally {
      setVisitButtonsBusy(false);
    }
  }

  function resetWizard() {
    state.templateKey = getRequestedTemplate() || state.templateKey || "products";
    state.profileCompleted = false;
    state.visibilityStatus = "draft";
    state.storeName = "";
    state.handle = "";
    state.tagline = "";
    state.about = "";
    state.accentColor = "#2563eb";
    state.avatarUrl = "";
    state.coverUrl = "";
    state.socials = {
      instagram: "",
      facebook: "",
      tiktok: "",
      xhandle: "",
    };
    state.product = {
      name: "",
      description: "",
      price: "",
      delivery: "",
      location: "",
      transportFee: "",
      images: [],
    };

    [
      storeNameInput,
      handleInput,
      taglineInput,
      aboutInput,
      instagramInput,
      facebookInput,
      tiktokInput,
      xhandleInput,
      productNameInput,
      productDescriptionInput,
      productPriceInput,
      transportFeeInput,
      deliveryInfoInput,
      businessLocationInput,
    ].forEach((input) => {
      if (input) {
        input.value = "";
      }
    });

    if (accentColorInput) accentColorInput.value = "#2563eb";
    if (logoFileInput) logoFileInput.value = "";
    if (coverFileInput) coverFileInput.value = "";
    if (productImagesInput) productImagesInput.value = "";

    updatePreview();
    updateFinalPreview();
    goToStep(1);
    queueDraftSave();
  }

  function renderModalImage() {
    if (!productSlider) {
      return;
    }

    const image = state.product.images[modalIndex];
    productSlider.innerHTML = image
      ? `<img src="${image.src}" alt="${image.name || "Product image"}" class="product-modal-image${zoomed ? " zoomed" : ""}">`
      : "";

    if (productIndicators) {
      productIndicators.innerHTML = state.product.images
        .map((_, index) => `<span class="dot${index === modalIndex ? " active" : ""}"></span>`)
        .join("");
    }

    if (productCaption) {
      productCaption.textContent = image ? image.name || `Image ${modalIndex + 1}` : "";
    }
  }

  function openModal(index) {
    if (!productModal || !state.product.images.length) {
      return;
    }

    modalIndex = Math.max(0, Math.min(index, state.product.images.length - 1));
    zoomed = false;
    renderModalImage();
    productModal.classList.remove("hidden");
  }

  function closeModal() {
    if (!productModal) {
      return;
    }
    productModal.classList.add("hidden");
  }

  async function loadStoreFromBackend() {
    try {
      const data = await apiFetch(endpoints.store, { method: "GET" });
      if (!data || !data.store) {
        updateModeUi();
        updatePreview();
        goToStep(1);
        return;
      }

      const store = data.store || {};
      const product = data.product || {};
      const images = Array.isArray(data.images) ? data.images : [];
      const meta = data.meta || {};

      state.templateKey = normalizeTemplateKey(getRequestedTemplate() || store.templateKey) || "products";
      state.profileCompleted = Boolean(store.profileCompleted);
      state.visibilityStatus = store.visibilityStatus || meta.visibilityStatus || "draft";
      state.storeName = store.storeName || "";
      state.handle = store.handle || "";
      state.tagline = store.tagline || "";
      state.about = store.about || "";
      state.accentColor = store.accentColor || "#2563eb";
      state.avatarUrl = store.avatarUrl || "";
      state.coverUrl = store.coverUrl || "";
      state.socials = {
        instagram: (store.socials && store.socials.instagram) || "",
        facebook: (store.socials && store.socials.facebook) || "",
        tiktok: (store.socials && store.socials.tiktok) || "",
        xhandle: (store.socials && store.socials.xhandle) || "",
      };
      state.product = {
        name: product.name || "",
        description: product.description || "",
        price: product.price === 0 || product.price ? String(product.price) : "",
        delivery: product.delivery || "",
        location: product.location || "",
        transportFee:
          product.transportFee === 0 || product.transportFee ? String(product.transportFee) : "",
        images: images
          .map((image, index) => ({
            src: image.url || image.src || "",
            name: image.name || `product-image-${index + 1}`,
          }))
          .filter((image) => Boolean(image.src)),
      };

      if (storeNameInput) storeNameInput.value = state.storeName;
      if (handleInput) handleInput.value = state.handle;
      if (taglineInput) taglineInput.value = state.tagline;
      if (aboutInput) aboutInput.value = state.about;
      if (instagramInput) instagramInput.value = state.socials.instagram;
      if (facebookInput) facebookInput.value = state.socials.facebook;
      if (tiktokInput) tiktokInput.value = state.socials.tiktok;
      if (xhandleInput) xhandleInput.value = state.socials.xhandle;
      if (productNameInput) productNameInput.value = state.product.name;
      if (productDescriptionInput) productDescriptionInput.value = state.product.description;
      if (productPriceInput) productPriceInput.value = state.product.price;
      if (transportFeeInput) transportFeeInput.value = state.product.transportFee;
      if (deliveryInfoInput) deliveryInfoInput.value = state.product.delivery;
      if (businessLocationInput) businessLocationInput.value = state.product.location;
      if (accentColorInput) accentColorInput.value = state.accentColor;

      updateModeUi();
      updatePreview();
      updateFinalPreview();
      goToStep(flowMode === "onboarding" ? Number(meta.setupStep || store.setupStep || 1) || 1 : 1);
      lastDraftSnapshot = JSON.stringify(buildDraftPayload());
    } catch (error) {
      setWizardStatus("");
      updateModeUi();
      updatePreview();
      updateFinalPreview();
      goToStep(1);
    }
  }

  function bindInput(input, updater) {
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      updater(input.value);
      updatePreview();
      updateFinalPreview();
      queueDraftSave();
    });
  }

  bindInput(storeNameInput, (value) => {
    state.storeName = value;
  });
  bindInput(handleInput, (value) => {
    state.handle = value;
  });
  bindInput(taglineInput, (value) => {
    state.tagline = value;
  });
  bindInput(accentColorInput, (value) => {
    state.accentColor = value || "#2563eb";
  });
  bindInput(aboutInput, (value) => {
    state.about = value;
  });
  bindInput(instagramInput, (value) => {
    state.socials.instagram = value;
  });
  bindInput(facebookInput, (value) => {
    state.socials.facebook = value;
  });
  bindInput(tiktokInput, (value) => {
    state.socials.tiktok = value;
  });
  bindInput(xhandleInput, (value) => {
    state.socials.xhandle = value;
  });
  bindInput(productNameInput, (value) => {
    state.product.name = value;
  });
  bindInput(productDescriptionInput, (value) => {
    state.product.description = value;
  });
  bindInput(productPriceInput, (value) => {
    state.product.price = value;
  });
  bindInput(transportFeeInput, (value) => {
    state.product.transportFee = value;
  });
  bindInput(deliveryInfoInput, (value) => {
    state.product.delivery = value;
  });
  bindInput(businessLocationInput, (value) => {
    state.product.location = value;
  });

  if (logoFileInput) {
    logoFileInput.addEventListener("change", async () => {
      const file = logoFileInput.files && logoFileInput.files[0];
      state.avatarUrl = file ? await readFileToDataURL(file) : "";
      updatePreview();
      updateFinalPreview();
      queueDraftSave();
    });
  }

  if (coverFileInput) {
    coverFileInput.addEventListener("change", async () => {
      const file = coverFileInput.files && coverFileInput.files[0];
      state.coverUrl = file ? await readFileToDataURL(file) : "";
      updatePreview();
      updateFinalPreview();
      queueDraftSave();
    });
  }

  if (productImagesInput) {
    productImagesInput.addEventListener("change", async () => {
      const files = Array.from(productImagesInput.files || []).slice(0, 4);
      state.product.images = await Promise.all(
        files.map(async (file) => ({
          src: await readFileToDataURL(file),
          name: file.name || "product-image",
        }))
      );
      updatePreview();
      updateFinalPreview();
      queueDraftSave();
    });
  }

  stepTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      goToStep(tab.dataset.step);
      queueDraftSave();
    });
  });

  actionButtons.forEach((button) => {
    const action = button.dataset.action;
    if (!action) {
      return;
    }

    button.addEventListener("click", async () => {
      if (action === "next") {
        setWizardStatus("");
        goToStep(state.step + 1);
        queueDraftSave();
        return;
      }

      if (action === "prev") {
        setWizardStatus("");
        goToStep(state.step - 1);
        queueDraftSave();
        return;
      }

      if (action === "reset") {
        setWizardStatus("");
        resetWizard();
        return;
      }

      if (action === "visit-store") {
        await openStorefront();
      }
    });
  });

  if (finalBack) {
    finalBack.addEventListener("click", () => {
      if (finalPreview) finalPreview.classList.add("hidden");
      if (wizardRoot) wizardRoot.classList.remove("hidden");
    });
  }

  if (finalVisit) {
    finalVisit.addEventListener("click", async () => {
      await openStorefront();
    });
  }

  if (headerActions && headerActions.visibilityBtn) {
    headerActions.visibilityBtn.addEventListener("click", async () => {
      const nextStatus = state.visibilityStatus === "published" ? "unpublished" : "published";
      try {
        setAutoSaveStatus(
          nextStatus === "published" ? "Publishing your storefront..." : "Unpublishing your storefront...",
          "neutral"
        );
        await updateVisibilityStatus(nextStatus);
        updateModeUi();
        setAutoSaveStatus(
          nextStatus === "published" ? "Store is now published." : "Store is now hidden from the public storefront.",
          "success"
        );
      } catch (error) {
        setAutoSaveStatus(
          (error && error.message) || "We could not update storefront visibility.",
          "error"
        );
      }
    });
  }

  [pvProductImageGrid, finalProductImages].forEach((container) => {
    if (!container) {
      return;
    }

    container.addEventListener("click", (event) => {
      const button = event.target.closest(".product-image-item");
      if (!button) {
        return;
      }
      openModal(Number(button.dataset.index || 0));
    });
  });

  if (productClose) {
    productClose.addEventListener("click", closeModal);
  }

  if (productModal) {
    productModal.addEventListener("click", (event) => {
      if (event.target === productModal) {
        closeModal();
      }
    });
  }

  if (productPrev) {
    productPrev.addEventListener("click", () => {
      if (!state.product.images.length) {
        return;
      }
      modalIndex = (modalIndex - 1 + state.product.images.length) % state.product.images.length;
      renderModalImage();
    });
  }

  if (productNext) {
    productNext.addEventListener("click", () => {
      if (!state.product.images.length) {
        return;
      }
      modalIndex = (modalIndex + 1) % state.product.images.length;
      renderModalImage();
    });
  }

  if (productZoomToggle) {
    productZoomToggle.addEventListener("click", () => {
      zoomed = !zoomed;
      renderModalImage();
    });
  }

  updateModeUi();
  updatePreview();
  updateFinalPreview();
  goToStep(1);
  loadStoreFromBackend();
});
