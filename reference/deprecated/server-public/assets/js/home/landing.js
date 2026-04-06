document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const toggle = document.querySelector('.landing-menu-toggle');
  const links = document.getElementById('landing-nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', !isExpanded);
      links.classList.toggle('active');
    });
  }

  // Scroll Reveal Observer
  const revealElements = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => observer.observe(el));

  // Newsletter form handling
  const newsletterForm = document.querySelector('.landing-newsletter-form');
  const formNote = document.querySelector('.landing-form-note');

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input').value;
      if (email) {
        formNote.textContent = 'Thank you for subscribing!';
        newsletterForm.reset();
      }
    });
  }
});
