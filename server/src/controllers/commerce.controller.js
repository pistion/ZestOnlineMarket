const { buildPage, renderPage } = require("./page.controller");
const { createHttpError, sendSuccess } = require("../utils/api-response");
const {
  buildCheckoutPreview,
  buildSellerOrdersWorkspace,
  createBuyerOrder,
  getBuyerOrderForUser,
  getSellerOrderForUser,
  listBuyerOrdersForUser,
  updateSellerOrderLifecycle,
} = require("../services/commerce.service");

async function getBuyerCheckoutSummary(req, res, next) {
  try {
    const summary = await buildCheckoutPreview(req.user, req.query || {});
    return sendSuccess(res, summary, "Checkout summary loaded");
  } catch (error) {
    return next(error);
  }
}

async function postBuyerCheckoutOrder(req, res, next) {
  try {
    const order = await createBuyerOrder(req.user, req.body || {});
    return sendSuccess(
      res,
      {
        order,
        redirectTo: order ? `/buyer/purchases/${order.id}` : "/buyer/purchases",
      },
      "Order created successfully",
      201
    );
  } catch (error) {
    return next(error);
  }
}

async function getBuyerOrders(req, res, next) {
  try {
    const payload = await listBuyerOrdersForUser(req.user);
    return sendSuccess(res, payload, "Buyer orders loaded");
  } catch (error) {
    return next(error);
  }
}

async function getBuyerOrderDetail(req, res, next) {
  try {
    const order = await getBuyerOrderForUser(req.user, req.params.orderId);
    if (!order) {
      throw createHttpError(404, "Order not found");
    }
    return sendSuccess(res, { order }, "Buyer order loaded");
  } catch (error) {
    return next(error);
  }
}

async function getSellerOrders(req, res, next) {
  try {
    const payload = await buildSellerOrdersWorkspace(req.user);
    return sendSuccess(res, payload, "Seller orders loaded");
  } catch (error) {
    return next(error);
  }
}

async function getSellerOrderDetail(req, res, next) {
  try {
    const order = await getSellerOrderForUser(req.user, req.params.orderId);
    if (!order) {
      throw createHttpError(404, "Order not found");
    }
    return sendSuccess(res, { order }, "Seller order loaded");
  } catch (error) {
    return next(error);
  }
}

async function patchSellerOrder(req, res, next) {
  try {
    const order = await updateSellerOrderLifecycle(req.user, req.params.orderId, req.body || {});
    if (!order) {
      throw createHttpError(404, "Order not found");
    }
    return sendSuccess(res, { order }, "Order updated");
  } catch (error) {
    return next(error);
  }
}

const renderBuyerOrdersPage = renderPage("buyerOrders");
const renderSellerOrdersPage = renderPage("sellerOrders");

function renderBuyerOrderDetailPage(req, res) {
  return res.render("layout", {
    page: buildPage("buyerOrderDetail", {
      bodyAttrs: {
        "buyer-order-id": String(req.params.orderId || ""),
      },
    }),
    flash: res.locals.flash,
  });
}

module.exports = {
  getBuyerCheckoutSummary,
  getBuyerOrderDetail,
  getBuyerOrders,
  getSellerOrderDetail,
  getSellerOrders,
  patchSellerOrder,
  postBuyerCheckoutOrder,
  renderBuyerOrderDetailPage,
  renderBuyerOrdersPage,
  renderSellerOrdersPage,
};
