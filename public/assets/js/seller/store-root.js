const templates = [
  {
    id: "products",
    badge: "Products",
    title: "Physical Products Store",
    subtitle: "Sell anything you can ship - bilums, phones, coffee, clothes.",
    bg: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
    features: [
      "Smart inventory and stock alerts",
      "PNG-wide shipping zones",
      "Variants, bundles, and flash sales",
      "Beautiful product galleries",
    ],
  },
  {
    id: "services",
    badge: "Services",
    title: "Skills and Services Store",
    subtitle: "Get paid for your talent - design, repair, tutoring, photography.",
    bg: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    features: [
      "Fixed price or hourly gigs",
      "Built-in booking calendar",
      "Portfolio and customer reviews",
      "Instant chat and file sharing",
    ],
  },
  {
    id: "learning",
    badge: "Courses",
    title: "Classes and Courses Store",
    subtitle: "Teach what you know - guitar, coding, cooking, business, and more.",
    bg: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
    features: [
      "Upload videos or teach live",
      "Student progress tracking",
      "Certificates and quizzes",
      "One-time or subscription fees",
    ],
  },
];

const serviceTemplates = [
  {
    id: "art",
    title: "Art and Design",
    subtitle: "Sell drawings, digital art, paintings, or offer commissions.",
    thumb: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&q=80",
  },
  {
    id: "music",
    title: "Music Services",
    subtitle: "Offer lessons, mixing, beats, vocals, and production.",
    thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
  },
  {
    id: "photography",
    title: "Photography",
    subtitle: "Offer photoshoots, editing, events, and studio work.",
    thumb: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
  },
  {
    id: "programmer",
    title: "Coding and Development",
    subtitle: "Offer coding lessons, apps, websites, and automations.",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  },
];

const classTemplates = [
  {
    id: "classes",
    title: "Classes",
    subtitle: "Offer structured lessons such as guitar, coding, maths, and more.",
    thumb: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
  },
  {
    id: "consultations",
    title: "Consultations",
    subtitle: "Provide one-on-one coaching, advice, or expert sessions.",
    thumb: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
  },
];

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

let current = 0;
let selectedTemplate = null;
let currentTemplate = "";

const flowMode =
  document.body.dataset.sellerTemplateFlowMode === "settings" ? "settings" : "onboarding";
const paths = {
  store: document.body.dataset.sellerStoreEndpoint || "/api/store/me",
  wizard: document.body.dataset.sellerWizardPath || "/seller/wizard-setup",
  dashboard: document.body.dataset.sellerDashboardPath || "/seller/dashboard",
  settings: document.body.dataset.sellerSettingsPath || "/seller/store/settings",
  templateManager: document.body.dataset.sellerTemplateManagerPath || "/seller/store/template",
};

