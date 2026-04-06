const fs = require("fs");
const path = require("path");

const { ensureDirectory, nowIso } = require("./etl/runtime-etl/helpers");
const { destroyPostgresKnex } = require("../../server/src/database/postgres/knex");
const { buildReconciliationReport } = require("./verify/runtime-verify/reconcile");
const { paths } = require("./config");

async function run() {
  const report = await buildReconciliationReport();
  const reportRoot = ensureDirectory(paths.snapshotRoot);
  const reportDir = ensureDirectory(path.join(reportRoot, "reports"));
  const reportPath = path.join(
    reportDir,
    `reconciliation-${nowIso().replace(/[:.]/g, "-")}.json`
  );

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, ...report }, null, 2));

  if (!report.passed) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await destroyPostgresKnex();
  });
