(function () {
  const endpoints = {
    settings: document.body.dataset.buyerSettingsEndpoint || "/api/buyer/settings",
    settingsSave: document.body.dataset.buyerSettingsSaveEndpoint || "/api/buyer/settings",
    addresses: document.body.dataset.buyerAddressesEndpoint || "/api/buyer/addresses",
  };

  const elements = {
    status: document.getElementById("buyerSettingsStatus"),
    settingsForm: document.getElementById("buyerSettingsForm"),
    fullName: document.getElementById("buyerSettingsFullName"),
    email: document.getElementById("buyerSettingsEmail"),
    phone: document.getElementById("buyerSettingsPhone"),
    avatarUrl: document.getElementById("buyerSettingsAvatarUrl"),
    avatarFile: document.getElementById("buyerSettingsAvatarFile"),
    avatarClear: document.getElementById("buyerSettingsAvatarClearBtn"),
    avatarPreview: document.getElementById("buyerSettingsAvatarPreview"),
    coverUrl: document.getElementById("buyerSettingsCoverUrl"),
    coverFile: document.getElementById("buyerSettingsCoverFile"),
    coverClear: document.getElementById("buyerSettingsCoverClearBtn"),
    coverPreview: document.getElementById("buyerSettingsCoverPreview"),
    bio: document.getElementById("buyerSettingsBio"),
    categories: document.getElementById("buyerSettingsCategories"),
    templates: document.getElementById("buyerSettingsTemplates"),
    panelCover: document.getElementById("buyerSettingsPanelCover"),
    panelAvatar: document.getElementById("buyerSettingsPanelAvatar"),
    panelName: document.getElementById("buyerSettingsPanelName"),
    panelEmail: document.getElementById("buyerSettingsPanelEmail"),
    navItems: Array.from(document.querySelectorAll(".buyer-settings-nav__item")),
    addressList: document.getElementById("buyerAddressList"),
    addressForm: document.getElementById("buyerAddressForm"),
    addressId: document.getElementById("buyerAddressId"),
    addressType: document.getElementById("buyerAddressType"),
    addressLine1: document.getElementById("buyerAddressLine1"),
    addressLine2: document.getElementById("buyerAddressLine2"),
    addressCity: document.getElementById("buyerAddressCity"),
    addressRegion: document.getElementById("buyerAddressRegion"),
    addressPostalCode: document.getElementById("buyerAddressPostalCode"),
    addressCountryCode: document.getElementById("buyerAddressCountryCode"),
    addressCancel: document.getElementById("buyerAddressCancelBtn"),
    recentList: document.getElementById("buyerSettingsRecentList"),
  };

  const state = {
    settings: null,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
      throw new Error((payload && payload.message) || `Request failed (${response.status})`);
    }

    return payload;
  }

  function setStatus(mode, message) {
    if (!elements.status) {
      return;
    }

    if (!mode || !message) {
      elements.status.hidden = true;
      elements.status.textContent = "";
      elements.status.className = "buyer-settings-status";
      return;
    }

    elements.status.hidden = false;
    elements.status.textContent = message;
    elements.status.className = `buyer-settings-status buyer-settings-status--${mode}`;
  }

  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function deriveInitial(value, fallback = "B") {
    const normalized = String(value || "").trim();
    return (normalized.charAt(0) || fallback).toUpperCase();
  }

  function safeCssUrl(value) {
    return String(value || "").replace(/"/g, '\\"');
  }

  function applyCoverSurface(element, url) {
    if (!element) {
      return;
    }

    if (url) {
      element.style.backgroundImage = `linear-gradient(140deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.38)), url("${safeCssUrl(url)}")`;
      element.classList.add("buyer-settings-panel__cover--filled");
      if (element.classList.contains("buyer-settings-media-preview")) {
        element.classList.add("buyer-settings-media-preview--filled");
      }
      return;
    }

    element.style.backgroundImage = "";
    element.classList.remove("buyer-settings-panel__cover--filled");
    element.classList.remove("buyer-settings-media-preview--filled");
  }

  function applyAvatarSurface(element, url, label) {
    if (!element) {
      return;
    }

    if (url) {
      element.style.backgroundImage = `url("${safeCssUrl(url)}")`;
      element.textContent = "";
      element.classList.add("buyer-settings-panel__avatar--filled");
      element.classList.add("buyer-settings-avatar-preview--filled");
      return;
    }

    element.style.backgroundImage = "";
    element.textContent = deriveInitial(label);
    element.classList.remove("buyer-settings-panel__avatar--filled");
    element.classList.remove("buyer-settings-avatar-preview--filled");
  }

  function updatePreviewState() {
    const settings = state.settings || {};
    const profile = settings.profile || {};
    const account = settings.account || {};
    const fullName = (elements.fullName && elements.fullName.value.trim()) || profile.fullName || profile.displayName || "Buyer account";
    const email = (elements.email && elements.email.value.trim()) || profile.email || account.email || "you@example.com";
    const avatarUrl = (elements.avatarUrl && elements.avatarUrl.value.trim()) || "";
    const coverUrl = (elements.coverUrl && elements.coverUrl.value.trim()) || "";

    if (elements.panelName) {
      elements.panelName.textContent = fullName;
    }
    if (elements.panelEmail) {
      elements.panelEmail.textContent = email;
    }

    applyCoverSurface(elements.coverPreview, coverUrl);
    applyCoverSurface(elements.panelCover, coverUrl);
    applyAvatarSurface(elements.avatarPreview, avatarUrl, fullName || email);
    applyAvatarSurface(elements.panelAvatar, avatarUrl, fullName || email);
  }

  function populateSettingsForm(payload) {
    const profile = payload.profile || {};
    const preferences = payload.preferences || {};

    if (elements.fullName) {
      elements.fullName.value = profile.fullName || profile.displayName || "";
    }
    if (elements.email) {
      elements.email.value = profile.email || (payload.account && payload.account.email) || "";
    }
    if (elements.phone) {
      elements.phone.value = profile.phone || "";
    }
    if (elements.avatarUrl) {
      elements.avatarUrl.value = profile.avatarUrl || "";
    }
    if (elements.coverUrl) {
      elements.coverUrl.value = profile.coverUrl || "";
    }
    if (elements.bio) {
      elements.bio.value = profile.bio || "";
    }
    if (elements.categories) {
      elements.categories.value = Array.isArray(preferences.favoriteCategories)
        ? preferences.favoriteCategories.join(", ")
        : "";
    }
    if (elements.templates) {
      elements.templates.value = Array.isArray(preferences.favoriteTemplates)
        ? preferences.favoriteTemplates.join(", ")
        : "";
    }

    updatePreviewState();
  }

  function resetAddressForm() {
    if (elements.addressId) {
      elements.addressId.value = "";
    }
    if (elements.addressType) {
      elements.addressType.value = "shipping";
    }
    if (elements.addressLine1) {
      elements.addressLine1.value = "";
    }
    if (elements.addressLine2) {
      elements.addressLine2.value = "";
    }
    if (elements.addressCity) {
      elements.addressCity.value = "";
    }
    if (elements.addressRegion) {
      elements.addressRegion.value = "";
    }
    if (elements.addressPostalCode) {
      elements.addressPostalCode.value = "";
    }
    if (elements.addressCountryCode) {
      elements.addressCountryCode.value = "PG";
    }
  }

  function fillAddressForm(address) {
    if (!address) {
      resetAddressForm();
      return;
    }

    if (elements.addressId) {
      elements.addressId.value = String(address.id || "");
    }
    if (elements.addressType) {
      elements.addressType.value = address.addressType || "shipping";
    }
    if (elements.addressLine1) {
      elements.addressLine1.value = address.addressLine1 || "";
    }
    if (elements.addressLine2) {
      elements.addressLine2.value = address.addressLine2 || "";
    }
    if (elements.addressCity) {
      elements.addressCity.value = address.city || "";
    }
    if (elements.addressRegion) {
      elements.addressRegion.value = address.region || "";
    }
    if (elements.addressPostalCode) {
      elements.addressPostalCode.value = address.postalCode || "";
    }
    if (elements.addressCountryCode) {
      elements.addressCountryCode.value = address.countryCode || "PG";
    }
  }

  function renderAddressList(addresses) {
    if (!elements.addressList) {
      return;
    }

    if (!addresses.length) {
      elements.addressList.innerHTML = `
        <div class="buyer-settings-empty">
          <p>No saved addresses yet. Add one below to speed up checkout.</p>
        </div>
      `;
      return;
    }

    elements.addressList.innerHTML = addresses
      .map(
        (address) => `
          <article class="buyer-address-card">
            <div class="buyer-address-card__top">
              <span class="buyer-address-card__type">${escapeHtml(address.addressType)}</span>
            </div>
            <div class="buyer-address-card__summary">${escapeHtml(address.summary || address.addressLine1)}</div>
            <div class="buyer-address-card__actions">
              <button class="buyer-settings-btn" type="button" data-address-edit="${escapeHtml(address.id)}">Edit</button>
              <button class="buyer-settings-btn buyer-settings-btn--danger" type="button" data-address-delete="${escapeHtml(address.id)}">Delete</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderRecentlyViewed(items) {
    if (!elements.recentList) {
      return;
    }

    if (!items.length) {
      elements.recentList.innerHTML = `
        <div class="buyer-settings-empty">
          <p>Your recently viewed listings will appear here after you browse the marketplace.</p>
        </div>
      `;
      return;
    }

    elements.recentList.innerHTML = items
      .map(
        (item) => `
          <a class="buyer-history-card" href="${escapeHtml(item.productPath || item.storePath || "/marketplace")}">
            <div class="buyer-history-card__image"${
              item.imageUrl
                ? ` style="background-image:url('${item.imageUrl.replace(/'/g, "\\'")}');"`
                : ""
            }></div>
            <div class="buyer-history-card__kicker">Recently viewed</div>
            <div class="buyer-history-card__title">${escapeHtml(item.title || "Listing")}</div>
            <div class="buyer-history-card__meta">${escapeHtml(item.storeName || "Marketplace store")}</div>
          </a>
        `
      )
      .join("");
  }

  function renderWorkspace(payload) {
    state.settings = payload;
    populateSettingsForm(payload);
    renderAddressList(Array.isArray(payload.addresses) ? payload.addresses : []);
    renderRecentlyViewed(Array.isArray(payload.recentlyViewed) ? payload.recentlyViewed : []);
  }

  async function loadSettings() {
    setStatus("success", "Loading buyer settings.");
    const payload = await requestJson(endpoints.settings);
    renderWorkspace(payload);
    setStatus("", "");
  }

  function currentAddressPayload() {
    return {
      addressType: elements.addressType ? elements.addressType.value : "shipping",
      addressLine1: elements.addressLine1 ? elements.addressLine1.value.trim() : "",
      addressLine2: elements.addressLine2 ? elements.addressLine2.value.trim() : "",
      city: elements.addressCity ? elements.addressCity.value.trim() : "",
      region: elements.addressRegion ? elements.addressRegion.value.trim() : "",
      postalCode: elements.addressPostalCode ? elements.addressPostalCode.value.trim() : "",
      countryCode: elements.addressCountryCode ? elements.addressCountryCode.value.trim() : "",
    };
  }

  function readFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("We could not read that image."));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(kind) {
    const fileInput = kind === "cover" ? elements.coverFile : elements.avatarFile;
    const targetInput = kind === "cover" ? elements.coverUrl : elements.avatarUrl;
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file || !targetInput) {
      return;
    }

    if (!/^image\//i.test(file.type || "")) {
      setStatus("error", "Please choose an image file.");
      fileInput.value = "";
      return;
    }

    try {
      const dataUrl = await readFileToDataUrl(file);
      targetInput.value = dataUrl;
      updatePreviewState();
      setStatus("success", kind === "cover" ? "Cover photo ready to save." : "Profile picture ready to save.");
    } catch (error) {
      setStatus("error", error.message || "We could not load that image.");
    }
  }

  function clearImageField(kind) {
    const fileInput = kind === "cover" ? elements.coverFile : elements.avatarFile;
    const targetInput = kind === "cover" ? elements.coverUrl : elements.avatarUrl;
    if (fileInput) {
      fileInput.value = "";
    }
    if (targetInput) {
      targetInput.value = "";
    }
    updatePreviewState();
  }

  async function saveProfileSettings(event) {
    event.preventDefault();
    setStatus("success", "Saving buyer settings.");

    try {
      const payload = {
        fullName: elements.fullName ? elements.fullName.value.trim() : "",
        phone: elements.phone ? elements.phone.value.trim() : "",
        avatarUrl: elements.avatarUrl ? elements.avatarUrl.value.trim() : "",
        coverUrl: elements.coverUrl ? elements.coverUrl.value.trim() : "",
        bio: elements.bio ? elements.bio.value.trim() : "",
        favoriteCategories: parseCsv(elements.categories ? elements.categories.value : ""),
        favoriteTemplates: parseCsv(elements.templates ? elements.templates.value : ""),
      };

      await requestJson(endpoints.settingsSave, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await loadSettings();
      setStatus("success", "Buyer settings saved.");
    } catch (error) {
      setStatus("error", error.message || "We could not save your settings.");
    }
  }

  async function saveAddress(event) {
    event.preventDefault();
    const addressId = elements.addressId ? elements.addressId.value.trim() : "";
    const method = addressId ? "PATCH" : "POST";
    const url = addressId ? `${endpoints.addresses}/${encodeURIComponent(addressId)}` : endpoints.addresses;

    setStatus("success", addressId ? "Updating address." : "Saving address.");

    try {
      await requestJson(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentAddressPayload()),
      });

      resetAddressForm();
      await loadSettings();
      setStatus("success", addressId ? "Address updated." : "Address saved.");
    } catch (error) {
      setStatus("error", error.message || "We could not save that address.");
    }
  }

  async function deleteAddress(addressId) {
    setStatus("success", "Removing address.");

    try {
      await requestJson(`${endpoints.addresses}/${encodeURIComponent(addressId)}`, {
        method: "DELETE",
      });

      if (elements.addressId && elements.addressId.value === String(addressId)) {
        resetAddressForm();
      }
      await loadSettings();
      setStatus("success", "Address removed.");
    } catch (error) {
      setStatus("error", error.message || "We could not remove that address.");
    }
  }

  function syncNavState(targetHash) {
    const normalizedHash = targetHash || window.location.hash || "#buyerSettingsAccountCard";
    elements.navItems.forEach((item) => {
      item.classList.toggle("buyer-settings-nav__item--active", item.getAttribute("href") === normalizedHash);
    });
  }

  function bindEvents() {
    elements.settingsForm?.addEventListener("submit", saveProfileSettings);
    elements.addressForm?.addEventListener("submit", saveAddress);
    elements.addressCancel?.addEventListener("click", resetAddressForm);

    elements.fullName?.addEventListener("input", updatePreviewState);
    elements.avatarUrl?.addEventListener("input", updatePreviewState);
    elements.coverUrl?.addEventListener("input", updatePreviewState);
    elements.coverFile?.addEventListener("change", async () => {
      await handleImageUpload("cover");
    });
    elements.avatarFile?.addEventListener("change", async () => {
      await handleImageUpload("avatar");
    });
    elements.coverClear?.addEventListener("click", () => {
      clearImageField("cover");
    });
    elements.avatarClear?.addEventListener("click", () => {
      clearImageField("avatar");
    });

    elements.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        syncNavState(item.getAttribute("href"));
      });
    });

    window.addEventListener("hashchange", () => {
      syncNavState();
    });

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-address-edit]");
      if (editButton) {
        const addressId = Number(editButton.getAttribute("data-address-edit") || 0);
        const addresses = Array.isArray(state.settings && state.settings.addresses)
          ? state.settings.addresses
          : [];
        const address = addresses.find((item) => Number(item.id) === addressId) || null;
        fillAddressForm(address);
        return;
      }

      const deleteButton = event.target.closest("[data-address-delete]");
      if (deleteButton) {
        const addressId = deleteButton.getAttribute("data-address-delete");
        deleteAddress(addressId);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    resetAddressForm();
    bindEvents();
    syncNavState();
    loadSettings().catch((error) => {
      setStatus("error", error.message || "We could not load your buyer settings.");
    });
  });
})();
