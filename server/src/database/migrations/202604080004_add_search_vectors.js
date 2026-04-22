exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE catalog_items
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(delivery, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(location, '')), 'C')
    ) STORED
  `);

  await knex.raw(`
    ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', coalesce(store_name, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(handle, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(tagline, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(description, '')), 'C')
    ) STORED
  `);

  await knex.raw("CREATE INDEX IF NOT EXISTS catalog_items_search_vector_idx ON catalog_items USING GIN (search_vector)");
  await knex.raw("CREATE INDEX IF NOT EXISTS stores_search_vector_idx ON stores USING GIN (search_vector)");
};

exports.down = async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS stores_search_vector_idx");
  await knex.raw("DROP INDEX IF EXISTS catalog_items_search_vector_idx");
  await knex.raw("ALTER TABLE stores DROP COLUMN IF EXISTS search_vector");
  await knex.raw("ALTER TABLE catalog_items DROP COLUMN IF EXISTS search_vector");
};
