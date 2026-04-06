
const classSubTemplates = [
  {
    id: "classes",
    title: "Classes",
    subtitle: "Offer structured lessons such as guitar, coding, maths and more",
    thumb: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80"
  },
  {
    id: "consultations",
    title: "Consultations",
    subtitle: "Provide professional 1-on-1 coaching, advice or expert sessions",
    thumb: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80"
  }
];
/* CLEAN + UPDATED WITH SUB-TEMPLATES */

const templates = [
  {
    id: "A",
    title: "Physical Products Store",
    subtitle: "Sell anything you can ship — bilums, phones, coffee, clothes",
    bg: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
    features: [
      "Smart inventory & stock alerts",
      "PNG-wide shipping zones",
      "Variants, bundles, flash sales",
      "Beautiful product galleries"
    ]
  },
  {
    id: "B",
    title: "Skills & Services Store",
    subtitle: "Get paid for your talent — design, repair, tutoring, photography",
    bg: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    features: [
      "Fixed price or hourly gigs",
      "Built-in booking calendar",
      "Portfolio + customer reviews",
      "Instant chat & file sharing"
    ]
  },
  {
    id: "C",
    title: "Classes & Courses Store",
    subtitle: "Teach what you know — guitar, coding, cooking, Tok Pisin, business",
    bg: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&q=85",
    thumb: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
    features: [
      "Upload videos or teach live",
      "Student progress tracking",
      "Certificates & quizzes",
      "One-time or subscription fees"
    ]
  }
];

const skillSubTemplates = [
  {
    id: "art",
    title: "Art & Design",
    subtitle: "Sell drawings, digital art, paintings or offer commissions",
    thumb: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&q=80"
  },
  {
    id: "music",
    title: "Music Services",
    subtitle: "Offer lessons, mixing, beats, vocals and production",
    thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80"
  },
  {
    id: "photo",
    title: "Photography",
    subtitle: "Offer photoshoots, editing, events & studio work",
    thumb: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80"
  },
  {
    id: "coding",
    title: "Coding & Development",
    subtitle: "Offer coding lessons, build apps, websites or automations",
    thumb: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
  }
];

let current = 0;
let selectedTemplate = null;

const el = {
  chooser: document.getElementById('chooser'),
  preview: document.getElementById('preview-mode'),
  selection: document.getElementById('selection-mode'),
  subSelection: document.getElementById('sub-selection-mode'),
  badge: document.getElementById('badge'),
  title: document.getElementById('title'),
  subtitle: document.getElementById('subtitle'),
  features: document.getElementById('features'),
  grid: document.getElementById('selection-grid'),
  subGrid: document.getElementById('sub-grid'),
  dots: document.getElementById('dots'),
  prev: document.getElementById('prev'),
  next: document.getElementById('next'),
};

const checkSVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
`;

function updatePreview() {
  const t = templates[current];
  el.chooser.style.backgroundImage = 
    `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${t.bg})`;

  el.badge.textContent = `Template ${t.id}`;
  el.title.textContent = t.title;
  el.subtitle.textContent = t.subtitle;

  el.features.innerHTML = t.features.map(f => `
    <div class="feature">
      ${checkSVG}
      <span>${f}</span>
    </div>
  `).join('');
}

function showSelection() {
  el.preview.style.display = "none";
  el.selection.style.display = "block";
  el.subSelection.style.display = "none";

  el.grid.innerHTML = templates.map(t => `
    <div class="template-card" data-id="${t.id}">
      <div class="thumb" style="background-image:url(${t.thumb})"></div>
      <h3>Template ${t.id}: ${t.title}</h3>
      <p>${t.subtitle}</p>
      <div class="check">${checkSVG}</div>
    </div>
  `).join("");

  document.querySelectorAll('.template-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('.template-card')
        .forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTemplate = card.dataset.id;

      el.next.textContent = `Continue with Template ${selectedTemplate}`;
      el.next.classList.remove("btn-disabled");
    };
  });
}

function showSkillSubTemplates() {
  el.preview.style.display = "none";
  el.selection.style.display = "none";
  el.subSelection.style.display = "block";

  el.subGrid.innerHTML = skillSubTemplates.map(t => `
    <div class="template-card" data-sub="${t.id}">
      <div class="thumb" style="background-image:url(${t.thumb})"></div>
      <h3>${t.title}</h3>
      <p>${t.subtitle}</p>
      <div class="check">${checkSVG}</div>
    </div>
  `).join("");

  document.querySelectorAll('#sub-grid .template-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('#sub-grid .template-card')
        .forEach(c => c.classList.remove('selected'));

      card.classList.add('selected');
      const chosenSub = card.dataset.sub;

      el.next.textContent = `Continue with ${chosenSub}`;
      el.next.classList.remove("btn-disabled");

      el.next.onclick = () => {
        window.location.href = `seller-wizard.html?template=B&sub=${chosenSub}`;
      };
    };
  });
}


function showClassSubTemplates() {
  el.preview.style.display = "none";
  el.selection.style.display = "none";
  el.subSelection.style.display = "none";
  document.getElementById('sub-selection-mode-c').style.display = "block";

  const gridC = document.getElementById('sub-grid-c');
  gridC.innerHTML = classSubTemplates.map(t => `
    <div class="template-card" data-sub="${t.id}">
      <div class="thumb" style="background-image:url(${t.thumb})"></div>
      <h3>${t.title}</h3>
      <p>${t.subtitle}</p>
      <div class="check">${checkSVG}</div>
    </div>
  `).join("");

  document.querySelectorAll('#sub-grid-c .template-card').forEach(card => {
    card.onclick = () => {
      document.querySelectorAll('#sub-grid-c .template-card')
        .forEach(c => c.classList.remove('selected'));

      card.classList.add('selected');
      const chosenSub = card.dataset.sub;

      el.next.textContent = `Continue with ${chosenSub}`;
      el.next.classList.remove("btn-disabled");

      el.next.onclick = () => {
        window.location.href = `seller-wizard.html?template=C&sub=${chosenSub}`;
      };
    };
  });
}

function updateDots() {
  el.dots.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('span');
    dot.className = "dot";
    if (i === (current < 3 ? current : 3)) dot.classList.add("active");
    el.dots.appendChild(dot);
  }
}

el.prev.onclick = () => {
  if (current > 0) {
    current--;

    // Reset ALL screens
    el.preview.style.display = "block";
    el.selection.style.display = "none";
    el.subSelection.style.display = "none";
    const cScreen = document.getElementById('sub-selection-mode-c');
    if (cScreen) cScreen.style.display = "none";

    // Reset Next button
    el.next.textContent = "Next";
    el.next.classList.add("btn-disabled");

    // Reset selected template
    selectedTemplate = null;

    updatePreview();
    updateDots();
  }
};

el.next.onclick = () => {
  if (current < 2) {
    current++;
    updatePreview();
    updateDots();
  } 
  else if (current === 2) {
    current = 3;
    showSelection();
    el.next.textContent = "Please select a template";
    el.next.classList.add("btn-disabled");
    updateDots();
  }  
  else if (selectedTemplate) {
    if (selectedTemplate === "B") {
      showSkillSubTemplates();
    } else if (selectedTemplate === "C") {
      showClassSubTemplates();
    } else {
      window.location.href = `seller-wizard.html?template=${selectedTemplate}`;
    }
  }
};

updatePreview();
updateDots();
