const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/env");
const { createUser, findUserByEmail } = require("../repositories/user.repository");
const {
  resolveAuthenticatedAppState,
  resolveBuyerSetupPath,
  resolveRoleAwareReturnPath,
} = require("../services/account-routing.service");
const { sendSuccess } = require("../utils/api-response");
const {
  appendResponseCookie,
  buildAuthCookie,
  buildClearedAuthCookie,
  buildClearedCsrfCookie,
  normalizeInternalPath,
} = require("../utils/auth-session");
const { validateAuthPayload } = require("../utils/request-validation");

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
    const { email, password, role } = validateAuthPayload(req.body, "register");
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      password: hashedPassword,
      role,
    });
    const token = signToken(user);
    const appState = await resolveAuthenticatedAppState(user);
    const returnTo = normalizeInternalPath(req.body && req.body.returnTo, "");
    const redirectTo =
      user.role === "buyer"
        ? resolveBuyerSetupPath()
        : resolveRoleAwareReturnPath(user.role, returnTo, appState.redirectTo);

    appendResponseCookie(res, buildAuthCookie(token));

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
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = validateAuthPayload(req.body, "login");
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken(user);
    const appState = await resolveAuthenticatedAppState(user);
    const returnTo = normalizeInternalPath(req.body && req.body.returnTo, "");
    const requestedRole = normalizeIntentRole(req.body && req.body.intentRole);
    const isRoleMismatch = Boolean(requestedRole && requestedRole !== user.role);
    const redirectTo = resolveRoleAwareReturnPath(user.role, returnTo, appState.redirectTo);
    appendResponseCookie(res, buildAuthCookie(token));

    return sendSuccess(
      res,
      buildAuthResult(user, token, appState, redirectTo, isRoleMismatch),
      isRoleMismatch ? "Role mismatch detected" : "Login successful"
    );
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  appendResponseCookie(res, buildClearedAuthCookie());
  appendResponseCookie(res, buildClearedCsrfCookie());
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
  login,
  logout,
  register,
};
