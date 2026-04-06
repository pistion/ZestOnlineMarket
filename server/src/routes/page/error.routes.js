const express = require("express");
const { renderPage } = require("../../controllers/page.controller");

function registerErrorRoutes(router = express.Router()) {
  router.get("/errors/400", renderPage("error400"));
  router.get("/errors/401", renderPage("error401"));
  router.get("/errors/403", renderPage("error403"));
  router.get("/errors/404", renderPage("error404"));
  router.get("/errors/429", renderPage("error429"));
  router.get("/errors/500", renderPage("error500"));
  router.get("/errors/502", renderPage("error502"));
  router.get("/errors/503", renderPage("error503"));
  router.get("/errors/504", renderPage("error504"));
  return router;
}

module.exports = {
  registerErrorRoutes,
};
