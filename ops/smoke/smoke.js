const path = require("path");
const { spawn } = require("child_process");
const { Client } = require("pg");

const { databaseUrl, pgConfig } = require("../db/config");

const root = path.resolve(__dirname, "..", "..");
const port = 3210;
const env = {
  ...process.env,
  PORT: String(port),
  JWT_SECRET: process.env.JWT_SECRET || "local-smoke-secret-1234567890",
  APP_ENV: process.env.APP_ENV || "local",
  ENABLE_DEMO_STALLS: process.env.ENABLE_DEMO_STALLS || "true",
};

const routes = [
  { path: "/", status: 200 },
  { path: "/auth/signin", status: 200 },
  { path: "/auth/signup", status: 200 },
  { path: "/marketplace", status: 200 },
  { path: "/buyer/wizard-setup", status: 302, locationPrefix: "/auth/signup?role=buyer" },
  { path: "/buyer/feed", status: 302 },
  { path: "/feed", status: 200 },
  { path: "/search", status: 200 },
  { path: "/global-feed", status: 302, location: "/feed" },
  { path: "/buyer/profile", status: 302 },
  { path: "/buyer/settings", status: 302 },
  { path: "/api/products", status: 200, expectsJson: true },
  { path: "/api/marketplace/stalls", status: 200, expectsJson: true },
  { path: "/stores/urban-bilum", status: 200 },
  { path: "/api/store/urban-bilum", status: 200, expectsJson: true },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPgClient() {
  return new Client(
    databaseUrl
      ? { connectionString: databaseUrl }
      : {
          host: pgConfig.host,
          port: pgConfig.port,
          database: pgConfig.database,
          user: pgConfig.user,
          password: pgConfig.password,
        }
  );
}

async function runMigrations() {
  await new Promise((resolve, reject) => {
    const migrateProcess = spawn(process.execPath, ["ops/db/migrate.js"], {
      cwd: root,
      env,
      stdio: "inherit",
    });

    migrateProcess.once("error", reject);
    migrateProcess.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Smoke migration step failed with exit code ${code}.`));
    });
  });
}

async function request(routePath, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${routePath}`, {
    redirect: "manual",
    ...options,
  });
  const body = await response.text();
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    setCookies:
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean),
    body,
  };
}

function extractCookieHeader(setCookies = []) {
  return setCookies
    .map((cookie) => String(cookie || "").split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function extractCsrfToken(body = "") {
  const match = String(body || "").match(/<meta\s+name="csrf-token"\s+content="([^"]*)"/i);
  return match ? match[1] : "";
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 12_000) {
    try {
      const response = await request("/");
      if (response.statusCode === 200) {
        return;
      }
    } catch (error) {
      // Keep polling until the server is ready.
    }

    await wait(400);
  }

  throw new Error("Server did not become ready in time.");
}

async function verifyRoutes() {
  for (const route of routes) {
    const response = await request(route.path);
    if (response.statusCode !== route.status) {
      throw new Error(`${route.path} returned ${response.statusCode} instead of ${route.status}`);
    }

    if (route.location && response.headers.location !== route.location) {
      throw new Error(
        `${route.path} redirected to ${response.headers.location || "nothing"} instead of ${route.location}`
      );
    }

    if (route.locationPrefix) {
      const location = response.headers.location || "";
      if (!location.startsWith(route.locationPrefix)) {
        throw new Error(
          `${route.path} redirected to ${location || "nothing"} instead of starting with ${route.locationPrefix}`
        );
      }
    }

    if (route.expectsJson) {
      const payload = JSON.parse(response.body);
      if (payload.success !== true) {
        throw new Error(`${route.path} did not return a success payload.`);
      }
    }
  }
}

