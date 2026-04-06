const {
  resolveAuthenticatedAppState,
  resolveRoleAwareReturnPath,
} = require("../services/account-routing.service");
const { normalizeInternalPath } = require("../utils/auth-session");

function shouldBypassAuthRedirect(req) {
  const switchMode = String(req.query.switch || "").trim();
  const forceMode = String(req.query.force || "").trim();
  return switchMode === "1" || forceMode === "1";
}

async function redirectAuthenticatedAppUser(req, res, next) {
  const user = req.user || res.locals.currentUser || null;
  if (!user || shouldBypassAuthRedirect(req)) {
    return next();
  }

  try {
    const appState = await resolveAuthenticatedAppState(user);
    const returnTo = normalizeInternalPath(req.query.returnTo || "", "");
    return res.redirect(302, resolveRoleAwareReturnPath(user.role, returnTo, appState.redirectTo));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  redirectAuthenticatedAppUser,
};
