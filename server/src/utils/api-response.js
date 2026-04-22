const { createAppError } = require("./errors");

function sendSuccess(res, payload = {}, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...payload,
  });
}

function createHttpError(status, message, options = {}) {
  return createAppError(status, message, options);
}

module.exports = {
  createHttpError,
  sendSuccess,
};
