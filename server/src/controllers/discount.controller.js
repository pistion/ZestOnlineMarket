const { sendSuccess } = require("../utils/api-response");
const {
  createSellerDiscount,
  listSellerDiscounts,
  updateSellerDiscount,
  validateDiscountForCheckout,
} = require("../services/discount.service");

async function getSellerDiscounts(req, res, next) {
  try {
    const payload = await listSellerDiscounts(req.user);
    return sendSuccess(res, payload, "Seller discounts loaded");
  } catch (error) {
    return next(error);
  }
}

async function postSellerDiscount(req, res, next) {
  try {
    const discount = await createSellerDiscount(req.user, req.body || {});
    return sendSuccess(res, { discount }, "Discount created", 201);
  } catch (error) {
    return next(error);
  }
}

async function patchSellerDiscount(req, res, next) {
  try {
    const discount = await updateSellerDiscount(req.user, req.params.discountId, req.body || {});
    return sendSuccess(res, { discount }, "Discount updated");
  } catch (error) {
    return next(error);
  }
}

async function postDiscountValidate(req, res, next) {
  try {
    const preview = await validateDiscountForCheckout(req.user, req.body && req.body.code);
    return sendSuccess(res, { preview }, "Discount preview loaded");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSellerDiscounts,
  patchSellerDiscount,
  postDiscountValidate,
  postSellerDiscount,
};