async function verifyAuthPages() {
  const signinResponse = await request("/auth/signin?role=seller");
  if (signinResponse.statusCode !== 200) {
    throw new Error("Sign-in page failed during auth UI smoke verification.");
  }

  if (!signinResponse.body.includes('id="authGoogleBtn"')) {
    throw new Error("Sign-in page is missing the Google auth button.");
  }

  if (!signinResponse.body.includes('id="authFacebookBtn"')) {
    throw new Error("Sign-in page is missing the Facebook auth button.");
  }

  if (!signinResponse.body.includes('id="authSupportBox"')) {
    throw new Error("Sign-in page is missing the troubleshooting panel.");
  }

  const signupResponse = await request("/auth/signup?role=buyer");
  if (signupResponse.statusCode !== 200) {
    throw new Error("Sign-up page failed during auth UI smoke verification.");
  }

  if (!signupResponse.body.includes('id="authConfirmPassword"')) {
    throw new Error("Sign-up page is missing the confirm-password field.");
  }

  if (!signupResponse.body.includes("Password confirm")) {
    throw new Error("Sign-up page is missing the password-confirm guidance copy.");
  }
}

async function verifyPostgresWritePath() {
  const smokeStamp = Date.now();
  const sellerEmail = `smoke_seller_${smokeStamp}@example.com`;
  const buyerEmail = `smoke_buyer_${smokeStamp}@example.com`;
  const handle = `smoke-${smokeStamp}`;
  const password = "Password123!";
  const authPageResponse = await request("/auth/signup");
  const csrfCookieHeader = extractCookieHeader(authPageResponse.setCookies);
  const csrfToken = extractCsrfToken(authPageResponse.body);
  if (!csrfCookieHeader || !csrfToken) {
    throw new Error("Failed to establish CSRF session for smoke verification.");
  }

  const registerResponse = await request("/auth/register", {
    method: "POST",
    headers: {
      Cookie: csrfCookieHeader,
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: sellerEmail,
      password,
      confirmPassword: password,
      role: "seller",
    }),
  });
  const registerPayload = JSON.parse(registerResponse.body);
  if (registerResponse.statusCode !== 200 || registerPayload.success !== true || !registerPayload.token) {
    throw new Error("Seller registration failed during smoke verification.");
  }

  const storeResponse = await request("/api/store", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName: "Smoke Store",
      handle,
      tagline: "Postgres runtime smoke test",
      about: "Created during smoke verification.",
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
        name: "Smoke Product",
        description: "Created during smoke verification.",
        price: 19.5,
        delivery: "pickup",
        location: "Port Moresby",
        transportFee: 0,
        images: [],
      },
    }),
  });
  const storePayload = JSON.parse(storeResponse.body);
  if (storeResponse.statusCode !== 200 || storePayload.success !== true) {
    throw new Error("Store save failed during smoke verification.");
  }

  const productResponse = await request("/api/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Smoke Commerce Product",
      description: "Created during commerce smoke verification.",
      price: 24.5,
      delivery: "pickup",
      location: "Port Moresby",
      transportFee: 3,
      stockQuantity: 4,
      status: "published",
      visibility: "public",
      images: [],
      variants: [
        {
          label: "Large",
          sku: `SMOKE-${smokeStamp}`,
          priceOverride: 27.5,
          stockQuantity: 3,
        },
      ],
    }),
  });
  const productPayload = JSON.parse(productResponse.body);
  if (productResponse.statusCode !== 200 || productPayload.success !== true || !productPayload.product) {
    throw new Error("Product create failed during commerce smoke verification.");
  }
  const productId = Number(productPayload.product.id || 0);
  const variantId = Number((productPayload.variants && productPayload.variants[0] && productPayload.variants[0].id) || 0);

  const discountCreateResponse = await request("/api/discounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: `SMOKE${String(smokeStamp).slice(-4)}`,
      title: "Smoke launch offer",
      discountType: "percentage",
      amount: 10,
      minOrderAmount: 10,
      maxUses: 10,
      active: true,
    }),
  });
  const discountCreatePayload = JSON.parse(discountCreateResponse.body);
  if (
    discountCreateResponse.statusCode !== 201 ||
    discountCreatePayload.success !== true ||
    !discountCreatePayload.discount
  ) {
    throw new Error("Discount create failed during commerce smoke verification.");
  }
  const couponCode = discountCreatePayload.discount.code;

  const storePostResponse = await request("/api/feed/store-posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "announcement",
      title: "Smoke linked update",
      description: "Linked store update for discovery smoke verification.",
      catalogItemId: productId,
      images: [],
    }),
  });
  const storePostPayload = JSON.parse(storePostResponse.body);
  if (storePostResponse.statusCode !== 200 || storePostPayload.success !== true) {
    throw new Error("Store update create failed during discovery smoke verification.");
  }

  const publicFeedResponse = await request("/api/feed?limit=2&page=1", {
    method: "GET",
  });
  const publicFeedPayload = JSON.parse(publicFeedResponse.body);
  if (
    publicFeedResponse.statusCode !== 200 ||
    publicFeedPayload.success !== true ||
    !publicFeedPayload.meta ||
    !publicFeedPayload.meta.pagination ||
    Number(publicFeedPayload.meta.pagination.pageSize || 0) !== 2
  ) {
    throw new Error("Feed pagination failed during discovery smoke verification.");
  }

  const buyerRegisterResponse = await request("/auth/register", {
    method: "POST",
    headers: {
      Cookie: csrfCookieHeader,
      "X-CSRF-Token": csrfToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: buyerEmail,
      password,
      confirmPassword: password,
      role: "buyer",
    }),
  });
  const buyerRegisterPayload = JSON.parse(buyerRegisterResponse.body);
  if (
    buyerRegisterResponse.statusCode !== 200 ||
    buyerRegisterPayload.success !== true ||
    !buyerRegisterPayload.token
  ) {
    throw new Error("Buyer registration failed during commerce smoke verification.");
  }

  const checkoutSummaryResponse = await request(
    `/api/buyer/checkout/summary?productId=${productId}&variantId=${variantId}&quantity=1`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${buyerRegisterPayload.token}`,
      },
    }
  );
  const checkoutSummaryPayload = JSON.parse(checkoutSummaryResponse.body);
  if (checkoutSummaryResponse.statusCode !== 200 || checkoutSummaryPayload.success !== true) {
    throw new Error("Checkout summary failed during commerce smoke verification.");
  }

  const searchResponse = await request(`/api/search?q=${encodeURIComponent("Smoke Commerce")}`, {
    method: "GET",
  });
  const searchPayload = JSON.parse(searchResponse.body);
  if (
    searchResponse.statusCode !== 200 ||
    searchPayload.success !== true ||
    Number(searchPayload.totalResults || 0) < 1
  ) {
    throw new Error("Search API failed during phase-3 smoke verification.");
  }

  const orderCreateResponse = await request("/api/buyer/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      variantId,
      quantity: 1,
      paymentMethod: "bsp-pay",
      customerName: "Smoke Buyer",
      customerEmail: buyerEmail,
      customerPhone: "70000000",
      deliveryMethod: "pickup",
      deliveryAddress: "Smoke test address",
      deliveryCity: "Port Moresby",
      deliveryNotes: "",
    }),
  });
  const orderCreatePayload = JSON.parse(orderCreateResponse.body);
  if (orderCreateResponse.statusCode !== 201 || orderCreatePayload.success !== true || !orderCreatePayload.order) {
    throw new Error("Checkout order creation failed during commerce smoke verification.");
  }
  const directOrderId = Number(orderCreatePayload.order.id || 0);

  const buyerSettingsSaveResponse = await request("/api/buyer/settings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: "Smoke Buyer",
      phone: "70000000",
      avatarUrl: "",
      bio: "Buyer settings smoke verification.",
      favoriteCategories: ["products"],
      favoriteTemplates: ["products"],
    }),
  });
  const buyerSettingsSavePayload = JSON.parse(buyerSettingsSaveResponse.body);
  if (buyerSettingsSaveResponse.statusCode !== 200 || buyerSettingsSavePayload.success !== true) {
    throw new Error("Buyer settings save failed during smoke verification.");
  }

  const buyerAddressCreateResponse = await request("/api/buyer/addresses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      addressType: "shipping",
      addressLine1: "Smoke Test Street",
      addressLine2: "Unit 4",
      city: "Port Moresby",
      region: "NCD",
      postalCode: "121",
      countryCode: "PG",
    }),
  });
  const buyerAddressCreatePayload = JSON.parse(buyerAddressCreateResponse.body);
  if (buyerAddressCreateResponse.statusCode !== 200 || buyerAddressCreatePayload.success !== true) {
    throw new Error("Buyer address create failed during smoke verification.");
  }

  const cartAddResponse = await request("/api/cart/items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
      variantId,
      quantity: 1,
    }),
  });
  const cartAddPayload = JSON.parse(cartAddResponse.body);
  if (
    cartAddResponse.statusCode !== 201 ||
    cartAddPayload.success !== true ||
    !cartAddPayload.cart ||
    Number(cartAddPayload.cart.itemCount || 0) < 1
  ) {
    throw new Error("Cart add failed during phase-3 smoke verification.");
  }

  const discountValidateResponse = await request("/api/discounts/validate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: couponCode,
    }),
  });
  const discountValidatePayload = JSON.parse(discountValidateResponse.body);
  if (
    discountValidateResponse.statusCode !== 200 ||
    discountValidatePayload.success !== true ||
    !discountValidatePayload.preview ||
    Number(discountValidatePayload.preview.amountApplied || 0) <= 0
  ) {
    throw new Error("Discount validation failed during phase-4 smoke verification.");
  }

  const cartSummaryResponse = await request("/api/cart", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
    },
  });
  const cartSummaryPayload = JSON.parse(cartSummaryResponse.body);
  if (
    cartSummaryResponse.statusCode !== 200 ||
    cartSummaryPayload.success !== true ||
    !cartSummaryPayload.cart ||
    Number(cartSummaryPayload.cart.readyItemCount || 0) < 1
  ) {
    throw new Error("Cart summary failed during phase-3 smoke verification.");
  }

  const cartCheckoutSummaryResponse = await request("/api/buyer/checkout/summary", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
    },
  });
  const cartCheckoutSummaryPayload = JSON.parse(cartCheckoutSummaryResponse.body);
  if (
    cartCheckoutSummaryResponse.statusCode !== 200 ||
    cartCheckoutSummaryPayload.success !== true ||
    String(cartCheckoutSummaryPayload.mode || "") !== "cart" ||
    !cartCheckoutSummaryPayload.cart ||
    Number(cartCheckoutSummaryPayload.cart.readyItemCount || 0) < 1
  ) {
    throw new Error("Cart-backed checkout summary failed during phase-3 smoke verification.");
  }

  const cartOrderCreateResponse = await request("/api/buyer/checkout/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentMethod: "bsp-pay",
      couponCode,
      customerName: "Smoke Buyer",
      customerEmail: buyerEmail,
      customerPhone: "70000000",
      deliveryMethod: "pickup",
      deliveryAddress: "Smoke test address",
      deliveryCity: "Port Moresby",
      deliveryNotes: "Cart checkout verification",
    }),
  });
  const cartOrderCreatePayload = JSON.parse(cartOrderCreateResponse.body);
  if (
    cartOrderCreateResponse.statusCode !== 201 ||
    cartOrderCreatePayload.success !== true ||
    !Array.isArray(cartOrderCreatePayload.orders) ||
    !cartOrderCreatePayload.orders.length
  ) {
    throw new Error("Cart-backed checkout order creation failed during phase-3 smoke verification.");
  }

  const sellerOrderShippedResponse = await request(`/api/seller/orders/${directOrderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "shipped",
      trackingNumber: `SMOKE-${smokeStamp}`,
      carrier: "PNG Post",
    }),
  });
  const sellerOrderShippedPayload = JSON.parse(sellerOrderShippedResponse.body);
  if (sellerOrderShippedResponse.statusCode !== 200 || sellerOrderShippedPayload.success !== true) {
    throw new Error("Seller shipped order update failed during review smoke verification.");
  }

  const sellerOrderDeliveredResponse = await request(`/api/seller/orders/${directOrderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${registerPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "delivered",
      carrier: "PNG Post",
    }),
  });
  const sellerOrderDeliveredPayload = JSON.parse(sellerOrderDeliveredResponse.body);
  if (sellerOrderDeliveredResponse.statusCode !== 200 || sellerOrderDeliveredPayload.success !== true) {
    throw new Error("Seller delivered order update failed during review smoke verification.");
  }

  const reviewCreateResponse = await request(`/api/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating: 5,
      title: "Smoke verified review",
      body: "Smoke review created after delivered purchase verification.",
    }),
  });
  const reviewCreatePayload = JSON.parse(reviewCreateResponse.body);
  if (reviewCreateResponse.statusCode !== 201 || reviewCreatePayload.success !== true || !reviewCreatePayload.review) {
    throw new Error("Review creation failed during phase-3 smoke verification.");
  }

  const reviewListResponse = await request(`/api/products/${productId}/reviews`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
    },
  });
  const reviewListPayload = JSON.parse(reviewListResponse.body);
  if (
    reviewListResponse.statusCode !== 200 ||
    reviewListPayload.success !== true ||
    !Array.isArray(reviewListPayload.reviews) ||
    !reviewListPayload.reviews.length
  ) {
    throw new Error("Review listing failed during phase-3 smoke verification.");
  }

  const cartAfterOrderResponse = await request("/api/cart", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
    },
  });
  const cartAfterOrderPayload = JSON.parse(cartAfterOrderResponse.body);
  if (
    cartAfterOrderResponse.statusCode !== 200 ||
    cartAfterOrderPayload.success !== true ||
    !cartAfterOrderPayload.cart ||
    Number(cartAfterOrderPayload.cart.itemCount || 0) !== 0
  ) {
    throw new Error("Cart did not clear after checkout during phase-3 smoke verification.");
  }

  const buyerWishlistAddResponse = await request("/api/buyer/wishlist", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
    }),
  });
  const buyerWishlistAddPayload = JSON.parse(buyerWishlistAddResponse.body);
  if (buyerWishlistAddResponse.statusCode !== 200 || buyerWishlistAddPayload.success !== true) {
    throw new Error("Buyer wishlist save failed during smoke verification.");
  }

  const buyerInteractionResponse = await request("/api/buyer/interactions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "view_product",
      source: "smoke",
      catalogItemId: productId,
      storeHandle: handle,
      templateKey: "products",
      itemType: "product",
    }),
  });
  const buyerInteractionPayload = JSON.parse(buyerInteractionResponse.body);
  if (buyerInteractionResponse.statusCode !== 200 || buyerInteractionPayload.success !== true) {
    throw new Error("Buyer interaction tracking failed during smoke verification.");
  }

  const buyerRecentlyViewedResponse = await request("/api/buyer/recently-viewed", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
    },
  });
  const buyerRecentlyViewedPayload = JSON.parse(buyerRecentlyViewedResponse.body);
  if (
    buyerRecentlyViewedResponse.statusCode !== 200 ||
    buyerRecentlyViewedPayload.success !== true ||
    !Array.isArray(buyerRecentlyViewedPayload.items)
  ) {
    throw new Error("Buyer recently viewed flow failed during smoke verification.");
  }

  const marketplaceStallsResponse = await request("/api/marketplace/stalls", {
    method: "GET",
  });
  const marketplaceStallsPayload = JSON.parse(marketplaceStallsResponse.body);
  const marketplaceStore = Array.isArray(marketplaceStallsPayload.stalls)
    ? marketplaceStallsPayload.stalls.find((stall) => String(stall.handle || "").trim() === handle)
    : null;
  const reportStoreId = Number((marketplaceStore && (marketplaceStore.storeId || marketplaceStore.id)) || 0);
  if (marketplaceStallsResponse.statusCode !== 200 || marketplaceStallsPayload.success !== true || !reportStoreId) {
    throw new Error("Marketplace store lookup failed during discovery smoke verification.");
  }

  const reportResponse = await request("/api/engagement/reports", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${buyerRegisterPayload.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetType: "store",
      targetId: reportStoreId,
      reason: "other",
      details: "Smoke moderation report for persistence verification.",
      metadata: {
        source: "smoke",
        storeHandle: handle,
      },
    }),
  });
  const reportPayload = JSON.parse(reportResponse.body);
  if (reportResponse.statusCode !== 200 || reportPayload.success !== true) {
    throw new Error("Content report failed during discovery smoke verification.");
  }

  const templateKeys = ["products", "art", "photography", "programmer", "music", "classes"];
  for (const templateKey of templateKeys) {
    const templateSaveResponse = await request("/api/store", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${registerPayload.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeName: "Smoke Store",
        handle,
        templateKey,
        tagline: `Smoke ${templateKey} storefront`,
        about: `Storefront verification for ${templateKey}.`,
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
          name: "Smoke Product",
          description: "Created during smoke verification.",
          price: 19.5,
          delivery: "pickup",
          location: "Port Moresby",
          transportFee: 0,
          images: [],
        },
      }),
    });
    const templateSavePayload = JSON.parse(templateSaveResponse.body);
    if (templateSaveResponse.statusCode !== 200 || templateSavePayload.success !== true) {
      throw new Error(`Store template save failed for ${templateKey}.`);
    }

    const sellerTemplateResponse = await request(`/seller/templates/${templateKey}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${registerPayload.token}`,
      },
    });
    if (sellerTemplateResponse.statusCode !== 200) {
      throw new Error(`Seller storefront route failed for ${templateKey}.`);
    }

    if (!sellerTemplateResponse.body.includes(`data-store-template-key="${templateKey}"`)) {
      throw new Error(`Seller storefront HTML did not expose template key ${templateKey}.`);
    }

    const publicTemplateResponse = await request(`/stores/${handle}`, {
      method: "GET",
    });
    if (publicTemplateResponse.statusCode !== 200) {
      throw new Error(`Public storefront route failed for ${templateKey}.`);
    }

    if (!publicTemplateResponse.body.includes(`data-store-template-key="${templateKey}"`)) {
      throw new Error(`Public storefront HTML did not expose template key ${templateKey}.`);
    }
  }

  const client = buildPgClient();
  try {
    await client.connect();
    const result = await client.query(
      `
        with store_row as (
          select s.id
          from stores s
          where s.handle = $1
          limit 1
        ),
        buyer_row as (
          select cp.id
          from customer_profiles cp
          join users u on u.id = cp.user_id
          where u.email = $3
          limit 1
        )
        select
          (select count(*) from users where email = $2) as user_count,
          (select count(*) from stores where handle = $1) as store_count,
          (select count(*) from catalog_items ci join store_row sr on sr.id = ci.store_id) as product_count,
          (select count(*) from feed_items fi join store_row sr on sr.id = fi.store_id where fi.type <> 'product_published') as feed_post_count,
          (select count(*) from orders o join store_row sr on sr.id = o.store_id where o.customer_email = $3) as order_count,
          (select count(*) from customer_addresses ca join buyer_row br on br.id = ca.customer_profile_id) as address_count,
          (select count(*) from wishlists w join buyer_row br on br.id = w.customer_profile_id) as wishlist_count,
          (select count(*) from content_reports cr join store_row sr on sr.id = cr.target_id where cr.target_type = 'store') as report_count
      `,
      [handle, sellerEmail, buyerEmail]
    );
    const row = result.rows[0] || {};
    if (Number(row.user_count || 0) !== 1) {
      throw new Error("Smoke verification could not find the registered user in PostgreSQL.");
    }
    if (Number(row.store_count || 0) !== 1) {
      throw new Error("Smoke verification could not find the saved store in PostgreSQL.");
    }
    if (Number(row.product_count || 0) < 1) {
      throw new Error("Smoke verification could not find the saved product in PostgreSQL.");
    }
    if (Number(row.feed_post_count || 0) < 1) {
      throw new Error("Smoke verification could not find the saved store update in PostgreSQL.");
    }
    if (Number(row.order_count || 0) < 1) {
      throw new Error("Smoke verification could not find the created order in PostgreSQL.");
    }
    if (Number(row.address_count || 0) < 1) {
      throw new Error("Smoke verification could not find the saved buyer address in PostgreSQL.");
    }
    if (Number(row.wishlist_count || 0) < 1) {
      throw new Error("Smoke verification could not find the saved buyer wishlist row in PostgreSQL.");
    }
    if (Number(row.report_count || 0) < 1) {
      throw new Error("Smoke verification could not find the saved content report in PostgreSQL.");
    }

    if (process.env.DB_PROVIDER && String(process.env.DB_PROVIDER).trim().toLowerCase() !== "postgres") {
      throw new Error("Smoke verification requires DB_PROVIDER=postgres.");
    }

    await client.query("delete from users where email = any($1::text[])", [[sellerEmail, buyerEmail]]);
  } finally {
    await client.end();
  }
}

async function run() {
  await runMigrations();

  const serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  try {
    await waitForServer();
    await verifyRoutes();
    await verifyAuthPages();
    await verifyPostgresWritePath();
    console.log("Smoke checks passed.");
  } finally {
    if (!serverProcess.killed) {
      serverProcess.kill("SIGTERM");
      await new Promise((resolve) => {
        serverProcess.once("exit", resolve);
      });
    }
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
