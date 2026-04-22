const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..", "..");
const projectRoot = path.resolve(serverRoot, "..");
const envFile = path.join(projectRoot, ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] != null) {
      return;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

function parseList(value, fallback = []) {
  if (!value) {
    return fallback.slice();
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeAppEnv(value, fallback = "local") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "development" || normalized === "dev" || normalized === "local" || normalized === "test") {
    return "local";
  }

  if (normalized === "staging" || normalized === "production") {
    return normalized;
  }

  return fallback;
}

loadEnvFile(envFile);

const appEnv = normalizeAppEnv(process.env.APP_ENV || process.env.NODE_ENV, "local");
const isProduction = appEnv === "production";
const jwtSecret =
  process.env.JWT_SECRET ||
  (isProduction ? "" : crypto.randomBytes(32).toString("hex"));
const allowedOrigins = parseList(process.env.ALLOWED_ORIGINS, [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

if (!jwtSecret) {
  throw new Error(
    "JWT_SECRET is required. Add it to your environment or create a local .env in the app root."
  );
}

const dbProvider = String(process.env.DB_PROVIDER || "postgres").trim().toLowerCase();
if (dbProvider && dbProvider !== "postgres") {
  throw new Error("Live runtime requires DB_PROVIDER=postgres.");
}

const paths = {
  envFile,
  projectRoot,
  serverRoot,
  publicDir: path.join(projectRoot, "public"),
  fixturesDir: path.join(projectRoot, "fixtures"),
  uploadsDir: path.join(projectRoot, "storage", "uploads"),
  viewsDir: path.join(serverRoot, "views"),
};

module.exports = {
  appEnv,
  isProduction,
  jwtSecret,
  port: parseNumber(process.env.PORT, 3000),
  jsonLimit: process.env.JSON_LIMIT || "12mb",
  allowedOrigins,
  enableDemoStalls: parseBoolean(process.env.ENABLE_DEMO_STALLS, true),
  csrfEnabled: parseBoolean(process.env.CSRF_ENABLED, true),
  csrfHeaderName: String(process.env.CSRF_HEADER_NAME || "x-csrf-token").trim().toLowerCase(),
  requestLoggingEnabled: parseBoolean(process.env.REQUEST_LOGGING_ENABLED, true),
  authRateLimitWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitMaxLogin: parseNumber(process.env.AUTH_RATE_LIMIT_MAX_LOGIN, 8),
  authRateLimitMaxRegister: parseNumber(process.env.AUTH_RATE_LIMIT_MAX_REGISTER, 4),
  writeRateLimitWindowMs: parseNumber(process.env.WRITE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  writeRateLimitMax: parseNumber(process.env.WRITE_RATE_LIMIT_MAX, 40),
  sellerWriteRateLimitWindowMs: parseNumber(process.env.SELLER_WRITE_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  sellerWriteRateLimitMax: parseNumber(process.env.SELLER_WRITE_RATE_LIMIT_MAX, 60),
  orderRateLimitWindowMs: parseNumber(process.env.ORDER_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  orderRateLimitMax: parseNumber(process.env.ORDER_RATE_LIMIT_MAX, 6),
  reportRateLimitWindowMs: parseNumber(process.env.REPORT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  reportRateLimitMax: parseNumber(process.env.REPORT_RATE_LIMIT_MAX, 6),
  featureSearchEnabled: parseBoolean(process.env.FEATURE_SEARCH, true),
  featureReviewsEnabled: parseBoolean(process.env.FEATURE_REVIEWS, true),
  featureDiscountsEnabled: parseBoolean(process.env.FEATURE_DISCOUNTS, true),
  featureAdminEnabled: parseBoolean(process.env.FEATURE_ADMIN, true),
  databaseUrl: String(process.env.DATABASE_URL || "").trim(),
  appBaseUrl: normalizeBaseUrl(process.env.APP_BASE_URL),
  dbRunMigrationsOnStartup: parseBoolean(
    process.env.DB_RUN_MIGRATIONS_ON_STARTUP,
    appEnv !== "local"
  ),
  dbConnectRetries: parseNumber(process.env.DB_CONNECT_RETRIES, appEnv === "local" ? 0 : 6),
  dbConnectRetryDelayMs: parseNumber(process.env.DB_CONNECT_RETRY_DELAY_MS, 2000),
  dbPoolMin: parseNumber(process.env.DB_POOL_MIN, isProduction ? 2 : 0),
  dbPoolMax: parseNumber(process.env.DB_POOL_MAX, isProduction ? 12 : 10),
  dbSslEnabled: String(process.env.DB_SSL || "").trim(),
  dbSslMode: String(process.env.PGSSLMODE || process.env.DB_SSL_MODE || "").trim().toLowerCase(),
  dbSslRejectUnauthorized: parseBoolean(
    process.env.DB_SSL_REJECT_UNAUTHORIZED,
    false
  ),
  storageProvider: String(process.env.STORAGE_PROVIDER || "local").trim().toLowerCase(),
  s3Bucket: String(process.env.S3_BUCKET || "").trim(),
  s3Region: String(process.env.S3_REGION || "").trim(),
  s3BaseUrl: String(process.env.S3_BASE_URL || "").trim(),
  smtpHost: String(process.env.SMTP_HOST || "").trim(),
  smtpPort: parseNumber(process.env.SMTP_PORT, 1025),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: String(process.env.SMTP_USER || "").trim(),
  smtpPass: String(process.env.SMTP_PASS || "").trim(),
  smtpFrom: String(process.env.SMTP_FROM || "Zest Market <no-reply@zest.local>").trim(),
  googleClientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
  googleClientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
  googleRedirectUri: normalizeBaseUrl(process.env.GOOGLE_REDIRECT_URI),
  facebookClientId: String(process.env.FACEBOOK_CLIENT_ID || "").trim(),
  facebookClientSecret: String(process.env.FACEBOOK_CLIENT_SECRET || "").trim(),
  facebookRedirectUri: normalizeBaseUrl(process.env.FACEBOOK_REDIRECT_URI),
  pgConfig: {
    host: process.env.PGHOST || "127.0.0.1",
    port: parseNumber(process.env.PGPORT, 5432),
    database: process.env.PGDATABASE || "zest_online_market",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
  },
  paths,
};
