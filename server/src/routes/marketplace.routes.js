const express = require("express");

const { getMarketplaceStalls } = require("../controllers/marketplace.controller");

const router = express.Router();

router.get("/stalls", getMarketplaceStalls);

module.exports = router;
