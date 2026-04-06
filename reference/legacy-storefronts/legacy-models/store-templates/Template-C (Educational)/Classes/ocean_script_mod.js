/**
 * Ocean Studio teaching page script – neon/ocean night variant.
 * Keeps the original reef architecture but with slightly adjusted copy.
 */

// ---------- DATA ----------

const coralCourses = [
  {
    id: 1,
    title: "Emotional Intelligence Mastery",
    description: "Deep 8-week journey into emotional clarity, boundaries and resilience.",
    type: "Course",
    category: "Emotional Intelligence",
    price: 850,
    durationLabel: "8 weeks",
    durationType: "medium",
    rating: 4.9,
    students: 340,
    popularity: 95,
    updatedDaysAgo: 4,
    spots: 24,
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200"
  },
  {
    id: 2,
    title: "Confidence & Identity Workshop",
    description: "A healing 2-day live workshop focused on authenticity and grounded self-confidence.",
    type: "Workshop",
    category: "Identity",
    price: 650,
    durationLabel: "2 days",
    durationType: "short",
    rating: 4.8,
    students: 180,
    popularity: 88,
    updatedDaysAgo: 9,
    spots: 12,
    imageUrl: "https://images.unsplash.com/photo-1504714146340-959ca07b0f29?q=80&w=1200"
  },
  {
    id: 3,
    title: "Mindfulness Digital Journal",
    description: "A curated digital journal with daily prompts rooted in neuroscience & well-being.",
    type: "Digital",
    category: "Mindfulness",
    price: 90,
    durationLabel: "Lifetime access",
    durationType: "short",
    rating: 4.7,
    students: 520,
    popularity: 80,
    updatedDaysAgo: 14,
    spots: null,
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200"
  },
  {
    id: 4,
    title: "Boundaries & Relationships",
    description: "Learn to say no gently but clearly, and build relationships that feel mutual.",
    type: "Course",
    category: "Relationships",
    price: 780,
    durationLabel: "6 weeks",
    durationType: "medium",
    rating: 4.9,
    students: 260,
    popularity: 92,
    updatedDaysAgo: 6,
    spots: 30,
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200"
  },
  {
    id: 5,
    title: "Slow Productivity for Burnt-Out High Achievers",
    description: "Redesign how you work so your nervous system and calendar finally agree.",
    type: "Course",
    category: "Productivity",
    price: 940,
    durationLabel: "10 weeks",
    durationType: "long",
    rating: 4.9,
    students: 145,
    popularity: 90,
    updatedDaysAgo: 2,
    spots: 18,
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200"
  },
  {
    id: 6,
    title: "Anxiety First Aid Kit",
    description: "Short, practical tools you can reach for in the middle of an anxious spiral.",
    type: "Digital",
    category: "Anxiety",
    price: 120,
    durationLabel: "Self-paced",
    durationType: "short",
    rating: 4.6,
    students: 610,
    popularity: 85,
    updatedDaysAgo: 20,
    spots: null,
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200"
  },
  {
    id: 7,
    title: "Gentle Morning Rituals",
    description: "A 14-day reset for mornings that welcome you instead of attacking you.",
    type: "Course",
    category: "Mindfulness",
    price: 280,
    durationLabel: "2 weeks",
    durationType: "short",
    rating: 4.8,
    students: 302,
    popularity: 77,
    updatedDaysAgo: 18,
    spots: null,
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200"
  },
  {
    id: 8,
    title: "Therapeutic Writing Lab",
    description: "Live space where you process your story in a structured, supported way.",
    type: "Workshop",
    category: "Self-Discovery",
    price: 720,
    durationLabel: "3 evenings",
    durationType: "medium",
    rating: 4.9,
    students: 96,
    popularity: 83,
    updatedDaysAgo: 11,
    spots: 10,
    imageUrl: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?q=80&w=1200"
  },
  {
    id: 9,
    title: "Nervous System Reset",
    description: "Body-based tools to bring you out of fight-or-flight and back into safety.",
    type: "Course",
    category: "Somatic",
    price: 880,
    durationLabel: "5 weeks",
    durationType: "medium",
    rating: 4.8,
    students: 210,
    popularity: 89,
    updatedDaysAgo: 1,
    spots: 25,
    imageUrl: "https://images.unsplash.com/photo-1526402461234-4f3b94f5d3a5?q=80&w=1200"
  }
];

