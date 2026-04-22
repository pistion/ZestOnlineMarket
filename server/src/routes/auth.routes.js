const express = require("express");

const {
  authRateLimitMaxLogin,
  authRateLimitMaxRegister,
  authRateLimitWindowMs,
} = require("../config/env");
const { loginBodySchema, registerBodySchema } = require("../schemas/auth.schema");
const { login, logout, register } = require("../controllers/auth.controller");
const { createRateLimiter } = require("../middleware/rate-limit.middleware");
const { validate } = require("../utils/validate");

const router = express.Router();
const authKeyGenerator = (req) => {
  const email = String(req.body && req.body.email || "")
    .trim()
    .toLowerCase();
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
  return `${email || "anonymous"}:${ip}`;
};

router.post(
  "/register",
  createRateLimiter({
    scope: "auth-register",
    windowMs: authRateLimitWindowMs,
    max: authRateLimitMaxRegister,
    message: "Too many registration attempts. Please try again later.",
    keyGenerator: authKeyGenerator,
  }),
  validate(registerBodySchema),
  register
);
router.post(
  "/login",
  createRateLimiter({
    scope: "auth-login",
    windowMs: authRateLimitWindowMs,
    max: authRateLimitMaxLogin,
    message: "Too many sign-in attempts. Please try again later.",
    keyGenerator: authKeyGenerator,
  }),
  validate(loginBodySchema),
  login
);
router.post("/logout", logout);
router.get("/logout", logout);

module.exports = router;
