// product_loader.js
// Loads all products into the grids on index.html

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    const data = await res.json();

    if (!data.success || !data.products) return;

    const recentGrid = document.getElementById("recentGrid");
    const prevGrid = document.getElementById("prevGrid");

    recentGrid.innerHTML = "";
    if (prevGrid) prevGrid.innerHTML = "";

    // How many days before a product becomes "previous"
    const RECENT_DAYS = 7;

    data.products.forEach((p) => {
      const card = buildProductCard(p);
      const createdAt = new Date(p.createdAt || Date.now());
      const now = new Date();
      const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

      if (diffDays <= RECENT_DAYS) {
        recentGrid.appendChild(card);
      } else if (prevGrid) {
        prevGrid.appendChild(card);
      }
    });
  } catch (err) {
    console.warn("Product loader failed:", err.message);
  }
}

function buildProductCard(p) {
  const card = document.createElement("div");
  card.className = "card";

  const img = p.thumbnail || "";
  const price = p.price || 0;
  const title = p.title || "Untitled";
  const handle = p.storeHandle || "";

  card.innerHTML = `
    <div class="card-media">
      <img src="${img}" alt="${title}" />
    </div>

    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-price">K ${price}</div>
      <a class="card-store" href="?handle=${handle}">@${handle}</a>
    </div>
  `;

  return card;
}
