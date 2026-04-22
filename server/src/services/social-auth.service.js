const jwt = require("jsonwebtoken");

const {
  appBaseUrl,
  facebookClientId,
  facebookClientSecret,
  facebookRedirectUri,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
  jwtSecret,
} = require("../config/env");
const { createHttpError } = require("../utils/api-response");

const SOCIAL_PROVIDER_LABELS = Object.freeze({
  facebook: "Facebook",
  google: "Google",
});

function normalizeSocialProvider(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "google" || normalized === "facebook" ? normalized : "";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildRequestBaseUrl(req) {
  const configured = normalizeBaseUrl(appBaseUrl);
  if (configured) {
    return configured;
  }

  const protocol = req && req.protocol ? req.protocol : "http";
  const host = req && typeof req.get === "function" ? req.get("host") : "";
  return normalizeBaseUrl(`${protocol}://${host}`);
}

function getSocialProviderLabel(provider) {
  const normalized = normalizeSocialProvider(provider);
  return SOCIAL_PROVIDER_LABELS[normalized] || "Social provider";
}

function getSocialProviderConfig(provider) {
  const normalized = normalizeSocialProvider(provider);
  if (normalized === "google") {
    return {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: googleRedirectUri,
      scopes: ["openid", "email", "profile"],
    };
  }

  if (normalized === "facebook") {
    return {
      clientId: facebookClientId,
      clientSecret: facebookClientSecret,
      redirectUri: facebookRedirectUri,
      scopes: ["email", "public_profile"],
    };
  }

  return null;
}

function isSocialProviderConfigured(provider) {
  const config = getSocialProviderConfig(provider);
  return Boolean(config && config.clientId && config.clientSecret);
}

function resolveSocialRedirectUri(provider, req) {
  const config = getSocialProviderConfig(provider);
  if (!config) {
    return "";
  }

  if (config.redirectUri) {
    return config.redirectUri;
  }

  const baseUrl = buildRequestBaseUrl(req);
  if (!baseUrl) {
    return "";
  }

  return `${baseUrl}/auth/oauth/${provider}/callback`;
}

function buildSocialConfigurationHint(provider) {
  const label = getSocialProviderLabel(provider);
  if (provider === "google") {
    return `Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI for ${label} sign-in.`;
  }

  if (provider === "facebook") {
    return `Set FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and FACEBOOK_REDIRECT_URI for ${label} sign-in.`;
  }

  return "Configure the social provider credentials before retrying.";
}

function assertSocialProviderConfigured(provider, req) {
  const normalized = normalizeSocialProvider(provider);
  if (!normalized) {
    throw createHttpError(404, "Unknown social sign-in provider", {
      code: "SOCIAL_PROVIDER_UNKNOWN",
      hint: "Use Google or Facebook from the sign-in page.",
    });
  }

  if (!isSocialProviderConfigured(normalized)) {
    throw createHttpError(503, `${getSocialProviderLabel(normalized)} sign-in is not configured yet`, {
      code: "SOCIAL_PROVIDER_NOT_CONFIGURED",
      hint: buildSocialConfigurationHint(normalized),
    });
  }

  const redirectUri = resolveSocialRedirectUri(normalized, req);
  if (!redirectUri) {
    throw createHttpError(500, "The social sign-in redirect URL could not be resolved", {
      code: "SOCIAL_REDIRECT_URI_MISSING",
      hint: "Set APP_BASE_URL or the provider-specific redirect URI and try again.",
    });
  }

  return {
    ...getSocialProviderConfig(normalized),
    provider: normalized,
    redirectUri,
  };
}

function buildSocialStateToken(payload) {
  return jwt.sign(
    {
      provider: normalizeSocialProvider(payload && payload.provider),
      role: String(payload && payload.role || "buyer").trim().toLowerCase(),
      returnTo: String(payload && payload.returnTo || "").trim(),
      nonce: String(payload && payload.nonce || "").trim(),
      type: "social-auth-state",
    },
    jwtSecret,
    {
      expiresIn: "10m",
    }
  );
}

function verifySocialStateToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (_) {
    throw createHttpError(400, "Social sign-in session expired", {
      code: "SOCIAL_AUTH_STATE_INVALID",
      hint: "Start the social sign-in flow again from the auth page.",
    });
  }
}

