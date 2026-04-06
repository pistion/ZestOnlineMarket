const legacy = require("../internal/buyer.repository.legacy");

module.exports = {
  createBuyerAddress: legacy.createBuyerAddress,
  deleteBuyerAddress: legacy.deleteBuyerAddress,
  listBuyerAddresses: legacy.listBuyerAddresses,
  updateBuyerAddress: legacy.updateBuyerAddress,
};
