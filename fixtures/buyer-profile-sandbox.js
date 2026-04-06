function createBuyerProfileSandboxPayload() {
  const now = Date.now();

  return {
    stage: "sandbox-buyer-profile",
    account: {
      id: "sandbox-buyer-01",
      email: "samira.badu@zest.test",
      role: "buyer",
    },
    profile: {
      displayName: "Samira Badu",
      fullName: "Samira Badu",
      email: "samira.badu@zest.test",
      bio: "Sandbox buyer persona used to test the buyer dashboard UI before changes land in the live project.",
      avatarUrl: "",
    },
    stats: {
      purchases: 3,
      wishlist: 4,
      following: 5,
      savedStores: 5,
    },
    insights: {
      personalizedFeed: true,
      summary:
        "This sandbox is seeded with followed-store activity, saved listings, and recommendation cards so you can test layout states quickly.",
      badges: [
        "Sandbox profile",
        "Followed-store heavy",
        "Recommendation rich",
        "Read-only dataset",
      ],
      highlights: [
        {
          label: "Top category",
          value: "Handmade goods",
          meta: "Used to preview recommendation and feed density.",
          tone: "positive",
        },
        {
          label: "Strongest signal",
          value: "Followed stalls",
          meta: "Feed cards in this sandbox prefer followed-store updates.",
          tone: "info",
        },
        {
          label: "Layout mode",
          value: "Frontend sandbox",
          meta: "Safe for UI-only experiments before merging into the live buyer profile.",
          tone: "neutral",
        },
      ],
    },
    feedPreview: [
      {
        title: "Late-night bilum drop",
        description:
          "A preview feed card with text long enough to test wrapping inside the dashboard grid.",
        storeName: "Kina Atelier",
        feedTag: "Live drop",
        images: ["/assets/img/seller/store-home/hero1.jpg"],
        storePath: "/marketplace",
        productPath: "/marketplace",
      },
      {
        title: "Studio restock: coastal ceramics",
        description:
          "Second feed card to test consistent image treatment and baseline spacing.",
        storeName: "Lagoon Clay House",
        feedTag: "New product",
        images: ["/assets/img/seller/store-home/hero2.jpg"],
        storePath: "/marketplace",
        productPath: "/marketplace",
      },
      {
        title: "Weekend promo bundle",
        description:
          "A promo-style card to verify mixed feed states without using live store data.",
        storeName: "Island Parcel Co.",
        feedTag: "Promo drop",
        images: ["/assets/img/seller/store-home/hero3.jpg"],
        storePath: "/marketplace",
        productPath: "/marketplace",
      },
    ],
    wishlist: [
      {
        title: "Painted bilum strap set",
        price: 78,
        storeName: "Kina Atelier",
        imageUrl: "/assets/img/seller/template-art/1.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Studio preset pack",
        price: 42,
        storeName: "Cloudline Capture",
        imageUrl: "/assets/img/buyer/product-viewer/product-2.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Hand-thrown glaze bowl",
        price: 55,
        storeName: "Lagoon Clay House",
        imageUrl: "/assets/img/buyer/product-viewer/product-3.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Market prep checklist template",
        price: 19,
        storeName: "The Craft Ledger",
        imageUrl: "/assets/img/buyer/product-viewer/product-4.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
    ],
    purchases: [
      {
        title: "Workshop ticket",
        totalAmount: 120,
        status: "paid",
        purchasedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
        imageUrl: "/assets/img/seller/template-classes/01.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Mobile preset bundle",
        totalAmount: 26,
        status: "delivered",
        purchasedAt: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
        imageUrl: "/assets/img/buyer/product-viewer/product-1.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Artist tote pack",
        totalAmount: 88,
        status: "processing",
        purchasedAt: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
        imageUrl: "/assets/img/seller/store-home/10.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
    ],
    activity: [
      {
        icon: "fa-solid fa-heart",
        text: "Saved a new ceramics listing for later review.",
        time: "12 minutes ago",
        href: "/marketplace",
      },
      {
        icon: "fa-solid fa-store",
        text: "Followed Kina Atelier from the marketplace grid.",
        time: "1 hour ago",
        href: "/marketplace",
      },
      {
        icon: "fa-solid fa-bag-shopping",
        text: "Checked out a workshop ticket from a followed store.",
        time: "2 days ago",
        href: "/marketplace",
      },
    ],
    interactions: [
      {
        title: "Commented on a live drop update",
        meta: "Lagoon Clay House • just now",
        actionLabel: "Open update",
        thumbnailUrl: "/assets/img/seller/store-home/11.jpg",
        productPath: "/buyer/feed",
        storePath: "/marketplace",
      },
      {
        title: "Shared a promo bundle to chat",
        meta: "Island Parcel Co. • today",
        actionLabel: "View promo",
        thumbnailUrl: "/assets/img/seller/store-home/9.jpg",
        productPath: "/buyer/feed",
        storePath: "/marketplace",
      },
    ],
    storeNetwork: [
      {
        title: "Kina Atelier",
        meta: "Your most active followed store this week",
        actionLabel: "Visit stall",
        thumbnailUrl: "/assets/img/seller/store-home/hero4.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
      {
        title: "Cloudline Capture",
        meta: "Strong recommendation overlap with your wishlist",
        actionLabel: "Open store",
        thumbnailUrl: "/assets/img/seller/store-home/8.jpg",
        productPath: "/marketplace",
        storePath: "/marketplace",
      },
    ],
    recommendations: [
      {
        title: "Creator launch checklist",
        price: 24,
        reason: "Suggested because you saved tools and craft-business listings.",
        imageUrl: "/assets/img/seller/template-programmer/1.jpg",
        productPath: "/marketplace",
      },
      {
        title: "Weekend pop-up flyer pack",
        price: 32,
        reason: "Matches your followed-store promo activity.",
        imageUrl: "/assets/img/seller/template-art/2.jpg",
        productPath: "/marketplace",
      },
      {
        title: "Studio lightroom kit",
        price: 49,
        reason: "Recommended from recent photography template visits.",
        imageUrl: "/assets/img/buyer/product-viewer/product-1.jpg",
        productPath: "/marketplace",
      },
    ],
    following: [
      {
        handle: "kina-atelier",
        storeName: "Kina Atelier",
        tagline: "Handmade woven pieces and quiet studio drops.",
        storePath: "/marketplace",
      },
      {
        handle: "lagoon-clay-house",
        storeName: "Lagoon Clay House",
        tagline: "Ceramics, classes, and slow-batch home pieces.",
        storePath: "/marketplace",
      },
      {
        handle: "cloudline-capture",
        storeName: "Cloudline Capture",
        tagline: "Preset kits and visual storytelling tools.",
        storePath: "/marketplace",
      },
      {
        handle: "island-parcel-co",
        storeName: "Island Parcel Co.",
        tagline: "Packaging, promo bundles, and drop-day support.",
        storePath: "/marketplace",
      },
      {
        handle: "craft-ledger",
        storeName: "The Craft Ledger",
        tagline: "Digital tools for market sellers and small makers.",
        storePath: "/marketplace",
      },
    ],
  };
}

module.exports = createBuyerProfileSandboxPayload;
