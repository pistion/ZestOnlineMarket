(function () {
  const publicStore = document.body.dataset.publicStore === "1";
  const pathname = window.location.pathname;
  const nav = document.querySelector("[data-nav]");
  const feedPath = "/feed";
  const globalFeedPath = "/feed";
  const marketplacePath = "/marketplace";
  const checkoutPath = document.body.dataset.checkoutPath || "/buyer/cart";
  const sellerStoreHubPath = publicStore
    ? `/auth/signin?role=seller&returnTo=${encodeURIComponent("/seller/store")}`
    : "/seller/store";
  const sellerDashboardPath = publicStore
    ? `/auth/signin?role=seller&returnTo=${encodeURIComponent("/seller/dashboard")}`
    : "/seller/dashboard";
  const sellerSettingsPath = publicStore
    ? `/auth/signin?role=seller&returnTo=${encodeURIComponent("/seller/store/settings")}`
    : "/seller/store/settings";

  const routeMap = {
    feed: feedPath,
    "global-feed": globalFeedPath,
    marketplace: marketplacePath,
    templates: marketplacePath,
    dashboard: sellerDashboardPath,
    auth: sellerSettingsPath,
    settings: sellerSettingsPath,
    cart: checkoutPath,
  };

  function isCurrent(pageKey) {
    if (pageKey === "feed") {
      return pathname === "/feed" || pathname === "/global-feed";
    }

    if (pageKey === "global-feed") {
      return pathname === "/feed" || pathname === "/global-feed";
    }

    if (pageKey === "marketplace") {
      return pathname === "/marketplace";
    }

    if (pageKey === "templates") {
      return pathname === "/marketplace";
    }

    if (pageKey === "dashboard") {
      return pathname === "/seller/dashboard";
    }

    if (pageKey === "cart") {
      return pathname === "/buyer/cart" || pathname === "/buyer/checkout";
    }

    if (pageKey === "auth" || pageKey === "settings") {
      return pathname === "/seller/store/settings";
    }

    return false;
  }

  function clearSavedSession() {
    try {
      window.localStorage.removeItem("zestUser");
    } catch {
      // ignore
    }
  }

  async function signOut() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          redirectTo: "/auth/signin?signedOut=1&role=seller",
        }),
      });
    } catch {
      // ignore
    } finally {
      clearSavedSession();
      window.location.href = "/auth/signin?signedOut=1&role=seller";
    }
  }

  document.querySelectorAll("[data-page]").forEach((element) => {
    const pageKey = element.getAttribute("data-page");
    const destination = routeMap[pageKey];
    if (!destination) {
      return;
    }

    if (element.tagName === "A") {
      element.setAttribute("href", destination);
    }

    const active = isCurrent(pageKey);
    element.classList.toggle("is-active", active);
    if (active) {
      element.setAttribute("aria-current", "page");
    } else {
      element.removeAttribute("aria-current");
    }

    element.addEventListener("click", (event) => {
      if (element.tagName === "A") {
        return;
      }

      event.preventDefault();
      window.location.href = destination;
    });
  });

  if (nav && !publicStore && !nav.querySelector("[data-auth-action]")) {
    const switchButton = document.createElement("button");
    switchButton.type = "button";
    switchButton.className = "zest-account-btn";
    switchButton.dataset.authAction = "switch";
    switchButton.innerHTML = '<i class="fa-solid fa-right-left"></i><span>Switch</span>';
    switchButton.addEventListener("click", () => {
      clearSavedSession();
      window.location.href = "/auth/signin?role=seller";
    });

    const signOutButton = document.createElement("button");
    signOutButton.type = "button";
    signOutButton.className = "zest-account-btn zest-account-btn--primary";
    signOutButton.dataset.authAction = "signout";
    signOutButton.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i><span>Sign Out</span>';
    signOutButton.addEventListener("click", async () => {
      await signOut();
    });

    nav.appendChild(switchButton);
    nav.appendChild(signOutButton);
  }
})();
