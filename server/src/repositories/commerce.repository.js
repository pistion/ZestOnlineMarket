module.exports = {
  ...require("./commerce/orders.repository"),
  ...require("./commerce/inventory.repository"),
  ...require("./commerce/metrics.repository"),
};
