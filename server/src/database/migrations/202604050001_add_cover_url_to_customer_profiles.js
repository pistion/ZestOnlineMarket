exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("customer_profiles", "cover_url");
  if (!hasColumn) {
    await knex.schema.alterTable("customer_profiles", (table) => {
      table.text("cover_url").nullable();
    });
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("customer_profiles", "cover_url");
  if (hasColumn) {
    await knex.schema.alterTable("customer_profiles", (table) => {
      table.dropColumn("cover_url");
    });
  }
};
