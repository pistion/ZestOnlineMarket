const legacy = require("../internal/buyer.repository.legacy");

module.exports = {
  addBuyerWishlistItem: legacy.addBuyerWishlistItem,
  listBuyerWishlist: legacy.listBuyerWishlist,
  removeBuyerWishlistItem: legacy.removeBuyerWishlistItem,
};
