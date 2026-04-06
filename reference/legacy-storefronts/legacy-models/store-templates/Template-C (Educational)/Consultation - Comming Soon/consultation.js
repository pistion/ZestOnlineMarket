
const CS_STORAGE_KEY = "consultationStudioPrefs_v1";

// ---------- DATA ----------

const CS_PROFILE = {
  name: "Dr. Maya Chen",
  title: "Psychologist & Strategic Consultant for High-Achievers",
  tagline:
    "I help leaders, founders and creatives build lives that feel as good on the inside as they look on paper.",
  rate: 420,
  clients: 210,
  years: 9,
  rating: 4.9,
  location: "Port Moresby · GMT+10",
  focusAreas: [
    "Burnout, exhaustion and quiet overwhelm",
    "Leadership & team dynamics",
    "Identity shifts, transitions and grief",
    "Founders holding too much (emotionally & practically)",
    "Boundaries, emotional language and self-trust"
  ]
};

const CS_SERVICES = [
  {
    id: 1,
    label: "Deep dive",
    title: "90-minute diagnostic session",
    description:
      "A one-off session to map what’s happening in your system, name key patterns, and outline a gentle but precise next-step plan.",
    focus: ["Burnout", "Leadership", "Clarity"],
    format: "Online • Zoom",
    priceFrom: 480,
    durationLabel: "Single 90-min session",
    bestFor: "If you’re not sure what you need yet, but you know something needs to shift."
  },
  {
    id: 2,
    label: "Short container",
    title: "4-week recalibration",
    description:
      "Weekly 75-min sessions focused on one core theme: burnout, relationships at work, emotional regulation, or boundaries.",
    focus: ["Burnout", "Nervous system", "Boundaries"],
    format: "Online or in-person",
    priceFrom: 1650,
    durationLabel: "4 x 75-min sessions",
    bestFor: "If you want accountability and support as you implement changes in real time."
  },
  {
    id: 3,
    label: "Leadership",
    title: "Founder & leader support",
    description:
      "A confidential space to think clearly about decisions, team dynamics, visibility, and the emotional cost of leading.",
    focus: ["Leadership", "Teams", "Strategy"],
    format: "Online • private link",
    priceFrom: 2200,
    durationLabel: "Custom 4–8 session arc",
    bestFor: "If you’re leading humans while also trying to remain one."
  },
  {
    id: 4,
    label: "Team session",
    title: "Team debrief & culture check-in",
    description:
      "Facilitated group conversation to name what’s working, what’s fraying, and what needs to shift in the team system.",
    focus: ["Teams", "Culture"],
    format: "Online or in-person",
    priceFrom: 3200,
    durationLabel: "Half-day facilitated session",
    bestFor: "If you want your team to feel safer, clearer and more aligned together."
  },
  {
    id: 5,
    label: "Lite support",
    title: "Email & voice note support (1 month)",
    description:
      "Asynchronous support between or instead of sessions. Thoughtful, paced responses for when your brain is noisy but your calendar is full.",
    focus: ["Ongoing support", "Integration"],
    format: "Encrypted async channel",
    priceFrom: 980,
    durationLabel: "30 days access",
    bestFor: "If you process best in writing and want slower, reflective support."
  }
];

const CS_CAPACITY = [
  { label: "1:1 sessions", level: "medium", text: "4 new clients this month" },
  { label: "Short containers", level: "low", text: "2 spots remaining" },
  { label: "Teams / orgs", level: "high", text: "Currently booking next quarter" }
];

const CS_PORTFOLIO = [
  {
    id: 1,
    label: "Founder",
    title: "Founder on the edge of walking away",
    snippet:
      "We rebuilt their weeks so their body wasn’t permanently in launch mode, while still honouring ambition.",
    duration: "4 months",
    outcome: "Clearer boundaries, 40% reduction in reported burnout markers.",
    focus: "Burnout & leadership",
    process:
      "We began with mapping nervous system states throughout the day, then layered in practical experiments: calendar adjustments, relational boundaries, and communication scripts with investors and team members."
  },
  {
    id: 2,
    label: "Leader",
    title: "Senior leader navigating team resentment",
    snippet:
      "We named and tended to quieter resentments that were clogging communication and decisions.",
    duration: "8 sessions",
    outcome: "Team feedback scores up, leader reported ‘less bracing’ before meetings.",
    focus: "Team dynamics & conflict",
    process:
      "We spent time locating where resentment lived in the body and story, then practised new language for repair, accountability and decision-making in-session before bringing it to the team."
  },
  {
    id: 3,
    label: "Creative",
    title: "Creative who couldn’t start anything",
    snippet:
      "Underneath ‘procrastination’ we found grief, perfectionism and a very tired nervous system.",
    duration: "6 sessions",
    outcome: "Consistent creative output with a kinder internal voice.",
    focus: "Identity & creative work",
    process:
      "We located old stories about worth and usefulness, built tiny experiments, and practised being with the discomfort of ‘good enough’ work instead of chasing perfect."
  }
];

