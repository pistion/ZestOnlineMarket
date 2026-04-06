function sendSuccess(res, payload = {}, message = "OK", statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...payload,
  });
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  createHttpError,
  sendSuccess,
};
