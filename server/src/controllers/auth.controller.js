const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { transaction } = require("../config/db");
const { jwtSecret } = require("../config/env");
const {
  createUser,
  findUserByAuthProvider,
  findUserByEmail,
  findUserById,
  linkUserAuthProvider,
  touchUserLastLogin,
  updateUserProfileById,
} = require("../repositories/user.repository");
const {
  resolveAuthenticatedAppState,
  resolveBuyerSetupPath,
  resolveRoleAwareReturnPath,
} = require("../services/account-routing.service");
const { sendTemplateMail } = require("../services/email.service");
const {
  assertSocialProviderConfigured,
  buildSocialAuthUrl,
  buildSocialStateToken,
  exchangeSocialCodeForProfile,
  getSocialProviderLabel,
  normalizeSocialProvider,
  verifySocialStateToken,
} = require("../services/social-auth.service");
const { createHttpError, sendSuccess } = require("../utils/api-response");
const {
  OAUTH_STATE_COOKIE_NAME,
  appendResponseCookie,
  buildAuthCookie,
  buildClearedAuthCookie,
  buildClearedCsrfCookie,
  buildClearedOAuthStateCookie,
  buildOAuthStateCookie,
  getCookieValue,
  normalizeInternalPath,
} = require("../utils/auth-session");
const { logWarn } = require("../utils/logger");

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "3h" }
  );
}

function normalizeIntentRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return role === "buyer" || role === "seller" ? role : "";
}

function buildAuthPagePath(mode, role = "buyer", returnTo = "", feedback = {}) {
  const basePath = mode === "signup" ? "/auth/signup" : "/auth/signin";
  const params = new URLSearchParams();
  params.set("role", normalizeIntentRole(role) || "buyer");
  const safeReturnTo = normalizeInternalPath(returnTo, "");
  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  Object.entries(feedback || {}).forEach(([key, value]) => {
    if (value != null && value !== "") {
      params.set(key, String(value));
    }
  });

  return `${basePath}?${params.toString()}`;
}

function buildAuthFeedback(error, requestId = "") {
  const shouldExposeMessage = Boolean(error && error.statusCode && error.statusCode < 500);
  const message =
    shouldExposeMessage && error && error.message
      ? error.message
      : "Authentication could not be completed right now.";

  return {
    error: message,
    errorCode: error && error.code ? error.code : "AUTH_FLOW_FAILED",
    hint:
      error && error.hint
        ? error.hint
        : "Retry the sign-in flow, then check the email, password, or provider setup if it still fails.",
    requestId,
  };
}

async function buildLoginSuccess(user, returnTo, intentRole, options = {}) {
  const appState = await resolveAuthenticatedAppState(user, options);
  const safeReturnTo = normalizeInternalPath(returnTo, "");
  const requestedRole = normalizeIntentRole(intentRole);
  const isRoleMismatch = Boolean(requestedRole && requestedRole !== user.role);
  const redirectTo = resolveRoleAwareReturnPath(user.role, safeReturnTo, appState.redirectTo);

  return {
    appState,
    redirectTo,
    roleMismatch: isRoleMismatch,
  };
}

function buildAuthResult(user, token, appState, redirectTo, roleMismatch = false) {
  return {
    token,
    role: user.role,
    redirectTo,
    roleMismatch,
    profileCompleted: appState.profileCompleted,
    buyerProfileCompleted: appState.buyerProfileCompleted,
    sellerProfileCompleted: appState.sellerProfileCompleted,
  };
}

