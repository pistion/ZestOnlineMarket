const {
  appEnv,
  databaseUrl,
  dbPoolMax,
  dbPoolMin,
  dbSslEnabled,
  dbSslMode,
  dbSslRejectUnauthorized,
  pgConfig,
} = require("../../config/env");

function parseBooleanFlag(value) {
  if (value == null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeSslMode(value) {
  return String(value || "").trim().toLowerCase();
}

function safeParseConnectionUrl(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch (_) {
    return null;
  }
}

function isLocalHost(host) {
  const normalized = String(host || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".local")
  );
}

function resolvePgSslConfig(options = {}) {
  const connectionString = options.connectionString ?? databaseUrl;
  const parsedUrl = safeParseConnectionUrl(connectionString);
  const host = options.host || (parsedUrl && parsedUrl.hostname) || pgConfig.host;
  const normalizedSslMode = normalizeSslMode(
    options.sslMode ||
      dbSslMode ||
      (parsedUrl && parsedUrl.searchParams.get("sslmode")) ||
      ""
  );
  const explicitSsl = parseBooleanFlag(
    options.sslEnabled == null ? dbSslEnabled : options.sslEnabled
  );
  const querySsl = parsedUrl
    ? parseBooleanFlag(parsedUrl.searchParams.get("ssl"))
    : null;

  if (explicitSsl === false || normalizedSslMode === "disable") {
    return false;
  }

  const strictSslMode = normalizedSslMode === "verify-ca" || normalizedSslMode === "verify-full";
  const requiredSslMode = normalizedSslMode === "require" || strictSslMode;
  const shouldUseRemoteSslByDefault =
    String(options.appEnv || appEnv) !== "local" && !isLocalHost(host);
  const shouldUseSsl =
    explicitSsl === true || querySsl === true || requiredSslMode || shouldUseRemoteSslByDefault;

  if (!shouldUseSsl) {
    return false;
  }

  return {
    rejectUnauthorized:
      strictSslMode ||
      Boolean(
        options.rejectUnauthorized == null
          ? dbSslRejectUnauthorized
          : options.rejectUnauthorized
      ),
  };
}

function buildConnectionConfig() {
  const ssl = resolvePgSslConfig();
  if (databaseUrl) {
    return ssl
      ? {
          connectionString: databaseUrl,
          ssl,
        }
      : {
          connectionString: databaseUrl,
        };
  }

  return ssl
    ? {
        ...pgConfig,
        ssl,
      }
    : {
        ...pgConfig,
      };
}

function buildPoolConfig() {
  return {
    min: dbPoolMin,
    max: dbPoolMax,
  };
}

function resolveKnexEnvironment(value = appEnv) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "production") {
    return "production";
  }
  if (normalized === "staging") {
    return "staging";
  }

  return "development";
}

module.exports = {
  buildConnectionConfig,
  buildPoolConfig,
  normalizeSslMode,
  parseBooleanFlag,
  resolveKnexEnvironment,
  resolvePgSslConfig,
};
