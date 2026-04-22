function identityColumn(knex, table, name = "id") {
  table.specificType(name, "bigint generated always as identity").primary();
}

function timestamps(table, knex) {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

exports.up = async function up(knex) {
  await knex.schema.createTable("user_auth_providers", (table) => {
    identityColumn(knex, table);
    table.bigInteger("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("provider", 32).notNullable();
    table.string("provider_subject", 255).notNullable();
    table.string("provider_email", 255).nullable();
    table.string("provider_display_name", 255).nullable();
    table.text("provider_avatar_url").nullable();
    timestamps(table, knex);
    table.unique(["provider", "provider_subject"]);
    table.unique(["user_id", "provider"]);
    table.index(["user_id"]);
    table.check("provider in ('google', 'facebook')");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_auth_providers");
};
