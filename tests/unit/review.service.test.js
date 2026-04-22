const { resolveReviewViewer } = require("../../server/src/services/review.service");

describe("review service helpers", () => {
  it("returns a safe viewer state for guests", async () => {
    const viewer = await resolveReviewViewer(null, 12);

    expect(viewer).toEqual({
      signedIn: false,
      role: "",
      canReview: false,
      hasDeliveredPurchase: false,
      hasReviewed: false,
      reviewId: null,
    });
  });

  it("returns a safe viewer state for non-buyer roles", async () => {
    const viewer = await resolveReviewViewer({ id: 1, role: "seller" }, 12);

    expect(viewer).toEqual({
      signedIn: true,
      role: "seller",
      canReview: false,
      hasDeliveredPurchase: false,
      hasReviewed: false,
      reviewId: null,
    });
  });
});