const reefState = {
  sortBy: "popular",
  viewMode: "grid",
  currentPage: 1,
  pageSize: 9
};

// ---------- HELPERS ----------

function sortCoral(list) {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (reefState.sortBy) {
      case "popular":
        return b.popularity - a.popularity;
      case "newest":
        return a.updatedDaysAgo - b.updatedDaysAgo;
      case "priceLow":
        return a.price - b.price;
      case "priceHigh":
        return b.price - a.price;
      case "rating":
        return b.rating - a.rating;
      case "durationShort": {
        const order = { short: 0, medium: 1, long: 2 };
        return (order[a.durationType] || 2) - (order[b.durationType] || 2);
      }
      default:
        return 0;
    }
  });
  return sorted;
}

function showPlankton(isLoading) {
  const loader = document.getElementById("planktonLoader");
  if (!loader) return;
  loader.classList.toggle("d-none", !isLoading);
}

// ---------- RENDERING ----------

function renderReefCourses() {
  const reef = document.getElementById("coralCourseReef");
  const empty = document.getElementById("emptyReef");
  const pager = document.getElementById("tidePagination");
  if (!reef || !pager || !empty) return;

  const list = sortCoral(coralCourses);

  if (!list.length) {
    empty.classList.remove("d-none");
    reef.innerHTML = "";
    pager.innerHTML = "";
    return;
  }

  empty.classList.add("d-none");

  const totalPages = Math.ceil(list.length / reefState.pageSize);
  if (reefState.currentPage > totalPages) reefState.currentPage = totalPages || 1;

  const start = (reefState.currentPage - 1) * reefState.pageSize;
  const toShow = list.slice(start, start + reefState.pageSize);

  reef.innerHTML = "";

  toShow.forEach(course => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4 coral-course-col";

    const card = document.createElement("article");
    card.className = "coral-card";
    card.tabIndex = 0;

    const imgWrap = document.createElement("div");
    imgWrap.className = "coral-card-img";
    const img = document.createElement("img");
    img.src = course.imageUrl;
    img.alt = course.title;
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    const body = document.createElement("div");
    body.className = "coral-card-body";

    const titleEl = document.createElement("h3");
    titleEl.className = "coral-card-title";
    titleEl.textContent = course.title;
    body.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = "coral-card-desc";
    descEl.textContent = course.description;
    body.appendChild(descEl);

    const meta = document.createElement("div");
    meta.className = "coral-card-meta";

    const price = document.createElement("span");
    price.className = "coral-card-price";
    price.textContent = `K${course.price}`;
    meta.appendChild(price);

    const typeDur = document.createElement("span");
    typeDur.className = "coral-card-type";
    typeDur.textContent = `${course.type} • ${course.durationLabel}`;
    meta.appendChild(typeDur);

    body.appendChild(meta);

    const stats = document.createElement("div");
    stats.className = "coral-card-stats";
    stats.textContent = `${course.rating.toFixed(1)} ★ · ${course.students} students`;
    body.appendChild(stats);

    const actions = document.createElement("div");
    actions.className = "coral-card-actions";

    const enrollBtn = document.createElement("button");
    enrollBtn.type = "button";
    enrollBtn.className = "coral-btn-main";
    enrollBtn.textContent = "Enroll now";
    enrollBtn.addEventListener("click", event => {
      event.stopPropagation();
      alert(`This would take the student to the enrollment page for:\n\n${course.title}`);
    });

    const quickBtn = document.createElement("button");
    quickBtn.type = "button";
    quickBtn.className = "coral-btn-secondary";
    quickBtn.textContent = "Quick view";
    quickBtn.addEventListener("click", event => {
      event.stopPropagation();
      openKraken(course);
    });

    actions.appendChild(enrollBtn);
    actions.appendChild(quickBtn);
    body.appendChild(actions);

    card.appendChild(body);

    card.addEventListener("click", () => {
      openKraken(course);
    });

    col.appendChild(card);
    reef.appendChild(col);
  });

  // Pagination controls
  pager.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "reef-page-btn";
  prev.textContent = "‹";
  prev.disabled = reefState.currentPage === 1;
  prev.addEventListener("click", () => {
    if (reefState.currentPage > 1) {
      reefState.currentPage--;
      refreshReef();
    }
  });
  pager.appendChild(prev);

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reef-page-btn" + (p === reefState.currentPage ? " active" : "");
    btn.textContent = String(p);
    btn.addEventListener("click", () => {
      reefState.currentPage = p;
      refreshReef();
    });
    pager.appendChild(btn);
  }

  const next = document.createElement("button");
  next.type = "button";
  next.className = "reef-page-btn";
  next.textContent = "›";
  next.disabled = reefState.currentPage === totalPages;
  next.addEventListener("click", () => {
    if (reefState.currentPage < totalPages) {
      reefState.currentPage++;
      refreshReef();
    }
  });
  pager.appendChild(next);
}

