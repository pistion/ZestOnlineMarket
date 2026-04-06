const test = require("node:test");
const assert = require("node:assert/strict");

const {
  appendResponseCookie,
  buildAuthCookie,
  getCookieValue,
  hasBearerAuthHeader,
  normalizeInternalPath,
  parseCookies,
} = require("../../server/src/utils/auth-session");

test("parseCookies reads cookie pairs safely", () => {
  const cookies = parseCookies("foo=bar; zest_auth=token123; another=value");
  assert.equal(cookies.foo, "bar");
  assert.equal(cookies.zest_auth, "token123");
  assert.equal(cookies.another, "value");
});

test("normalizeInternalPath allows only safe internal paths", () => {
  assert.equal(normalizeInternalPath("/buyer/profile"), "/buyer/profile");
  assert.equal(normalizeInternalPath("https://example.com", "/"), "/");
  assert.equal(normalizeInternalPath("//evil.test", "/"), "/");
});

test("hasBearerAuthHeader detects bearer tokens only", () => {
  assert.equal(hasBearerAuthHeader({ headers: { authorization: "Bearer abc123" } }), true);
  assert.equal(hasBearerAuthHeader({ headers: { authorization: "Basic abc123" } }), false);
  assert.equal(hasBearerAuthHeader({ headers: {} }), false);
});

test("appendResponseCookie preserves existing cookies", () => {
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

  const cookies = response.getHeader("Set-Cookie");
  assert.ok(Array.isArray(cookies));
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /zest_auth=/);
  assert.match(cookies[1], /zest_csrf=/);
});

test("getCookieValue extracts a single cookie by name", () => {
  const value = getCookieValue(
    { headers: { cookie: "zest_csrf=abc; zest_auth=def" } },
    "zest_csrf"
  );
  assert.equal(value, "abc");
});
