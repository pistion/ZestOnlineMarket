(function () {
  function withSecurityToken(body) {
    const payload = {
      ...(body || {}),
    };

    const token =
      window.ZestHttp && typeof window.ZestHttp.getCsrfToken === "function"
        ? window.ZestHttp.getCsrfToken()
        : "";

    if (token && !payload._csrf) {
      payload._csrf = token;
    }

    return payload;
  }

  function postJson(url, body, options = {}) {
    const payload = JSON.stringify(withSecurityToken(body));

    if (options.preferBeacon && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      return navigator.sendBeacon(url, blob);
    }

    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      keepalive: Boolean(options.keepalive),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload,
    })
      .then((response) => response.json().catch(() => null))
      .catch(() => null);
  }

  window.ZestBuyerInteractions = {
    track(payload, options = {}) {
      return postJson("/api/buyer/interactions", payload, {
        keepalive: true,
        ...options,
      });
    },
  };
})();