async function register(req, res, next) {
  try {
    const { email, password, role, returnTo } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { appState, user } = await transaction(async (txContext) => {
      const repoOptions = {
        transaction: txContext,
      };
      const createdUser = await createUser(
        {
          email,
          password: hashedPassword,
          role,
        },
        repoOptions
      );
      await touchUserLastLogin(createdUser.id, repoOptions);
      const nextAppState = await resolveAuthenticatedAppState(createdUser, repoOptions);

      return {
        appState: nextAppState,
        user: createdUser,
      };
    });
    const token = signToken(user);
    const safeReturnTo = normalizeInternalPath(returnTo, "");
    const redirectTo =
      user.role === "buyer"
        ? resolveBuyerSetupPath()
        : resolveRoleAwareReturnPath(user.role, safeReturnTo, appState.redirectTo);

    appendResponseCookie(res, buildAuthCookie(token));
    await sendTemplateMail({
      to: user.email,
      subject: "Welcome to Zest Market",
      template: "welcome",
      data: {
        email: user.email,
        role: user.role,
        redirectTo,
      },
    });

    return sendSuccess(
      res,
      buildAuthResult(user, token, appState, redirectTo, false),
      "User registered"
    );
  } catch (error) {
    if (
      (error.message && error.message.includes("UNIQUE constraint failed: users.email")) ||
      error.code === "23505"
    ) {
      return next(
        createHttpError(400, "Email already exists", {
          code: "EMAIL_TAKEN",
          hint: "Sign in instead, or use Google/Facebook if that email was created through social sign-in.",
        })
      );
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, intentRole, returnTo } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      logWarn("auth.login_failed_user_missing", {
        email,
        requestId: req.requestId || "",
      });
      throw createHttpError(401, "Invalid email or password", {
        code: "INVALID_CREDENTIALS",
        hint: "Check the email spelling, or use Google/Facebook if this account was created with a social provider.",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logWarn("auth.login_failed_password_mismatch", {
        email,
        requestId: req.requestId || "",
      });
      throw createHttpError(401, "Invalid email or password", {
        code: "INVALID_CREDENTIALS",
        hint: "Passwords are case-sensitive. If you normally use Google or Facebook, use that button instead.",
      });
    }

    await touchUserLastLogin(user.id);
    const token = signToken(user);
    const {
      appState,
      redirectTo,
      roleMismatch,
    } = await buildLoginSuccess(user, returnTo, intentRole);
    appendResponseCookie(res, buildAuthCookie(token));

    return sendSuccess(
      res,
      buildAuthResult(user, token, appState, redirectTo, roleMismatch),
      roleMismatch ? "Role mismatch detected" : "Login successful"
    );
  } catch (error) {
    return next(error);
  }
}

async function startSocialAuth(req, res) {
  const provider = normalizeSocialProvider(req.params.provider);
  const requestedRole = normalizeIntentRole(req.query.role) || "buyer";
  const returnTo = normalizeInternalPath(req.query.returnTo, "");

  try {
    const config = assertSocialProviderConfigured(provider, req);
    const nonce = crypto.randomBytes(18).toString("hex");
    const state = buildSocialStateToken({
      provider,
      role: requestedRole,
      returnTo,
      nonce,
    });

    appendResponseCookie(res, buildOAuthStateCookie(nonce));
    return res.redirect(302, buildSocialAuthUrl(provider, { config, req, state }));
  } catch (error) {
    return res.redirect(
      302,
      buildAuthPagePath(
        "signin",
        requestedRole,
        returnTo,
        buildAuthFeedback(error, req.requestId || "")
      )
    );
  }
}

async function finishSocialAuth(req, res) {
  const provider = normalizeSocialProvider(req.params.provider);
  let statePayload = null;

  appendResponseCookie(res, buildClearedOAuthStateCookie());

  try {
    const normalizedProvider = normalizeSocialProvider(provider);
    if (!normalizedProvider) {
      throw createHttpError(404, "Unknown social sign-in provider", {
        code: "SOCIAL_PROVIDER_UNKNOWN",
        hint: "Use Google or Facebook from the sign-in page.",
      });
    }

    if (req.query && req.query.error) {
      throw createHttpError(400, `${getSocialProviderLabel(normalizedProvider)} sign-in was canceled`, {
        code: "SOCIAL_AUTH_CANCELLED",
        hint: "Retry the provider flow or use email and password instead.",
      });
    }

    const stateToken = String(req.query && req.query.state || "").trim();
    const stateCookie = getCookieValue(req, OAUTH_STATE_COOKIE_NAME);
    if (!stateToken || !stateCookie) {
      throw createHttpError(400, "Social sign-in session expired", {
        code: "SOCIAL_AUTH_STATE_INVALID",
        hint: "Start the social sign-in flow again from the auth page.",
      });
    }

    statePayload = verifySocialStateToken(stateToken);
    if (
      !statePayload ||
      statePayload.type !== "social-auth-state" ||
      normalizeSocialProvider(statePayload.provider) !== normalizedProvider ||
      String(statePayload.nonce || "").trim() !== String(stateCookie || "").trim()
    ) {
      throw createHttpError(400, "Social sign-in session could not be verified", {
        code: "SOCIAL_AUTH_STATE_INVALID",
        hint: "Start the social sign-in flow again from the auth page.",
      });
    }

    const profile = await exchangeSocialCodeForProfile(normalizedProvider, {
      req,
      code: req.query && req.query.code,
    });
    if (!profile.email) {
      throw createHttpError(400, `${getSocialProviderLabel(normalizedProvider)} did not share an email address`, {
        code: "SOCIAL_AUTH_EMAIL_MISSING",
        hint: "Use email sign-up instead, or choose a provider account that shares an email address.",
      });
    }

    const { appState, user } = await transaction(async (txContext) => {
      const repoOptions = {
        transaction: txContext,
      };
      let authenticatedUser = await findUserByAuthProvider(
        normalizedProvider,
        profile.subject,
        repoOptions
      );

      if (!authenticatedUser) {
        authenticatedUser = await findUserByEmail(profile.email, repoOptions);
      }

      if (!authenticatedUser) {
        const randomPasswordHash = await bcrypt.hash(
          `${normalizedProvider}:${profile.subject}:${crypto.randomUUID()}`,
          10
        );
        authenticatedUser = await createUser(
          {
            email: profile.email,
            password: randomPasswordHash,
            role: normalizeIntentRole(statePayload.role) || "buyer",
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          },
          repoOptions
        );
      } else {
        authenticatedUser = await updateUserProfileById(
          authenticatedUser.id,
          {
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
          },
          repoOptions
        );
      }

      await linkUserAuthProvider(
        authenticatedUser.id,
        {
          provider: normalizedProvider,
          providerSubject: profile.subject,
          email: profile.email,
          displayName: profile.fullName,
          avatarUrl: profile.avatarUrl,
        },
        repoOptions
      );
      await touchUserLastLogin(authenticatedUser.id, repoOptions);

      const refreshedUser = await findUserById(authenticatedUser.id, repoOptions);
      const nextAppState = await resolveAuthenticatedAppState(refreshedUser, repoOptions);

      return {
        appState: nextAppState,
        user: refreshedUser,
      };
    });

    const token = signToken(user);
    const redirectTo = resolveRoleAwareReturnPath(
      user.role,
      statePayload.returnTo || "",
      appState.redirectTo
    );

    appendResponseCookie(res, buildAuthCookie(token));
    return res.redirect(302, redirectTo);
  } catch (error) {
    logWarn("auth.social_failed", {
      provider: normalizeSocialProvider(provider) || String(provider || ""),
      requestId: req.requestId || "",
      code: error && error.code ? error.code : "SOCIAL_AUTH_FAILED",
      message: error && error.message ? error.message : "Social authentication failed",
    });

    const fallbackRole =
      normalizeIntentRole(statePayload && statePayload.role) ||
      normalizeIntentRole(req.query && req.query.role) ||
      "buyer";
    const fallbackReturnTo =
      normalizeInternalPath(statePayload && statePayload.returnTo, "") ||
      normalizeInternalPath(req.query && req.query.returnTo, "");

    return res.redirect(
      302,
      buildAuthPagePath(
        "signin",
        fallbackRole,
        fallbackReturnTo,
        buildAuthFeedback(error, req.requestId || "")
      )
    );
  }
}

function logout(req, res) {
  appendResponseCookie(res, buildClearedAuthCookie());
  appendResponseCookie(res, buildClearedCsrfCookie());
  appendResponseCookie(res, buildClearedOAuthStateCookie());
  const redirectTo = normalizeInternalPath(
    (req.body && req.body.redirectTo) || (req.query && req.query.redirectTo),
    ""
  );

  if (redirectTo) {
    return res.redirect(302, redirectTo);
  }

  const accepts = req.headers.accept || "";
  if (accepts.includes("text/html")) {
    return res.redirect(302, "/auth/signin?signedOut=1");
  }

  return sendSuccess(res, {}, "Logged out");
}

module.exports = {
  finishSocialAuth,
  login,
  logout,
  register,
  startSocialAuth,
};
