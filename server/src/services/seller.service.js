const { getSellerWorkspaceSummary } = require("../repositories/store.repository");
const { getSellerOrderMetricsByStoreId } = require("../repositories/commerce.repository");
const {
  APP_PATHS,
  resolveSellerSetupPath,
  resolveSellerSettingsPath,
  resolveSellerTemplateManagerPath,
} = require("./account-routing.service");
const { getTemplateMeta } = require("../utils/store-template");

async function buildSellerWorkspaceSummary(userId, options = {}) {
  const summary = await getSellerWorkspaceSummary(userId, options);
  if (!summary) {
    return {
      store: null,
      metrics: {
        followers: 0,
        products: 0,
        draftProducts: 0,
        liveProducts: 0,
        updates: 0,
        orders: 0,
        revenue: 0,
        paidOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
      },
      completion: {
        profileCompleted: false,
        setupStep: 1,
      },
      template: getTemplateMeta("products"),
      lifecycle: {
        visibilityStatus: "draft",
        visibilityLabel: "Draft storefront",
        publishedAt: null,
      },
      paths: {
        dashboard: APP_PATHS.sellerDashboard,
        settings: resolveSellerSettingsPath(),
        templateManager: resolveSellerTemplateManagerPath(),
        setup: APP_PATHS.sellerStore,
        templatePreview: "",
        publicStore: "",
      },
    };
  }

  const store = summary.store;
  const commerceMetrics = store && store.id
    ? await getSellerOrderMetricsByStoreId(store.id, options)
    : {
        totalOrders: 0,
        paidOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        refundedOrders: 0,
        netRevenue: 0,
      };
  const template = getTemplateMeta(store && store.templateKey);
  const visibilityStatus = String((store && store.visibilityStatus) || "draft").trim().toLowerCase();
  const visibilityLabel =
    visibilityStatus === "published"
      ? "Published storefront"
      : visibilityStatus === "unpublished"
        ? "Hidden storefront"
        : "Draft storefront";
  const publicStorePath =
    visibilityStatus === "published" && store && store.handle
      ? `/stores/${encodeURIComponent(store.handle)}`
      : "";

  return {
    store,
    metrics: {
      ...summary.metrics,
      orders: commerceMetrics.totalOrders || summary.metrics.orders || 0,
      revenue: commerceMetrics.netRevenue || 0,
      paidOrders: commerceMetrics.paidOrders || 0,
      shippedOrders: commerceMetrics.shippedOrders || 0,
      deliveredOrders: commerceMetrics.deliveredOrders || 0,
      refundedOrders: commerceMetrics.refundedOrders || 0,
    },
    completion: {
      profileCompleted: Boolean(store && store.profileCompleted),
      setupStep: Number(store && store.setupStep || 1) || 1,
    },
    template,
    lifecycle: {
      visibilityStatus,
      visibilityLabel,
      publishedAt: store && store.publishedAt ? store.publishedAt : null,
    },
    paths: {
      dashboard: APP_PATHS.sellerDashboard,
      settings: resolveSellerSettingsPath(),
      templateManager: resolveSellerTemplateManagerPath(),
      setup: resolveSellerSetupPath(store),
      templatePreview: template.previewPath,
      publicStore: publicStorePath,
    },
  };
}

module.exports = {
  buildSellerWorkspaceSummary,
};
