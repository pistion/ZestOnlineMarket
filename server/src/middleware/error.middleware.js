const { renderErrorPage } = require("../controllers/page.controller");
const {
  createValidationErrorFromZod,
  isAppError,
  isZodLikeError,
} = require("../utils/errors");
const { logError } = require("../utils/logger");

function wantsJson(req) {
  const accepts = req.accepts(["html", "json"]);
  return (
    req.path.startsWith("/api/") ||
    (req.path.startsWith("/auth/") && req.method !== "GET") ||
    accepts === "json"
  );
}

function notFoundHandler(req, res) {
  if (wantsJson(req)) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
      requestId: req.requestId || "",
    });
  }

  return renderErrorPage(req, res, 404);
}

function errorHandler(error, req, res, next) {
  const normalizedError = isZodLikeError(error) ? createValidationErrorFromZod(error) : error;
  const statusCode = normalizedError.statusCode || normalizedError.status || 500;
  const safeMessage =
    statusCode >= 500
      ? "Internal server error"
      : normalizedError.message || "Request failed";

  if (statusCode >= 500) {
    logError("request.error", {
      requestId: req.requestId || "",
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      code: normalizedError && normalizedError.code ? normalizedError.code : "INTERNAL_ERROR",
      message: normalizedError && normalizedError.message ? normalizedError.message : "Internal server error",
      stack: normalizedError && normalizedError.stack ? normalizedError.stack : "",
    });
  }

  if (wantsJson(req)) {
    const payload = {
      success: false,
      message: safeMessage,
      requestId: req.requestId || "",
    };

    if (statusCode < 500) {
      payload.code =
        normalizedError && normalizedError.code
          ? normalizedError.code
          : isAppError(normalizedError)
            ? normalizedError.code
            : "REQUEST_FAILED";
      if (normalizedError && normalizedError.details) {
        payload.details = normalizedError.details;
      }
    }

    return res.status(statusCode).json(payload);
  }

  return renderErrorPage(req, res, statusCode, normalizedError);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