const CS_TESTIMONIALS = [
  {
    quote:
      "I came in asking for help with time management. We did some of that. But mostly, we rebuilt how I relate to myself when I’m not ‘performing’ for anyone.",
    name: "Founder, tech",
    location: "Online client",
    focus: "4-month container"
  },
  {
    quote:
      "This was the first space where I didn’t feel I had to be ‘on’. We could sit in the mess for a bit, and then move into strategy when my body was ready.",
    name: "Senior leader, non-profit",
    location: "Hybrid sessions",
    focus: "Leadership support"
  },
  {
    quote:
      "I thought I was just bad at finishing things. Turns out my system was still bracing for impact from stuff that happened years ago. Naming that changed everything.",
    name: "Writer, creative",
    location: "Online client",
    focus: "Identity & creative work"
  }
];

// ---------- STATE ----------

const csState = {
  adminMode: false,
  altTheme: false,
  activeServiceTag: "All",
  currentTestimonialIndex: 0
};

// ---------- STORAGE ----------

function csLoadFromStorage() {
  try {
    const raw = localStorage.getItem(CS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    csState.adminMode = !!saved.adminMode;
    csState.altTheme = !!saved.altTheme;
    csState.activeServiceTag = saved.activeServiceTag || "All";
    csState.currentTestimonialIndex = saved.currentTestimonialIndex || 0;
  } catch (e) {
    console.warn("CS: failed to load stored prefs", e);
  }
}

function csSaveToStorage() {
  const payload = {
    adminMode: csState.adminMode,
    altTheme: csState.altTheme,
    activeServiceTag: csState.activeServiceTag,
    currentTestimonialIndex: csState.currentTestimonialIndex
  };
  localStorage.setItem(CS_STORAGE_KEY, JSON.stringify(payload));
}

// ---------- DOM CACHE ----------

const csEl = {};

function csCacheDom() {
  csEl.heroName = document.getElementById("csHeroName");
  csEl.heroTitle = document.getElementById("csHeroTitle");
  csEl.heroTagline = document.getElementById("csHeroTagline");
  csEl.profileRate = document.getElementById("csProfileRate");
  csEl.statClients = document.getElementById("csStatClients");
  csEl.statYears = document.getElementById("csStatYears");
  csEl.statRating = document.getElementById("csStatRating");
  csEl.location = document.getElementById("csLocation");
  csEl.focusList = document.getElementById("csFocusList");
  csEl.serviceTagRow = document.getElementById("csServiceTagRow");
  csEl.serviceCards = document.getElementById("csServiceCards");
  csEl.serviceSelect = document.getElementById("csServiceSelect");
  csEl.capacityGrid = document.getElementById("csCapacityGrid");
  csEl.portfolioGrid = document.getElementById("csPortfolioGrid");
  csEl.testSlider = document.getElementById("csTestimonialSlider");
  csEl.testPrev = document.getElementById("csTestPrev");
  csEl.testNext = document.getElementById("csTestNext");
  csEl.bookingForm = document.getElementById("csBookingForm");
  csEl.bookingSuccess = document.getElementById("csBookingSuccess");
  csEl.year = document.getElementById("csYear");
  csEl.ownerDrawer = document.getElementById("csOwnerDrawer");
  csEl.ownerToggle = document.getElementById("csOwnerToggle");
  csEl.adminToggle = document.getElementById("csAdminToggle");
  csEl.statServices = document.getElementById("csStatServices");
  csEl.statPortfolio = document.getElementById("csStatPortfolio");
  csEl.statTestimonials = document.getElementById("csStatTestimonials");
  csEl.editHeroBtn = document.getElementById("csEditHeroBtn");
  csEl.addServiceBtn = document.getElementById("csAddServiceBtn");
  csEl.themeToggleBtn = document.getElementById("csThemeToggleBtn");
  csEl.modal = document.getElementById("csModal");
  csEl.modalBody = document.getElementById("csModalBody");
  csEl.modalClose = document.getElementById("csModalClose");
}

// ---------- RENDER ----------

function csRenderProfile() {
  csEl.heroName.textContent = CS_PROFILE.name;
  csEl.heroTitle.textContent = CS_PROFILE.title;
  csEl.heroTagline.textContent = CS_PROFILE.tagline;
  csEl.profileRate.textContent = `K${CS_PROFILE.rate} / session`;
  csEl.statClients.textContent = `${CS_PROFILE.clients}+`;
  csEl.statYears.textContent = CS_PROFILE.years;
  csEl.statRating.textContent = `${CS_PROFILE.rating.toFixed(1)}★`;
  csEl.location.textContent = CS_PROFILE.location;

  csEl.focusList.innerHTML = "";
  CS_PROFILE.focusAreas.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    csEl.focusList.appendChild(li);
  });
}

