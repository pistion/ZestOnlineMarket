(function () {
  const state = {
    role: document.body.dataset.authRole === "seller" ? "seller" : "buyer",
    mode: document.body.dataset.authMode === "signup" ? "signup" : "signin",
  };

  const routes = {
    signin: "/auth/signin",
    signup: "/auth/signup",
    buyerHome: safePath(document.body.dataset.buyerHomePath || "/buyer/profile"),
    buyerSetup: safePath(document.body.dataset.buyerSetupPath || "/buyer/wizard-setup"),
    sellerHome: safePath(document.body.dataset.sellerHomePath || "/seller/store"),
  };

  const session = {
    active:
      state.mode === "signin" &&
      document.body.dataset.authSignedOut !== "1" &&
      document.body.dataset.authSessionActive === "1",
    email: document.body.dataset.authSessionEmail || "",
    role: document.body.dataset.authSessionRole === "seller" ? "seller" : "buyer",
    homePath: safePath(document.body.dataset.authSessionHomePath || ""),
    expiresAt: Number(document.body.dataset.authSessionExpiry || 0),
    signedOut: document.body.dataset.authSignedOut === "1",
    returnTo: safePath(document.body.dataset.returnTo || ""),
  };

  let sessionTimerId = null;

  const elements = {
    title: document.querySelector("#authTitle"),
    intro: document.querySelector("#authIntro"),
    roleLabel: document.querySelector("#authRoleLabel"),
    roleTabs: document.querySelector("#authRoleTabs"),
    buyerTab: document.querySelector("#authTabBuyer"),
    sellerTab: document.querySelector("#authTabSeller"),
    card: document.querySelector("#authCard"),
    form: document.querySelector("#authForm"),
    email: document.querySelector("#authEmail"),
    password: document.querySelector("#authPassword"),
    submitBtn: document.querySelector("#authSubmitBtn"),
    submitText: document.querySelector("#authSubmitText"),
    spinner: document.querySelector("#authSpinner"),
    error: document.querySelector("#authError"),
    notice: document.querySelector("#authNotice"),
    helper: document.querySelector("#authHelper"),
    toggleCopy: document.querySelector("#authToggleCopy"),
    modeToggle: document.querySelector("#authModeToggle"),
    sessionBanner: document.querySelector("#authSessionBanner"),
    sessionEmail: document.querySelector("#authSessionEmail"),
    sessionContinue: document.querySelector("#authSessionContinueLink"),
    sessionSwitch: document.querySelector("#authSessionSwitchBtn"),
    sessionLogout: document.querySelector("#authSessionLogoutBtn"),
    sessionTimerRow: document.querySelector("#authSessionTimerRow"),
    sessionTimer: document.querySelector("#authSessionTimer"),
  };

  function safePath(value) {
    const normalized = String(value || "").trim();
    if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("://")) {
      return "";
    }

    return normalized;
  }

  function setElementHidden(element, shouldHide) {
    if (!element) {
      return;
    }

    element.hidden = shouldHide;
    element.style.display = shouldHide ? "none" : "";
  }

  function buildAuthPagePath(mode, role, extra = {}) {
    const base = mode === "signup" ? routes.signup : routes.signin;
    const params = new URLSearchParams();
    params.set("role", role === "seller" ? "seller" : "buyer");

    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    return `${base}?${params.toString()}`;
  }

  function defaultRedirectForRole(role) {
    return role === "seller" ? routes.sellerHome : routes.buyerHome;
  }

  function resolveRedirect(result) {
    const redirectTo = safePath((result && result.redirectTo) || "");
    return redirectTo || defaultRedirectForRole(result && result.role);
  }

  function setError(message) {
    if (!elements.error) {
      return;
    }

    elements.error.textContent = message || "";
    elements.error.hidden = !message;
  }

  function setNotice(message) {
    if (elements.notice) {
      elements.notice.textContent = message || "";
    }
  }

  function setLoading(isLoading) {
    if (elements.submitBtn) {
      elements.submitBtn.disabled = isLoading;
    }

    if (elements.spinner) {
      elements.spinner.hidden = !isLoading;
    }
  }

  function renderHeaderCopy() {
    const isSignup = state.mode === "signup";

    if (elements.roleLabel) {
      elements.roleLabel.textContent = state.role === "seller" ? "Seller Access" : "Buyer Access";
    }

    if (elements.title) {
      elements.title.textContent = isSignup ? "Create your account" : "Welcome back";
    }

    if (elements.intro) {
      elements.intro.textContent =
        state.role === "seller"
          ? isSignup
            ? "Create a seller account, then continue into store setup and workspace tools."
            : "Sign in to resume your seller workspace based on your store setup status."
          : isSignup
            ? "Create a buyer account, then continue into buyer setup before landing in your profile."
            : "Sign in to continue into your buyer profile, feed, marketplace, and checkout flow.";
    }

    if (elements.helper) {
      elements.helper.textContent =
        state.role === "seller"
          ? isSignup
            ? "Seller sign-up opens /seller/store first so the store can be configured immediately."
            : "Seller sign-in returns to the seller workspace or store setup if it is still incomplete."
          : isSignup
            ? "Buyer sign-up opens /buyer/wizard-setup first, then moves into /buyer/profile."
            : "Buyer sign-in goes to /buyer/profile. From there, buyers can open their feed, the global feed, and the marketplace.";
    }

    if (elements.submitText) {
      elements.submitText.textContent = isSignup ? "Create account" : "Sign in";
    }

    if (elements.toggleCopy) {
      elements.toggleCopy.textContent = isSignup ? "Already have an account?" : "Need an account?";
    }

    if (elements.modeToggle) {
      elements.modeToggle.textContent = isSignup ? "Sign in" : "Create one";
      elements.modeToggle.href = buildAuthPagePath(isSignup ? "signin" : "signup", state.role, {
        returnTo: session.returnTo,
      });
    }
  }

  function renderRoleTabs() {
    const buyerActive = state.role === "buyer";
    if (elements.buyerTab) {
      elements.buyerTab.classList.toggle("is-active", buyerActive);
      elements.buyerTab.setAttribute("aria-selected", buyerActive ? "true" : "false");
    }
    if (elements.sellerTab) {
      elements.sellerTab.classList.toggle("is-active", !buyerActive);
      elements.sellerTab.setAttribute("aria-selected", buyerActive ? "false" : "true");
    }
  }

  function renderSessionBanner() {
    if (!elements.sessionBanner) {
      return;
    }

    if (!session.active) {
      setElementHidden(elements.sessionBanner, true);
      if (elements.card) {
        setElementHidden(elements.card, false);
      }
      if (elements.sessionTimerRow) {
        setElementHidden(elements.sessionTimerRow, true);
      }
      return;
    }

    setElementHidden(elements.sessionBanner, false);
    if (elements.card) {
      setElementHidden(elements.card, true);
    }
    if (elements.sessionEmail) {
      elements.sessionEmail.textContent = session.email || "your account";
    }
    if (elements.sessionContinue) {
      elements.sessionContinue.href = session.homePath || defaultRedirectForRole(session.role);
    }
  }

  function formatSessionDuration(remainingMs) {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2, "0")}h`;
    }

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function stopSessionCountdown() {
    if (sessionTimerId) {
      window.clearInterval(sessionTimerId);
      sessionTimerId = null;
    }
  }

  function expireSessionView() {
    stopSessionCountdown();
    session.active = false;
    session.expiresAt = 0;
    renderSessionBanner();
    setMode("signin");
    setNotice("Your session ended. Sign in again to continue.");
    window.history.replaceState({}, "", buildAuthPagePath("signin", state.role, {
      returnTo: session.returnTo,
    }));
  }

  function updateSessionCountdown() {
    if (!session.active || !Number.isFinite(session.expiresAt) || session.expiresAt <= 0) {
      if (elements.sessionTimerRow) {
        setElementHidden(elements.sessionTimerRow, true);
      }
      return;
    }

    const remainingMs = session.expiresAt - Date.now();
    if (remainingMs <= 0) {
      expireSessionView();
      return;
    }

    if (elements.sessionTimerRow) {
      setElementHidden(elements.sessionTimerRow, false);
    }
    if (elements.sessionTimer) {
      elements.sessionTimer.textContent = formatSessionDuration(remainingMs);
    }
  }

  function startSessionCountdown() {
    stopSessionCountdown();
    if (!session.active) {
      return;
    }

    updateSessionCountdown();
    if (!session.active) {
      return;
    }

    sessionTimerId = window.setInterval(updateSessionCountdown, 1000);
  }

  function setRole(role) {
    state.role = role === "seller" ? "seller" : "buyer";
    renderRoleTabs();
    renderHeaderCopy();
    setError("");
  }

  function setMode(mode) {
    state.mode = mode === "signup" ? "signup" : "signin";
    renderHeaderCopy();
    setError("");
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.success === false) {
      throw new Error((result && result.message) || `Request failed (${response.status})`);
    }

    return result;
  }

  async function signOutAndStay() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          redirectTo: buildAuthPagePath("signin", state.role, { signedOut: 1 }),
        }),
      });
    } catch {
      // ignore
    } finally {
      window.location.href = buildAuthPagePath("signin", state.role, { signedOut: 1 });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const email = String(elements.email?.value || "").trim();
    const password = String(elements.password?.value || "");

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = state.mode === "signup" ? "/auth/register" : "/auth/login";
      const payload =
        state.mode === "signup"
          ? {
              email,
              password,
              role: state.role,
              returnTo: session.returnTo,
            }
          : {
              email,
              password,
              intentRole: state.role,
              returnTo: session.returnTo,
            };

      const result = await postJson(endpoint, payload);

      if (result.roleMismatch) {
        setNotice(
          result.role === "seller"
            ? "This account is a seller account, so Zest is opening seller tools."
            : "This account is a buyer account, so Zest is opening the buyer profile."
        );
        window.setTimeout(() => {
          window.location.href = resolveRedirect(result);
        }, 700);
        return;
      }

      window.location.href = resolveRedirect(result);
    } catch (error) {
      setError(error.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    elements.roleTabs?.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-role]");
      if (!tab) {
        return;
      }

      setRole(tab.getAttribute("data-role"));
    });

    elements.modeToggle?.addEventListener("click", (event) => {
      event.preventDefault();
      setMode(state.mode === "signup" ? "signin" : "signup");
      window.history.replaceState({}, "", buildAuthPagePath(state.mode, state.role, {
        returnTo: session.returnTo,
      }));
    });

    elements.form?.addEventListener("submit", handleSubmit);
    elements.sessionSwitch?.addEventListener("click", signOutAndStay);
    elements.sessionLogout?.addEventListener("click", signOutAndStay);
  }

  function initNotices() {
    if (session.signedOut) {
      setNotice("You signed out successfully. Sign in again whenever you're ready.");
      return;
    }
  }

  function init() {
    if (session.active && (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now())) {
      session.active = false;
      session.expiresAt = 0;
    }

    renderRoleTabs();
    renderHeaderCopy();
    renderSessionBanner();
    startSessionCountdown();
    bindEvents();
    initNotices();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
