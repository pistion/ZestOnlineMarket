// ============================================================
// ZEST — PRODUCT FEED + CREATE WIZARD + IMAGE VIEWER + CARD SLIDER
// ============================================================

// Utilities
const $ = (s) => document.querySelector(s);
const df = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
const formatDate = (d) => df.format(new Date(d));
const RECENT_DAYS = 14;

let PRODUCTS = [];

// ============================================================
// CARD SLIDER STATE
// ============================================================
let CAROUSEL_INTERVALS = [];

function clearCarousels() {
  CAROUSEL_INTERVALS.forEach((id) => clearInterval(id));
  CAROUSEL_INTERVALS = [];
}

// Setup sliders on all cards after render
function setupAllCardSliders() {
  const cards = document.querySelectorAll(".card");

  cards.forEach((card) => {
    const imagesData = card.dataset.images;
    if (!imagesData) return;

    let images;
    try {
      images = JSON.parse(imagesData);
    } catch (e) {
      images = [];
    }
    if (!images || !images.length) return;

    const media = card.querySelector(".media");
    const imgEl = media.querySelector(".media-main");
    const dots = media.querySelectorAll(".media-dot");

    let current = 0;

    function show(idx) {
      if (!images.length) return;
      current = ((idx % images.length) + images.length) % images.length;
      imgEl.src = images[current];
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === current);
      });
    }

    // If only one image: no auto-slide, simple click to open viewer
    if (images.length === 1) {
      show(0);
      media.addEventListener("click", () => {
        openImageViewer(images, 0);
      });
      return;
    }

    // Multiple images: dots + auto-slide + click to viewer
    dots.forEach((dot, i) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        show(i);
      });
    });

    media.addEventListener("click", () => {
      openImageViewer(images, current);
    });

    show(0);

    const intervalId = setInterval(() => {
      show(current + 1);
    }, 5000); // 5s auto-slide

    CAROUSEL_INTERVALS.push(intervalId);
  });
}

/* ============================================================
   CREATE CARD (Feed Component)
============================================================ */
function createCard(item) {
  const el = document.createElement("article");
  el.className = "card";

  const images = item.images || [];
  const thumb = images.length ? images[0] : "";

  el.dataset.images = JSON.stringify(images);

  const hasMultiple = images.length > 1;

  el.innerHTML = `
    <div class="media">
      ${
        thumb
          ? `<img class="media-main" src="${thumb}" alt="${item.name || ""}">`
          : `<div class="media-placeholder"></div>`
      }
      ${
        hasMultiple
          ? `<div class="media-dots">
               ${images
                 .map(
                   (_, idx) =>
                     `<span class="media-dot${idx === 0 ? " active" : ""}"></span>`
                 )
                 .join("")}
             </div>`
          : ""
      }
    </div>

    <div class="body">
      <div class="title">${item.name}</div>

      <div class="muted" style="margin-top:2px">
        ${item.description ? item.description.substring(0, 140) + "..." : ""}
      </div>

      <div class="price-row">
        <div class="price">K${Number(item.price).toFixed(2)}</div>
        <div class="date">${formatDate(item.datePosted)}</div>
      </div>

      <div class="muted" style="margin-top:6px;font-size:.85rem">
        ${item.location ? `📍 ${item.location}` : ""}
      </div>
    </div>
  `;

  // If only one image, still allow click to open viewer
  if (images.length === 1 && thumb) {
    const media = el.querySelector(".media");
    media.addEventListener("click", () => {
      openImageViewer(images, 0);
    });
  }

  return el;
}

/* ============================================================
   SPLIT RECENT / PREVIOUS
============================================================ */
function splitByRecency(items) {
  const now = new Date();
  const msRecent = RECENT_DAYS * 24 * 60 * 60 * 1000;

  const recent = [];
  const previous = [];

  items.forEach((p) => {
    const age = now - new Date(p.datePosted);
    (age <= msRecent ? recent : previous).push(p);
  });

  recent.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
  previous.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));

  return { recent, previous };
}