const el = {
  chooser: document.getElementById("chooser"),
  preview: document.getElementById("preview-mode"),
  selection: document.getElementById("selection-mode"),
  subSelection: document.getElementById("sub-selection-mode"),
  classScreen: document.getElementById("sub-selection-mode-c"),
  badge: document.getElementById("badge"),
  title: document.getElementById("title"),
  subtitle: document.getElementById("subtitle"),
  features: document.getElementById("features"),
  grid: document.getElementById("selection-grid"),
  subGrid: document.getElementById("sub-grid"),
  classGrid: document.getElementById("sub-grid-c"),
  dots: document.getElementById("dots"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  flowBadge: document.getElementById("templateFlowBadge"),
  flowTitle: document.getElementById("templateFlowTitle"),
  flowCopy: document.getElementById("templateFlowCopy"),
  dashboardLink: document.getElementById("templateFlowDashboardLink"),
  settingsLink: document.getElementById("templateFlowSettingsLink"),
  previewLink: document.getElementById("templateFlowPreviewLink"),
  statusCard: document.getElementById("templateStatusCard"),
  statusEyebrow: document.getElementById("templateStatusEyebrow"),
  statusTitle: document.getElementById("templateStatusTitle"),
  statusText: document.getElementById("templateStatusText"),
  statusFamily: document.getElementById("templateStatusFamily"),
  statusMode: document.getElementById("templateStatusMode"),
};

const checkSVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
`;

function getTemplateMeta(templateKey) {
  return TEMPLATE_META[String(templateKey || "").trim().toLowerCase()] || TEMPLATE_META.products;
}

function renderStatusCard(templateKey) {
  const meta = getTemplateMeta(templateKey || currentTemplate || "products");
  if (el.statusCard) {
    el.statusCard.hidden = false;
  }
  if (el.statusEyebrow) {
    el.statusEyebrow.textContent =
      flowMode === "settings" ? "Current storefront template" : "Template direction";
  }
  if (el.statusTitle) {
    el.statusTitle.textContent = meta.label;
  }
  if (el.statusText) {
    el.statusText.textContent = meta.summary;
  }
  if (el.statusFamily) {
    el.statusFamily.textContent = meta.family;
  }
  if (el.statusMode) {
    el.statusMode.textContent =
      flowMode === "settings" ? "Template manager" : "Onboarding flow";
  }
  if (el.previewLink) {
    el.previewLink.href = meta.previewPath;
    el.previewLink.hidden = flowMode !== "settings";
  }
}

function updateFlowShell() {
  if (el.flowBadge) {
    el.flowBadge.textContent =
      flowMode === "settings" ? "Template manager" : "Seller onboarding";
  }
  if (el.flowTitle) {
    el.flowTitle.textContent =
      flowMode === "settings"
        ? "Switch your storefront template"
        : "Choose your storefront template";
  }
  if (el.flowCopy) {
    el.flowCopy.textContent =
      flowMode === "settings"
        ? "Review your current template, choose a new storefront style, then save the change from store settings."
        : "Start with the template that best matches how you sell, then continue into store setup.";
  }
  if (el.dashboardLink) {
    el.dashboardLink.hidden = flowMode !== "settings";
    el.dashboardLink.href = paths.dashboard;
  }
  if (el.settingsLink) {
    el.settingsLink.hidden = flowMode !== "settings";
    el.settingsLink.href = paths.settings;
  }
  renderStatusCard(selectedTemplate || currentTemplate || "products");
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw new Error((data && data.message) || `Request failed (${response.status})`);
  }

  return data;
}

async function loadCurrentTemplate() {
  if (flowMode !== "settings") {
    updateFlowShell();
    return;
  }

  try {
    const data = await apiFetch(paths.store, { method: "GET" });
    const store = data && data.store ? data.store : null;
    currentTemplate = String((store && store.templateKey) || "products").trim().toLowerCase();
    selectedTemplate = currentTemplate || selectedTemplate;
  } catch (_) {
    currentTemplate = "products";
  }

  updateFlowShell();
}

async function saveDraftTemplate(templateKey) {
  try {
    await fetch("/api/seller/store/draft", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        templateKey,
        setupStep: 1,
        socials: {},
        product: {
          images: [],
        },
      }),
    });
  } catch (_) {
    // ignore draft-save failures and continue to the next step
  }
}

async function navigateToNextStep(templateKey) {
  if (!templateKey) {
    return;
  }

  if (flowMode === "settings") {
    window.location.href = `${paths.settings}?template=${encodeURIComponent(templateKey)}`;
    return;
  }

  await saveDraftTemplate(templateKey);
  window.location.href = `${paths.wizard}?template=${encodeURIComponent(templateKey)}`;
}

function renderPreview() {
  const template = templates[current];
  if (!template) {
    return;
  }

  el.chooser.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${template.bg})`;
  el.badge.textContent = template.badge;
  el.title.textContent = template.title;
  el.subtitle.textContent = template.subtitle;
  el.features.innerHTML = template.features
    .map(
      (feature) => `
        <div class="feature">
          ${checkSVG}
          <span>${feature}</span>
        </div>
      `
    )
    .join("");
}

function updateDots() {
  el.dots.innerHTML = "";
  for (let index = 0; index < 4; index += 1) {
    const dot = document.createElement("span");
    dot.className = "dot";
    if (index === (current < 3 ? current : 3)) {
      dot.classList.add("active");
    }
    el.dots.appendChild(dot);
  }
}

function resetSecondaryScreens() {
  el.preview.style.display = "block";
  el.selection.style.display = "none";
  el.subSelection.style.display = "none";
  if (el.classScreen) {
    el.classScreen.style.display = "none";
  }
}

function applySelectedState(selector, templateKey) {
  document.querySelectorAll(selector).forEach((item) => {
    item.classList.toggle("selected", item.dataset.template === templateKey);
  });
}

function updateNextButton(label) {
  if (!el.next) {
    return;
  }

  el.next.classList.remove("btn-disabled");
  el.next.textContent =
    flowMode === "settings" ? `Use ${label}` : `Continue with ${label}`;
}

function enableSelectionHandler(selector, onContinue) {
  document.querySelectorAll(selector).forEach((card) => {
    card.addEventListener("click", () => {
      applySelectedState(selector, card.dataset.template);
      selectedTemplate = card.dataset.template;
      renderStatusCard(selectedTemplate);
      updateNextButton(card.dataset.label);
      el.next.onclick = () => onContinue(selectedTemplate);
    });
  });
}

