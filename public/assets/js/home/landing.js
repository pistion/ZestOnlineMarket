document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".landing-menu-toggle");
  const navLinks = document.querySelector(".landing-nav-links");
  const newsletterForm = document.querySelector(".landing-newsletter-form");
  const formNote = document.querySelector(".landing-form-note");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }

      const target = document.querySelector(hash);
      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      navLinks?.classList.remove("is-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  if (newsletterForm && formNote) {
    newsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const emailInput = newsletterForm.querySelector("input[type='email']");
      const email = emailInput ? emailInput.value.trim() : "";
      formNote.textContent = email
        ? `Thanks, ${email}. We will keep you posted.`
        : "Thanks for subscribing.";
      newsletterForm.reset();
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll("[data-reveal]").forEach((element) => {
    observer.observe(element);
  });
});
