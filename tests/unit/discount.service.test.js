const {
  calculateDiscountAmount,
  isDiscountAvailable,
  validateDiscountAgainstGroup,
} = require("../../server/src/services/discount.service");

describe("discount service helpers", () => {
  it("calculates percentage, fixed, and free-shipping discounts", () => {
    expect(calculateDiscountAmount({ discountType: "percentage", amount: 10 }, 200, 15)).toBe(20);
    expect(calculateDiscountAmount({ discountType: "fixed", amount: 25 }, 200, 15)).toBe(25);
    expect(calculateDiscountAmount({ discountType: "free_shipping", amount: 0 }, 200, 15)).toBe(15);
  });

  it("detects inactive and exhausted discounts", () => {
    expect(isDiscountAvailable({ active: true, useCount: 1, maxUses: 2 }, new Date("2026-04-08T00:00:00.000Z"))).toBe(true);
    expect(isDiscountAvailable({ active: false }, new Date("2026-04-08T00:00:00.000Z"))).toBe(false);
    expect(isDiscountAvailable({ active: true, useCount: 2, maxUses: 2 }, new Date("2026-04-08T00:00:00.000Z"))).toBe(false);
  });

  it("rejects discounts that do not apply to the active store group", () => {
    expect(() =>
      validateDiscountAgainstGroup(
        {
          id: 1,
          active: true,
          storeId: 99,
          discountType: "percentage",
          amount: 10,
          minOrderAmount: 0,
        },
        {
          store: { id: 12 },
          subtotalAmount: 100,
          shippingAmount: 0,
        }
      )
    ).toThrow(/does not apply/);
  });
});
