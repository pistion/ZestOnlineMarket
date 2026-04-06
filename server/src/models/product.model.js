const { all, get, run } = require("../config/db");

function createProduct({
  storeId,
  name,
  description,
  price,
  delivery,
  location,
  transportFee,
}) {
  return run(
    `INSERT INTO products (
      storeId, name, description, price, delivery, location, transportFee
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [storeId, name, description, price, delivery, location, transportFee]
  );
}

function updateProduct(productId, product) {
  return run(
    `UPDATE products
    SET name = ?, description = ?, price = ?, delivery = ?, location = ?, transportFee = ?
    WHERE id = ?`,
    [
      product.name,
      product.description,
      product.price,
      product.delivery,
      product.location,
      product.transportFee,
      productId,
    ]
  );
}

function deleteProduct(productId) {
  return run("DELETE FROM products WHERE id = ?", [productId]);
}

function findFirstProductByStoreId(storeId) {
  return get(
    "SELECT * FROM products WHERE storeId = ? ORDER BY datetime(createdAt) ASC, id ASC LIMIT 1",
    [storeId]
  );
}

function findProductById(productId) {
  return get("SELECT * FROM products WHERE id = ?", [productId]);
}

function findProductByIdAndStoreId(productId, storeId) {
  return get("SELECT * FROM products WHERE id = ? AND storeId = ?", [productId, storeId]);
}

async function replaceProductImages(productId, imageUrls = []) {
  await run("DELETE FROM product_images WHERE productId = ?", [productId]);

  for (const [index, url] of imageUrls.entries()) {
    await run(
      "INSERT INTO product_images (productId, url, sortOrder) VALUES (?, ?, ?)",
      [productId, url, index]
    );
  }
}

function findProductImages(productId) {
  return all(
    "SELECT * FROM product_images WHERE productId = ? ORDER BY sortOrder ASC, id ASC",
    [productId]
  );
}

function listProductsByStoreId(storeId) {
  return all(
    "SELECT * FROM products WHERE storeId = ? ORDER BY datetime(createdAt) DESC, id DESC",
    [storeId]
  );
}

function listProductsWithStores() {
  return all(
    `SELECT p.*, s.handle, s.storeName, s.templateKey,
      (
        SELECT url
        FROM product_images
        WHERE productId = p.id
        ORDER BY sortOrder ASC, id ASC
        LIMIT 1
      ) AS thumbnail
    FROM products p
    JOIN stores s ON s.id = p.storeId
    ORDER BY datetime(p.createdAt) DESC, p.id DESC`
  );
}

module.exports = {
  createProduct,
  deleteProduct,
  findFirstProductByStoreId,
  findProductById,
  findProductByIdAndStoreId,
  findProductImages,
  listProductsByStoreId,
  listProductsWithStores,
  replaceProductImages,
  updateProduct,
};