function csGetAllServiceTags() {
  const tags = new Set();
  CS_SERVICES.forEach((s) => s.focus.forEach((f) => tags.add(f)));
  return ["All", ...Array.from(tags)];
}

function csRenderServiceTags() {
  csEl.serviceTagRow.innerHTML = "";
  const tags = csGetAllServiceTags();
  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "cs-tag-chip" + (csState.activeServiceTag === tag ? " active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      csState.activeServiceTag = tag;
      csSaveToStorage();
      csRenderServiceTags();
      csRenderServices();
    });
    csEl.serviceTagRow.appendChild(btn);
  });
}

function csRenderServices() {
  csEl.serviceCards.innerHTML = "";

  const active = csState.activeServiceTag;
  const list =
    active === "All"
      ? CS_SERVICES
      : CS_SERVICES.filter((s) => s.focus.includes(active));

  list.forEach((service) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6";

    const card = document.createElement("article");
    card.className = "cs-service-card";
    card.dataset.serviceId = String(service.id);

    const labelRow = document.createElement("div");
    labelRow.className = "cs-service-label-row";

    const label = document.createElement("div");
    label.className = "cs-service-label";
    label.textContent = service.label;
    const pill = document.createElement("div");
    pill.className = "cs-service-pill";
    pill.textContent = service.format;

    labelRow.appendChild(label);
    labelRow.appendChild(pill);
    card.appendChild(labelRow);

    const title = document.createElement("h3");
    title.className = "cs-service-title";
    title.textContent = service.title;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "cs-service-desc";
    desc.textContent = service.description;
    card.appendChild(desc);

    const meta = document.createElement("div");
    meta.className = "cs-service-meta";

    const price = document.createElement("div");
    price.className = "cs-service-price";
    price.textContent = `From K${service.priceFrom}`;
    const duration = document.createElement("div");
    duration.className = "cs-service-duration";
    duration.textContent = service.durationLabel;

    meta.appendChild(price);
    meta.appendChild(duration);
    card.appendChild(meta);

    const bestFor = document.createElement("p");
    bestFor.className = "cs-service-desc";
    bestFor.style.fontSize = "0.82rem";
    bestFor.style.marginBottom = "0.4rem";
    bestFor.textContent = service.bestFor;
    card.appendChild(bestFor);

    const foot = document.createElement("div");
    foot.className = "cs-service-foot";

    const primary = document.createElement("button");
    primary.type = "button";
    primary.className = "btn cs-btn-primary";
    primary.textContent = "Book this";
    primary.addEventListener("click", () => {
      csSelectServiceInForm(service.id);
      document
        .getElementById("cs-booking")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const more = document.createElement("button");
    more.type = "button";
    more.className = "btn cs-btn-soft cs-btn-ghost-alt";
    more.textContent = "Details";
    more.addEventListener("click", () => csOpenServiceModal(service));

    foot.appendChild(primary);
    foot.appendChild(more);
    card.appendChild(foot);

    col.appendChild(card);
    csEl.serviceCards.appendChild(col);
  });

  // update stats
  csEl.statServices.textContent = CS_SERVICES.length;
}

function csRenderServiceSelect() {
  csEl.serviceSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a service";
  csEl.serviceSelect.appendChild(placeholder);

  CS_SERVICES.forEach((service) => {
    const opt = document.createElement("option");
    opt.value = String(service.id);
    opt.textContent = `${service.title} (from K${service.priceFrom})`;
    csEl.serviceSelect.appendChild(opt);
  });
}

function csSelectServiceInForm(serviceId) {
  csEl.serviceSelect.value = String(serviceId);
}

function csRenderCapacity() {
  csEl.capacityGrid.innerHTML = "";
  CS_CAPACITY.forEach((item) => {
    const div = document.createElement("div");
    let levelClass = "cs-capacity-level-medium";
    if (item.level === "low") levelClass = "cs-capacity-level-low";
    if (item.level === "high") levelClass = "cs-capacity-level-high";
    div.className = `cs-capacity-box ${levelClass}`;

    const label = document.createElement("div");
    label.className = "cs-capacity-label";
    label.textContent = item.label;

    const value = document.createElement("div");
    value.className = "cs-capacity-value";
    value.textContent = item.text;

    div.appendChild(label);
    div.appendChild(value);
    csEl.capacityGrid.appendChild(div);
  });
}

function csRenderPortfolio() {
  csEl.portfolioGrid.innerHTML = "";
  CS_PORTFOLIO.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-4";

    const card = document.createElement("article");
    card.className = "cs-portfolio-card";
    card.addEventListener("click", () => csOpenCaseStudyModal(item));

    const label = document.createElement("div");
    label.className = "cs-portfolio-label";
    label.textContent = item.label;

    const title = document.createElement("h3");
    title.className = "cs-portfolio-title";
    title.textContent = item.title;

    const desc = document.createElement("p");
    desc.className = "cs-portfolio-desc";
    desc.textContent = item.snippet;

    const meta = document.createElement("div");
    meta.className = "cs-portfolio-meta";
    meta.innerHTML = `<span>${item.duration}</span><span>${item.focus}</span>`;

    card.appendChild(label);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);

    col.appendChild(card);
    csEl.portfolioGrid.appendChild(col);
  });

  csEl.statPortfolio.textContent = CS_PORTFOLIO.length;
}

