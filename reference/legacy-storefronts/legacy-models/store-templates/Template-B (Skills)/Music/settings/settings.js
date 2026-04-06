// Settings editor platform for Music Store (keeps Settings UI styling)
// Storage key (readable by music-store-v2.js later if you wire it in)
(function () {
  'use strict';

  const STORAGE_KEY = 'glondia_music_store_settings_v1';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const menuButtons = qsa('[data-settings-target]');
  const panels = qsa('[data-settings-panel]');

  const toastEl = qs('.toast');
  const yearEl = qs('[data-year]');

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function toast(title, sub) {
    if (!toastEl) return;
    toastEl.innerHTML = `
      <div class="toast-title">${escapeHtml(title || 'Saved')}</div>
      <div class="toast-sub">${escapeHtml(sub || '')}</div>
    `.trim();
    toastEl.classList.add('is-show');
    window.clearTimeout(toastEl._t);
    toastEl._t = window.setTimeout(() => toastEl.classList.remove('is-show'), 2200);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // -------------------------
  // Panel switching
  // -------------------------
  function setActivePanel(id) {
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.settingsPanel === id));
    menuButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.settingsTarget === id));
    // Scroll top of main on panel switch (mobile niceness)
    const main = qs('[data-settings-main]');
    if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (menuButtons.length && panels.length) {
    menuButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.settingsTarget;
        if (!id) return;
        setActivePanel(id);
      });
    });
  }

  // -------------------------
  // Upload previews + dataURL capture
  // -------------------------
  const fileDataMap = new WeakMap(); // input -> dataURL

  function handleImagePreview(input) {
    const key = input.dataset.previewTarget;
    if (!key || !input.files || !input.files[0]) return;

    const file = input.files[0];
    if (!file.type || !file.type.startsWith('image/')) return;

    const preview = qs('[data-preview="' + key + '"]');
    if (!preview) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return;
      fileDataMap.set(input, dataUrl);

      const img = document.createElement('img');
      img.src = String(dataUrl);
      preview.innerHTML = '';
      preview.appendChild(img);

      // Optional: if it's a store-level image, mirror to initials/brand etc
      syncBoundTextFromInputs();
    };
    reader.readAsDataURL(file);
  }

  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.matches('input[type="file"][data-preview-target]')) {
      handleImagePreview(input);
    }
    if (input.matches('[data-bind]')) {
      syncBoundTextFromInputs();
    }
  });

  // -------------------------
  // Dynamic lists
  // -------------------------
  const lists = {
    tracks: {
      list: () => qs('[data-tracks-list]'),
      itemSel: '[data-track-item]',
      addSel: '[data-add-track]',
      removeSel: '[data-remove-track]',
      type: 'track',
      previewPrefix: 'track-cover-'
    },
    albums: {
      list: () => qs('[data-albums-list]'),
      itemSel: '[data-album-item]',
      addSel: '[data-add-album]',
      removeSel: '[data-remove-album]',
      type: 'album',
      previewPrefix: 'album-cover-'
    },
    licenses: {
      list: () => qs('[data-licenses-list]'),
      itemSel: '[data-license-item]',
      addSel: '[data-add-license]',
      removeSel: '[data-remove-license]',
      type: 'license'
    },
    packs: {
      list: () => qs('[data-packs-list]'),
      itemSel: '[data-pack-item]',
      addSel: '[data-add-pack]',
      removeSel: '[data-remove-pack]',
      type: 'pack',
      previewPrefix: 'pack-cover-'
    },
    reviews: {
      list: () => qs('[data-reviews-list]'),
      itemSel: '[data-review-item]',
      addSel: '[data-add-review]',
      removeSel: '[data-remove-review]',
      type: 'review'
    },
    faq: {
      list: () => qs('[data-faq-list]'),
      itemSel: '[data-faq-item]',
      addSel: '[data-add-faq]',
      removeSel: '[data-remove-faq]',
      type: 'faq'
    }
  };

  const listCounters = new Map(); // previewPrefix -> next index

  function getNextIndex(prefix) {
    const next = (listCounters.get(prefix) || 1) + 1;
    listCounters.set(prefix, next);
    return next;
  }

  function initCounters() {
    // Seed counters based on existing template preview keys (e.g., track-cover-1)
    qsa('input[type="file"][data-preview-target]').forEach(inp => {
      const key = inp.dataset.previewTarget || '';
      const m = key.match(/^(.*?)-(\d+)$/);
      if (!m) return;
      const prefix = m[1] + '-';
      const num = parseInt(m[2], 10);
      if (!Number.isFinite(num)) return;
      const cur = listCounters.get(prefix) || 1;
      listCounters.set(prefix, Math.max(cur, num));
    });
  }
  initCounters();

  function cloneItem(templateEl, opts = {}) {
    const clone = templateEl.cloneNode(true);

    // Clear text, url, number inputs
    qsa('input', clone).forEach(input => {
      const t = input.type;
      if (t === 'text' || t === 'url' || t === 'number') input.value = '';
      if (t === 'file') input.value = '';
    });

    // Clear selects (keep first option)
    qsa('select', clone).forEach(sel => {
      if (sel.options.length) sel.selectedIndex = 0;
    });

    // Clear textareas
    qsa('textarea', clone).forEach(area => (area.value = ''));

    // Reset previews inside clone
    qsa('[data-preview]', clone).forEach(preview => {
      preview.innerHTML = '<span>Image</span>';
    });

    // Update preview keys + file targets if required
    if (opts.previewPrefix) {
      const preview = qs('[data-preview]', clone);
      const fileInput = qs('input[type="file"][data-preview-target]', clone);
      if (preview && fileInput) {
        const idx = getNextIndex(opts.previewPrefix);
        const newKey = opts.previewPrefix + String(idx);
        preview.setAttribute('data-preview', newKey);
        fileInput.setAttribute('data-preview-target', newKey);
      }
    }

    return clone;
  }

  document.addEventListener('click', (e) => {
    const target = e.target;

    // Add handlers
    for (const key in lists) {
      const cfg = lists[key];
      const addBtn = target.closest?.(cfg.addSel);
      if (addBtn) {
        const list = cfg.list();
        if (!list) return;

        const template = qs(cfg.itemSel, list);
        if (!template) return;

        const item = cloneItem(template, { previewPrefix: cfg.previewPrefix });
        list.appendChild(item);
        toast('Added', `New ${cfg.type} item added.`);
        return;
      }
    }

    // Remove handlers
    for (const key in lists) {
      const cfg = lists[key];
      const removeBtn = target.closest?.(cfg.removeSel);
      if (removeBtn) {
        const list = cfg.list();
        if (!list) return;
        const item = removeBtn.closest?.(cfg.itemSel);
        if (!item) return;

        const items = qsa(cfg.itemSel, list);
        if (items.length > 1) {
          item.remove();
          toast('Removed', `Removed ${cfg.type} item.`);
        } else {
          // Clear last one
          qsa('input, textarea', item).forEach(el => {
            if (el instanceof HTMLInputElement) {
              if (['text', 'url', 'number'].includes(el.type)) el.value = '';
              if (el.type === 'file') el.value = '';
            }
            if (el instanceof HTMLTextAreaElement) el.value = '';
          });
          qsa('select', item).forEach(sel => (sel.selectedIndex = 0));
          qsa('[data-preview]', item).forEach(p => (p.innerHTML = '<span>Image</span>'));
          toast('Cleared', `Cleared the last ${cfg.type} item.`);
        }
        return;
      }
    }

    // Sidebar/footer quick actions
    const actionBtn = target.closest?.('[data-action]');
    if (actionBtn) {
      e.preventDefault();
      const act = actionBtn.getAttribute('data-action');
      if (act === 'save') saveAll();
      if (act === 'load') loadAll();
      if (act === 'export') exportJson();
      return;
    }

    // Section-level actions
    const secSave = target.closest?.('[data-action="save-section"]');
    if (secSave) {
      const section = secSave.getAttribute('data-section') || 'section';
      saveAll(section);
      return;
    }

    const secReset = target.closest?.('[data-action="reset-section"]');
    if (secReset) {
      const section = secReset.getAttribute('data-section') || 'section';
      resetSection(section);
      return;
    }
  });

  // Import JSON
  const importInput = qs('input[type="file"][data-action="import"]');
  if (importInput) {
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        applySettings(obj, { persist: true });
        toast('Imported', 'JSON imported and applied.');
        importInput.value = '';
      } catch (err) {
        console.error(err);
        toast('Import failed', 'Invalid JSON file.');
      }
    });
  }

  // -------------------------
  // Data model
  // -------------------------
  function getBoundFields() {
    const data = {};
    qsa('[data-bind]').forEach(el => {
      const key = el.getAttribute('data-bind');
      if (!key) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        data[key] = el.value ?? '';
      }
    });
    return data;
  }

  function getStoreImages() {
    // store-level file fields live on inputs with data-store-field
    const out = {};
    qsa('input[type="file"][data-store-field]').forEach(input => {
      const field = input.dataset.storeField;
      if (!field) return;
      const dataUrl = fileDataMap.get(input);
      if (dataUrl) out[field] = dataUrl;
    });
    return out;
  }

  function getListData(listEl, itemSelector) {
    const items = qsa(itemSelector, listEl);
    return items.map(item => {
      const obj = {};
      // inputs/selects/textareas with data-field
      qsa('[data-field]', item).forEach(el => {
        const k = el.getAttribute('data-field');
        if (!k) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          obj[k] = el.value ?? '';
        }
      });

      // file fields within item (data-file-field)
      qsa('input[type="file"][data-file-field]', item).forEach(inp => {
        const k = inp.dataset.fileField;
        if (!k) return;
        const dataUrl = fileDataMap.get(inp);
        if (dataUrl) obj[k] = dataUrl;
      });

      return obj;
    });
  }

  function collectSettings() {
    const bound = getBoundFields();
    const storeImages = getStoreImages();

    const out = {
      version: 1,
      updatedAt: new Date().toISOString(),
      store: {
        name: bound.storeName || 'Artists Store',
        tagline: bound.storeTagline || 'Tune how your store looks, feels and sells.',
        slug: bound.storeSlug || '',
        logoDataUrl: storeImages.storeLogoDataUrl || '',
        coverDataUrl: storeImages.storeCoverDataUrl || ''
      },
      about: {
        headline: bound.aboutHeadline || '',
        text: bound.aboutText || ''
      },
      social: {
        instagram: bound.socialInstagram || '',
        facebook: bound.socialFacebook || '',
        tiktok: bound.socialTikTok || '',
        youtube: bound.socialYouTube || '',
        spotify: bound.socialSpotify || '',
        website: bound.socialWebsite || ''
      },
      tracks: [],
      albums: [],
      licenses: [],
      packs: [],
      reviews: [],
      faq: []
    };

    // Lists
    const tList = lists.tracks.list();
    if (tList) out.tracks = getListData(tList, lists.tracks.itemSel);

    const aList = lists.albums.list();
    if (aList) out.albums = getListData(aList, lists.albums.itemSel);

    const lList = lists.licenses.list();
    if (lList) out.licenses = getListData(lList, lists.licenses.itemSel);

    const pList = lists.packs.list();
    if (pList) out.packs = getListData(pList, lists.packs.itemSel);

    const rList = lists.reviews.list();
    if (rList) out.reviews = getListData(rList, lists.reviews.itemSel);

    const fList = lists.faq.list();
    if (fList) out.faq = getListData(fList, lists.faq.itemSel);

    return out;
  }

  function persistSettings(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  // -------------------------
  // Apply settings -> DOM
  // -------------------------
  function setValueByBind(key, value) {
    qsa('[data-bind="' + key + '"]').forEach(el => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.value = value ?? '';
      }
    });
  }

  function setTextByBindText(key, value) {
    qsa('[data-bind-text="' + key + '"]').forEach(el => (el.textContent = String(value ?? '')));
  }

  function computeInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'AS';
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : (parts[0]?.[1] || '');
    const initials = (first + last).toUpperCase();
    return initials || 'AS';
  }

  function applyImagePreviewByKey(key, dataUrl) {
    if (!key || !dataUrl) return;
    const preview = qs('[data-preview="' + key + '"]');
    if (!preview) return;
    const img = document.createElement('img');
    img.src = String(dataUrl);
    preview.innerHTML = '';
    preview.appendChild(img);
  }

  function ensureListCount(cfg, desiredCount) {
    const list = cfg.list();
    if (!list) return;
    let items = qsa(cfg.itemSel, list);
    const template = items[0];
    if (!template) return;

    // Remove extra items
    while (items.length > desiredCount) {
      items[items.length - 1].remove();
      items = qsa(cfg.itemSel, list);
    }
    // Add missing items
    while (items.length < desiredCount) {
      const item = cloneItem(template, { previewPrefix: cfg.previewPrefix });
      list.appendChild(item);
      items = qsa(cfg.itemSel, list);
    }
  }

  function setListData(cfg, data) {
    const list = cfg.list();
    if (!list) return;
    const rows = Array.isArray(data) ? data : [];
    ensureListCount(cfg, Math.max(rows.length, 1));

    const items = qsa(cfg.itemSel, list);
    items.forEach((item, idx) => {
      const row = rows[idx] || {};

      qsa('[data-field]', item).forEach(el => {
        const k = el.getAttribute('data-field');
        if (!k) return;
        const val = row[k] ?? '';
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          el.value = String(val);
        }
      });

      // Apply file previews if present in row (coverDataUrl)
      if (cfg.previewPrefix && row.coverDataUrl) {
        // Find the preview key in this item
        const preview = qs('[data-preview]', item);
        if (preview) applyImagePreviewByKey(preview.getAttribute('data-preview'), row.coverDataUrl);
      }
    });
  }

  function applySettings(obj, { persist = false } = {}) {
    if (!obj || typeof obj !== 'object') return;

    const storeName = obj.store?.name ?? 'Artists Store';
    const storeTagline = obj.store?.tagline ?? 'Tune how your store looks, feels and sells.';
    const storeSlug = obj.store?.slug ?? '';

    setValueByBind('storeName', storeName);
    setValueByBind('storeTagline', storeTagline);
    setValueByBind('storeSlug', storeSlug);

    setValueByBind('aboutHeadline', obj.about?.headline ?? '');
    setValueByBind('aboutText', obj.about?.text ?? '');

    setValueByBind('socialInstagram', obj.social?.instagram ?? '');
    setValueByBind('socialFacebook', obj.social?.facebook ?? '');
    setValueByBind('socialTikTok', obj.social?.tiktok ?? '');
    setValueByBind('socialYouTube', obj.social?.youtube ?? '');
    setValueByBind('socialSpotify', obj.social?.spotify ?? '');
    setValueByBind('socialWebsite', obj.social?.website ?? '');

    // Mirror to sidebar/topbar text nodes
    setTextByBindText('storeName', storeName);
    setTextByBindText('storeTagline', storeTagline);

    const initialsEl = qs('[data-bind-initials]');
    if (initialsEl) initialsEl.textContent = computeInitials(storeName);

    // Store-level images previews (logo / cover)
    if (obj.store?.logoDataUrl) applyImagePreviewByKey('store-avatar', obj.store.logoDataUrl);
    if (obj.store?.coverDataUrl) applyImagePreviewByKey('store-cover', obj.store.coverDataUrl);

    // Lists
    setListData(lists.tracks, obj.tracks);
    setListData(lists.albums, obj.albums);
    setListData(lists.licenses, obj.licenses);
    setListData(lists.packs, obj.packs);
    setListData(lists.reviews, obj.reviews);
    setListData(lists.faq, obj.faq);

    // Keep counters fresh after list manipulation
    initCounters();

    if (persist) persistSettings(obj);
  }

  function syncBoundTextFromInputs() {
    // Update sidebar/topbar store name/tagline in real-time
    const nameInput = qs('[data-bind="storeName"]');
    const taglineInput = qs('[data-bind="storeTagline"]');

    const name = nameInput ? nameInput.value : '';
    const tag = taglineInput ? taglineInput.value : '';

    if (name) setTextByBindText('storeName', name);
    if (tag) setTextByBindText('storeTagline', tag);

    const initialsEl = qs('[data-bind-initials]');
    if (initialsEl) initialsEl.textContent = computeInitials(name);
  }

  // -------------------------
  // Actions
  // -------------------------
  function saveAll(scopeLabel) {
    const obj = collectSettings();
    const ok = persistSettings(obj);
    if (ok) {
      toast('Saved', scopeLabel ? `Saved: ${scopeLabel}` : 'All settings saved.');
    } else {
      toast('Save failed', 'Storage is full or blocked.');
    }
    // ensure live bound text is updated even if user didn't blur
    syncBoundTextFromInputs();
  }

  function loadAll() {
    const saved = readSaved();
    if (!saved) {
      toast('Nothing saved', 'No saved settings found yet.');
      return;
    }
    applySettings(saved, { persist: false });
    toast('Loaded', 'Saved settings applied.');
  }

  function exportJson() {
    const obj = collectSettings();
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    a.download = `music-store-settings-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Exported', 'Downloaded JSON settings.');
  }

  function resetSection(section) {
    const saved = readSaved();
    if (!saved) {
      toast('No saved copy', 'Save first, then you can reset from saved.');
      return;
    }

    // Reset is “load saved” for now, scoped resets can be added later.
    applySettings(saved, { persist: false });
    toast('Reset', `Reset from saved settings (${section}).`);
  }

  // Load saved on first paint (non-destructive)
  window.addEventListener('DOMContentLoaded', () => {
    const saved = readSaved();
    if (saved) {
      applySettings(saved, { persist: false });
      toast('Loaded', 'Your saved settings are ready.');
    } else {
      // Ensure initial bound text is correct
      syncBoundTextFromInputs();
    }
  });

})();
