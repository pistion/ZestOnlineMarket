const { sanitizeSearchQuery } = require("../../server/src/services/search.service");

describe("search service helpers", () => {
  it("builds a tsquery string from free-text user input", () => {
    expect(sanitizeSearchQuery("  React storefront builder  ")).toBe("react:* & storefront:* & builder:*");
  });

  it("deduplicates tokens and strips unsupported punctuation", () => {
    expect(sanitizeSearchQuery("React, react!! API/API")).toBe("react:* & api:*");
  });

  it("returns an empty query for empty input", () => {
    expect(sanitizeSearchQuery("   ")).toBe("");
  });
});
