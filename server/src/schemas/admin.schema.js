const {
  createNormalizedSchema,
  normalizeChoice,
  normalizePositiveInteger,
  normalizeText,
} = require("./shared.schema");

const ADMIN_USER_STATUSES = ["active", "suspended"];
const REPORT_STATUSES = ["open", "reviewing", "resolved", "rejected"];

const adminUserParamsSchema = createNormalizedSchema((params) => ({
  userId: normalizePositiveInteger(params && params.userId, "User id"),
}));

const adminReportParamsSchema = createNormalizedSchema((params) => ({
  reportId: normalizePositiveInteger(params && params.reportId, "Report id"),
}));

const adminUserStatusBodySchema = createNormalizedSchema((body) => ({
  status: normalizeChoice(body && body.status, ADMIN_USER_STATUSES, "User status is invalid"),
  note: normalizeText(body && body.note, 320, "Admin note"),
}));

const adminReportStatusBodySchema = createNormalizedSchema((body) => ({
  status: normalizeChoice(body && body.status, REPORT_STATUSES, "Report status is invalid"),
  note: normalizeText(body && body.note, 320, "Resolution note"),
}));

module.exports = {
  adminReportParamsSchema,
  adminReportStatusBodySchema,
  adminUserParamsSchema,
  adminUserStatusBodySchema,
};