function buildSocialAuthUrl(provider, options = {}) {
  const config = options.config || assertSocialProviderConfigured(provider, options.req);
  const state = String(options.state || "").trim();
  if (!state) {
    throw createHttpError(500, "Social sign-in state could not be created", {
      code: "SOCIAL_STATE_MISSING",
      hint: "Retry the sign-in flow from the auth page.",
    });
  }

  if (config.provider === "google") {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "select_account",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(","),
    state,
  });

  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return {
      raw: text,
    };
  }
}

function buildProviderExchangeError(provider, stage, hint) {
  const label = getSocialProviderLabel(provider);
  return createHttpError(502, `${label} sign-in could not be completed`, {
    code: `${provider.toUpperCase()}_${stage}`,
    hint,
  });
}

async function exchangeGoogleCodeForProfile(config, code) {
  try {
    const tokenBody = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
    });
    const tokenPayload = await parseJsonResponse(tokenResponse);
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw buildProviderExchangeError(
        "google",
        "TOKEN_EXCHANGE_FAILED",
        "Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
      );
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });
    const profilePayload = await parseJsonResponse(profileResponse);
    if (!profileResponse.ok || !profilePayload.sub) {
      throw buildProviderExchangeError(
        "google",
        "PROFILE_FETCH_FAILED",
        "Google returned a token, but the profile could not be read."
      );
    }

    if (profilePayload.email_verified === false) {
      throw createHttpError(400, "Google sign-in requires a verified email address", {
        code: "GOOGLE_EMAIL_NOT_VERIFIED",
        hint: "Verify the email address on the Google account or use email sign-in instead.",
      });
    }

    return {
      provider: "google",
      subject: String(profilePayload.sub || "").trim(),
      email: String(profilePayload.email || "").trim().toLowerCase(),
      fullName: String(profilePayload.name || "").trim(),
      avatarUrl: String(profilePayload.picture || "").trim(),
    };
  } catch (error) {
    if (error && error.statusCode) {
      throw error;
    }

    throw buildProviderExchangeError(
      "google",
      "NETWORK_FAILURE",
      "Google could not be reached from the server. Check outbound network access and retry."
    );
  }
}

async function exchangeFacebookCodeForProfile(config, code) {
  try {
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenPayload = await parseJsonResponse(tokenResponse);
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw buildProviderExchangeError(
        "facebook",
        "TOKEN_EXCHANGE_FAILED",
        "Check FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, and FACEBOOK_REDIRECT_URI."
      );
    }

    const profileParams = new URLSearchParams({
      access_token: tokenPayload.access_token,
      fields: "id,name,email,picture.width(240).height(240)",
    });
    const profileResponse = await fetch(
      `https://graph.facebook.com/me?${profileParams.toString()}`
    );
    const profilePayload = await parseJsonResponse(profileResponse);
    if (!profileResponse.ok || !profilePayload.id) {
      throw buildProviderExchangeError(
        "facebook",
        "PROFILE_FETCH_FAILED",
        "Facebook returned a token, but the profile could not be read."
      );
    }

    return {
      provider: "facebook",
      subject: String(profilePayload.id || "").trim(),
      email: String(profilePayload.email || "").trim().toLowerCase(),
      fullName: String(profilePayload.name || "").trim(),
      avatarUrl: String(
        profilePayload &&
        profilePayload.picture &&
        profilePayload.picture.data &&
        profilePayload.picture.data.url || ""
      ).trim(),
    };
  } catch (error) {
    if (error && error.statusCode) {
      throw error;
    }

    throw buildProviderExchangeError(
      "facebook",
      "NETWORK_FAILURE",
      "Facebook could not be reached from the server. Check outbound network access and retry."
    );
  }
}

async function exchangeSocialCodeForProfile(provider, options = {}) {
  const normalized = normalizeSocialProvider(provider);
  const config = options.config || assertSocialProviderConfigured(normalized, options.req);
  const code = String(options.code || "").trim();
  if (!code) {
    throw createHttpError(400, `${getSocialProviderLabel(normalized)} sign-in did not return a code`, {
      code: "SOCIAL_AUTH_CODE_MISSING",
      hint: "Start the social sign-in flow again from the auth page.",
    });
  }

  if (normalized === "google") {
    return exchangeGoogleCodeForProfile(config, code);
  }

  return exchangeFacebookCodeForProfile(config, code);
}

module.exports = {
  assertSocialProviderConfigured,
  buildSocialAuthUrl,
  buildSocialConfigurationHint,
  buildSocialStateToken,
  exchangeSocialCodeForProfile,
  getSocialProviderLabel,
  isSocialProviderConfigured,
  normalizeSocialProvider,
  resolveSocialRedirectUri,
  verifySocialStateToken,
};