function showTemplateSelection() {
  el.preview.style.display = "none";
  el.selection.style.display = "block";
  el.subSelection.style.display = "none";
  if (el.classScreen) {
    el.classScreen.style.display = "none";
  }

  el.grid.innerHTML = templates
    .map(
      (template) => `
        <div class="template-card" data-template="${template.id}" data-label="${template.title}">
          <div class="thumb" style="background-image:url(${template.thumb})"></div>
          <h3>${template.title}</h3>
          <p>${template.subtitle}</p>
          <div class="check">${checkSVG}</div>
        </div>
      `
    )
    .join("");

  enableSelectionHandler("#selection-grid .template-card", (templateKey) => {
    if (templateKey === "services") {
      showServiceTemplates();
      return;
    }

    if (templateKey === "learning") {
      showClassTemplates();
      return;
    }

    navigateToNextStep("products");
  });
}

function showServiceTemplates() {
  el.preview.style.display = "none";
  el.selection.style.display = "none";
  el.subSelection.style.display = "block";
  if (el.classScreen) {
    el.classScreen.style.display = "none";
  }

  el.subGrid.innerHTML = serviceTemplates
    .map(
      (template) => `
        <div class="template-card" data-template="${template.id}" data-label="${template.title}">
          <div class="thumb" style="background-image:url(${template.thumb})"></div>
          <h3>${template.title}</h3>
          <p>${template.subtitle}</p>
          <div class="check">${checkSVG}</div>
        </div>
      `
    )
    .join("");

  enableSelectionHandler("#sub-grid .template-card", (templateKey) => {
    navigateToNextStep(templateKey);
  });

  if (currentTemplate && serviceTemplates.some((template) => template.id === currentTemplate)) {
    selectedTemplate = currentTemplate;
    applySelectedState("#sub-grid .template-card", currentTemplate);
    renderStatusCard(currentTemplate);
    updateNextButton(getTemplateMeta(currentTemplate).label);
    el.next.onclick = () => navigateToNextStep(currentTemplate);
  }
}

function showClassTemplates() {
  el.preview.style.display = "none";
  el.selection.style.display = "none";
  el.subSelection.style.display = "none";
  if (!el.classScreen) {
    return;
  }

  el.classScreen.style.display = "block";
  el.classGrid.innerHTML = classTemplates
    .map(
      (template) => `
        <div class="template-card" data-template="${template.id}" data-label="${template.title}">
          <div class="thumb" style="background-image:url(${template.thumb})"></div>
          <h3>${template.title}</h3>
          <p>${template.subtitle}</p>
          <div class="check">${checkSVG}</div>
        </div>
      `
    )
    .join("");

  enableSelectionHandler("#sub-grid-c .template-card", (templateKey) => {
    navigateToNextStep(templateKey);
  });

  if (currentTemplate && classTemplates.some((template) => template.id === currentTemplate)) {
    selectedTemplate = currentTemplate;
    applySelectedState("#sub-grid-c .template-card", currentTemplate);
    renderStatusCard(currentTemplate);
    updateNextButton(getTemplateMeta(currentTemplate).label);
    el.next.onclick = () => navigateToNextStep(currentTemplate);
  }
}

function defaultNext() {
  if (current < 2) {
    current += 1;
    renderPreview();
    updateDots();
    renderStatusCard(templates[current] && templates[current].id === "services"
      ? "art"
      : templates[current] && templates[current].id === "learning"
        ? "classes"
        : "products");
    return;
  }

  current = 3;
  updateDots();
  showTemplateSelection();
  el.next.textContent = flowMode === "settings" ? "Select a template" : "Please select a template";
  el.next.classList.add("btn-disabled");
}

function initializeSettingsMode() {
  current = 3;
  if (el.prev) {
    el.prev.textContent = "Back";
  }
  if (el.dots) {
    el.dots.style.display = "none";
  }
  showTemplateSelection();
  el.next.textContent = "Select a template";
  el.next.classList.add("btn-disabled");

  const currentMeta = getTemplateMeta(currentTemplate || "products");
  if (currentTemplate === "products") {
    selectedTemplate = "products";
    applySelectedState("#selection-grid .template-card", "products");
    renderStatusCard("products");
    updateNextButton(currentMeta.label);
    el.next.onclick = () => navigateToNextStep("products");
  } else if (serviceTemplates.some((template) => template.id === currentTemplate)) {
    showServiceTemplates();
  } else if (classTemplates.some((template) => template.id === currentTemplate)) {
    showClassTemplates();
  }
}

el.prev.onclick = () => {
  if (flowMode === "settings") {
    window.location.href = paths.settings;
    return;
  }

  if (current <= 0) {
    return;
  }

  current -= 1;
  selectedTemplate = null;
  el.next.textContent = "Next";
  el.next.classList.add("btn-disabled");
  el.next.onclick = defaultNext;
  resetSecondaryScreens();
  renderPreview();
  updateDots();
  renderStatusCard("products");
};

el.next.onclick = defaultNext;

renderPreview();
updateDots();
updateFlowShell();

loadCurrentTemplate().finally(() => {
  if (flowMode === "settings") {
    initializeSettingsMode();
    return;
  }

  renderStatusCard("products");
});
