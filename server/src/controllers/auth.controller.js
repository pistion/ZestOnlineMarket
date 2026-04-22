const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { transaction } = require("../config/db");
const { jwtSecret } = require("../config/env");
const { createUser, findUserByEmail } = require("../repositories/user.repository");
const {
  resolveAuthenticatedAppState,
  resolveBuyerSetupPath,
  resolveRoleAwareReturnPath,
} = require("../services/account-routing.service");
const { sendTemplateMail } = require("../services/email.service");
const { createHttpError, sendSuccess } = require("../utils/api-response");
const {
  appendResponseCookie,
  buildAuthCookie,
  buildClearedAuthCookie,
  buildClearedCsrfCookie,
  normalizeInternalPath,
} = require("../utils/auth-session");

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
    const { email, password, role, returnTo } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { appState, user } = await transaction(async (txContext) => {
      const repoOptions = {
        transaction: txContext,
      };
      const createdUser = await createUser(
        {
          email,
          password: hashedPassword,
          role,
        },
        repoOptions
      );
      const nextAppState = await resolveAuthenticatedAppState(createdUser, repoOptions);

      return {
        appState: nextAppState,
        user: createdUser,
      };
    });
    const token = signToken(user);
    const safeReturnTo = normalizeInternalPath(returnTo, "");
    const redirectTo =
      user.role === "buyer"
        ? resolveBuyerSetupPath()
        : resolveRoleAwareReturnPath(user.role, safeReturnTo, appState.redirectTo);

    appendResponseCookie(res, buildAuthCookie(token));
    await sendTemplateMail({
      to: user.email,
      subject: "Welcome to Zest Market",
      template: "welcome",
      data: {
        email: user.email,
        role: user.role,
        redirectTo,
      },
    });

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
      return next(
        createHttpError(400, "Email already exists", {
          code: "EMAIL_TAKEN",
        })
      );
    }

    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, intentRole, returnTo } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      throw createHttpError(401, "Invalid email or password", {
        code: "INVALID_CREDENTIALS",
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw createHttpError(401, "Invalid email or password", {
        code: "INVALID_CREDENTIALS",
      });
    }

    const token = signToken(user);
    const appState = await resolveAuthenticatedAppState(user);
    const safeReturnTo = normalizeInternalPath(returnTo, "");
    const requestedRole = normalizeIntentRole(intentRole);
    const isRoleMismatch = Boolean(requestedRole && requestedRole !== user.role);
    const redirectTo = resolveRoleAwareReturnPath(user.role, safeReturnTo, appState.redirectTo);
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
