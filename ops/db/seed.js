const path = require("path");

const knexfile = require(path.resolve(__dirname, "..", "..", "knexfile"));
const postgres = require(path.resolve(
  __dirname,
  "..",
  "..",
  "server",
  "src",
  "database",
  "postgres",
  "knex"
));
const { repairMigrationHistory } = require("./repair-migration-history");

async function run() {
  const envName = process.env.KNEX_ENV || process.env.NODE_ENV || "development";
  const config = knexfile[envName] || knexfile.development;
  await postgres.initPostgresConnection();
  const knex = postgres.getPostgresKnex();
  await repairMigrationHistory(knex);
  const seeded = await knex.seed.run(config.seeds);
  console.log(
    JSON.stringify(
      {
        env: envName,
        seeded,
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await postgres.destroyPostgresKnex();
  });
