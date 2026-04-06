(function () {
  if (document.body.dataset.publicStore !== "1") {
    return;
  }

  const buyerInteractions = window.ZestBuyerInteractions || null;
  const storeHandle = String(document.body.dataset.storeHandle || "").trim();
  const templateKey = String(document.body.dataset.storeTemplateKey || "products").trim() || "products";

  if (buyerInteractions && typeof buyerInteractions.track === "function") {
    buyerInteractions.track({
      action: "view_store",
      source: "public-storefront",
      storeHandle,
      templateKey,
      itemType: templateKey === "products" ? "product" : templateKey,
    });
  }

  [
    "[data-seller-only='true']",
    "#createTop",
    "#createFab",
    "#settingsBtn",
    "#settingsPanel",
    ".chip-settings",
    ".create-btn",
    ".fab",
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.style.display = "none";
    });
  });

  const productPath = document.body.dataset.productPath;
  const checkoutPath = document.body.dataset.checkoutPath;
  if (!productPath) {
    return;
  }

  document.querySelectorAll("button, a").forEach((element) => {
    const label = (element.textContent || "").trim().toLowerCase();
    if (!label) {
      return;
    }

    if (label === "view details" || label === "view offer") {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = productPath;
      });
    }
  });

  const bar = document.createElement("div");
  bar.setAttribute(
    "style",
    [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:999",
      "display:flex",
      "gap:10px",
      "flex-wrap:wrap",
      "justify-content:flex-end",
    ].join(";")
  );

  const viewLink = document.createElement("a");
  viewLink.href = productPath;
  viewLink.textContent = "View Offer";
  viewLink.setAttribute(
    "style",
    [
      "padding:12px 18px",
      "border-radius:999px",
      "background:#0f172a",
      "color:#fff",
      "font-weight:700",
      "text-decoration:none",
      "box-shadow:0 12px 30px rgba(15,23,42,.22)",
    ].join(";")
  );

  bar.appendChild(viewLink);

  if (checkoutPath) {
    const checkoutLink = document.createElement("a");
    checkoutLink.href = checkoutPath;
    checkoutLink.textContent = "Checkout";
    checkoutLink.setAttribute(
      "style",
      [
        "padding:12px 18px",
        "border-radius:999px",
        "background:#16a34a",
        "color:#fff",
        "font-weight:700",
        "text-decoration:none",
        "box-shadow:0 12px 30px rgba(22,163,74,.2)",
      ].join(";")
    );
    bar.appendChild(checkoutLink);
  }

  document.body.appendChild(bar);
})();
