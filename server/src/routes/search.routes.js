const express = require("express");

const { getSearchResults } = require("../controllers/search.controller");
const { searchQuerySchema } = require("../schemas/search.schema");
const { validate } = require("../utils/validate");

const router = express.Router();

router.get("/", validate({ query: searchQuerySchema }), getSearchResults);

module.exports = router;
