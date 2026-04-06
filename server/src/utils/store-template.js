const TEMPLATE_PAGE_KEYS = {
  products: "sellerTemplateProducts",
  art: "sellerTemplateArt",
  music: "sellerTemplateMusic",
  photography: "sellerTemplatePhotography",
  programmer: "sellerTemplateProgrammer",
  classes: "sellerTemplateClasses",
  consultations: "sellerTemplateClasses",
};
const TEMPLATE_PAGE_PATHS = {
  products: "/seller/templates/products",
  art: "/seller/templates/art",
  music: "/seller/templates/music",
  photography: "/seller/templates/photography",
  programmer: "/seller/templates/programmer",
  classes: "/seller/templates/classes",
  consultations: "/seller/templates/classes",
};
const TEMPLATE_META = Object.freeze({
  products: {
    key: "products",
    label: "Products Store",
    family: "Physical products",
    summary: "Built for inventory-led selling with product galleries, featured drops, and catalog-first browsing.",
  },
  art: {
    key: "art",
    label: "Art and Design",
    family: "Creative services",
    summary: "Designed for artists, commissions, and portfolio-led storefront storytelling.",
  },
  music: {
    key: "music",
    label: "Music Services",
    family: "Creative services",
    summary: "Best for lessons, beats, production offers, and music-first promotion.",
  },
  photography: {
    key: "photography",
    label: "Photography Studio",
    family: "Creative services",
    summary: "Ideal for photo sessions, portfolios, event work, and visual-first client work.",
  },
  programmer: {
    key: "programmer",
    label: "Developer Profile",
    family: "Professional services",
    summary: "Made for coding offers, app delivery, consulting, and portfolio-style proof of work.",
  },
  classes: {
    key: "classes",
    label: "Classes Studio",
    family: "Education",
    summary: "Structured for lessons, recurring sessions, class highlights, and teaching-led storefronts.",
  },
  consultations: {
    key: "consultations",
    label: "Consultations Studio",
    family: "Education",
    summary: "Focused on one-on-one advice, coaching sessions, and appointment-led offerings.",
  },
});

function isValidTemplateKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return Boolean(TEMPLATE_PAGE_KEYS[normalized]);
}

function normalizeTemplateKey(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return TEMPLATE_PAGE_KEYS[normalized] ? normalized : "products";
}

function resolveTemplatePageKey(templateKey) {
  return TEMPLATE_PAGE_KEYS[normalizeTemplateKey(templateKey)] || TEMPLATE_PAGE_KEYS.products;
}

function resolveSellerTemplatePath(templateKey) {
  return TEMPLATE_PAGE_PATHS[normalizeTemplateKey(templateKey)] || TEMPLATE_PAGE_PATHS.products;
}

function getTemplateMeta(templateKey) {
  const normalized = normalizeTemplateKey(templateKey);
  return {
    ...TEMPLATE_META[normalized],
    previewPath: resolveSellerTemplatePath(normalized),
  };
}

module.exports = {
  getTemplateMeta,
  isValidTemplateKey,
  normalizeTemplateKey,
  resolveTemplatePageKey,
  resolveSellerTemplatePath,
  TEMPLATE_META,
  TEMPLATE_PAGE_KEYS,
  TEMPLATE_PAGE_PATHS,
};
