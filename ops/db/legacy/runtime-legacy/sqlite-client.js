const sqlite3 = require("sqlite3").verbose();

const { paths } = require("../../config");

function openSqliteDatabase(filePath, options = {}) {
  const mode = options.readonly
    ? sqlite3.OPEN_READONLY
    : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE;

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, mode, (error) => {
      if (error) {
        reject(error);
        return;
      }

      db.run("PRAGMA foreign_keys = ON", (pragmaError) => {
        if (pragmaError) {
          reject(pragmaError);
          return;
        }

        resolve(db);
      });
    });
  });
}

function buildClient(db) {
  return {
    db,
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
          if (error) {
            reject(error);
            return;
          }

          resolve({
            lastID: this.lastID,
            changes: this.changes,
          });
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(row || null);
        });
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(rows || []);
        });
      });
    },
    async transaction(work) {
      await this.run("BEGIN IMMEDIATE TRANSACTION");

      try {
        const result = await work({ provider: "sqlite" });
        await this.run("COMMIT");
        return result;
      } catch (error) {
        try {
          await this.run("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to rollback SQLite transaction:", rollbackError.message);
        }

        throw error;
      }
    },
    close() {
      return new Promise((resolve, reject) => {
        db.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

let legacyClientPromise = null;
let initialized = false;

async function getLegacySqliteClient() {
  if (!legacyClientPromise) {
    legacyClientPromise = openSqliteDatabase(paths.legacySqlitePath).then(buildClient);
  }

  return legacyClientPromise;
}

async function createReadOnlyLegacySqliteClient(filePath = paths.legacySqlitePath) {
  const db = await openSqliteDatabase(filePath, { readonly: true });
  return buildClient(db);
}

async function initLegacyDb() {
  if (initialized) {
    return;
  }

  const client = await getLegacySqliteClient();

  await client.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('buyer','seller'))
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      storeName TEXT,
      handle TEXT UNIQUE,
      tagline TEXT,
      about TEXT,
      accentColor TEXT,
      avatarUrl TEXT,
      coverUrl TEXT,
      instagram TEXT,
      facebook TEXT,
      tiktok TEXT,
      xhandle TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const storeColumns = await client.all("PRAGMA table_info(stores)");
  const hasTemplateKeyColumn = storeColumns.some((column) => column.name === "templateKey");
  if (!hasTemplateKeyColumn) {
    await client.run("ALTER TABLE stores ADD COLUMN templateKey TEXT NOT NULL DEFAULT 'products'");
  }

  const hasProfileCompletedColumn = storeColumns.some((column) => column.name === "profileCompleted");
  if (!hasProfileCompletedColumn) {
    await client.run("ALTER TABLE stores ADD COLUMN profileCompleted INTEGER NOT NULL DEFAULT 0");
  }

  await client.run(
    `UPDATE stores
      SET profileCompleted = CASE
        WHEN trim(COALESCE(storeName, '')) <> '' AND trim(COALESCE(handle, '')) <> '' THEN 1
        ELSE 0
      END
      WHERE profileCompleted IS NULL OR profileCompleted = 0`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS customer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      fullName TEXT,
      email TEXT,
      phone TEXT,
      avatarUrl TEXT,
      bio TEXT,
      profileCompleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  const customerProfileColumns = await client.all("PRAGMA table_info(customer_profiles)");
  const hasBuyerProfileCompletedColumn = customerProfileColumns.some(
    (column) => column.name === "profileCompleted"
  );
  if (!hasBuyerProfileCompletedColumn) {
    await client.run("ALTER TABLE customer_profiles ADD COLUMN profileCompleted INTEGER NOT NULL DEFAULT 0");
  }

  await client.run(
    `UPDATE customer_profiles
      SET profileCompleted = CASE
        WHEN trim(COALESCE(fullName, '')) <> ''
          OR trim(COALESCE(phone, '')) <> ''
          OR trim(COALESCE(avatarUrl, '')) <> ''
          OR trim(COALESCE(bio, '')) <> ''
        THEN 1
        ELSE 0
      END
      WHERE profileCompleted IS NULL OR profileCompleted = 0`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS customer_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerProfileId INTEGER UNIQUE NOT NULL,
      favoriteCategories TEXT NOT NULL DEFAULT '[]',
      favoriteTemplates TEXT NOT NULL DEFAULT '[]',
      viewedItems TEXT NOT NULL DEFAULT '[]',
      interactionSummary TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (customerProfileId) REFERENCES customer_profiles(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS customer_followed_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerProfileId INTEGER NOT NULL,
      storeId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (customerProfileId, storeId),
      FOREIGN KEY (customerProfileId) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      storeId INTEGER NOT NULL,
      name TEXT,
      description TEXT,
      price REAL,
      delivery TEXT,
      location TEXT,
      transportFee REAL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE
    )`
  );

  const productColumns = await client.all("PRAGMA table_info(products)");
  const hasNameColumn = productColumns.some((column) => column.name === "name");
  const hasTitleColumn = productColumns.some((column) => column.name === "title");

  if (!hasNameColumn && hasTitleColumn) {
    await client.run("ALTER TABLE products RENAME COLUMN title TO name");
  }

  await client.run(
    `CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId INTEGER NOT NULL,
      url TEXT NOT NULL,
      sortOrder INTEGER,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS feed_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      storeId INTEGER NOT NULL,
      catalogItemId INTEGER,
      title TEXT,
      description TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (type, catalogItemId),
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (catalogItemId) REFERENCES products(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerProfileId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (customerProfileId, productId),
      FOREIGN KEY (customerProfileId) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS feed_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feedItemId INTEGER NOT NULL,
      customerProfileId INTEGER NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (feedItemId, customerProfileId, type),
      FOREIGN KEY (feedItemId) REFERENCES feed_items(id) ON DELETE CASCADE,
      FOREIGN KEY (customerProfileId) REFERENCES customer_profiles(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      authorUserId INTEGER NOT NULL,
      parentCommentId INTEGER,
      body TEXT NOT NULL,
      visibilityStatus TEXT NOT NULL DEFAULT 'visible',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (authorUserId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (targetType, targetId, userId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      targetType TEXT NOT NULL,
      targetId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      destination TEXT,
      method TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await client.run(
    `CREATE TABLE IF NOT EXISTS customer_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerProfileId INTEGER NOT NULL,
      storeId INTEGER,
      productId INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      totalAmount REAL NOT NULL DEFAULT 0,
      purchasedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customerProfileId) REFERENCES customer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE SET NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE SET NULL
    )`
  );

  initialized = true;
}

async function closeLegacySqliteClient() {
  if (!legacyClientPromise) {
    return;
  }

  const client = await legacyClientPromise;
  await client.close();
  legacyClientPromise = null;
  initialized = false;
}

async function run(sql, params = []) {
  const client = await getLegacySqliteClient();
  return client.run(sql, params);
}

async function get(sql, params = []) {
  const client = await getLegacySqliteClient();
  return client.get(sql, params);
}

async function all(sql, params = []) {
  const client = await getLegacySqliteClient();
  return client.all(sql, params);
}

async function transaction(work) {
  const client = await getLegacySqliteClient();
  return client.transaction(work);
}

module.exports = {
  all,
  closeLegacySqliteClient,
  createReadOnlyLegacySqliteClient,
  get,
  getLegacySqliteClient,
  initLegacyDb,
  run,
  transaction,
};
