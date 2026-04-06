exports.up = async function up(knex) {
  if (knex.client.config.client !== "pg") {
    return;
  }

  const constraints = await knex
    .select("con.conname")
    .from({ con: "pg_constraint" })
    .join({ rel: "pg_class" }, "rel.oid", "con.conrelid")
    .where("rel.relname", "feed_items")
    .where("con.contype", "c");

  for (const constraint of constraints) {
    if (!constraint || !constraint.conname) {
      continue;
    }

    await knex.raw("ALTER TABLE feed_items DROP CONSTRAINT IF EXISTS ??", [constraint.conname]);
  }

  await knex.raw(
    "ALTER TABLE feed_items ADD CONSTRAINT feed_items_type_check CHECK (type in ('product_published', 'announcement', 'promo', 'live_drop'))"
  );
};

exports.down = async function down(knex) {
  if (knex.client.config.client !== "pg") {
    return;
  }

  await knex.raw("ALTER TABLE feed_items DROP CONSTRAINT IF EXISTS feed_items_type_check");
  await knex.raw(
    "ALTER TABLE feed_items ADD CONSTRAINT feed_items_type_check CHECK (type in ('product_published', 'announcement', 'promo'))"
  );
};
