function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("migration_runs", (table) => {
    identityColumn(knex, table);
    table.string("name", 120).notNullable();
    table.string("stage", 120).notNullable();
    table.string("status", 32).notNullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("started_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("completed_at", { useTz: true }).nullable();
  });

  await knex.schema.createTable("migration_mappings", (table) => {
    identityColumn(knex, table);
    table.bigInteger("run_id").notNullable().references("id").inTable("migration_runs").onDelete("CASCADE");
    table.string("entity_type", 120).notNullable();
    table.bigInteger("legacy_id").nullable();
    table.bigInteger("new_id").nullable();
    table.string("natural_key", 255).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["run_id", "entity_type"]);
    table.index(["entity_type", "legacy_id"]);
  });

  await knex.schema.createTable("migration_failures", (table) => {
    identityColumn(knex, table);
    table.bigInteger("run_id").nullable().references("id").inTable("migration_runs").onDelete("SET NULL");
    table.string("entity_type", 120).notNullable();
    table.bigInteger("legacy_id").nullable();
    table.string("stage", 120).notNullable();
    table.text("message").notNullable();
    table.jsonb("payload").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(["run_id", "entity_type"]);
  });

  await knex.schema.createTable("users", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.string("email", 255).notNullable().unique();
    table.text("password_hash").notNullable();
    table.string("role", 32).notNullable();
    table.string("status", 32).notNullable().defaultTo("active");
    table.string("full_name", 160).nullable();
    table.string("phone", 64).nullable();
    table.text("avatar_media_url").nullable();
    table.timestamp("last_login", { useTz: true }).nullable();
    table.string("subscription_plan_id", 64).nullable();
    table.timestamp("subscription_start_date", { useTz: true }).nullable();
    table.timestamp("subscription_end_date", { useTz: true }).nullable();
    table.boolean("subscription_auto_renew").notNullable().defaultTo(false);
    table.string("subscription_status", 32).notNullable().defaultTo("inactive");
    timestamps(table, knex);
    table.check("role in ('buyer', 'seller')");
    table.check("status in ('active', 'suspended')");
    table.check("subscription_status in ('inactive', 'active', 'cancelled', 'expired')");
  });

  await knex.schema.createTable("customer_profiles", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.bigInteger("user_id").notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    table.string("full_name", 160).nullable();
    table.string("email", 255).nullable();
    table.string("phone", 64).nullable();
    table.text("avatar_url").nullable();
    table.text("bio").nullable();
    timestamps(table, knex);
  });

  await knex.schema.createTable("shipping_profiles", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.string("profile_name", 160).notNullable();
    table.string("currency_code", 3).notNullable().defaultTo("PGK");
    table.jsonb("rules").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    timestamps(table, knex);
  });

  await knex.schema.createTable("stores", (table) => {
    identityColumn(knex, table);
    table.bigInteger("legacy_id").unique().nullable();
    table.bigInteger("owner_user_id").notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    table.string("handle", 64).notNullable().unique();
    table.string("store_name", 160).notNullable();
    table.string("tagline", 255).nullable();
    table.text("description").nullable();
    table.string("template_key", 64).notNullable().defaultTo("products");
    table.text("logo_media_url").nullable();
    table.text("cover_media_url").nullable();
    timestamps(table, knex);
  });

  await knex.schema.createTable("store_settings", (table) => {
    identityColumn(knex, table);
    table.bigInteger("store_id").notNullable().unique().references("id").inTable("stores").onDelete("CASCADE");
    table.string("currency_code", 3).notNullable().defaultTo("PGK");
    table.string("default_language", 12).notNullable().defaultTo("en");
    table.string("accent_color", 12).notNullable().defaultTo("#2563eb");
    table.bigInteger("shipping_profile_id").nullable().references("id").inTable("shipping_profiles").onDelete("SET NULL");
    table.jsonb("theme_settings").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb("color_palette").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb("font_choices").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb("layout_preferences").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    timestamps(table, knex);
  });

  await knex.schema.createTable("store_social_links", (table) => {
    identityColumn(knex, table);
    table.bigInteger("store_id").notNullable().references("id").inTable("stores").onDelete("CASCADE");
    table.string("platform", 32).notNullable();
    table.text("handle_or_url").notNullable();
    timestamps(table, knex);
    table.unique(["store_id", "platform"]);
    table.check("platform in ('instagram', 'facebook', 'tiktok', 'xhandle')");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("store_social_links");
  await knex.schema.dropTableIfExists("store_settings");
  await knex.schema.dropTableIfExists("stores");
  await knex.schema.dropTableIfExists("shipping_profiles");
  await knex.schema.dropTableIfExists("customer_profiles");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("migration_failures");
  await knex.schema.dropTableIfExists("migration_mappings");
  await knex.schema.dropTableIfExists("migration_runs");
};
