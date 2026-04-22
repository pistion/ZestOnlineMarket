const { getPostgresExecutor } = require("./repository-source");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getAdminDashboardSummary(options = {}) {
  const knex = getPostgresExecutor(options);
  const [counts] = await knex("users as u")
    .select(
      knex.raw("count(*)::int as total_users"),
      knex.raw("count(*) filter (where u.role = 'buyer')::int as buyer_users"),
      knex.raw("count(*) filter (where u.role = 'seller')::int as seller_users"),
      knex.raw("count(*) filter (where u.role = 'admin')::int as admin_users"),
      knex.raw("count(*) filter (where u.status = 'suspended')::int as suspended_users")
    );

  const [reportCounts] = await knex("content_reports")
    .select(
      knex.raw("count(*)::int as total_reports"),
      knex.raw("count(*) filter (where status = 'open')::int as open_reports"),
      knex.raw("count(*) filter (where status = 'reviewing')::int as reviewing_reports")
    );

  const [orderCounts] = await knex("orders")
    .select(
      knex.raw("count(*)::int as total_orders"),
      knex.raw("coalesce(sum(total_amount), 0)::numeric(12, 2) as gross_revenue")
    );

  return {
    totals: {
      users: toNumber(counts && counts.total_users, 0),
      buyerUsers: toNumber(counts && counts.buyer_users, 0),
      sellerUsers: toNumber(counts && counts.seller_users, 0),
      adminUsers: toNumber(counts && counts.admin_users, 0),
      suspendedUsers: toNumber(counts && counts.suspended_users, 0),
      reports: toNumber(reportCounts && reportCounts.total_reports, 0),
      openReports: toNumber(reportCounts && reportCounts.open_reports, 0),
      reviewingReports: toNumber(reportCounts && reportCounts.reviewing_reports, 0),
      orders: toNumber(orderCounts && orderCounts.total_orders, 0),
      grossRevenue: toMoney(orderCounts && orderCounts.gross_revenue, 0),
    },
  };
}

async function listUsers(options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("users")
    .select("id", "email", "role", "status", "full_name", "phone", "created_at", "updated_at")
    .orderBy("created_at", "desc")
    .limit(100);

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    email: String(row.email || "").trim(),
    role: String(row.role || "").trim(),
    status: String(row.status || "").trim(),
    fullName: String(row.full_name || "").trim(),
    phone: String(row.phone || "").trim(),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }));
}

async function updateUserStatus(userId, status, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("users")
    .where({ id: userId })
    .update({
      status,
      updated_at: knex.fn.now(),
    })
    .returning(["id", "email", "role", "status", "full_name", "created_at", "updated_at"]);

  if (!row) {
    return null;
  }

  return {
    id: toNumber(row.id, 0),
    email: String(row.email || "").trim(),
    role: String(row.role || "").trim(),
    status: String(row.status || "").trim(),
    fullName: String(row.full_name || "").trim(),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function listContentReports(options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("content_reports as cr")
    .leftJoin("users as u", "u.id", "cr.reporter_user_id")
    .select(
      "cr.*",
      "u.email as reporter_email",
      "u.role as reporter_role"
    )
    .orderBy([
      { column: "cr.status", order: "asc" },
      { column: "cr.created_at", order: "desc" },
    ])
    .limit(100);

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    targetType: String(row.target_type || "").trim(),
    targetId: toNumber(row.target_id, 0),
    reporterUserId: row.reporter_user_id == null ? null : toNumber(row.reporter_user_id, 0),
    reporterEmail: String(row.reporter_email || "").trim(),
    reporterRole: String(row.reporter_role || "").trim(),
    reason: String(row.reason || "").trim(),
    details: String(row.details || "").trim(),
    status: String(row.status || "").trim(),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }));
}

async function updateContentReportStatus(reportId, status, note = "", options = {}) {
  const knex = getPostgresExecutor(options);
  const existing = await knex("content_reports")
    .where({ id: reportId })
    .first();

  if (!existing) {
    return null;
  }

  const metadata = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
  metadata.adminNote = note || metadata.adminNote || "";

  const [row] = await knex("content_reports")
    .where({ id: reportId })
    .update({
      status,
      metadata,
      updated_at: knex.fn.now(),
    })
    .returning(["*"]);

  return {
    id: toNumber(row.id, 0),
    targetType: String(row.target_type || "").trim(),
    targetId: toNumber(row.target_id, 0),
    status: String(row.status || "").trim(),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    updatedAt: row.updated_at || null,
  };
}

async function listPlatformOrders(options = {}) {
  const knex = getPostgresExecutor(options);
  const rows = await knex("orders as o")
    .leftJoin("stores as s", "s.id", "o.store_id")
    .select(
      "o.id",
      "o.order_number",
      "o.status",
      "o.payment_status",
      "o.customer_name",
      "o.customer_email",
      "o.total_amount",
      "o.currency",
      "o.placed_at",
      "s.store_name",
      "s.handle"
    )
    .orderBy("o.placed_at", "desc")
    .limit(100);

  return rows.map((row) => ({
    id: toNumber(row.id, 0),
    orderNumber: String(row.order_number || "").trim(),
    status: String(row.status || "").trim(),
    paymentStatus: String(row.payment_status || "").trim(),
    customerName: String(row.customer_name || "").trim(),
    customerEmail: String(row.customer_email || "").trim(),
    totalAmount: toMoney(row.total_amount, 0),
    currency: String(row.currency || "PGK").trim(),
    placedAt: row.placed_at || null,
    storeName: String(row.store_name || "").trim(),
    storeHandle: String(row.handle || "").trim(),
  }));
}

async function createAdminActionLog(action, options = {}) {
  const knex = getPostgresExecutor(options);
  const [row] = await knex("admin_actions")
    .insert({
      admin_user_id: action.adminUserId || null,
      action_type: action.actionType,
      target_type: action.targetType,
      target_id: action.targetId || null,
      metadata: action.metadata || {},
    })
    .returning(["id"]);

  return {
    id: toNumber(row && row.id, 0),
  };
}

module.exports = {
  createAdminActionLog,
  getAdminDashboardSummary,
  listContentReports,
  listPlatformOrders,
  listUsers,
  updateContentReportStatus,
  updateUserStatus,
};
