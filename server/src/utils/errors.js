function normalizeStatusCode(value, fallback = 500) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 400 || parsed > 599) {
    return fallback;
  }

  return parsed;
}

function defaultErrorCode(statusCode) {
  if (statusCode >= 500) {
    return "INTERNAL_ERROR";
  }
  if (statusCode === 404) {
    return "NOT_FOUND";
  }
  if (statusCode === 401) {
    return "UNAUTHORIZED";
  }
  if (statusCode === 403) {
    return "FORBIDDEN";
  }
  if (statusCode === 409) {
    return "CONFLICT";
  }

  return "BAD_REQUEST";
}

class AppError extends Error {
  constructor(statusCode, code, message, options = {}) {
    super(message || "Request failed");

    this.name = "AppError";
    this.statusCode = normalizeStatusCode(statusCode, 500);
    this.status = this.statusCode;
    this.code = code || defaultErrorCode(this.statusCode);
    this.details = options.details || null;
    this.hint = options.hint || "";
    this.expose = options.expose ?? this.statusCode < 500;
    this.isOperational = options.isOperational ?? true;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, AppError);
  }
}

function createAppError(statusCode, message, options = {}) {
  return new AppError(statusCode, options.code, message, options);
}

function formatValidationIssues(error) {
  const issues = Array.isArray(error && error.issues) ? error.issues : [];
  return issues.map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join(".") : "",
    message: issue.message || "Invalid value",
    code: issue.code || "invalid",
  }));
}

function createValidationError(message = "Request validation failed", details = [], options = {}) {
  return createAppError(400, message, {
    code: options.code || "VALIDATION_ERROR",
    details,
    cause: options.cause,
    expose: true,
    isOperational: true,
  });
}

function isZodLikeError(error) {
  return Boolean(error && error.name === "ZodError" && Array.isArray(error.issues));
}

function createValidationErrorFromZod(error, options = {}) {
  const details = formatValidationIssues(error);
  const message = options.message || details[0]?.message || "Request validation failed";
  return createValidationError(message, details, {
    ...options,
    cause: options.cause || error,
  });
}

function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  AppError,
  createAppError,
  createValidationError,
  createValidationErrorFromZod,
  formatValidationIssues,
  isAppError,
  isZodLikeError,
};
