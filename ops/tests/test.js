const { runUnitTests } = require("./unit");
const { runIntegrationTests } = require("./test-integration");

async function run() {
  runUnitTests();
  console.log("Unit tests passed.");
  await runIntegrationTests();
  console.log("All tests passed.");
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
