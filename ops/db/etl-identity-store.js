const path = require("path");

const { destroyPostgresKnex } = require(path.resolve(
  __dirname,
  "..",
  "..",
  "server",
  "src",
  "database",
  "postgres",
  "knex"
));
const { migrateIdentityAndStores } = require("./etl/runtime-etl/identity-store");

async function run() {
  const result = await migrateIdentityAndStores();
  console.log(JSON.stringify(result, null, 2));
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await destroyPostgresKnex();
  });
