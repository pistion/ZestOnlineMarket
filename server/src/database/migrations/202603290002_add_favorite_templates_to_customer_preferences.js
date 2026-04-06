exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable("customer_preferences");
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn("customer_preferences", "favorite_templates");
  if (!hasColumn) {
    await knex.schema.alterTable("customer_preferences", (table) => {
      table.jsonb("favorite_templates").notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    });
  }
};

exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable("customer_preferences");
  if (!hasTable) {
    return;
  }

  const hasColumn = await knex.schema.hasColumn("customer_preferences", "favorite_templates");
  if (hasColumn) {
    await knex.schema.alterTable("customer_preferences", (table) => {
      table.dropColumn("favorite_templates");
    });
  }
};
