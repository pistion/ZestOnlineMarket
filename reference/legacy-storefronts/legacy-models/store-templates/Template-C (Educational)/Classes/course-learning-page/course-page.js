// Simple in-browser data model for the course page
const courseData = {
    id: "creative-storytelling-course",
    title: "Intro to Creative Storytelling",
    summary:
        "Use this layout as a focused learning space: a clean sidebar for lessons, a main video area, and a discussion thread under every lesson.",
    modules: [
        {
            id: "module-1",
            title: "Module 1 · Foundations",
            subtitle: "Getting oriented",
            lessons: [
                {
                    id: "lesson-1-1",
                    title: "Welcome & How This Space Works",
                    duration: "05:12",
                    level: "Intro",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                    description:
                        "A quick overview of how students move through lessons, track progress, and use the discussion area to ask questions.",
                },
                {
                    id: "lesson-1-2",
                    title: "Designing a Focused Learning Layout",
                    duration: "07:34",
                    level: "Core",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
                    description:
                        "We walk through the core layout of this page: sidebar modules, main video space, and companion chat for every lesson.",
                },
            ],
        },
        {
            id: "module-2",
            title: "Module 2 · Structuring Lessons",
            subtitle: "From idea to clear sequence",
            lessons: [
                {
                    id: "lesson-2-1",
                    title: "Breaking a Course into Chapters",
                    duration: "09:02",
                    level: "Core",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
                    description:
                        "How to group your topics into modules and lessons so students always know where they are in the journey.",
                },
                {
                    id: "lesson-2-2",
                    title: "Layering Video, Notes & Resources",
                    duration: "11:48",
                    level: "Applied",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-20s.mp4",
                    description:
                        "Use video, written descriptions, PDFs and external links together without overwhelming the learner.",
                },
            ],
        },
        {
            id: "module-3",
            title: "Module 3 · Engagement & Feedback",
            subtitle: "Make the page interactive",
            lessons: [
                {
                    id: "lesson-3-1",
                    title: "Using the Discussion Thread Effectively",
                    duration: "06:21",
                    level: "Core",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-30s.mp4",
                    description:
                        "Examples of how students can ask questions, respond to each other, and leave time-stamped notes for later review.",
                },
                {
                    id: "lesson-3-2",
                    title: "Tracking Progress & Completion",
                    duration: "08:39",
                    level: "Core",
                    videoSrc:
                        "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
                    description:
                        "Ideas for connecting this front-end with your backend so completion, quiz results and scores can be stored.",
                },
            ],
        },
    ],
    materials: [
        {
            id: "mat-outline",
            icon: "📘",
            title: "Course Outline (PDF)",
            meta: "High-level overview of all modules and lessons.",
            href: "#",
        },
        {
            id: "mat-checklist",
            icon: "✅",
            title: "Lesson Planning Checklist",
            meta: "Print this and use it when designing your own lessons.",
            href: "#",
        },
        {
            id: "mat-slides",
            icon: "🖼️",
            title: "Slide Deck Template",
            meta: "Starter slide template that matches this layout.",
            href: "#",
        },
    ],
};

// Local storage helpers
const STORAGE_KEYS = {
    LESSON_PROGRESS: `course-progress:${courseData.id}`,
    LESSON_CHAT: (lessonId) => `course-chat:${courseData.id}:${lessonId}`,
};

function loadProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.LESSON_PROGRESS);
        if (!raw) return {};
        return JSON.parse(raw) || {};
    } catch (e) {
        console.warn("Unable to load progress from localStorage", e);
        return {};
    }
}

function saveProgress(progress) {
    try {
        localStorage.setItem(
            STORAGE_KEYS.LESSON_PROGRESS,
            JSON.stringify(progress)
        );
    } catch (e) {
        console.warn("Unable to save progress to localStorage", e);
    }
}