// ---------- MODAL / QUICK VIEW ----------

function openKraken(course) {
  const shell = document.getElementById("krakenModal");
  const body = document.getElementById("krakenContent");
  if (!shell || !body) return;

  body.innerHTML = `
    <h3>${course.title}</h3>
    <p class="mb-2"><strong>Type:</strong> ${course.type} • ${course.durationLabel}</p>
    <p class="mb-2"><strong>Category:</strong> ${course.category}</p>
    <p class="mb-2"><strong>Price:</strong> K${course.price}</p>
    <p class="mb-3">${course.description}</p>
    <p class="coral-card-stats mb-1">${course.rating.toFixed(1)} ★ · ${course.students} students enrolled</p>
    <p class="coral-card-stats">Updated ${course.updatedDaysAgo} days ago</p>
  `;

  shell.classList.remove("d-none");
}

function closeKraken() {
  const shell = document.getElementById("krakenModal");
  if (!shell) return;
  shell.classList.add("d-none");
}

// ---------- CONTROLS BINDING ----------

function bindReefControls() {
  const sortSelect = document.getElementById("dolphinSort");
  if (sortSelect) {
    sortSelect.addEventListener("change", event => {
      reefState.sortBy = event.target.value;
      reefState.currentPage = 1;
      refreshReef();
    });
  }

  const viewButtons = document.querySelectorAll(".reef-view-toggle");
  const reefContainer = document.getElementById("coralCourseReef");
  viewButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.view;
      reefState.viewMode = mode;

      viewButtons.forEach(b => b.classList.toggle("active", b === btn));

      if (reefContainer) {
        reefContainer.classList.remove("reef-view-grid", "reef-view-list", "reef-view-compact");
        reefContainer.classList.add("reef-view-" + mode);
      }
    });
  });

  const krakenClose = document.getElementById("krakenClose");
  const krakenShell = document.getElementById("krakenModal");
  if (krakenClose) {
    krakenClose.addEventListener("click", closeKraken);
  }
  if (krakenShell) {
    krakenShell.addEventListener("click", event => {
      if (event.target === krakenShell || event.target.classList.contains("kraken-backdrop")) {
        closeKraken();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeKraken();
    }
  });
}

// ---------- REFRESH WITH SMALL LOADER ----------

function refreshReef() {
  showPlankton(true);
  setTimeout(() => {
    renderReefCourses();
    showPlankton(false);
  }, 160);
}

// ---------- INIT ----------

document.addEventListener("DOMContentLoaded", () => {
  bindReefControls();
  refreshReef();
});


  // Pager Redirects

(function setupSettingsNav(){
  const settingsLink = document.querySelector('.coral-btn-main');
  if(!settingsLink) return;

  settingsLink.addEventListener('click', (e)=>{
    e.preventDefault();
    window.location.href = "Registration-and-enrollment/index.html"; // <-- replace with your real file
  });
})();