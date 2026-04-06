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
const { migrateCatalogAndMedia } = require("./etl/runtime-etl/catalog");

async function run() {
  const result = await migrateCatalogAndMedia();
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