function loadChatForLesson(lessonId) {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.LESSON_CHAT(lessonId));
        if (!raw) return [];
        return JSON.parse(raw) || [];
    } catch (e) {
        console.warn("Unable to load chat from localStorage", e);
        return [];
    }
}

function saveChatForLesson(lessonId, messages) {
    try {
        localStorage.setItem(
            STORAGE_KEYS.LESSON_CHAT(lessonId),
            JSON.stringify(messages)
        );
    } catch (e) {
        console.warn("Unable to save chat to localStorage", e);
    }
}

// App state
const state = {
    activeLessonId: null,
    progress: loadProgress(), // { [lessonId]: true }
};

document.addEventListener("DOMContentLoaded", () => {
    initCourseMeta();
    initMaterials();
    initModulesAndLessons();
    attachChatHandlers();
    updateOverallProgress();
});

// Initialize top course meta
function initCourseMeta() {
    const titleEl = document.getElementById("courseTitle");
    const summaryEl = document.getElementById("courseSummary");
    const lessonCountLabel = document.getElementById("lessonCountLabel");

    titleEl.textContent = courseData.title;
    summaryEl.textContent = courseData.summary;

    const totalLessons = courseData.modules.reduce(
        (count, m) => count + m.lessons.length,
        0
    );
    lessonCountLabel.textContent =
        totalLessons === 1 ? "1 lesson" : `${totalLessons} lessons`;
}

// Initialize materials list
function initMaterials() {
    const materialsList = document.getElementById("materialsList");
    materialsList.innerHTML = "";

    courseData.materials.forEach((mat) => {
        const li = document.createElement("li");
        li.className = "material-item";
        li.innerHTML = `
            <div class="material-icon">${mat.icon}</div>
            <div class="material-main">
                <p class="material-title">${mat.title}</p>
                <p class="material-meta">${mat.meta}</p>
            </div>
            <a href="${mat.href}" class="material-link" target="_blank" rel="noopener noreferrer">
                View
            </a>
        `;
        materialsList.appendChild(li);
    });
}

// Initialize modules & lessons list
function initModulesAndLessons() {
    const container = document.getElementById("modulesContainer");
    container.innerHTML = "";

    courseData.modules.forEach((module) => {
        const card = document.createElement("article");
        card.className = "module-card";

        const completedCount = module.lessons.filter(
            (lesson) => !!state.progress[lesson.id]
        ).length;
        const allCompleted = completedCount === module.lessons.length;

        const moduleIdAttr = module.id;

        card.innerHTML = `
            <div class="module-header" data-module="${moduleIdAttr}">
                <div class="module-title-wrapper">
                    <h4 class="module-title">${module.title}</h4>
                    <p class="module-subtitle">${module.subtitle}</p>
                </div>
                <div class="module-meta">
                    <span>${module.lessons.length} ${
            module.lessons.length === 1 ? "lesson" : "lessons"
        }</span>
                    <span>${completedCount}/${module.lessons.length} done</span>
                    <span class="module-progress-dot${
                        allCompleted ? " completed" : ""
                    }"></span>
                    <span class="module-toggle">▾</span>
                </div>
            </div>
            <ul class="lessons-list" data-lessons-for="${moduleIdAttr}"></ul>
        `;

        container.appendChild(card);

        const lessonsList = card.querySelector(".lessons-list");
        const header = card.querySelector(".module-header");
        const toggleList = () => {
            const expanded = lessonsList.classList.toggle("expanded");
            const toggleEl = header.querySelector(".module-toggle");
            toggleEl.textContent = expanded ? "▴" : "▾";
        };

        header.addEventListener("click", (evt) => {
            // Do not trigger when clicking a lesson; only module header
            if (evt.target.closest(".module-toggle") || evt.currentTarget) {
                toggleList();
            }
        });

        // Render lessons
        module.lessons.forEach((lesson) => {
            const li = document.createElement("li");
            li.className = "lesson-item";
            li.dataset.lessonId = lesson.id;

            const isCompleted = !!state.progress[lesson.id];
            li.innerHTML = `
                <div class="lesson-main">
                    <span class="lesson-title">${lesson.title}</span>
                    <div class="lesson-meta-row">
                        <span class="lesson-status-pill">${
                            isCompleted ? "Completed" : "Not started"
                        }</span>
                        <span class="lesson-duration">${lesson.duration}</span>
                        <span class="lesson-badge">${lesson.level}</span>
                    </div>
                </div>
                <div class="lesson-check">${
                    isCompleted ? "✓" : ""
                }</div>
            `;

            li.addEventListener("click", () => {
                selectLesson(lesson.id);
            });

            lessonsList.appendChild(li);
        });

        // Start with first module expanded
        if (courseData.modules[0].id === module.id) {
            lessonsList.classList.add("expanded");
        }
    });
}

