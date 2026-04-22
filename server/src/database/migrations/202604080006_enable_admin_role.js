exports.up = async function up(knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role in ('buyer', 'seller', 'admin'))"
  );
};

exports.down = async function down(knex) {
  await knex.raw("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role in ('buyer', 'seller'))"
  );
};
