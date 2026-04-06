// IMAGE SWITCHER
function changeImage(imgElement) {
  const main = document.getElementById("mainImage");
  if (!main) return;

  main.src = imgElement.src;

  document.querySelectorAll(".gallery img").forEach((img) => {
    img.classList.remove("active");
  });
  imgElement.classList.add("active");
}

// TABS
function openTab(event, tabName) {
  const contents = document.querySelectorAll(".tab-content");
  const buttons = document.querySelectorAll(".tab-button");

  contents.forEach((tab) => tab.classList.remove("active"));
  buttons.forEach((btn) => btn.classList.remove("active"));

  const activeContent = document.getElementById(tabName);
  if (activeContent) activeContent.classList.add("active");

  event.currentTarget.classList.add("active");
}

// ADD TO CART
function addToCart() {
  alert("Huckberry x Timex Ironman Flix added to cart. 🏃‍♂️");
}

// LIGHTBOX
document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainImage");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");

  if (mainImage && lightbox && lightboxImg) {
    mainImage.addEventListener("click", () => {
      lightboxImg.src = mainImage.src;
      lightbox.style.display = "flex";
    });
  }
});

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    lightbox.style.display = "none";
  }
}
