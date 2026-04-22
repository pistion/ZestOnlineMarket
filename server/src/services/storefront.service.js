const {
  findCatalogMedia,
  listProductVariants,
  listStoreCatalogItems,
} = require("../repositories/catalog.repository");
const { findStoreByHandle, listMarketplaceStalls: listRealMarketplaceStalls } = require("../repositories/store.repository");
const { mapProductImages, mapProductRow, mapProductVariantRow, mapStoreRow } = require("../utils/store-mappers");
const { getDemoStorePayloadByHandle, listDemoStalls } = require("./demo-store.service");
const { normalizeTemplateKey } = require("../utils/store-template");

const MUSIC_KIND_LABELS = {
  single: "Single",
  album: "Album",
  ep: "EP",
  pack: "Pack",
  video: "Video",
  lesson: "Lesson",
  license: "License",
  bundle: "Bundle",
};

const PROGRAM_TYPE_LABELS = {
  program: "Program",
  course: "Course",
  workshop: "Workshop",
  session: "Session",
  resource: "Resource",
};
const PHOTOGRAPHY_TYPE_LABELS = {
  print: "Print",
  license: "License",
  session: "Session",
  editorial: "Editorial",
  gallery: "Gallery",
};
const PROGRAMMER_TYPE_LABELS = {
  package: "Package",
  project: "Project",
  retainer: "Retainer",
  audit: "Audit",
  support: "Support",
};

function normalizeMetaKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function buildSearchText(...parts) {
  return parts
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function readVariantMetaValue(product, keys = []) {
  const variants = Array.isArray(product && product.variants) ? product.variants : [];
  if (!variants.length || !keys.length) {
    return "";
  }

  const normalizedKeys = new Set(keys.map((key) => normalizeMetaKey(key)));

  for (const variant of variants) {
    const attributes = variant && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
      ? variant.attributes
      : {};

    for (const [key, rawValue] of Object.entries(attributes)) {
      if (!normalizedKeys.has(normalizeMetaKey(key))) {
        continue;
      }

      const value = String(rawValue || "").trim();
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function formatDateLabel(value, fallback = "") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function inferMusicKind(product) {
  const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

  if (/\b(album|lp)\b/.test(searchText)) {
    return "album";
  }
  if (/\bep\b|extended play/.test(searchText)) {
    return "ep";
  }
  if (/\b(pack|sample|stems?|loop)\b/.test(searchText)) {
    return "pack";
  }
  if (/\b(video|visualizer)\b/.test(searchText)) {
    return "video";
  }
  if (/\b(license|licence|sync|commercial)\b/.test(searchText)) {
    return "license";
  }
  if (/\b(lesson|class|coaching|masterclass|workshop)\b/.test(searchText)) {
    return "lesson";
  }
  if (/\b(bundle|collection)\b/.test(searchText)) {
    return "bundle";
  }

  return "single";
}

function buildMusicItem(store, product) {
  const kind = inferMusicKind(product);
  const kindLabel = MUSIC_KIND_LABELS[kind] || "Release";
  const variantCount = Number(product && product.variantCount) || (Array.isArray(product && product.variants) ? product.variants.length : 0);
  const previewUrl = readVariantMetaValue(product, [
    "preview",
    "previewUrl",
    "preview_url",
    "sample",
    "sampleUrl",
    "sample_url",
    "audio",
    "audioUrl",
    "audio_url",
  ]);
  const durationLabel =
    readVariantMetaValue(product, ["duration", "length", "runtime", "time"]) ||
    (kind === "lesson" ? "Guided access" : previewUrl ? "Preview ready" : "Preview pending");
  const bpmLabel = readVariantMetaValue(product, ["bpm", "tempo"]);

  return {
    id: Number(product && product.id) || 0,
    title: product && product.title ? product.title : "Untitled release",
    description: product && product.description ? product.description : "",
    price: Number(product && product.price) || 0,
    imageUrl: Array.isArray(product && product.images) && product.images.length
      ? String((product.images[0] && (product.images[0].url || product.images[0].src)) || "").trim()
      : "",
    createdAt: product && product.createdAt ? product.createdAt : null,
    createdLabel: formatDateLabel(product && product.createdAt, "Fresh release"),
    delivery: product && product.delivery ? product.delivery : "",
    location: product && product.location ? product.location : "",
    supportLabel: product && product.delivery
      ? product.delivery
      : product && product.location
        ? product.location
        : "Digital storefront release",
    status: product && product.status ? product.status : "published",
    visibility: product && product.visibility ? product.visibility : "public",
    kind,
    kindLabel,
    previewUrl,
    durationLabel,
    bpmLabel,
    trackCount: Math.max(variantCount || 0, kind === "album" || kind === "ep" || kind === "pack" ? 2 : 1),
    detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "",
    artistLabel: store && store.storeName ? store.storeName : "Artist",
  };
}

function buildMusicTemplateData(store, products = []) {
  const libraryItems = products
    .map((product) => buildMusicItem(store, product))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  const collections = libraryItems.filter((item) => ["album", "ep", "pack", "bundle"].includes(item.kind));
  const liveKinds = [...new Set(libraryItems.map((item) => item.kind))];

  return {
    releases: libraryItems.slice(0, 6),
    collections: (collections.length ? collections : libraryItems.slice(0, 3)).slice(0, 4),
    libraryItems,
    availableKinds: liveKinds,
    stats: {
      trackCount: libraryItems.length,
      collectionCount: collections.length,
      lessonCount: libraryItems.filter((item) => item.kind === "lesson").length,
    },
  };
}

function inferProgramType(product) {
  const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

  if (/\b(workshop|masterclass|bootcamp)\b/.test(searchText)) {
    return "workshop";
  }
  if (/\b(course|cohort|journey|curriculum)\b/.test(searchText)) {
    return "course";
  }
  if (/\b(session|consult|coaching|1:1|one on one)\b/.test(searchText)) {
    return "session";
  }
  if (/\b(resource|ebook|guide|toolkit|worksheet|template)\b/.test(searchText)) {
    return "resource";
  }

  return "program";
}

function inferProgramFormat(product, programType) {
  const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

  if (/\b(self[- ]?paced|recorded|digital|download)\b/.test(searchText)) {
    return "Self-paced";
  }
  if (/\b(live|zoom|weekly|cohort|workshop|in person|in-person)\b/.test(searchText)) {
    return "Live";
  }
  if (/\b(hybrid)\b/.test(searchText)) {
    return "Hybrid";
  }
  if (programType === "resource") {
    return "Digital";
  }

  return "Guided";
}

function buildProgramScheduleLabel(product) {
  if (product && product.delivery) {
    return product.delivery;
  }

  const createdLabel = formatDateLabel(product && product.createdAt, "");
  if (createdLabel) {
    return `Updated ${createdLabel}`;
  }

  return "Flexible start";
}

function buildClassesProgram(store, product) {
  const programType = inferProgramType(product);
  const formatLabel = inferProgramFormat(product, programType);
  const seatsRemaining = Number(product && product.stockQuantity) || 0;
  const durationLabel =
    readVariantMetaValue(product, ["duration", "length", "pace", "schedule"]) ||
    (formatLabel === "Live" ? "Live guided experience" : "Flexible pace");
  const levelLabel = readVariantMetaValue(product, ["level", "audience", "difficulty"]) || "";
  const isPast = String(product && product.status || "").trim().toLowerCase() === "archived";

  return {
    id: Number(product && product.id) || 0,
    title: product && product.title ? product.title : "Untitled program",
    description: product && product.description ? product.description : "",
    price: Number(product && product.price) || 0,
    imageUrl: Array.isArray(product && product.images) && product.images.length
      ? String((product.images[0] && (product.images[0].url || product.images[0].src)) || "").trim()
      : "",
    createdAt: product && product.createdAt ? product.createdAt : null,
    createdLabel: formatDateLabel(product && product.createdAt, "Recently updated"),
    delivery: product && product.delivery ? product.delivery : "",
    location: product && product.location ? product.location : "",
    transportFee: Number(product && product.transportFee) || 0,
    scheduleLabel: buildProgramScheduleLabel(product),
    seatsRemaining,
    capacityLabel: seatsRemaining > 0 ? `${seatsRemaining} seat${seatsRemaining === 1 ? "" : "s"} open` : "Open waitlist",
    programType,
    programTypeLabel: PROGRAM_TYPE_LABELS[programType] || "Program",
    formatLabel,
    durationLabel,
    levelLabel,
    isPast,
    detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "",
    educatorLabel: store && store.storeName ? store.storeName : "Teaching studio",
  };
}

function buildClassesTemplateData(store, products = []) {
  const programs = products
    .map((product) => buildClassesProgram(store, product))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  return {
    allPrograms: programs,
    upcomingPrograms: programs.filter((program) => !program.isPast),
    pastPrograms: programs.filter((program) => program.isPast),
    availableTypes: [...new Set(programs.map((program) => program.programType))],
    stats: {
      totalPrograms: programs.length,
      livePrograms: programs.filter((program) => program.formatLabel === "Live").length,
      resourcePrograms: programs.filter((program) => program.programType === "resource").length,
    },
  };
}

function inferPhotographyType(product) {
  const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

  if (/\b(print|archival|edition|framed|canvas)\b/.test(searchText)) {
    return "print";
  }
  if (/\b(license|licence|licensing|rights|usage|commercial)\b/.test(searchText)) {
    return "license";
  }
  if (/\b(editorial|campaign|brand|lookbook)\b/.test(searchText)) {
    return "editorial";
  }
  if (/\b(session|portrait|shoot|coverage|wedding|event)\b/.test(searchText)) {
    return "session";
  }
  if (/\b(collection|series|gallery)\b/.test(searchText)) {
    return "gallery";
  }

  return "print";
}

function buildPhotographyItem(store, product) {
  const photographyType = inferPhotographyType(product);
  const sizeLabel =
    readVariantMetaValue(product, ["size", "print_size", "printSize", "format"]) ||
    (photographyType === "session" ? "Custom scope" : "Open edition");
  const licenseLabel =
    readVariantMetaValue(product, ["license", "licence", "usage", "rights"]) ||
    (photographyType === "license" ? "Usage-ready" : photographyType === "session" ? "Bookable" : "Collector print");
  const deliveryLabel =
    product && product.delivery
      ? product.delivery
      : photographyType === "session"
        ? "Booking flow"
        : "Print delivery";

  return {
    id: Number(product && product.id) || 0,
    title: product && product.title ? product.title : "Untitled capture",
    description: product && product.description ? product.description : "",
    price: Number(product && product.price) || 0,
    imageUrl: Array.isArray(product && product.images) && product.images.length
      ? String((product.images[0] && (product.images[0].url || product.images[0].src)) || "").trim()
      : "",
    createdAt: product && product.createdAt ? product.createdAt : null,
    createdLabel: formatDateLabel(product && product.createdAt, "Fresh set"),
    location: product && product.location ? product.location : "",
    transportFee: Number(product && product.transportFee) || 0,
    photographyType,
    typeLabel: PHOTOGRAPHY_TYPE_LABELS[photographyType] || "Gallery",
    sizeLabel,
    licenseLabel,
    deliveryLabel,
    detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "",
    photographerLabel: store && store.storeName ? store.storeName : "Photography studio",
  };
}

function buildPhotographyTemplateData(store, products = []) {
  const galleryItems = products
    .map((product) => buildPhotographyItem(store, product))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  const sessions = galleryItems.filter((item) => item.photographyType === "session");
  const licenses = galleryItems.filter((item) => item.photographyType === "license");

  return {
    heroShots: galleryItems.slice(0, 5),
    galleryItems,
    serviceItems: galleryItems.filter((item) => ["session", "license", "editorial"].includes(item.photographyType)),
    availableTypes: [...new Set(galleryItems.map((item) => item.photographyType))],
    stats: {
      totalShots: galleryItems.length,
      sessionCount: sessions.length,
      licensingCount: licenses.length,
    },
  };
}

function inferProgrammerType(product) {
  const searchText = buildSearchText(product && product.title, product && product.description, product && product.delivery);

  if (/\b(retainer|monthly|ongoing|fractional)\b/.test(searchText)) {
    return "retainer";
  }
  if (/\b(audit|review|diagnostic|refactor)\b/.test(searchText)) {
    return "audit";
  }
  if (/\b(support|maintenance|bug fix|handoff)\b/.test(searchText)) {
    return "support";
  }
  if (/\b(package|tier|starter|growth|premium)\b/.test(searchText)) {
    return "package";
  }

  return "project";
}

function deriveTechTags(product) {
  const fromMeta = readVariantMetaValue(product, ["stack", "tech", "technology", "framework"]);
  if (fromMeta) {
    return fromMeta
      .split(/[,/]| and /i)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  const description = buildSearchText(product && product.title, product && product.description);
  const tags = [
    "React",
    "Node.js",
    "PostgreSQL",
    "TypeScript",
    "Express",
    "Shopify",
    "Next.js",
    "API",
  ].filter((label) => description.includes(label.toLowerCase()));

  return tags.slice(0, 6);
}

function buildProgrammerOffer(store, product, index = 0) {
  const programmerType = inferProgrammerType(product);
  const variants = Array.isArray(product && product.variants) ? product.variants : [];
  const packageVariants = variants.length
    ? variants.map((variant) => ({
        label: variant.label || `Tier ${index + 1}`,
        price: Number(variant.priceOverride != null ? variant.priceOverride : product.price || 0),
        sku: variant.sku || "",
      }))
    : [
        {
          label: ["Starter", "Growth", "Flagship"][index] || "Base package",
          price: Number(product && product.price) || 0,
          sku: "",
        },
      ];

  return {
    id: Number(product && product.id) || 0,
    title: product && product.title ? product.title : "Developer offer",
    description: product && product.description ? product.description : "",
    price: Number(product && product.price) || 0,
    imageUrl: Array.isArray(product && product.images) && product.images.length
      ? String((product.images[0] && (product.images[0].url || product.images[0].src)) || "").trim()
      : "",
    createdAt: product && product.createdAt ? product.createdAt : null,
    createdLabel: formatDateLabel(product && product.createdAt, "Recently updated"),
    location: product && product.location ? product.location : "",
    deliveryLabel: product && product.delivery ? product.delivery : "Remote delivery",
    programmerType,
    typeLabel: PROGRAMMER_TYPE_LABELS[programmerType] || "Project",
    packageVariants,
    stackTags: deriveTechTags(product),
    scopeLabel:
      readVariantMetaValue(product, ["scope", "timeline", "duration"]) ||
      (programmerType === "retainer" ? "Ongoing collaboration" : "Project scoped"),
    detailPath: Number(product && product.id) > 0 ? `/products/${Number(product.id)}` : "",
    studioLabel: store && store.storeName ? store.storeName : "Developer studio",
  };
}

function buildProgrammerTemplateData(store, products = []) {
  const offers = products
    .map((product, index) => buildProgrammerOffer(store, product, index))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  const packages = offers.slice(0, 3);
  const allTags = [...new Set(offers.flatMap((offer) => offer.stackTags || []))].slice(0, 10);

  return {
    offers,
    packageHighlights: packages,
    stackTags: allTags,
    stats: {
      totalOffers: offers.length,
      retainerCount: offers.filter((offer) => offer.programmerType === "retainer").length,
      auditCount: offers.filter((offer) => offer.programmerType === "audit").length,
    },
  };
}

function buildTemplateData(store, products = []) {
  const templateKey = normalizeTemplateKey(store && store.templateKey);
  if (templateKey === "music") {
    return {
      music: buildMusicTemplateData(store, products),
    };
  }

  if (templateKey === "classes") {
    return {
      classes: buildClassesTemplateData(store, products),
    };
  }

  if (templateKey === "photography") {
    return {
      photography: buildPhotographyTemplateData(store, products),
    };
  }

  if (templateKey === "programmer") {
    return {
      programmer: buildProgrammerTemplateData(store, products),
    };
  }

  return {};
}

function attachTemplateData(payload) {
  if (!payload || !payload.store) {
    return payload;
  }

  return {
    ...payload,
    templateData: buildTemplateData(payload.store, Array.isArray(payload.products) ? payload.products : []),
  };
}

async function buildStoreProducts(storeId, options = {}) {
  const productRows = await listStoreCatalogItems(storeId, options);
  return Promise.all(
    productRows.map(async (productRow) => {
      const [imageRows, variantRows] = await Promise.all([
        findCatalogMedia(productRow.id, options),
        listProductVariants(productRow.id, options),
      ]);
      return {
        ...mapProductRow({
          ...productRow,
          variants: variantRows.map((variant) => mapProductVariantRow(variant)),
        }),
        images: mapProductImages(imageRows),
      };
    })
  );
}

async function buildRealStorePayload(storeRow, options = {}) {
  if (!storeRow) {
    return attachTemplateData({
      success: true,
      message: "Store loaded",
      store: null,
      product: null,
      images: [],
      products: [],
      meta: {
        isDemo: false,
        isEditable: true,
        visibilityStatus: "draft",
        setupStep: 1,
      },
    });
  }

  const products = await buildStoreProducts(storeRow.id, {
    publicOnly: Boolean(options.publicOnly),
  });
  if (!products.length) {
    return attachTemplateData({
      success: true,
      message: "Store loaded",
      store: mapStoreRow(storeRow),
      product: null,
      images: [],
      products: [],
      meta: {
        isDemo: false,
        isEditable: true,
        visibilityStatus: storeRow.visibilityStatus || "draft",
        setupStep: storeRow.setupStep || 1,
      },
    });
  }

  const featuredProduct = products[0];
  return attachTemplateData({
    success: true,
    message: "Store loaded",
    store: mapStoreRow(storeRow),
    product: featuredProduct,
    images: featuredProduct.images || [],
    products,
    meta: {
      isDemo: false,
      isEditable: true,
      visibilityStatus: storeRow.visibilityStatus || "draft",
      setupStep: storeRow.setupStep || 1,
    },
  });
}

async function resolveStorePayloadByHandle(handle) {
  const storeRow = await findStoreByHandle(handle);
  if (storeRow && storeRow.visibilityStatus === "published") {
    return buildRealStorePayload(storeRow, { publicOnly: true });
  }

  return attachTemplateData(getDemoStorePayloadByHandle(handle));
}

function mapMarketplaceRow(row) {
  const handle = String(row.handle || "").trim();
  const productImages = row.thumbnail ? [row.thumbnail] : [];
  const followerCount = Number(row.followerCount || 0);
  const productCount = Number(row.productCount || 0);
  const salesCount = Number(row.salesCount || 0);

  return {
    storeId: Number(row.id || row.storeId || 0) || 0,
    handle,
    storeName: row.storeName || `@${handle}`,
    templateKey: row.templateKey || "products",
    tagline: row.tagline || "",
    teaser: row.productDescription || row.tagline || row.about || "Browse this stall",
    location: row.productLocation || "",
    thumbnailUrl: row.thumbnail || "",
    coverUrl: row.coverUrl || "",
    followerCount,
    productCount,
    salesCount,
    metrics: {
      followers: followerCount,
      listings: productCount,
      sales: salesCount,
    },
    featuredProduct: row.productId
      ? {
          id: row.productId,
          name: row.productName || "Featured product",
          title: row.productName || "Featured product",
          description: row.productDescription || "",
          price: Number(row.productPrice || 0),
          delivery: row.productDelivery || "",
          location: row.productLocation || "",
          transportFee: Number(row.productTransportFee || 0),
          images: productImages,
        }
      : null,
    isDemo: false,
    isEditable: false,
  };
}

async function listMarketplaceStalls() {
  const rows = await listRealMarketplaceStalls();
  const realStalls = rows.map(mapMarketplaceRow);
  const realHandles = new Set(realStalls.map((stall) => stall.handle));
  const demoStalls = listDemoStalls().filter((stall) => !realHandles.has(stall.handle));

  return [...realStalls, ...demoStalls];
}

module.exports = {
  buildTemplateData,
  buildRealStorePayload,
  listMarketplaceStalls,
  resolveStorePayloadByHandle,
};
