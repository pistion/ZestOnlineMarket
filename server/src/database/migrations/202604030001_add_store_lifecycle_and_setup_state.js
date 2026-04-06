exports.up = async function up(knex) {
  await knex.schema.alterTable("stores", (table) => {
    table.string("visibility_status", 24).notNullable().defaultTo("draft");
    table.timestamp("published_at", { useTz: true }).nullable();
  });

  await knex.schema.alterTable("store_settings", (table) => {
    table.integer("setup_step").notNullable().defaultTo(1);
    table.jsonb("setup_state").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
  });

  await knex("stores").update({
    visibility_status: knex.raw(
      "case when coalesce(profile_completed, false) then 'published' else 'draft' end"
    ),
    published_at: knex.raw(
      "case when coalesce(profile_completed, false) then coalesce(updated_at, created_at, now()) else null end"
    ),
  });

  await knex("store_settings as ss")
    .update({
      setup_step: knex.raw(
        `case
          when exists (
            select 1
            from stores s
            where s.id = ss.store_id
              and coalesce(s.profile_completed, false)
          ) then 4
          else 1
        end`
      ),
      setup_state: knex.raw("'{}'::jsonb"),
    });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("store_settings", (table) => {
    table.dropColumn("setup_state");
    table.dropColumn("setup_step");
  });

  await knex.schema.alterTable("stores", (table) => {
    table.dropColumn("published_at");
    table.dropColumn("visibility_status");
  });
};
