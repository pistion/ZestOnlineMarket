const assert = require("node:assert/strict");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

const {
  appendResponseCookie,
  buildAuthCookie,
  getCookieValue,
  hasBearerAuthHeader,
  normalizeInternalPath,
  parseCookies,
} = require(path.join(root, "server", "src", "utils", "auth-session"));
const {
  validateBuyerInteractionPayload,
  validateBuyerWishlistPayload,
  validateContentReportPayload,
} = require(path.join(root, "server", "src", "utils", "request-validation"));

function runUnitTests() {
  const cookies = parseCookies("foo=bar; zest_auth=token123; another=value");
  assert.equal(cookies.foo, "bar");
  assert.equal(cookies.zest_auth, "token123");
  assert.equal(cookies.another, "value");

  assert.equal(normalizeInternalPath("/buyer/profile"), "/buyer/profile");
  assert.equal(normalizeInternalPath("https://example.com", "/"), "/");
  assert.equal(normalizeInternalPath("//evil.test", "/"), "/");

  assert.equal(hasBearerAuthHeader({ headers: { authorization: "Bearer abc123" } }), true);
  assert.equal(hasBearerAuthHeader({ headers: { authorization: "Basic abc123" } }), false);
  assert.equal(hasBearerAuthHeader({ headers: {} }), false);

  const headers = new Map();
  const response = {
    getHeader(name) {
      return headers.get(name);
    },
    setHeader(name, value) {
      headers.set(name, value);
    },
  };

  appendResponseCookie(response, buildAuthCookie("token-one"));
  appendResponseCookie(response, "zest_csrf=csrf-token; Path=/");
  const setCookies = response.getHeader("Set-Cookie");
  assert.ok(Array.isArray(setCookies));
  assert.equal(setCookies.length, 2);
  assert.match(setCookies[0], /zest_auth=/);
  assert.match(setCookies[1], /zest_csrf=/);

  const csrfCookie = getCookieValue(
    { headers: { cookie: "zest_csrf=abc; zest_auth=def" } },
    "zest_csrf"
  );
  assert.equal(csrfCookie, "abc");

  const interactionPayload = validateBuyerInteractionPayload({
    action: "View Product",
    source: "Marketplace Card",
    storeHandle: "@Test-Store",
    templateKey: "products",
    itemType: "Product",
    catalogItemId: 12,
  });
  assert.equal(interactionPayload.action, "view_product");
  assert.equal(interactionPayload.source, "marketplace-card");
  assert.equal(interactionPayload.storeHandle, "test-store");
  assert.equal(interactionPayload.templateKey, "products");
  assert.equal(interactionPayload.itemType, "product");
  assert.equal(interactionPayload.catalogItemId, 12);

  const wishlistPayload = validateBuyerWishlistPayload({ productId: 42 });
  assert.equal(wishlistPayload.productId, 42);

  assert.throws(
    () =>
      validateContentReportPayload({
        targetType: "store",
        targetId: 5,
        reason: "fake",
        details: "This should not pass validation.",
      }),
    /Report reason/
  );
}

if (require.main === module) {
  try {
    runUnitTests();
    console.log("Unit tests passed.");
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = {
  runUnitTests,
};
