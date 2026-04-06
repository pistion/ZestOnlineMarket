const legacy = require("../internal/buyer.repository.legacy");

module.exports = {
  createBuyerProfileForUser: legacy.createBuyerProfileForUser,
  ensureBuyerProfileByUserId: legacy.ensureBuyerProfileByUserId,
  findBuyerPreferencesByUserId: legacy.findBuyerPreferencesByUserId,
  findBuyerProfileByUserId: legacy.findBuyerProfileByUserId,
  getBuyerDomainSnapshot: legacy.getBuyerDomainSnapshot,
  saveBuyerProfileSetup: legacy.saveBuyerProfileSetup,
  updateBuyerSettings: legacy.updateBuyerSettings,
};
