/* ============================================================
   Ocean Studio — Enrollment Page Interaction Logic
   Handles:
   - Toggle buttons
   - Slide-in/slide-out animations
   - Full form validation
   - Gating access to Program Investment card
   ============================================================ */

// Get DOM elements
const registrationCard = document.getElementById("registrationCard");
const investmentCard = document.getElementById("investmentCard");

const showRegistrationButton = document.getElementById("showRegistrationButton");
const showPaymentButton = document.getElementById("showPaymentButton");

const enrollForm = document.getElementById("enrollForm");


// Utility to show a card
function revealCard(card) {
  card.classList.remove("hidden");
  card.classList.remove("slide-out");
  card.classList.add("slide-in");
}

// Utility to hide a card
function hideCard(card) {
  card.classList.remove("slide-in");
  card.classList.add("slide-out");

  // Fully hide after animation completes
  setTimeout(() => {
    card.classList.add("hidden");
  }, 300);
}


// ============================================================
// 1. SHOW REGISTRATION DETAILS CARD
// ============================================================
showRegistrationButton.addEventListener("click", () => {
  // If Registration is already open, do nothing
  if (!registrationCard.classList.contains("hidden")) return;

  // Hide investment if open
  if (!investmentCard.classList.contains("hidden")) {
    hideCard(investmentCard);
  }

  revealCard(registrationCard);
});


// ============================================================
// 2. VALIDATE FORM + TRANSITION TO PAYMENT
// ============================================================
enrollForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent default form submission

  if (!enrollForm.checkValidity()) {
    // Show built-in Bootstrap validation messages
    enrollForm.classList.add("was-validated");
    return;
  }

  // If the form is valid:
  enrollForm.classList.add("was-validated");

  // Enable the “Continue to Payment” button
  showPaymentButton.disabled = false;

  // Now automatically switch to the Program Investment card
  hideCard(registrationCard);

  // Delay to allow animation to finish before showing next card
  setTimeout(() => {
    revealCard(investmentCard);
  }, 350);
});


// ============================================================
// 3. "Continue to Payment" button (manual toggle)
// ============================================================
showPaymentButton.addEventListener("click", () => {
  // If disabled (form not completed), ignore
  if (showPaymentButton.disabled) return;

  // Hide registration card if open
  if (!registrationCard.classList.contains("hidden")) {
    hideCard(registrationCard);
  }

  // Show investment card
  revealCard(investmentCard);
});


// ============================================================
// 4. Extra Safety — auto-disable "Continue to Payment"
//    if the user re-opens Registration and clears fields
// ============================================================

const requiredFields = ["fullName", "email", "country", "timezone", "goal", "terms"];

requiredFields.forEach((id) => {
  const field = document.getElementById(id);

  if (!field) return;

  field.addEventListener("input", () => {
    if (enrollForm.checkValidity()) {
      showPaymentButton.disabled = false; // all good
    } else {
      showPaymentButton.disabled = true; // incomplete
    }
  });
});
