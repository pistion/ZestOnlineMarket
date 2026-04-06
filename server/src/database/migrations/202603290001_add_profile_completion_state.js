exports.up = async function up(knex) {
  await knex.schema.alterTable("customer_profiles", (table) => {
    table.boolean("profile_completed").notNullable().defaultTo(false);
  });

  await knex.schema.alterTable("stores", (table) => {
    table.boolean("profile_completed").notNullable().defaultTo(false);
  });

  await knex("customer_profiles")
    .whereRaw(
      "coalesce(trim(full_name), '') <> '' or coalesce(trim(phone), '') <> '' or coalesce(trim(avatar_url), '') <> '' or coalesce(trim(bio), '') <> ''"
    )
    .update({
      profile_completed: true,
      updated_at: knex.fn.now(),
    });

  await knex("stores")
    .whereRaw("coalesce(trim(store_name), '') <> '' and coalesce(trim(handle), '') <> ''")
    .update({
      profile_completed: true,
      updated_at: knex.fn.now(),
    });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("stores", (table) => {
    table.dropColumn("profile_completed");
  });

  await knex.schema.alterTable("customer_profiles", (table) => {
    table.dropColumn("profile_completed");
  });
};
