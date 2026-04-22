const { sendSuccess } = require("../utils/api-response");
const {
  loadAdminWorkspace,
  resolveAdminReport,
  suspendOrActivateUser,
} = require("../services/admin.service");

const INTER_FONT =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
const FONT_AWESOME =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";

function renderAdminPage(res, {
  title,
  view,
  section,
  bodyAttrs = {},
  data,
}) {
  return res.render("layout", {
    page: {
      title,
      view,
      externalStyles: [INTER_FONT, FONT_AWESOME],
      styles: [
        "/assets/css/global.css",
        "/assets/css/shared/ui.css",
        "/assets/css/admin/panel.css",
      ],
      externalScripts: [],
      scripts: ["/assets/js/admin/panel.js"],
      bodyAttrs: {
        "admin-section": section,
        "admin-user-api-base": "/admin/api/users",
        "admin-report-api-base": "/admin/api/reports",
        ...bodyAttrs,
      },
      bodyClass: "admin-panel-page",
      layoutHeader: false,
      layoutFooter: false,
    },
    flash: res.locals.flash,
    adminData: data,
  });
}

async function renderAdminDashboardPage(req, res, next) {
  try {
    const workspace = await loadAdminWorkspace(req.user);
    return renderAdminPage(res, {
      title: "Admin Dashboard",
      view: "pages/admin/dashboard",
      section: "dashboard",
      data: workspace,
    });
  } catch (error) {
    return next(error);
  }
}

async function renderAdminUsersPage(req, res, next) {
  try {
    const workspace = await loadAdminWorkspace(req.user);
    return renderAdminPage(res, {
      title: "Admin Users",
      view: "pages/admin/users",
      section: "users",
      data: workspace,
    });
  } catch (error) {
    return next(error);
  }
}

async function renderAdminReportsPage(req, res, next) {
  try {
    const workspace = await loadAdminWorkspace(req.user);
    return renderAdminPage(res, {
      title: "Admin Reports",
      view: "pages/admin/reports",
      section: "reports",
      data: workspace,
    });
  } catch (error) {
    return next(error);
  }
}

async function renderAdminOrdersPage(req, res, next) {
  try {
    const workspace = await loadAdminWorkspace(req.user);
    return renderAdminPage(res, {
      title: "Admin Orders",
      view: "pages/admin/orders",
      section: "orders",
      data: workspace,
    });
  } catch (error) {
    return next(error);
  }
}

async function patchAdminUserStatus(req, res, next) {
  try {
    const user = await suspendOrActivateUser(
      req.user,
      req.params.userId,
      req.body.status,
      req.body.note
    );
    return sendSuccess(res, { user }, "User status updated");
  } catch (error) {
    return next(error);
  }
}

async function patchAdminReportStatus(req, res, next) {
  try {
    const report = await resolveAdminReport(
      req.user,
      req.params.reportId,
      req.body.status,
      req.body.note
    );
    return sendSuccess(res, { report }, "Report updated");
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  patchAdminReportStatus,
  patchAdminUserStatus,
  renderAdminDashboardPage,
  renderAdminOrdersPage,
  renderAdminReportsPage,
  renderAdminUsersPage,
};
