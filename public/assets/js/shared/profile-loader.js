// profile_loader.js
// Loads store header data (cover, avatar, name, about) on the profile page
// It does NOT depend on the wizard page. It only reads from the backend.
//
// Priority:
// 1) If URL has ?handle=xyz → load /api/store/:handle (public profile)
// 2) Else, if a logged-in seller is present via auth cookie -> load /api/store/me
// 3) Else → do nothing (static placeholders remain)

(function () {
  const $ = (sel) => document.querySelector(sel);

  const bannerEl = $(".banner");
  const avatarEl = $(".avatar");
  const nameEl = $(".name");
  const aboutEl = $(".about");

  // Pills row (Owner, Email, WhatsApp)
  const pillsRow = document.querySelector(".meta .row");

  function getHandleFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const handle = params.get("handle");
    if (!handle) return null;
    return handle.trim() || null;
  }

  async function fetchStoreData() {
    const handle = getHandleFromQuery();

    // 1) Public profile by handle
    if (handle) {
      const res = await fetch(`/api/store/${encodeURIComponent(handle)}`);
      if (!res.ok) throw new Error("Failed to load store by handle");
      const data = await res.json();
      // Expect: { success, store, product, images }
      if (data && data.success !== false) return data;
      throw new Error(data && data.message ? data.message : "Failed to load store");
    }

    // 2) Logged-in seller profile
    const res = await fetch("/api/store/me", {
      credentials: "same-origin",
    });
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) throw new Error("Failed to load store (me)");
    const data = await res.json();
    if (data && data.success !== false) return data;
    throw new Error(data && data.message ? data.message : "Failed to load store");
  }

  function applyHeaderFromStore(store) {
    if (!store) return;

    // Store name
    if (nameEl) {
      nameEl.textContent =
        (store.storeName && store.storeName.trim()) ||
        "Your Store Name";
    }

    // About
    if (aboutEl) {
      const aboutText =
        (store.about && store.about.trim()) ||
        "Tell buyers what you sell and how you serve your community.";
      aboutEl.textContent = aboutText;
    }

    // Cover
    if (bannerEl) {
      if (store.coverUrl) {
        bannerEl.style.backgroundImage = `url('${store.coverUrl}')`;
        bannerEl.style.backgroundSize = "cover";
        bannerEl.style.backgroundPosition = "center";
      } else if (store.accentColor) {
        bannerEl.style.backgroundImage = `linear-gradient(135deg, ${store.accentColor}, #22c55e)`;
      }
    }

    // Avatar / logo
    if (avatarEl) {
      if (store.avatarUrl) {
        avatarEl.style.backgroundImage = `url('${store.avatarUrl}')`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
        avatarEl.textContent = "";
      } else {
        // Fallback: first letter of store name
        avatarEl.style.backgroundImage = "";
        avatarEl.style.backgroundColor = "#0f172a";
        const n =
          (store.storeName && store.storeName.trim()) ||
          "S";
        avatarEl.textContent = n.charAt(0).toUpperCase();
      }
    }

    // Pills: for now we keep placeholders that are already in HTML.
    // Later, when you add settings for owner/email/WhatsApp, you can
    // update pillsRow.innerHTML here using store.ownerName, store.email, etc.
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await fetchStoreData();
      if (!data || !data.store) {
        // No store yet — leave placeholders
        return;
      }
      applyHeaderFromStore(data.store);
      // NOTE: data.product and data.images are available here too
      // if later you want to feature the first post in the header.
    } catch (err) {
      console.warn("Profile loader failed:", err.message);
      // Leave static placeholders
    }
  });
})();