function csRenderTestimonial() {
  const index =
    ((csState.currentTestimonialIndex % CS_TESTIMONIALS.length) +
      CS_TESTIMONIALS.length) % CS_TESTIMONIALS.length;
  csState.currentTestimonialIndex = index;

  const t = CS_TESTIMONIALS[index];
  csEl.testSlider.innerHTML = "";

  const card = document.createElement("article");
  card.className = "cs-testimonial-card";

  const quote = document.createElement("p");
  quote.className = "cs-testimonial-quote";
  quote.textContent = t.quote;

  const meta = document.createElement("div");
  meta.className = "cs-testimonial-meta";
  meta.innerHTML = `
    <div>
      <div class="cs-testimonial-name">${t.name}</div>
      <div>${t.location}</div>
    </div>
    <div>${t.focus}</div>
  `;

  card.appendChild(quote);
  card.appendChild(meta);
  csEl.testSlider.appendChild(card);

  csEl.statTestimonials.textContent = CS_TESTIMONIALS.length;
}

// ---------- MODALS ----------

function csOpenServiceModal(service) {
  csEl.modalBody.innerHTML = `
    <h3>${service.title}</h3>
    <p class="mb-2"><strong>Container:</strong> ${service.durationLabel}</p>
    <p class="mb-2"><strong>Format:</strong> ${service.format}</p>
    <p class="mb-2"><strong>Investment:</strong> From K${service.priceFrom}</p>
    <p class="mb-2"><strong>Focus areas:</strong> ${service.focus.join(", ")}</p>
    <p class="mt-3 mb-0">${service.description}</p>
    <p class="mt-2" style="font-size:0.85rem; color:#6b6b6b;">${service.bestFor}</p>
  `;
  csShowModal();
}

function csOpenCaseStudyModal(item) {
  csEl.modalBody.innerHTML = `
    <h3>${item.title}</h3>
    <p class="mb-2"><strong>Client archetype:</strong> ${item.label}</p>
    <p class="mb-2"><strong>Duration:</strong> ${item.duration}</p>
    <p class="mb-2"><strong>Focus:</strong> ${item.focus}</p>
    <p class="mt-3 mb-2">${item.snippet}</p>
    <p class="mb-2"><strong>Outcome:</strong> ${item.outcome}</p>
    <p class="mt-2 mb-0" style="font-size:0.9rem; color:#6b6b6b;">${item.process}</p>
  `;
  csShowModal();
}

