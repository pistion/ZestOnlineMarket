const { renderErrorPage } = require("../controllers/page.controller");
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
  const statusCode = error.status || 500;
  const safeMessage =
    statusCode >= 500 ? "Internal server error" : error.message || "Request failed";

  if (statusCode >= 500) {
    logError("request.error", {
      requestId: req.requestId || "",
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      message: error && error.message ? error.message : "Internal server error",
      stack: error && error.stack ? error.stack : "",
    });
  }

  if (wantsJson(req)) {
    return res.status(statusCode).json({
      success: false,
      message: safeMessage,
      requestId: req.requestId || "",
    });
  }

  return renderErrorPage(req, res, statusCode, error);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
