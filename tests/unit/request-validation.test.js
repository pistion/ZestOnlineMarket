const {
  validateArtListingPayload,
  validateBuyerInteractionPayload,
  validateBuyerWishlistPayload,
  validateContentReportPayload,
  validateFeedQueryPayload,
  validateProductPayload,
  validateSellerOrderStatusPayload,
  validateStorePayload,
  validateStoreFeedPostPayload,
} = require("../../server/src/utils/request-validation");

describe("request validation compatibility helpers", () => {
  it("normalizes safe interaction input", () => {
    const payload = validateBuyerInteractionPayload({
      action: "View Product",
      source: "Marketplace Card",
      storeHandle: "@Test-Store",
      templateKey: "products",
      itemType: "Product",
      catalogItemId: 12,
    });

    expect(payload).toMatchObject({
      action: "view_product",
      source: "marketplace-card",
      storeHandle: "test-store",
      templateKey: "products",
      itemType: "product",
      catalogItemId: 12,
    });
  });

  it("rejects unsupported report reasons", () => {
    expect(() =>
      validateContentReportPayload({
        targetType: "store",
        targetId: 5,
        reason: "fake",
        details: "This should not pass validation.",
      })
    ).toThrow(/Report reason/);
  });

  it("requires a positive wishlist product id", () => {
    const payload = validateBuyerWishlistPayload({ productId: 42 });
    expect(payload.productId).toBe(42);
  });

  it("normalizes feed pagination and search options", () => {
    expect(
      validateFeedQueryPayload({
        page: "2",
        limit: "5",
        scope: "following",
        q: " Bilum bags ",
      })
    ).toEqual({
      page: 2,
      limit: 5,
      scope: "following",
      query: "Bilum bags",
    });
  });

  it("derives a feed post title when one is not provided", () => {
    const payload = validateStoreFeedPostPayload({
      type: "promo",
      description: "Fresh arrivals just landed in store today.",
      productId: 9,
      images: [],
    });

    expect(payload.type).toBe("promo");
    expect(payload.catalogItemId).toBe(9);
    expect(payload.hasExplicitTitle).toBe(false);
    expect(payload.images).toHaveLength(0);
    expect(payload.title).toMatch(/Fresh arrivals/i);
  });

  it("normalizes store, handle, and visibility fields", () => {
    const payload = validateStorePayload({
      storeName: "Bilum House",
      handle: "@Bilum_House",
      templateKey: "products",
      tagline: "Handmade goods",
      about: "Locally crafted.",
      accentColor: "2563eb",
      avatarUrl: "",
      coverUrl: "",
      visibilityStatus: "published",
      socials: {
        instagram: "bilumhouse",
        facebook: "",
        tiktok: "",
        xhandle: "",
      },
      product: {},
    });

    expect(payload.handle).toBe("bilum-house");
    expect(payload.accentColor).toBe("#2563eb");
    expect(payload.visibilityStatus).toBe("published");
  });

  it("normalizes core catalog fields", () => {
    const payload = validateProductPayload({
      name: "Market Bag",
      description: "Woven by hand for everyday shopping.",
      price: "45.5",
      delivery: "pickup",
      location: "Port Moresby",
      transportFee: "0",
      stockQuantity: "3",
      variants: [],
      images: [],
    });

    expect(payload.price).toBe(45.5);
    expect(payload.stockQuantity).toBe(3);
    expect(payload.status).toBe("published");
  });

  it("normalizes art listing booleans and metadata", () => {
    const payload = validateArtListingPayload({
      name: "Coastal Light",
      description: "Acrylic on canvas inspired by dawn on the waterfront.",
      price: 1200,
      delivery: "courier",
      location: "Lae",
      transportFee: 25,
      stockQuantity: 1,
      images: [],
      variants: [],
      medium: "Acrylic",
      category: "Landscape",
      featured: "true",
      commissionOpen: "1",
    });

    expect(payload.medium).toBe("Acrylic");
    expect(payload.artCategory).toBe("Landscape");
    expect(payload.featured).toBe(true);
    expect(payload.commissionOpen).toBe(true);
  });

  it("normalizes seller order updates", () => {
    const payload = validateSellerOrderStatusPayload({
      status: "SHIPPED",
      trackingNumber: " ZX-100 ",
      carrier: "Post PNG",
    });

    expect(payload.status).toBe("shipped");
    expect(payload.trackingNumber).toBe("ZX-100");
    expect(payload.carrier).toBe("Post PNG");
  });
});