/* ============================================================
   RENDER PRODUCTS
============================================================ */
function renderProducts(items) {
  const { recent, previous } = splitByRecency(items);
  const recentGrid = $("#recentGrid");
  const prevGrid = $("#prevGrid");

  if (!recentGrid || !prevGrid) return;

  clearCarousels();

  recentGrid.innerHTML = "";
  prevGrid.innerHTML = "";

  recent.forEach((p) => recentGrid.appendChild(createCard(p)));
  previous.forEach((p) => prevGrid.appendChild(createCard(p)));

  const recentCountEl = $("#recentCount");
  const prevCountEl = $("#prevCount");

  if (recentCountEl) {
    recentCountEl.textContent = recent.length
      ? `${recent.length} item${recent.length > 1 ? "s" : ""}`
      : "No recent items";
  }

  if (prevCountEl) {
    prevCountEl.textContent = previous.length
      ? `${previous.length} item${previous.length > 1 ? "s" : ""}`
      : "No previous items";
  }

  setupAllCardSliders();
}

/* ============================================================
   LOAD PRODUCTS
============================================================ */
async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error("Failed to fetch products");

    const data = await res.json();

    PRODUCTS = (data.products || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      images: p.images || [],
      location: p.location || "",
      delivery: p.delivery || "",
      datePosted: p.createdAt || new Date().toISOString().slice(0, 10),
    }));

    renderProducts(PRODUCTS);
  } catch (err) {
    console.error(err);
    renderProducts([]);
  }
}

/* ============================================================
   FIELDS
============================================================ */
const productNameInput = $("#productName");
const productDescriptionInput = $("#productDescription");
const productPriceInput = $("#productPrice");
const transportFeeInput = $("#transportFee");
const deliveryInfoInput = $("#deliveryInfo");
const businessLocationInput = $("#businessLocation");
const productImagesInput = $("#productImages");
const productImagePreviewGrid = $("#productImagePreviewGrid");
const imgWarning = $("#imgWarning");

const MAX_IMAGES = 4;
const MAX_IMG_SIZE = 2 * 1024 * 1024;

/* ============================================================
   IMAGE PREVIEW
============================================================ */
function clearImagePreviews() {
  if (productImagePreviewGrid) {
    productImagePreviewGrid.innerHTML = "";
  }
}

function createThumbnail(file) {
  const url = URL.createObjectURL(file);

  const thumb = document.createElement("div");
  thumb.className = "preview-thumb";
  thumb.innerHTML = `<img src="${url}" class="preview-img"/>`;
  thumb.addEventListener("click", () => openImageViewer([url], 0));

  return thumb;
}

if (productImagesInput) {
  productImagesInput.addEventListener("change", () => {
    clearImagePreviews();
    if (imgWarning) {
      imgWarning.style.display = "none";
      imgWarning.textContent = "";
    }

    const files = [...productImagesInput.files];

    if (files.length > MAX_IMAGES) {
      if (imgWarning) {
        imgWarning.textContent = `Maximum ${MAX_IMAGES} images allowed.`;
        imgWarning.style.display = "block";
      }
      productImagesInput.value = "";
      return;
    }

    for (const f of files) {
      if (f.size > MAX_IMG_SIZE) {
        if (imgWarning) {
          imgWarning.textContent = "One or more images exceed 2MB.";
          imgWarning.style.display = "block";
        }
        productImagesInput.value = "";
        return;
      }
    }

    files.forEach((file) =>
      productImagePreviewGrid.appendChild(createThumbnail(file))
    );
  });
}

