const express = require("express");

const {
  patchAdminReportStatus,
  patchAdminUserStatus,
  renderAdminDashboardPage,
  renderAdminOrdersPage,
  renderAdminReportsPage,
  renderAdminUsersPage,
} = require("../controllers/admin.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin, requireAdminPage } = require("../middleware/admin.middleware");
const {
  adminReportParamsSchema,
  adminReportStatusBodySchema,
  adminUserParamsSchema,
  adminUserStatusBodySchema,
} = require("../schemas/admin.schema");
const { validate } = require("../utils/validate");

const router = express.Router();

router.get("/admin/dashboard", requireAdminPage, renderAdminDashboardPage);
router.get("/admin/users", requireAdminPage, renderAdminUsersPage);
router.get("/admin/reports", requireAdminPage, renderAdminReportsPage);
router.get("/admin/orders", requireAdminPage, renderAdminOrdersPage);

router.patch(
  "/admin/api/users/:userId/status",
  requireAuth,
  requireAdmin,
  validate({ body: adminUserStatusBodySchema, params: adminUserParamsSchema }),
  patchAdminUserStatus
);
router.patch(
  "/admin/api/reports/:reportId/status",
  requireAuth,
  requireAdmin,
  validate({ body: adminReportStatusBodySchema, params: adminReportParamsSchema }),
  patchAdminReportStatus
);

module.exports = router;
