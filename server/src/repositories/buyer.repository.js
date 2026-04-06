module.exports = {
  ...require("./buyer/profile.repository"),
  ...require("./buyer/address.repository"),
  ...require("./buyer/following.repository"),
  ...require("./buyer/wishlist.repository"),
  ...require("./buyer/activity.repository"),
};
