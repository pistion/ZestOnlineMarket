const {
  createAdminActionLog,
  getAdminDashboardSummary,
  listContentReports,
  listPlatformOrders,
  listUsers,
  updateContentReportStatus,
  updateUserStatus,
} = require("../repositories/admin.repository");
const { createHttpError } = require("../utils/api-response");

function assertAdminUser(user) {
  if (!user || user.role !== "admin") {
    throw createHttpError(403, "Admin-only route");
  }
}

async function loadAdminWorkspace(user, options = {}) {
  assertAdminUser(user);
  const [summary, users, reports, orders] = await Promise.all([
    getAdminDashboardSummary(options),
    listUsers(options),
    listContentReports(options),
    listPlatformOrders(options),
  ]);

  return {
    summary,
    users,
    reports,
    orders,
  };
}

async function suspendOrActivateUser(user, targetUserId, status, note = "", options = {}) {
  assertAdminUser(user);
  const updated = await updateUserStatus(targetUserId, status, options);
  if (!updated) {
    throw createHttpError(404, "User not found");
  }

  await createAdminActionLog(
    {
      adminUserId: user.id,
      actionType: `user_${status}`,
      targetType: "user",
      targetId: targetUserId,
      metadata: {
        note,
        nextStatus: status,
        email: updated.email,
      },
    },
    options
  );

  return updated;
}

async function resolveAdminReport(user, reportId, status, note = "", options = {}) {
  assertAdminUser(user);
  const updated = await updateContentReportStatus(reportId, status, note, options);
  if (!updated) {
    throw createHttpError(404, "Report not found");
  }

  await createAdminActionLog(
    {
      adminUserId: user.id,
      actionType: `report_${status}`,
      targetType: "content_report",
      targetId: reportId,
      metadata: {
        note,
        nextStatus: status,
      },
    },
    options
  );

  return updated;
}

module.exports = {
  loadAdminWorkspace,
  resolveAdminReport,
  suspendOrActivateUser,
};
