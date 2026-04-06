const express = require("express");

const {
  getSandboxBuyerProfile,
  renderSandboxBuyerProfilePage,
} = require("../controllers/sandbox.controller");

const router = express.Router();

router.get("/api/sandbox/buyer-profile", getSandboxBuyerProfile);
router.get("/sandbox/buyer-profile", renderSandboxBuyerProfilePage);

module.exports = router;
