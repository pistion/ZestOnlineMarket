const { groupCartItems, summarizeValidatedItems } = require("../../server/src/services/cart.service");

describe("cart service helpers", () => {
  it("summarizes only ready items into checkout totals", () => {
    const summary = summarizeValidatedItems([
      {
        status: "ready",
        quantity: 2,
        lineSubtotal: 40,
        lineTax: 4,
        shippingAmount: 5,
        lineTotal: 49,
        storeId: 1,
      },
      {
        status: "invalid",
        quantity: 1,
        lineSubtotal: 12,
        lineTax: 1.2,
        shippingAmount: 0,
        lineTotal: 13.2,
        storeId: 1,
      },
    ]);

    expect(summary).toMatchObject({
      subtotalAmount: 40,
      taxAmount: 4,
      shippingAmount: 5,
      totalAmount: 49,
      itemCount: 2,
      lineItemCount: 1,
      readyItemCount: 1,
      invalidItemCount: 1,
      uniqueStoreCount: 1,
    });
  });

  it("groups items by store and flags invalid checkout groups", () => {
    const groups = groupCartItems([
      {
        id: 1,
        storeId: 10,
        storeName: "North Market",
        storeHandle: "north-market",
        storePath: "/stores/north-market",
        status: "ready",
        quantity: 1,
        lineSubtotal: 20,
        lineTax: 2,
        shippingAmount: 4,
        lineTotal: 26,
      },
      {
        id: 2,
        storeId: 11,
        storeName: "South Market",
        storeHandle: "south-market",
        storePath: "/stores/south-market",
        status: "invalid",
        quantity: 1,
        lineSubtotal: 15,
        lineTax: 1.5,
        shippingAmount: 0,
        lineTotal: 16.5,
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].store.storeName).toBe("North Market");
    expect(groups[0].hasCheckoutIssues).toBe(false);
    expect(groups[1].hasCheckoutIssues).toBe(true);
  });
});
