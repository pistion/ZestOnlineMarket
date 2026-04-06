document.addEventListener("DOMContentLoaded", () => {
  const state = {
    step: 1,
    email: "",
    fullName: "",
    phone: "",
    avatarUrl: "",
    bio: "",
    favoriteCategories: [],
    favoriteTemplates: [],
  };

  let baselineState = JSON.parse(JSON.stringify(state));
  let saveInFlight = false;

  const bodyData = document.body.dataset || {};
  const profileEndpoint = bodyData.buyerProfileEndpoint || "/api/buyer/me";
  const setupEndpoint = bodyData.buyerSetupEndpoint || "/api/buyer/profile";
  const profilePath = bodyData.buyerProfilePath || "/buyer/profile";
  const buyerFeedPath = bodyData.buyerFeedPath || "/buyer/feed";
  const marketplacePath = bodyData.buyerMarketplacePath || "/marketplace";
  const globalFeedPath = bodyData.buyerGlobalFeedPath || "/feed";

  const stepTabs = Array.from(document.querySelectorAll(".step-tab"));
  const stepCards = Array.from(document.querySelectorAll(".step"));
  const actionButtons = Array.from(document.querySelectorAll(".step-actions .btn"));
  const chipButtons = Array.from(document.querySelectorAll(".chip-option"));

  const elements = {
    email: document.querySelector("#buyerEmail"),
    fullName: document.querySelector("#buyerFullName"),
    phone: document.querySelector("#buyerPhone"),
    avatarFile: document.querySelector("#buyerAvatarFile"),
    bio: document.querySelector("#buyerBio"),
    status: document.querySelector("#buyerWizardStatus"),
    previewMode: document.querySelector("#buyerWizardPreviewMode"),
    previewAvatar: document.querySelector("#buyerWizardPreviewAvatar"),
    previewName: document.querySelector("#buyerWizardPreviewName"),
    previewEmail: document.querySelector("#buyerWizardPreviewEmail"),
    previewPhone: document.querySelector("#buyerWizardPreviewPhone"),
    previewBio: document.querySelector("#buyerWizardPreviewBio"),
    previewSignals: document.querySelector("#buyerWizardPreviewSignals"),
  };

  function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function normalizeInternalPath(path) {
    const value = String(path || "").trim();
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
      return "";
    }

    return value;
  }

  async function apiFetch(path, options = {}) {
    const headers = {
      Accept: "application/json",
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

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      if (response.status === 401) {
        window.location.href = "/auth/signin?role=buyer";
        throw new Error("Authentication required");
      }
      throw new Error((payload && payload.message) || `Request failed (${response.status})`);
    }

    return payload;
  }

  function setStatus(message, tone = "info") {
    if (!elements.status) {
      return;
    }

    if (!message) {
      elements.status.hidden = true;
      elements.status.textContent = "";
      elements.status.removeAttribute("data-state");
      return;
    }

    elements.status.hidden = false;
    elements.status.textContent = message;
    elements.status.dataset.state = tone;
  }

  function deriveBuyerInitial() {
    const label = String(state.fullName || state.email || "Buyer").trim();
    return label.charAt(0).toUpperCase() || "B";
  }

  function buildSignalBadges() {
    const categoryBadges = state.favoriteCategories.map((value) => ({
      label: value === "product" ? "Everyday products" : value,
      type: "Category",
    }));
    const templateBadges = state.favoriteTemplates.map((value) => ({
      label: value,
      type: "Style",
    }));

    return categoryBadges.concat(templateBadges);
  }

  function renderSignalBadges() {
    if (!elements.previewSignals) {
      return;
    }

    const badges = buildSignalBadges();
    if (!badges.length) {
      elements.previewSignals.innerHTML =
        '<span class="buyer-preview-chip buyer-preview-chip--muted">Your buyer signal chips will appear here</span>';
      return;
    }

    elements.previewSignals.innerHTML = badges
      .map(
        (badge) =>
          `<span class="buyer-preview-chip"><strong>${badge.type}:</strong> ${badge.label}</span>`
      )
      .join("");
  }

  function updateChipStates() {
    chipButtons.forEach((button) => {
      const group = button.dataset.chipGroup;
      const value = String(button.dataset.value || "").trim().toLowerCase();
      if (!group || !value) {
        return;
      }

      const activeValues =
        group === "template" ? state.favoriteTemplates : state.favoriteCategories;
      button.classList.toggle("active", activeValues.includes(value));
    });
  }

  function updatePreview() {
    if (elements.email) {
      elements.email.value = state.email;
    }

    if (elements.previewMode) {
      elements.previewMode.textContent = state.favoriteTemplates.length
        ? "Buyer profile tuned around your taste"
        : "Profile getting ready";
    }

    if (elements.previewAvatar) {
      if (state.avatarUrl) {
        elements.previewAvatar.style.backgroundImage = `url('${state.avatarUrl}')`;
        elements.previewAvatar.textContent = "";
      } else {
        elements.previewAvatar.style.backgroundImage = "";
        elements.previewAvatar.textContent = deriveBuyerInitial();
      }
    }

    if (elements.previewName) {
      elements.previewName.textContent = state.fullName || "Buyer profile";
    }

    if (elements.previewEmail) {
      elements.previewEmail.textContent = state.email || "your@email.com";
    }

    if (elements.previewPhone) {
      elements.previewPhone.textContent = state.phone || "Phone not added yet";
    }

    if (elements.previewBio) {
      elements.previewBio.textContent =
        state.bio ||
        "Your short buyer bio will appear here once you add a few details about what you like discovering on Zest.";
    }

    renderSignalBadges();
    updateChipStates();
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
  }

  function hydrateStateFromSnapshot(snapshot = {}) {
    const profile = snapshot.profile || {};
    const preferences = snapshot.preferences || {};

    state.email = String((profile && profile.email) || (snapshot.account && snapshot.account.email) || "").trim();
    state.fullName = String(profile.fullName || "").trim();
    state.phone = String(profile.phone || "").trim();
    state.avatarUrl = String(profile.avatarUrl || "").trim();
    state.bio = String(profile.bio || "").trim();
    state.favoriteCategories = Array.isArray(preferences.favoriteCategories)
      ? preferences.favoriteCategories.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
      : [];
    state.favoriteTemplates = Array.isArray(preferences.favoriteTemplates)
      ? preferences.favoriteTemplates.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
      : [];

    if (elements.fullName) {
      elements.fullName.value = state.fullName;
    }
    if (elements.phone) {
      elements.phone.value = state.phone;
    }
    if (elements.bio) {
      elements.bio.value = state.bio;
    }

    baselineState = cloneState(state);
    updatePreview();
  }

  async function readFileToDataUrl(file) {
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

  function resetWizard() {
    Object.assign(state, cloneState(baselineState));

    if (elements.fullName) {
      elements.fullName.value = state.fullName;
    }
    if (elements.phone) {
      elements.phone.value = state.phone;
    }
    if (elements.bio) {
      elements.bio.value = state.bio;
    }
    if (elements.avatarFile) {
      elements.avatarFile.value = "";
    }

    setStatus("");
    goToStep(1);
  }

  async function loadBuyerSnapshot() {
    const result = await apiFetch(profileEndpoint, { method: "GET" });
    hydrateStateFromSnapshot(result.data || {});
  }

  function setSaveButtonsBusy(isBusy) {
    saveInFlight = isBusy;
    document.querySelectorAll('[data-action="save-profile"]').forEach((button) => {
      button.disabled = isBusy;
      button.textContent = isBusy ? "Saving profile..." : "Open buyer profile";
    });
  }

  async function saveProfile() {
    if (saveInFlight) {
      return;
    }

    setStatus("Saving your buyer setup and preparing your profile...", "info");
    setSaveButtonsBusy(true);

    try {
      const result = await apiFetch(setupEndpoint, {
        method: "POST",
        body: JSON.stringify({
          fullName: state.fullName,
          phone: state.phone,
          avatarUrl: state.avatarUrl,
          bio: state.bio,
          favoriteCategories: state.favoriteCategories,
          favoriteTemplates: state.favoriteTemplates,
        }),
      });

      const redirectTo =
        normalizeInternalPath(result.data && result.data.redirectTo) || profilePath;
      window.location.href = redirectTo;
    } catch (error) {
      setStatus(
        error && error.message
          ? error.message
          : "We could not save your buyer setup right now. Please try again.",
        "error"
      );
    } finally {
      setSaveButtonsBusy(false);
    }
  }

  stepTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      goToStep(tab.dataset.step);
    });
  });

  actionButtons.forEach((button) => {
    const action = button.dataset.action;
    if (!action) {
      return;
    }

    button.addEventListener("click", async () => {
      if (action === "next") {
        setStatus("");
        goToStep(state.step + 1);
        return;
      }

      if (action === "prev") {
        setStatus("");
        goToStep(state.step - 1);
        return;
      }

      if (action === "reset") {
        resetWizard();
        return;
      }

      if (action === "save-profile") {
        await saveProfile();
      }
    });
  });

  if (elements.fullName) {
    elements.fullName.addEventListener("input", (event) => {
      state.fullName = String(event.target.value || "");
      updatePreview();
    });
  }

  if (elements.phone) {
    elements.phone.addEventListener("input", (event) => {
      state.phone = String(event.target.value || "");
      updatePreview();
    });
  }

  if (elements.bio) {
    elements.bio.addEventListener("input", (event) => {
      state.bio = String(event.target.value || "");
      updatePreview();
    });
  }

  if (elements.avatarFile) {
    elements.avatarFile.addEventListener("change", async () => {
      const file = elements.avatarFile.files && elements.avatarFile.files[0];
      state.avatarUrl = file ? await readFileToDataUrl(file) : baselineState.avatarUrl || "";
      updatePreview();
    });
  }

  chipButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.dataset.chipGroup;
      const value = String(button.dataset.value || "").trim().toLowerCase();
      if (!group || !value) {
        return;
      }

      const key = group === "template" ? "favoriteTemplates" : "favoriteCategories";
      const hasValue = state[key].includes(value);
      state[key] = hasValue
        ? state[key].filter((item) => item !== value)
        : state[key].concat(value);
      updatePreview();
    });
  });

  updatePreview();
  goToStep(1);

  loadBuyerSnapshot().catch(() => {
    setStatus(
      "We could not prefill your buyer setup just now. You can still complete the wizard manually.",
      "error"
    );

    if (elements.previewSignals) {
      elements.previewSignals.innerHTML =
        '<span class="buyer-preview-chip buyer-preview-chip--muted">Profile, feed, marketplace, and global feed will unlock here once setup is saved</span>';
    }

    document.querySelectorAll(".buyer-route-card code").forEach((code, index) => {
      const values = [profilePath, buyerFeedPath, marketplacePath, globalFeedPath];
      if (values[index]) {
        code.textContent = values[index];
      }
    });
  });
});