/* ============================================================
   WIZARD (4 Steps)
============================================================ */
function setupWizard() {
  let currentStep = 1;

  const screens = document.querySelectorAll(".wizard-screen");
  const steps = document.querySelectorAll(".wizard-step");

  function showStep(step) {
    currentStep = step;

    screens.forEach((scr) => {
      scr.style.display =
        Number(scr.getAttribute("data-screen")) === step ? "block" : "none";
    });

    steps.forEach((s) => {
      const st = Number(s.getAttribute("data-step"));
      s.classList.toggle("active", st === step);
    });
  }

  document.querySelectorAll(".btn-next").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep < 4) showStep(currentStep + 1);
    });
  });

  document.querySelectorAll(".btn-back").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 1) showStep(currentStep - 1);
    });
  });

  showStep(1);
}

/* ============================================================
   MODAL + SUBMIT
============================================================ */
function setupCreateModal() {
  const modal = $("#createModal");
  if (!modal) return;

  const modalBackdrop = modal.querySelector(".modal-backdrop");
  const modalCloseBtn = modal.querySelector(".modal-close");
  const createForm = $("#createProductForm");

  const createTop = $("#createTop");
  const createFab = $("#createFab");

  function openModal() {
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
    if (createForm) {
      createForm.reset();
    }
    clearImagePreviews();
  }

  if (createTop) {
    createTop.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (createFab) {
    createFab.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", closeModal);
  }

  // Submit handler
  if (!createForm) return;

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = productNameInput?.value.trim();
    const description = productDescriptionInput?.value.trim();
    const price = productPriceInput?.value;
    const transportFee = transportFeeInput?.value || 0;
    const delivery = deliveryInfoInput?.value.trim();
    const location = businessLocationInput?.value.trim();
    const files = productImagesInput ? [...productImagesInput.files] : [];

    if (!name || !description || !price) {
      alert("Please fill in all required fields.");
      return;
    }

    // Local insert (optimistic UI)
    const today = new Date().toISOString().slice(0, 10);
    const localImages = files.map((f) => URL.createObjectURL(f));

    const localProduct = {
      id: Date.now(),
      name,
      description,
      price,
      images: localImages,
      location,
      delivery,
      datePosted: today,
    };

    PRODUCTS.unshift(localProduct);
    renderProducts(PRODUCTS);

    // Send to backend (optional)
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("transportFee", transportFee);
    formData.append("delivery", delivery);
    formData.append("location", location);

    files.forEach((file) => formData.append("images", file));

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Server failed");

      const saved = await res.json();

      // Replace local product with backend product
      PRODUCTS = PRODUCTS.filter((p) => p.id !== localProduct.id);
      PRODUCTS.unshift(saved.product);
      renderProducts(PRODUCTS);
    } catch (err) {
      console.warn("Backend unreachable, using local only.");
    }

    closeModal();
  });
}

/* ============================================================
   IMAGE VIEWER (Fullscreen, with dots + arrows)
============================================================ */
const iv = $("#imageViewer");
const ivImg = $("#iv-image");
const ivBackdrop = iv?.querySelector(".iv-backdrop");
const ivClose = iv?.querySelector(".iv-close");
const ivDotsContainer = iv?.querySelector(".iv-dots");
const ivPrev = iv?.querySelector(".iv-prev");
const ivNext = iv?.querySelector(".iv-next");

let viewerImages = [];
let viewerIndex = 0;

function renderViewer() {
  if (!iv || !ivImg || !viewerImages.length) return;
  ivImg.src = viewerImages[viewerIndex];

  if (ivDotsContainer) {
    ivDotsContainer.innerHTML = viewerImages
      .map(
        (_, i) =>
          `<span class="iv-dot${i === viewerIndex ? " active" : ""}"></span>`
      )
      .join("");

    const dots = ivDotsContainer.querySelectorAll(".iv-dot");
    dots.forEach((dot, i) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        viewerIndex = i;
        renderViewer();
      });
    });
  }
}

function pauseCarousels() {
  clearCarousels();
}

function resumeCarousels() {
  setupAllCardSliders();
}