// Select lesson to play
function selectLesson(lessonId) {
    const lesson = findLessonById(lessonId);
    if (!lesson) return;

    state.activeLessonId = lesson.id;

    // Update active lesson appearance
    document
        .querySelectorAll(".lesson-item")
        .forEach((item) => item.classList.remove("active"));

    const activeItem = document.querySelector(
        `.lesson-item[data-lesson-id="${lesson.id}"]`
    );
    if (activeItem) {
        activeItem.classList.add("active");
    }

    // Update video
    const videoEl = document.getElementById("lessonVideo");
    const sourceEl = document.getElementById("lessonVideoSource");
    sourceEl.src = lesson.videoSrc;
    // Reload the video source
    videoEl.load();
    videoEl.play().catch(() => {
        // autoplay may fail; ignore
    });

    // Update meta
    const titleEl = document.getElementById("activeLessonTitle");
    const metaEl = document.getElementById("activeLessonMeta");
    const descEl = document.getElementById("activeLessonDescription");
    titleEl.textContent = lesson.title;
    metaEl.textContent = `${lesson.duration} • ${lesson.level}`;
    descEl.textContent = lesson.description;

    // Update chat label
    const chatLabel = document.getElementById("chatLessonLabel");
    chatLabel.textContent = `Discussing: ${lesson.title}`;

    // Enable "mark complete" button
    const markBtn = document.getElementById("markCompleteBtn");
    markBtn.disabled = false;
    const isCompleted = !!state.progress[lesson.id];
    markBtn.textContent = isCompleted ? "Completed" : "Mark as complete";
    markBtn.classList.toggle("completed", isCompleted);

    markBtn.onclick = () => {
        toggleLessonCompleted(lesson.id);
    };

    // Load chat messages for this lesson
    renderChatMessagesForLesson(lesson.id);
}

// Helper: find lesson by ID
function findLessonById(lessonId) {
    for (const module of courseData.modules) {
        const lesson = module.lessons.find((l) => l.id === lessonId);
        if (lesson) return lesson;
    }
    return null;
}

// Toggle completion state
function toggleLessonCompleted(lessonId) {
    const isCompleted = !!state.progress[lessonId];
    if (isCompleted) {
        delete state.progress[lessonId];
    } else {
        state.progress[lessonId] = true;
    }

    saveProgress(state.progress);
    updateOverallProgress();
    refreshLessonIndicators(lessonId);
}

