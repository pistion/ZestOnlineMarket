(function () {
  const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
  const originalFetch = window.fetch ? window.fetch.bind(window) : null;

  function parseCookies() {
    return String(document.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce((cookies, part) => {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) {
          return cookies;
        }

        const key = part.slice(0, separatorIndex).trim();
        const value = part.slice(separatorIndex + 1).trim();
        cookies[key] = decodeURIComponent(value);
        return cookies;
      }, {});
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) {
      return meta.content;
    }

    const cookies = parseCookies();
    return cookies.zest_csrf || "";
  }

  function isSameOrigin(url) {
    try {
      return new URL(url, window.location.href).origin === window.location.origin;
    } catch (error) {
      return false;
    }
  }

  function mergeHeaders(initialHeaders, nextHeaders) {
    const headers = new Headers(initialHeaders || {});
    const additions = new Headers(nextHeaders || {});
    additions.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  function withCsrfHeaders(input, init = {}) {
    const request = input instanceof Request ? input : null;
    const method = String(init.method || (request && request.method) || "GET").toUpperCase();
    const requestUrl = request ? request.url : input;

    if (!originalFetch || SAFE_METHODS.has(method) || !requestUrl || !isSameOrigin(requestUrl)) {
      return originalFetch(input, init);
    }

    const token = getCsrfToken();
    const headers = mergeHeaders(request ? request.headers : null, init.headers);
    if (token && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", token);
    }

    if (request) {
      return originalFetch(new Request(request, { ...init, headers }));
    }

    return originalFetch(input, { ...init, headers });
  }

  if (originalFetch) {
    window.fetch = withCsrfHeaders;
  }

  window.ZestHttp = {
    getCsrfToken,
  };
})();