function openImageViewer(images, startIndex = 0) {
  viewerImages = images && images.length ? images.slice() : [];
  if (!viewerImages.length || !iv) return;

  viewerIndex = Math.min(
    Math.max(startIndex, 0),
    viewerImages.length - 1
  );

  pauseCarousels();

  iv.classList.add("show");
  renderViewer();
}

function closeImageViewer() {
  if (!iv || !ivImg) return;
  iv.classList.remove("show");
  ivImg.src = "";
  viewerImages = [];
  viewerIndex = 0;
  resumeCarousels();
}

if (ivBackdrop) {
  ivBackdrop.addEventListener("click", closeImageViewer);
}
if (ivClose) {
  ivClose.addEventListener("click", closeImageViewer);
}

if (ivPrev) {
  ivPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!viewerImages.length) return;
    viewerIndex =
      (viewerIndex - 1 + viewerImages.length) % viewerImages.length;
    renderViewer();
  });
}

if (ivNext) {
  ivNext.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!viewerImages.length) return;
    viewerIndex = (viewerIndex + 1) % viewerImages.length;
    renderViewer();
  });
}

document.addEventListener("keydown", (e) => {
  if (!iv || !iv.classList.contains("show")) return;

  if (e.key === "Escape") {
    closeImageViewer();
  } else if (e.key === "ArrowLeft") {
    if (!viewerImages.length) return;
    viewerIndex =
      (viewerIndex - 1 + viewerImages.length) % viewerImages.length;
    renderViewer();
  } else if (e.key === "ArrowRight") {
    if (!viewerImages.length) return;
    viewerIndex = (viewerIndex + 1) % viewerImages.length;
    renderViewer();
  }
});

/* ============================================================
   INIT (Core)
============================================================ */

function setupFollowButton() {
  const btn = document.getElementById("followBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isFollowing = btn.classList.toggle("is-following");
    btn.textContent = isFollowing ? "Following" : "Follow";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  setupWizard();
  setupCreateModal();
  setupFollowButton();
});

/* ============================================================
   SETTINGS PANEL + TABS
============================================================ */
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");

if (settingsBtn && settingsPanel && closeSettings) {
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("open");
  });

  closeSettings.addEventListener("click", () => {
    settingsPanel.classList.remove("open");
  });
}

// TAB SWITCHING
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.remove("active")
    );
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-screen").forEach((screen) => {
      screen.classList.remove("active");
    });
    const activeScreen = document.getElementById("tab-" + tab);
    if (activeScreen) activeScreen.classList.add("active");
  });
});

/* ============================================================
   STORE / LAYOUT ENGINE
============================================================ */

// STORE MAP – core data for each layout
const STORE_MAP = {
  A: { type: "products", label: "Products Store" },
  B: { type: "classes",  label: "Classes / Courses Store" },
  C: { type: "services", label: "Skills / Services Store" },
  D: { type: "coaching", label: "Coaching / Fitness Store" }
};

const layoutButtons = document.querySelectorAll(".layout-btn");
const layoutPreview = document.getElementById("layoutPreview");

function applyLayout(layoutKey) {
  const cfg = STORE_MAP[layoutKey] || STORE_MAP.A;

  // update body dataset
  if (document.body) {
    document.body.dataset.store = cfg.type;
    document.body.dataset.layout = layoutKey;
  }

  // update preview class
  if (layoutPreview) {
    layoutPreview.classList.remove("layout-A", "layout-B", "layout-C", "layout-D");
    layoutPreview.classList.add("layout-" + layoutKey);
  }

  // update active button
  layoutButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.layout === layoutKey);
  });

  // persist
  try {
    localStorage.setItem("storeType", layoutKey);
  } catch (e) {
    // ignore storage errors
  }
}

// attach click handlers
layoutButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    applyLayout(btn.dataset.layout);
  });
});

// initialize layout from storage or default
(function initLayoutFromStorage() {
  let initial = "A";
  try {
    initial = localStorage.getItem("storeType") || "A";
  } catch (e) {
    initial = "A";
  }
  applyLayout(initial);
})();

