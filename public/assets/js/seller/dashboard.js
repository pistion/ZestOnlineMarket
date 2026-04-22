(function () {
  "use strict";

  const state = {
    summary: null,
    discounts: [],
    charts: {
      overview: null,
      trends: null,
    },
  };

  const endpoints = {
    overview: document.body.dataset.sellerOverviewEndpoint || "/api/seller/me",
    discounts: document.body.dataset.sellerDiscountEndpoint || "/api/discounts",
  };

  const elements = {
    sidebar: document.querySelector(".sidebar"),
    toggleBtn: document.getElementById("toggleSidebar"),
    closeSidebar: document.querySelector(".close-sidebar"),
    navBtns: document.querySelectorAll(".nav-btn"),
    sections: document.querySelectorAll(".dashboard-section"),
    pageTitle: document.getElementById("page-title"),
    switchAccountBtn: document.getElementById("sellerSwitchAccountBtn"),
    signOutBtn: document.getElementById("sellerSignOutBtn"),
    storeName: document.getElementById("sellerDashboardStoreName"),
    storeStatus: document.getElementById("sellerDashboardStoreStatus"),
    storeMetric: document.getElementById("sellerDashboardStoreMetric"),
    visibilityMetric: document.getElementById("sellerDashboardVisibilityMetric"),
    templateChip: document.getElementById("sellerDashboardTemplateChip"),
    visibilityChip: document.getElementById("sellerDashboardVisibilityChip"),
    setupChip: document.getElementById("sellerDashboardSetupChip"),
    bannerTitle: document.getElementById("sellerWorkspaceBannerTitle"),
    bannerCopy: document.getElementById("sellerWorkspaceBannerCopy"),
    templatePill: document.getElementById("sellerWorkspaceTemplatePill"),
    visibilityPill: document.getElementById("sellerWorkspaceVisibilityPill"),
    stepPill: document.getElementById("sellerWorkspaceStepPill"),
    primaryAction: document.getElementById("sellerDashboardPrimaryAction"),
    templateAction: document.getElementById("sellerDashboardTemplateAction"),
    publicStoreLink: document.getElementById("sellerDashboardPublicStoreLink"),
    healthCopy: document.getElementById("sellerHealthCopy"),
    actionQueue: document.getElementById("sellerActionQueue"),
    revenueMetric: document.getElementById("sellerRevenueMetric"),
    revenueCopy: document.getElementById("sellerRevenueCopy"),
    ordersMetric: document.getElementById("sellerOrdersMetric"),
    ordersCopy: document.getElementById("sellerOrdersCopy"),
    updatesMetric: document.getElementById("sellerUpdatesMetric"),
    updatesCopy: document.getElementById("sellerUpdatesCopy"),
    productsMetric: document.getElementById("sellerProductsMetric"),
    productsCopy: document.getElementById("sellerProductsCopy"),
    promotionForm: document.getElementById("sellerPromotionForm"),
    promotionList: document.getElementById("sellerPromotionList"),
    promotionSubmit: document.getElementById("sellerPromotionSubmit"),
    promotionCode: document.getElementById("sellerPromotionCode"),
    promotionType: document.getElementById("sellerPromotionType"),
    promotionAmount: document.getElementById("sellerPromotionAmount"),
    salesChart: document.getElementById("salesChart"),
    trendsChart: document.getElementById("trendsChart"),
  };

  function toast(message, tone = "info") {
    if (window.ZestToast && typeof window.ZestToast[tone] === "function") {
      window.ZestToast[tone](message);
      return;
    }
    window.alert(message);
  }

  function formatCurrency(value) {
    return `K${Number(value || 0).toFixed(2)}`;
  }

  function formatVisibility(status) {
    const normalized = String(status || "draft").trim().toLowerCase();
    if (normalized === "published") {
      return "Published storefront";
    }
    if (normalized === "unpublished") {
      return "Hidden storefront";
    }
    return "Draft storefront";
  }

  function formatSetupStep(step, completed) {
    return completed ? "Setup complete" : `Step ${step || 1} of 4`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function clearSavedSession() {
    try {
      window.localStorage.removeItem("zestUser");
    } catch (_error) {
      // ignore
    }
  }

  async function signOut() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          redirectTo: "/auth/signin?signedOut=1&role=seller",
        }),
      });
    } catch (_error) {
      // ignore
    } finally {
      clearSavedSession();
      window.location.href = "/auth/signin?signedOut=1&role=seller";
    }
  }

  function setActiveSection(sectionId) {
    elements.navBtns.forEach((button) => {
      button.classList.toggle("active", button.dataset.section === sectionId);
    });
    elements.sections.forEach((section) => {
      section.classList.toggle("active", section.id === sectionId);
    });
    if (elements.pageTitle) {
      const active = Array.from(elements.navBtns).find((button) => button.dataset.section === sectionId);
      elements.pageTitle.textContent = active ? active.textContent.trim() : "Overview";
    }
    if (window.innerWidth <= 768 && elements.sidebar) {
      elements.sidebar.classList.add("hidden");
    }
  }

  function toggleSidebar() {
    if (elements.sidebar) {
      elements.sidebar.classList.toggle("hidden");
    }
  }

  function renderActionQueue(items) {
    if (!elements.actionQueue) {
      return;
    }
    elements.actionQueue.innerHTML = items.map((item) => `<li><i class="${item.icon}"></i> ${escapeHtml(item.label)}</li>`).join("");
  }

  function renderOverview(summary) {
    if (!summary) {
      return;
    }

    state.summary = summary;
    const store = summary.store || {};
    const metrics = summary.metrics || {};
    const completion = summary.completion || {};
    const template = summary.template || {};
    const lifecycle = summary.lifecycle || {};
    const paths = summary.paths || {};
    const visibilityLabel = lifecycle.visibilityLabel || formatVisibility(store.visibilityStatus);
    const setupLabel = formatSetupStep(completion.setupStep, completion.profileCompleted);
    const actionQueue = [];

    if (elements.storeName) {
      elements.storeName.textContent = store.storeName || "Seller workspace";
    }
    if (elements.storeStatus) {
      elements.storeStatus.textContent = completion.profileCompleted
        ? "Store management and publishing workspace"
        : `Setup in progress - step ${completion.setupStep || 1} of 4`;
    }
    if (elements.storeMetric) {
      elements.storeMetric.innerHTML = `<i class="fas fa-store"></i> ${metrics.products || 0} listings`;
    }
    if (elements.visibilityMetric) {
      elements.visibilityMetric.innerHTML = `<i class="fas fa-location-dot"></i> ${visibilityLabel}`;
    }
    if (elements.templateChip) {
      elements.templateChip.innerHTML = `<i class="fas fa-layer-group"></i> ${template.label || "Products Store"}`;
    }
    if (elements.visibilityChip) {
      elements.visibilityChip.innerHTML = `<i class="fas fa-circle"></i> ${visibilityLabel}`;
    }
    if (elements.setupChip) {
      elements.setupChip.innerHTML = `<i class="fas fa-bolt"></i> ${setupLabel}`;
    }
    if (elements.bannerTitle) {
      elements.bannerTitle.textContent = completion.profileCompleted
        ? `Manage ${store.storeName || "your storefront"}`
        : "Finish your storefront setup";
    }
    if (elements.bannerCopy) {
      elements.bannerCopy.textContent = completion.profileCompleted
        ? `Your ${template.label || "storefront"} is ${visibilityLabel.toLowerCase()}. Review branding, listings, and promotions from one place.`
        : `Your ${template.label || "storefront"} is still being prepared. Finish the remaining steps, then publish when you are ready.`;
    }
    if (elements.templatePill) {
      elements.templatePill.textContent = template.family || "Physical products";
    }
    if (elements.visibilityPill) {
      elements.visibilityPill.textContent = visibilityLabel;
    }
    if (elements.stepPill) {
      elements.stepPill.textContent = setupLabel;
    }
    if (elements.primaryAction) {
      elements.primaryAction.href = completion.profileCompleted ? paths.settings || "/seller/store/settings" : paths.setup || "/seller/store";
      elements.primaryAction.textContent = completion.profileCompleted ? "Open store settings" : "Continue setup";
    }
    if (elements.templateAction) {
      elements.templateAction.href = paths.templateManager || "/seller/store/template";
    }
    if (elements.publicStoreLink) {
      elements.publicStoreLink.hidden = !paths.publicStore;
      elements.publicStoreLink.href = paths.publicStore || "#";
    }
    if (elements.healthCopy) {
      elements.healthCopy.textContent = completion.profileCompleted
        ? "Track revenue, order status, listings, and promotions from one live workspace."
        : "Use these signals to finish setup, confirm your template, and prepare the storefront for publishing.";
    }
    if (elements.revenueMetric) {
      elements.revenueMetric.innerHTML = `${formatCurrency(metrics.revenue)} <span class="trend positive">${metrics.orders ? "Live" : "Waiting"}</span>`;
    }
    if (elements.revenueCopy) {
      elements.revenueCopy.textContent = metrics.orders
        ? `Net revenue is now based on ${metrics.orders || 0} live orders flowing through this store.`
        : "Publish listings and complete your first checkout to start building real revenue data.";
    }
    if (elements.ordersMetric) {
      elements.ordersMetric.innerHTML = `${Number(metrics.orders || 0)} <span class="trend positive">${metrics.orders ? "Live" : "Waiting"}</span>`;
    }
    if (elements.ordersCopy) {
      elements.ordersCopy.textContent = metrics.orders
        ? `Paid: ${metrics.paidOrders || 0}, shipped: ${metrics.shippedOrders || 0}, delivered: ${metrics.deliveredOrders || 0}, refunded: ${metrics.refundedOrders || 0}.`
        : "Once a buyer completes checkout, the order queue will appear here and in Store Orders.";
    }
    if (elements.updatesMetric) {
      elements.updatesMetric.innerHTML = `${Number(metrics.updates || 0)} <span class="trend positive">${metrics.updates ? "Active" : "Quiet"}</span>`;
    }
    if (elements.updatesCopy) {
      elements.updatesCopy.textContent = metrics.followers
        ? `Followers: ${metrics.followers}. Store updates can now be used to keep that audience engaged.`
        : "Publish seller updates to start building a social storefront rhythm.";
    }
    if (elements.productsMetric) {
      elements.productsMetric.innerHTML = `${Number(metrics.liveProducts || 0)} <span class="trend negative">${Number(metrics.draftProducts || 0)} drafts</span>`;
    }
    if (elements.productsCopy) {
      elements.productsCopy.textContent = completion.profileCompleted
        ? "Use store settings and listing management to move drafts into the live storefront."
        : "Finish onboarding to turn your draft storefront into a published seller space.";
    }

    if (!completion.profileCompleted) {
      actionQueue.push(
        { icon: "fas fa-store", label: "Complete your store identity, branding, and socials." },
        { icon: "fas fa-layer-group", label: `Keep the ${template.label || "current"} template if it still matches how you sell.` },
        { icon: "fas fa-box-open", label: "Finish your featured listing so the storefront is ready to publish." }
      );
    } else {
      actionQueue.push(
        { icon: "fas fa-sliders", label: "Review store settings and visibility controls before your next launch." },
        { icon: "fas fa-tags", label: "Create or update a promotion so checkout incentives stay current." },
        { icon: "fas fa-bullhorn", label: metrics.updates ? "Keep followers engaged with fresh store updates." : "Publish your first store update to create a live storefront rhythm." }
      );
    }

    renderActionQueue(actionQueue);
    renderCharts(metrics);
  }

  function ensureCharts() {
    if (!window.Chart) {
      return;
    }

    if (!state.charts.overview && elements.salesChart) {
      state.charts.overview = new window.Chart(elements.salesChart.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: ["Paid", "Shipped", "Delivered", "Refunded"],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: ["#2563eb", "#0f766e", "#15803d", "#c2410c"],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      });
    }

    if (!state.charts.trends && elements.trendsChart) {
      state.charts.trends = new window.Chart(elements.trendsChart.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Revenue", "Orders", "Live listings", "Followers", "Updates"],
          datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "rgba(37, 99, 235, 0.72)",
              "rgba(15, 118, 110, 0.72)",
              "rgba(21, 128, 61, 0.72)",
              "rgba(59, 130, 246, 0.52)",
              "rgba(14, 116, 144, 0.62)",
            ],
            borderRadius: 12,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  function renderCharts(metrics) {
    ensureCharts();
    if (state.charts.overview) {
      state.charts.overview.data.datasets[0].data = [
        Number(metrics.paidOrders || 0),
        Number(metrics.shippedOrders || 0),
        Number(metrics.deliveredOrders || 0),
        Number(metrics.refundedOrders || 0),
      ];
      state.charts.overview.update();
    }

    if (state.charts.trends) {
      state.charts.trends.data.datasets[0].data = [
        Number(metrics.revenue || 0),
        Number(metrics.orders || 0),
        Number(metrics.liveProducts || 0),
        Number(metrics.followers || 0),
        Number(metrics.updates || 0),
      ];
      state.charts.trends.update();
    }
  }

  function buildPromotionPayload(formData) {
    return {
      code: String(formData.get("code") || "").trim().toUpperCase(),
      title: String(formData.get("title") || "").trim(),
      discountType: String(formData.get("discountType") || "percentage").trim(),
      amount: Number(formData.get("amount") || 0),
      minOrderAmount: Number(formData.get("minOrderAmount") || 0),
      maxUses: formData.get("maxUses") ? Number(formData.get("maxUses")) : null,
      startsAt: formData.get("startsAt") ? new Date(formData.get("startsAt")).toISOString() : null,
      endsAt: formData.get("endsAt") ? new Date(formData.get("endsAt")).toISOString() : null,
      active: formData.get("active") === "on",
    };
  }

  function renderDiscounts() {
    if (!elements.promotionList) {
      return;
    }

    if (!state.discounts.length) {
      elements.promotionList.innerHTML = '<p class="card-copy">No promotions created yet.</p>';
      return;
    }

    elements.promotionList.innerHTML = state.discounts
      .map((discount) => {
        const amountLabel =
          discount.discountType === "percentage"
            ? `${Number(discount.amount || 0)}% off`
            : discount.discountType === "free_shipping"
              ? "Free shipping"
              : `${formatCurrency(discount.amount)} off`;

        return `
          <article class="promotion-card">
            <div class="promotion-card__head">
              <div>
                <strong>${escapeHtml(discount.code)}</strong>
                <p>${escapeHtml(discount.title || "Promotion")}</p>
              </div>
              <span class="workspace-pill">${discount.active ? "Active" : "Paused"}</span>
            </div>
            <div class="promotion-card__meta">
              <span>${escapeHtml(amountLabel)}</span>
              <span>Min order: ${formatCurrency(discount.minOrderAmount || 0)}</span>
              <span>Uses: ${Number(discount.useCount || 0)}${discount.maxUses ? ` / ${Number(discount.maxUses)}` : ""}</span>
            </div>
            <div class="promotion-card__actions">
              <button class="header-action-link" type="button" data-toggle-discount="${Number(discount.id || 0)}" data-next-active="${discount.active ? "false" : "true"}">
                ${discount.active ? "Pause" : "Activate"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadDiscounts() {
    if (!elements.promotionList) {
      return;
    }

    try {
      const payload = await fetchJson(endpoints.discounts);
      state.discounts = Array.isArray(payload.discounts) ? payload.discounts : [];
      renderDiscounts();
    } catch (error) {
      elements.promotionList.innerHTML = `<p class="card-copy">${escapeHtml((error && error.message) || "Unable to load promotions.")}</p>`;
    }
  }

  async function createPromotion(event) {
    event.preventDefault();
    if (!elements.promotionForm || !elements.promotionSubmit) {
      return;
    }

    const originalLabel = elements.promotionSubmit.textContent;
    elements.promotionSubmit.disabled = true;
    elements.promotionSubmit.textContent = "Saving...";

    try {
      const payload = buildPromotionPayload(new window.FormData(elements.promotionForm));
      const response = await fetchJson(endpoints.discounts, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.discount) {
        state.discounts = [response.discount, ...state.discounts];
        renderDiscounts();
      } else {
        await loadDiscounts();
      }

      elements.promotionForm.reset();
      if (elements.promotionCode) {
        elements.promotionCode.value = "";
      }
      if (elements.promotionType) {
        elements.promotionType.value = "percentage";
      }
      if (elements.promotionAmount) {
        elements.promotionAmount.value = "";
      }
      toast("Promotion created.", "success");
      setActiveSection("promotions");
    } catch (error) {
      toast((error && error.message) || "Unable to create promotion.", "error");
    } finally {
      elements.promotionSubmit.disabled = false;
      elements.promotionSubmit.textContent = originalLabel;
    }
  }

  async function togglePromotion(discountId, nextActive) {
    try {
      const existing = state.discounts.find((discount) => Number(discount.id || 0) === Number(discountId || 0));
      if (!existing) {
        throw new Error("Promotion not found");
      }
      await fetchJson(`${endpoints.discounts}/${Number(discountId || 0)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: existing.code,
          title: existing.title,
          description: existing.description || "",
          discountType: existing.discountType,
          amount: existing.amount,
          minOrderAmount: existing.minOrderAmount || 0,
          maxUses: existing.maxUses,
          startsAt: existing.startsAt || null,
          endsAt: existing.endsAt || null,
          active: nextActive === "true",
        }),
      });
      toast(nextActive === "true" ? "Promotion activated." : "Promotion paused.", "success");
      await loadDiscounts();
    } catch (error) {
      toast((error && error.message) || "Unable to update promotion.", "error");
    }
  }

  function bindEvents() {
    if (elements.toggleBtn) {
      elements.toggleBtn.addEventListener("click", toggleSidebar);
    }
    if (elements.closeSidebar) {
      elements.closeSidebar.addEventListener("click", toggleSidebar);
    }

    elements.navBtns.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.route) {
          window.location.href = button.dataset.route;
          return;
        }
        if (button.dataset.section) {
          setActiveSection(button.dataset.section);
        }
      });
    });

    if (elements.switchAccountBtn) {
      elements.switchAccountBtn.addEventListener("click", () => {
        clearSavedSession();
        window.location.href = "/auth/signin?role=seller";
      });
    }
    if (elements.signOutBtn) {
      elements.signOutBtn.addEventListener("click", () => {
        signOut().catch(() => {});
      });
    }
    if (elements.promotionForm) {
      elements.promotionForm.addEventListener("submit", createPromotion);
    }
    if (elements.promotionList) {
      elements.promotionList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-toggle-discount]");
        if (!button) {
          return;
        }
        togglePromotion(button.getAttribute("data-toggle-discount"), button.getAttribute("data-next-active"));
      });
    }
  }

  async function loadWorkspaceOverview() {
    try {
      const payload = await fetchJson(endpoints.overview);
      renderOverview(payload);
    } catch (_error) {
      toast("Unable to load seller workspace right now.", "error");
    }
  }

  bindEvents();
  ensureCharts();
  loadWorkspaceOverview().catch(() => {});
  loadDiscounts().catch(() => {});
})();
