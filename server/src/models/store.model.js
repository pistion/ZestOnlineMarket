const { all, get, run } = require("../config/db");

function upsertStoreByUserId({
  userId,
  storeName,
  handle,
  templateKey,
  tagline,
  about,
  accentColor,
  avatarUrl,
  coverUrl,
  instagram,
  facebook,
  tiktok,
  xhandle,
  profileCompleted,
}) {
  return run(
    `INSERT INTO stores (
      userId, storeName, handle, templateKey, tagline, about, accentColor,
      avatarUrl, coverUrl, instagram, facebook, tiktok, xhandle, profileCompleted
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      storeName = excluded.storeName,
      handle = excluded.handle,
      templateKey = excluded.templateKey,
      tagline = excluded.tagline,
      about = excluded.about,
      accentColor = excluded.accentColor,
      avatarUrl = excluded.avatarUrl,
      coverUrl = excluded.coverUrl,
      instagram = excluded.instagram,
      facebook = excluded.facebook,
      tiktok = excluded.tiktok,
      xhandle = excluded.xhandle,
      profileCompleted = excluded.profileCompleted`,
    [
      userId,
      storeName,
      handle,
      templateKey,
      tagline,
      about,
      accentColor,
      avatarUrl,
      coverUrl,
      instagram,
      facebook,
      tiktok,
      xhandle,
      profileCompleted ? 1 : 0,
    ]
  );
}

function findStoreByUserId(userId) {
  return get("SELECT * FROM stores WHERE userId = ?", [userId]);
}

function findStoreById(storeId) {
  return get("SELECT * FROM stores WHERE id = ?", [storeId]);
}

function findStoreByHandle(handle) {
  return get("SELECT * FROM stores WHERE handle = ?", [handle]);
}

function listStoresForMarketplace() {
  return all(
    `SELECT
      s.*,
      (
        SELECT COUNT(*)
        FROM customer_followed_stores cfs
        WHERE cfs.storeId = s.id
      ) AS followerCount,
      (
        SELECT COUNT(*)
        FROM products productCount
        WHERE productCount.storeId = s.id
      ) AS productCount,
      (
        SELECT COUNT(*)
        FROM customer_purchases cp
        WHERE cp.storeId = s.id
      ) AS salesCount,
      p.id AS productId,
      p.name AS productName,
      p.description AS productDescription,
      p.price AS productPrice,
      p.delivery AS productDelivery,
      p.location AS productLocation,
      p.transportFee AS productTransportFee,
      p.createdAt AS productCreatedAt,
      (
        SELECT url
        FROM product_images
        WHERE productId = p.id
        ORDER BY sortOrder ASC, id ASC
        LIMIT 1
      ) AS thumbnail
    FROM stores s
    LEFT JOIN products p ON p.id = (
      SELECT id
      FROM products
      WHERE storeId = s.id
      ORDER BY datetime(createdAt) ASC, id ASC
      LIMIT 1
    )
    WHERE s.handle IS NOT NULL AND trim(s.handle) <> ''
    ORDER BY
      CASE WHEN p.id IS NULL THEN 1 ELSE 0 END ASC,
      datetime(p.createdAt) DESC,
      s.id DESC`
  );
}

module.exports = {
  findStoreByHandle,
  findStoreById,
  findStoreByUserId,
  listStoresForMarketplace,
  upsertStoreByUserId,
};
