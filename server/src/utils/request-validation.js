module.exports = {
  ...require("../domains/auth/auth.validation"),
  ...require("../domains/art/art.validation"),
  ...require("../domains/buyer/buyer.validation"),
  ...require("../domains/store/store.validation"),
  ...require("../domains/product/product.validation"),
  ...require("../domains/feed/feed.validation"),
  ...require("../domains/engagement/engagement.validation"),
  ...require("../domains/reporting/report.validation"),
  ...require("../domains/commerce/order.validation"),
};