function csShowModal() {
  csEl.modal.classList.remove("d-none");
}

function csHideModal() {
  csEl.modal.classList.add("d-none");
}

// ---------- EVENTS ----------

function csBindEvents() {
  csEl.testPrev.addEventListener("click", () => {
    csState.currentTestimonialIndex =
      (csState.currentTestimonialIndex - 1 + CS_TESTIMONIALS.length) %
      CS_TESTIMONIALS.length;
    csSaveToStorage();
    csRenderTestimonial();
  });

  csEl.testNext.addEventListener("click", () => {
    csState.currentTestimonialIndex =
      (csState.currentTestimonialIndex + 1) % CS_TESTIMONIALS.length;
    csSaveToStorage();
    csRenderTestimonial();
  });

  csEl.bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    csEl.bookingSuccess.classList.remove("d-none");
    setTimeout(() => {
      csEl.bookingSuccess.classList.add("d-none");
    }, 6000);
    e.target.reset();
  });

  csEl.ownerToggle.addEventListener("click", () => {
    csEl.ownerDrawer.classList.toggle("collapsed");
  });

  csEl.adminToggle.addEventListener("change", (e) => {
    csState.adminMode = e.target.checked;
    document.body.classList.toggle("cs-admin-mode", csState.adminMode);
    csSaveToStorage();
  });

  csEl.themeToggleBtn.addEventListener("click", () => {
    csState.altTheme = !csState.altTheme;
    document.body.classList.toggle("cs-alt-theme", csState.altTheme);
    csSaveToStorage();
  });

  csEl.editHeroBtn.addEventListener("click", () => {
    if (!csState.adminMode) return;
    const name = prompt("Edit name:", CS_PROFILE.name);
    if (name && name.trim()) {
      CS_PROFILE.name = name.trim();
      csEl.heroName.textContent = CS_PROFILE.name;
    }
    const title = prompt("Edit title:", CS_PROFILE.title);
    if (title && title.trim()) {
      CS_PROFILE.title = title.trim();
      csEl.heroTitle.textContent = CS_PROFILE.title;
    }
    const tagline = prompt("Edit tagline:", CS_PROFILE.tagline);
    if (tagline && tagline.trim()) {
      CS_PROFILE.tagline = tagline.trim();
      csEl.heroTagline.textContent = CS_PROFILE.tagline;
    }
  });

  csEl.addServiceBtn.addEventListener("click", () => {
    if (!csState.adminMode) return;
    const title = prompt("New service title:");
    if (!title || !title.trim()) return;
    const priceStr = prompt("From price (K):", "500");
    const price = parseFloat(priceStr);
    if (Number.isNaN(price)) return;
    const label = prompt("Label (e.g. Deep dive / Lite):", "Custom");
    const duration = prompt("Duration label:", "3 x 60-min sessions");
    const desc = prompt("Short description:", "New service created from Owner tools.");
    const focusRaw = prompt(
      "Focus tags (comma separated):",
      "Custom,Support"
    );
    const focus = focusRaw
      ? focusRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["Custom"];

    CS_SERVICES.push({
      id: Date.now(),
      label: label || "Custom",
      title: title.trim(),
      description: desc || "",
      focus,
      format: "Online",
      priceFrom: price,
      durationLabel: duration || "",
      bestFor: ""
    });

    csRenderServiceTags();
    csRenderServices();
    csRenderServiceSelect();
  });

  csEl.modalClose.addEventListener("click", csHideModal);
  csEl.modal.addEventListener("click", (e) => {
    if (e.target === csEl.modal || e.target.classList.contains("cs-modal-backdrop")) {
      csHideModal();
    }
  });
}

// ---------- INIT ----------

function csInit() {
  csLoadFromStorage();
  csCacheDom();
  csRenderProfile();
  csRenderServiceTags();
  csRenderServices();
  csRenderServiceSelect();
  csRenderCapacity();
  csRenderPortfolio();
  csRenderTestimonial();
  csBindEvents();

  csEl.year.textContent = new Date().getFullYear();

  // apply stored theme/admin
  document.body.classList.toggle("cs-alt-theme", csState.altTheme);
  document.body.classList.toggle("cs-admin-mode", csState.adminMode);
  csEl.adminToggle.checked = csState.adminMode;
}

document.addEventListener("DOMContentLoaded", csInit);
