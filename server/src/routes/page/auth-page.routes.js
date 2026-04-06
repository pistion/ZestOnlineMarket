const express = require("express");
const { renderAuthPage } = require("../../controllers/page.controller");

function registerAuthPageRoutes(router = express.Router()) {
  router.get("/auth/signin", renderAuthPage("signin", "signin"));
  router.get("/auth/signup", renderAuthPage("signup", "signup"));
  return router;
}

module.exports = {
  registerAuthPageRoutes,
};
