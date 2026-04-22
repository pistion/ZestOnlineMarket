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
    dividerCopy: document.querySelector("#authDividerCopy"),
    card: document.querySelector("#authCard"),
    form: document.querySelector("#authForm"),
    email: document.querySelector("#authEmail"),
    password: document.querySelector("#authPassword"),
    confirmField: document.querySelector("#authConfirmField"),
    confirmPassword: document.querySelector("#authConfirmPassword"),
    passwordMeta: document.querySelector("#authPasswordMeta"),
    passwordRules: document.querySelector("#authPasswordRules"),
    submitBtn: document.querySelector("#authSubmitBtn"),
    submitText: document.querySelector("#authSubmitText"),
    spinner: document.querySelector("#authSpinner"),
    error: document.querySelector("#authError"),
    notice: document.querySelector("#authNotice"),
    helper: document.querySelector("#authHelper"),
    toggleCopy: document.querySelector("#authToggleCopy"),
    modeToggle: document.querySelector("#authModeToggle"),
    googleCopy: document.querySelector("#authGoogleCopy"),
    facebookCopy: document.querySelector("#authFacebookCopy"),
    socialButtons: Array.from(document.querySelectorAll("[data-provider]")),
    sessionBanner: document.querySelector("#authSessionBanner"),
    sessionEmail: document.querySelector("#authSessionEmail"),
    sessionContinue: document.querySelector("#authSessionContinueLink"),
    sessionSwitch: document.querySelector("#authSessionSwitchBtn"),
    sessionLogout: document.querySelector("#authSessionLogoutBtn"),
    sessionTimerRow: document.querySelector("#authSessionTimerRow"),
    sessionTimer: document.querySelector("#authSessionTimer"),
    supportBox: document.querySelector("#authSupportBox"),
    supportHint: document.querySelector("#authSupportHint"),
    supportTips: document.querySelector("#authSupportTips"),
    supportRequestId: document.querySelector("#authSupportRequestId"),
  };

  function safePath(value) {
    const normalized = String(value || "").trim();
    if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("://")) {
      return "";
    }

    return normalized;
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta && meta.content ? String(meta.content).trim() : "";
  }

  function getQueryParams() {
    return new URLSearchParams(window.location.search || "");
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

  function buildSocialAuthPath(provider) {
    const params = new URLSearchParams();
    params.set("role", state.role);
    if (session.returnTo) {
      params.set("returnTo", session.returnTo);
    }

    return `/auth/oauth/${encodeURIComponent(provider)}?${params.toString()}`;
  }

  function defaultRedirectForRole(role) {
    return role === "seller" ? routes.sellerHome : routes.buyerHome;
  }

  function resolveRedirect(result) {
    const redirectTo = safePath((result && result.redirectTo) || "");
    return redirectTo || defaultRedirectForRole(result && result.role);
  }

  function clearSupportPanel() {
    if (elements.supportHint) {
      elements.supportHint.textContent = "";
    }
    if (elements.supportTips) {
      elements.supportTips.innerHTML = "";
    }
    if (elements.supportRequestId) {
      elements.supportRequestId.textContent = "";
      setElementHidden(elements.supportRequestId, true);
    }
    setElementHidden(elements.supportBox, true);
  }

  function buildTroubleshootingTips(payload = {}) {
    const code = String(payload.code || "").trim().toUpperCase();
    const details = Array.isArray(payload.details) ? payload.details : [];

    if (details.length) {
      return details.map((detail) => detail.message).filter(Boolean).slice(0, 4);
    }

    switch (code) {
      case "INVALID_CREDENTIALS":
        return [
          "Check that the email address is spelled correctly.",
          "Passwords are case-sensitive, including symbols and numbers.",
          "If you originally used Google or Facebook, use that provider button instead.",
        ];
      case "EMAIL_TAKEN":
        return [
          "This email already belongs to an account.",
          "Try the sign-in mode instead of creating a second account.",
          "If the account started with Google or Facebook, continue with that provider.",
        ];
      case "SOCIAL_PROVIDER_NOT_CONFIGURED":
        return [
          "The button is wired into the app, but the provider keys are still missing on the server.",
          "Set the provider client ID, secret, and redirect URI, then retry the social sign-in flow.",
        ];
      case "SOCIAL_AUTH_STATE_INVALID":
        return [
          "The provider redirected back after the temporary auth state expired.",
          "Start the Google or Facebook flow again from this page.",
        ];
      case "SOCIAL_AUTH_EMAIL_MISSING":
        return [
          "This provider account did not return an email address.",
          "Use an account that shares email access, or create the account with email and password instead.",
        ];
      case "GOOGLE_TOKEN_EXCHANGE_FAILED":
      case "FACEBOOK_TOKEN_EXCHANGE_FAILED":
      case "GOOGLE_NETWORK_FAILURE":
      case "FACEBOOK_NETWORK_FAILURE":
        return [
          "Check the provider client ID, secret, and callback URL on the server.",
          "Confirm the deployment can make outbound HTTPS requests to the provider.",
        ];
      default:
        return [
          "Retry the request once to rule out an expired form or temporary provider issue.",
          "If it keeps failing, use the request ID below to trace the server-side error quickly.",
        ];
    }
  }

  function renderSupportPanel(payload = {}) {
    const hint = String(payload.hint || "").trim();
    const tips = buildTroubleshootingTips(payload);
    const requestId = String(payload.requestId || "").trim();

    if (elements.supportHint) {
      elements.supportHint.textContent = hint || "Try the suggestions below before retrying the form.";
    }
    if (elements.supportTips) {
      elements.supportTips.innerHTML = tips.map((tip) => `<li>${tip}</li>`).join("");
    }
    if (elements.supportRequestId) {
      if (requestId) {
        elements.supportRequestId.textContent = `Request ${requestId}`;
        setElementHidden(elements.supportRequestId, false);
      } else {
        elements.supportRequestId.textContent = "";
        setElementHidden(elements.supportRequestId, true);
      }
    }

    setElementHidden(elements.supportBox, false);
  }

  function setError(message, payload = {}) {
    if (elements.error) {
      elements.error.textContent = message || "";
      setElementHidden(elements.error, !message);
    }

    if (message) {
      renderSupportPanel(payload);
      return;
    }

    clearSupportPanel();
  }

  function setNotice(message) {
    if (elements.notice) {
      elements.notice.textContent = message || "";
      setElementHidden(elements.notice, !message);
    }
  }

  function clearFeedback() {
    setError("");
    setNotice("");
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
            ? "Create a seller account, confirm the password, then continue into the seller setup flow."
            : "Sign in to resume your seller workspace, or switch to Google or Facebook if you use social sign-in."
          : isSignup
            ? "Create a buyer account with a confirmed password, then continue into buyer setup before landing in your profile."
            : "Sign in to continue into your buyer profile, feed, marketplace, and checkout flow.";
    }

    if (elements.helper) {
      elements.helper.textContent =
        state.role === "seller"
          ? isSignup
            ? "Seller sign-up now bootstraps the Postgres store records immediately so the wizard can continue without missing tables."
            : "Seller sign-in returns to the seller wizard or workspace based on the current store setup state."
          : isSignup
            ? "Buyer sign-up creates the buyer profile and preference records immediately, then opens /buyer/wizard-setup."
            : "Buyer sign-in goes to /buyer/profile. If something fails, the troubleshooting card below will surface the request ID and server hint.";
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

    if (elements.passwordMeta) {
      elements.passwordMeta.textContent = isSignup
        ? "Use 8 to 128 characters with both letters and numbers. You will confirm it before submitting."
        : "Use the same password you created for this account, or switch to Google/Facebook if that is how you registered.";
    }

    if (elements.dividerCopy) {
      elements.dividerCopy.textContent = isSignup ? "or create an account with email" : "or continue with email";
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

  function renderModeState() {
    const isSignup = state.mode === "signup";

    if (elements.confirmPassword) {
      elements.confirmPassword.value = "";
      elements.confirmPassword.required = isSignup;
    }
    setElementHidden(elements.confirmField, !isSignup);
    setElementHidden(elements.passwordRules, !isSignup);

    if (elements.password) {
      elements.password.setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
      elements.password.placeholder = isSignup ? "Create a password" : "Enter your password";
    }
  }

  function renderSocialButtons() {
    const isSignup = state.mode === "signup";
    elements.socialButtons.forEach((button) => {
      const provider = button.getAttribute("data-provider");
      if (!provider) {
        return;
      }

      button.href = buildSocialAuthPath(provider);
    });

    if (elements.googleCopy) {
      elements.googleCopy.textContent = isSignup ? "Sign up with Google" : "Continue with Google";
    }

    if (elements.facebookCopy) {
      elements.facebookCopy.textContent = isSignup ? "Sign up with Facebook" : "Continue with Facebook";
    }
  }

  function syncPageStateToUrl() {
    window.history.replaceState({}, "", buildAuthPagePath(state.mode, state.role, {
      returnTo: session.returnTo,
    }));
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
    renderSocialButtons();
    clearFeedback();
    syncPageStateToUrl();
  }

  function setMode(mode) {
    state.mode = mode === "signup" ? "signup" : "signin";
    renderHeaderCopy();
    renderModeState();
    renderSocialButtons();
    clearFeedback();
    syncPageStateToUrl();
  }

  async function postJson(url, payload) {
    const csrfToken = getCsrfToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.success === false) {
      const error = new Error((result && result.message) || `Request failed (${response.status})`);
      error.code = result && result.code ? result.code : "";
      error.hint = result && result.hint ? result.hint : "";
      error.details = result && Array.isArray(result.details) ? result.details : [];
      error.requestId = result && result.requestId ? result.requestId : "";
      throw error;
    }

    return result;
  }

  async function signOutAndStay() {
    const csrfToken = getCsrfToken();
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers,
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

  function validateForm() {
    const email = String(elements.email?.value || "").trim();
    const password = String(elements.password?.value || "");
    const confirmPassword = String(elements.confirmPassword?.value || "");

    if (!email || !password) {
      return {
        valid: false,
        message: "Enter your email and password.",
        code: "FORM_INCOMPLETE",
      };
    }

    if (state.mode === "signup") {
      if (!confirmPassword) {
        return {
          valid: false,
          message: "Confirm your password before creating the account.",
          code: "PASSWORD_CONFIRM_REQUIRED",
        };
      }

      if (password !== confirmPassword) {
        return {
          valid: false,
          message: "Passwords do not match.",
          code: "PASSWORD_MISMATCH",
          hint: "Re-enter the password in both fields so the new account starts with the intended credentials.",
        };
      }
    }

    return {
      valid: true,
      email,
      password,
      confirmPassword,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFeedback();

    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.message, validation);
      return;
    }

    setLoading(true);

    try {
      const endpoint = state.mode === "signup" ? "/auth/register" : "/auth/login";
      const payload =
        state.mode === "signup"
          ? {
              email: validation.email,
              password: validation.password,
              confirmPassword: validation.confirmPassword,
              role: state.role,
              returnTo: session.returnTo,
            }
          : {
              email: validation.email,
              password: validation.password,
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
      setError(error.message || "Authentication failed.", {
        code: error.code,
        hint: error.hint,
        details: error.details,
        requestId: error.requestId,
      });
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
    });

    elements.form?.addEventListener("submit", handleSubmit);
    elements.sessionSwitch?.addEventListener("click", signOutAndStay);
    elements.sessionLogout?.addEventListener("click", signOutAndStay);
  }

  function initFeedbackFromQuery() {
    const params = getQueryParams();
    const errorMessage = String(params.get("error") || "").trim();
    const noticeMessage = String(params.get("notice") || "").trim();

    if (errorMessage) {
      setError(errorMessage, {
        code: String(params.get("errorCode") || "").trim(),
        hint: String(params.get("hint") || "").trim(),
        requestId: String(params.get("requestId") || "").trim(),
      });
      return;
    }

    if (session.signedOut) {
      setNotice("You signed out successfully. Sign in again whenever you're ready.");
      return;
    }

    if (noticeMessage) {
      setNotice(noticeMessage);
    }
  }

  function init() {
    if (session.active && (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now())) {
      session.active = false;
      session.expiresAt = 0;
    }

    renderRoleTabs();
    renderHeaderCopy();
    renderModeState();
    renderSocialButtons();
    renderSessionBanner();
    startSessionCountdown();
    bindEvents();
    initFeedbackFromQuery();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