// Refresh checkmarks and status text for a single lesson + module
function refreshLessonIndicators(lessonId) {
    const isCompleted = !!state.progress[lessonId];

    const lessonItem = document.querySelector(
        `.lesson-item[data-lesson-id="${lessonId}"]`
    );
    if (lessonItem) {
        const statusPill = lessonItem.querySelector(".lesson-status-pill");
        const check = lessonItem.querySelector(".lesson-check");
        statusPill.textContent = isCompleted ? "Completed" : "Not started";
        check.textContent = isCompleted ? "✓" : "";
    }

    // Button state
    if (state.activeLessonId === lessonId) {
        const markBtn = document.getElementById("markCompleteBtn");
        markBtn.textContent = isCompleted ? "Completed" : "Mark as complete";
        markBtn.classList.toggle("completed", isCompleted);
    }

    // Update module-level dot & counts
    courseData.modules.forEach((module) => {
        const moduleCard = document.querySelector(
            `.module-header[data-module="${module.id}"]`
        );
        if (!moduleCard) return;

        const completedCount = module.lessons.filter(
            (lesson) => !!state.progress[lesson.id]
        ).length;
        const allCompleted = completedCount === module.lessons.length;

        const metaSpans = moduleCard.querySelectorAll(".module-meta span");
        if (metaSpans.length >= 2) {
            metaSpans[1].textContent = `${completedCount}/${module.lessons.length} done`;
        }

        const dot = moduleCard.querySelector(".module-progress-dot");
        if (dot) {
            dot.classList.toggle("completed", allCompleted);
        }
    });
}

// Calculate and update overall progress
function updateOverallProgress() {
    const totalLessons = courseData.modules.reduce(
        (count, m) => count + m.lessons.length,
        0
    );
    const completedLessons = Object.values(state.progress).filter(Boolean)
        .length;

    const percentage =
        totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    const fillEl = document.getElementById("overallProgressFill");
    const valueEl = document.getElementById("overallProgressValue");
    fillEl.style.width = `${percentage}%`;
    valueEl.textContent = `${percentage}%`;
}

// Chat: render for the active lesson
function renderChatMessagesForLesson(lessonId) {
    const messagesContainer = document.getElementById("chatMessages");
    messagesContainer.innerHTML = "";

    if (!lessonId) {
        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.textContent = "Select a lesson to see or start a discussion.";
        messagesContainer.appendChild(empty);
        return;
    }

    const messages = loadChatForLesson(lessonId);

    if (!messages.length) {
        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.textContent =
            "No messages yet for this lesson. Be the first to ask a question or leave a note.";
        messagesContainer.appendChild(empty);
        return;
    }

    messages.forEach((msg) => {
        const wrapper = document.createElement("article");
        wrapper.className = "chat-message";

        const authorLabel = msg.name && msg.name.trim().length
            ? msg.name.trim()
            : "Student";

        const header = document.createElement("div");
        header.className = "chat-message-header";

        const authorSpan = document.createElement("span");
        authorSpan.className =
            "chat-author" +
            (!msg.name || !msg.name.trim().length ? " chat-author-default" : "");
        authorSpan.textContent = authorLabel;

        const timeSpan = document.createElement("span");
        timeSpan.className = "chat-timestamp";
        timeSpan.textContent = msg.createdAtLabel;

        header.appendChild(authorSpan);
        header.appendChild(timeSpan);

        const body = document.createElement("p");
        body.className = "chat-text";
        body.textContent = msg.text;

        wrapper.appendChild(header);
        wrapper.appendChild(body);
        messagesContainer.appendChild(wrapper);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Attach chat handlers
function attachChatHandlers() {
    const form = document.getElementById("chatForm");
    const nameInput = document.getElementById("chatName");
    const messageInput = document.getElementById("chatMessage");

    renderChatMessagesForLesson(null); // initial state: no lesson selected

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();

        if (!state.activeLessonId) {
            alert("Select a lesson before posting a message.");
            return;
        }

        const rawText = messageInput.value.trim();
        const rawName = nameInput.value;

        if (!rawText) return;

        const messages = loadChatForLesson(state.activeLessonId);
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        messages.push({
            name: rawName || "",
            text: rawText,
            createdAt: now.toISOString(),
            createdAtLabel: timeLabel,
        });

        saveChatForLesson(state.activeLessonId, messages);
        messageInput.value = "";
        renderChatMessagesForLesson(state.activeLessonId);
    });
}
