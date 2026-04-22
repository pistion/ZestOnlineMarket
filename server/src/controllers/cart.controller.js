const { sendSuccess } = require("../utils/api-response");
const {
  addBuyerCartItem,
  clearBuyerCart,
  getBuyerCartWorkspace,
  removeBuyerCartItem,
  updateBuyerCartItemQuantity,
} = require("../services/cart.service");

async function getCart(req, res, next) {
  try {
    const payload = await getBuyerCartWorkspace(req.user);
    return sendSuccess(res, payload, "Cart loaded");
  } catch (error) {
    return next(error);
  }
}

async function postCartItem(req, res, next) {
  try {
    const payload = await addBuyerCartItem(req.user, req.body || {});
    return sendSuccess(res, payload, "Item added to cart", 201);
  } catch (error) {
    return next(error);
  }
}

async function patchCartItem(req, res, next) {
  try {
    const payload = await updateBuyerCartItemQuantity(req.user, req.params.itemId, req.body || {});
    return sendSuccess(res, payload, "Cart item updated");
  } catch (error) {
    return next(error);
  }
}

async function destroyCartItem(req, res, next) {
  try {
    const payload = await removeBuyerCartItem(req.user, req.params.itemId);
    return sendSuccess(res, payload, "Cart item removed");
  } catch (error) {
    return next(error);
  }
}

async function destroyCart(req, res, next) {
  try {
    const payload = await clearBuyerCart(req.user);
    return sendSuccess(res, payload, "Cart cleared");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  destroyCart,
  destroyCartItem,
  getCart,
  patchCartItem,
  postCartItem,
};
