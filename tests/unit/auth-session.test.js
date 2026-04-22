const {
  OAUTH_STATE_COOKIE_NAME,
  appendResponseCookie,
  buildAuthCookie,
  buildClearedOAuthStateCookie,
  buildOAuthStateCookie,
  getCookieValue,
  hasBearerAuthHeader,
  normalizeInternalPath,
  parseCookies,
} = require("../../server/src/utils/auth-session");

describe("auth session helpers", () => {
  it("reads cookie pairs safely", () => {
    const cookies = parseCookies("foo=bar; zest_auth=token123; another=value");
    expect(cookies.foo).toBe("bar");
    expect(cookies.zest_auth).toBe("token123");
    expect(cookies.another).toBe("value");
  });

  it("allows only safe internal paths", () => {
    expect(normalizeInternalPath("/buyer/profile")).toBe("/buyer/profile");
    expect(normalizeInternalPath("https://example.com", "/")).toBe("/");
    expect(normalizeInternalPath("//evil.test", "/")).toBe("/");
  });

  it("detects bearer tokens only", () => {
    expect(hasBearerAuthHeader({ headers: { authorization: "Bearer abc123" } })).toBe(true);
    expect(hasBearerAuthHeader({ headers: { authorization: "Basic abc123" } })).toBe(false);
    expect(hasBearerAuthHeader({ headers: {} })).toBe(false);
  });

  it("preserves existing cookies when appending response cookies", () => {
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
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(/zest_auth=/);
    expect(cookies[1]).toMatch(/zest_csrf=/);
  });

  it("extracts a single cookie by name", () => {
    const value = getCookieValue(
      { headers: { cookie: "zest_csrf=abc; zest_auth=def" } },
      "zest_csrf"
    );
    expect(value).toBe("abc");
  });

  it("builds an oauth state cookie with a short lifetime", () => {
    const cookie = buildOAuthStateCookie("nonce-123");
    expect(cookie).toContain(`${OAUTH_STATE_COOKIE_NAME}=nonce-123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=600");
  });

  it("clears the oauth state cookie explicitly", () => {
    const cookie = buildClearedOAuthStateCookie();
    expect(cookie).toContain(`${OAUTH_STATE_COOKIE_NAME}=`);
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie).toContain("Max-Age=0");
  });
});