/* ============================================================
   PRODUCTS GRID INTEGRATION (Zest-native store layout)
============================================================ */
(function () {
  // Footer year
  const yearFooter = document.getElementById("yearFooter");
  if (yearFooter) yearFooter.textContent = new Date().getFullYear();

  // Enhance cards after any render
  function enhanceProductCards() {
    const cards = document.querySelectorAll(".products-grid .card");
    cards.forEach((card) => {
      if (card.dataset.enhanced === "1") return;
      card.dataset.enhanced = "1";

      // Add category badge to media
      const media = card.querySelector(".media");
      if (media && !media.querySelector(".p-badge")) {
        const category =
          card.dataset.category ||
          (card.querySelector(".title")?.textContent || "product");
        const badge = document.createElement("span");
        badge.className = "p-badge";
        badge.textContent = category;
        media.appendChild(badge);
      }

      // Add action buttons to body
      const body = card.querySelector(".body");
      if (body && !body.querySelector(".actions-row")) {
        const row = document.createElement("div");
        row.className = "actions-row";
        row.innerHTML = `
          <button class="btn-outline" type="button" data-view>View</button>
          <button class="btn-add" type="button" data-add>Add</button>
        `;
        body.appendChild(row);

        // Wire buttons
        const imagesData = card.dataset.images;
        let images = [];
        try { images = JSON.parse(imagesData || "[]"); } catch(e){ images = []; }

        row.querySelector("[data-view]")?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (typeof openImageViewer === "function" && images.length) {
            openImageViewer(images, 0);
          }
        });

        row.querySelector("[data-add]")?.addEventListener("click", (e) => {
          e.stopPropagation();
          // Placeholder for future cart/checkout
          alert("Added to list");
        });
      }
    });
  }

  // Wrap original renderProducts to enhance after render
  if (typeof window.renderProducts === "function" && !window.__renderWrapped) {
    window.__renderWrapped = true;
    const __orig = window.renderProducts;
    window.renderProducts = function (items) {
      __orig(items);
      enhanceProductCards();
    };
  }

  // Search + category filter
  function applyFilters() {
    if (!Array.isArray(window.PRODUCTS)) return;
    const q = (document.getElementById("searchInput")?.value || "")
      .toLowerCase()
      .trim();
    const cat = document.getElementById("categoryFilter")?.value || "all";

    const filtered = window.PRODUCTS.filter((p) => {
      const matchesQ =
        !q ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q);
      const pCat = (p.category || "all").toLowerCase();
      const matchesCat = cat === "all" || pCat === cat;
      return matchesQ && matchesCat;
    });

    if (typeof window.renderProducts === "function") {
      window.renderProducts(filtered);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");

    if (searchInput) {
      searchInput.addEventListener("input", applyFilters);
    }
    if (categoryFilter) {
      categoryFilter.addEventListener("change", applyFilters);
    }

    // First enhancement pass after initial loadProducts()
    setTimeout(enhanceProductCards, 0);
  });
})();

/* ============================================================
   VIEW MODE TOGGLE (Grid vs Feed/Facebook-style)
============================================================ */

const gridViewBtn = document.getElementById("gridViewBtn");
const listViewBtn = document.getElementById("listViewBtn");

// mode: "grid" (current grid) or "feed" (Facebook-style feed)
function setViewMode(mode) {
  document.body.classList.remove("grid-view", "feed-view");

  if (mode === "grid") {
    document.body.classList.add("grid-view");
  } else if (mode === "feed") {
    document.body.classList.add("feed-view");
  }

  // Re-render so any mode-specific classes/styles are consistently applied
  renderProducts(PRODUCTS);
}

if (gridViewBtn) {
  gridViewBtn.addEventListener("click", () => setViewMode("grid"));
}

if (listViewBtn) {
  listViewBtn.addEventListener("click", () => setViewMode("feed"));
}
