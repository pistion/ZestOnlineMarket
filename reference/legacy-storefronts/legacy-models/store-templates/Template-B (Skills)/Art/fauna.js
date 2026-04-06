/* ============================================================================
   FAUNA JS (Merged Scripts)
   Project: Glondia Marketplace • Artist Store Profile (Art Template)
   Goal: 1:1 behavior with cleaner scoping and fewer files.

   FILE MAP (what lives where):
   - NAV + TOAST + SMOOTH SCROLL + FAQ:    Section A
   - MODAL VIEWER (shared):               Section B
   - DYNAMIC GALLERY (artworks grid):     Section C
   - PRODUCT CARD INJECTOR (single mount):Section D
   - CARD ISOLATION (unique markers):     Section E

   Notes for non-dev maintainers:
   - Look for "SECTION X" headings to find feature areas quickly.
   - JS hooks use data-attributes where possible to reduce breakage.
   ============================================================================ */

/* =========================
   Helpers
   ========================= */
const fauna$ = (sel, root=document) => root.querySelector(sel);
const fauna$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function faunaSafeToken(s){
  return String(s || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function faunaEscapeHTML(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function faunaReadJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    if(!v) return fallback;
    return JSON.parse(v);
  }catch(_){ return fallback; }
}
function faunaWriteJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){}
}

/* =========================
   SECTION A — NAV / TOAST / ANCHORS / FAQ
   ========================= */
(function faunaSetupNav(){
  const navToggle = fauna$('[data-nav-toggle]');
  const nav = fauna$('[data-nav]');
  if(navToggle && nav){
    navToggle.addEventListener('click', ()=> nav.classList.toggle('fauna-open'));
  }
})();

(function faunaHighlightNav(){
  const page = document.body.getAttribute('data-page');
  if(!page) return;
  fauna$$('[data-nav] a').forEach(a=>{
    if(a.dataset.page === page) a.classList.add('fauna-active');
  });
})();

function faunaToast(msg){
  const t = fauna$('.fauna-toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('fauna-show');
  window.clearTimeout(faunaToast._t);
  faunaToast._t = window.setTimeout(() => t.classList.remove('fauna-show'), 2200);
}

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-toast]');
  if(btn){ faunaToast(btn.dataset.toast); }
});

// Smooth scroll for profile nav anchors
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if(!target) return;
  e.preventDefault();
  target.scrollIntoView({behavior:'smooth', block:'start'});
});

// FAQ toggles
(function faunaSetupFAQ(){
  fauna$$('[data-faq] .fauna-faq-q').forEach(q=>{
    q.addEventListener('click', ()=>{
      q.closest('.fauna-faq-item')?.classList.toggle('fauna-open');
    });
  });
})();

/* =========================
   SECTION B — SHARED MODAL (used by gallery viewer)
   ========================= */
const faunaModal = fauna$('[data-modal]');
const faunaModalBody = fauna$('[data-modal-body]');

function faunaOpenModal(html){
  if(!faunaModal || !faunaModalBody) return;
  faunaModalBody.innerHTML = html;
  faunaModal.classList.add('fauna-open');

  // enter animation
  requestAnimationFrame(() => {
    const inner = faunaModalBody.querySelector('.fauna-image-modal-inner');
    if(inner) inner.classList.add('fauna-enter');
  });
}

function faunaCloseModal(){
  if(!faunaModal || !faunaModalBody) return;
  const inner = faunaModalBody.querySelector('.fauna-image-modal-inner');
  if(inner) inner.classList.remove('fauna-enter');

  window.setTimeout(() => {
    faunaModal.classList.remove('fauna-open');
    faunaModalBody.innerHTML = '';
  }, 200);
}

if(faunaModal){
  faunaModal.addEventListener('click', (e)=>{
    const clickedOutside = (e.target === faunaModal);
    const clickedClose = !!e.target.closest('[data-close]');
    if(clickedOutside || clickedClose) faunaCloseModal();
  });
}

/* =========================
   SECTION C — DYNAMIC GALLERY
   ========================= */
(function faunaSetupArtGallery(){
  const grid = fauna$('[data-gallery-grid]');
  if(!grid) return;

  const filterBar = fauna$('[data-gallery-filters]');
  const searchInput = fauna$('[data-gallery-search]');
  const sortSelect = fauna$('[data-gallery-sort]');
  const emptyState = fauna$('[data-gallery-empty]');

  // Artwork data (same idea as original; safe to replace with real images later)
  const artworks = [
    { id:'aurora-waves', title:'Aurora Waves', artist:'Lina Kora', category:'painting', medium:'Acrylic on canvas', size:'80 x 60 cm', price:820, currency:'K', popularity:98, sortNew:6,
      images:['https://picsum.photos/id/1015/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Original','Ships from PNG'] },
    { id:'highlands-carving', title:'Highlands Guardian', artist:'Tamo Aru', category:'carving', medium:'Hand-carved hardwood', size:'42 cm tall', price:640, currency:'K', popularity:93, sortNew:5,
      images:['https://picsum.photos/id/1016/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Carving','One of a kind'] },
    { id:'market-sketch', title:'Ela Beach Market', artist:'Jayla Tom', category:'drawing', medium:'Ink & marker on paper', size:'29.7 x 21 cm', price:220, currency:'K', popularity:88, sortNew:4,
      images:['https://picsum.photos/id/1020/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Drawing','Signed print'] },
    { id:'reef-light', title:'Reef Light', artist:'Mako S.', category:'painting', medium:'Oil on canvas', size:'70 x 50 cm', price:760, currency:'K', popularity:91, sortNew:3,
      images:['https://picsum.photos/id/1015/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Original','Framing available'] },
    { id:'spirit-mask', title:'Spirit Mask Relief', artist:'Kiri Naru', category:'carving', medium:'Burnished cedar wall piece', size:'55 x 35 cm', price:520, currency:'K', popularity:86, sortNew:2,
      images:['https://picsum.photos/id/1016/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Wall art','Hand-carved'] },
    { id:'night-sketch', title:'Night Street Study', artist:'Rafa N.', category:'drawing', medium:'Graphite & charcoal', size:'30 x 40 cm', price:260, currency:'K', popularity:80, sortNew:1,
      images:['https://picsum.photos/id/1016/600/400'], date:'2024', location:'Port Moresby, PNG', description:'Short description of this artwork.', badges:['Original drawing'] },
  ];

  let currentFilter = 'all';
  let currentSearch = '';
  let currentSort = 'featured';

  function renderGallery(items){
    grid.innerHTML = '';
    if(!items.length){
      if(emptyState) emptyState.style.display = 'block';
      return;
    }
    if(emptyState) emptyState.style.display = 'none';

    items.forEach(art=>{
      const card = document.createElement('article');
      card.className = 'fauna-media fauna-art-card fauna-card fauna-hover';
      card.dataset.artId = art.id;

      const bg = (art.images && art.images.length) ? `style="background-image:url('${art.images[0]}');"` : '';
      const dots = (art.images && art.images.length)
        ? `<div class="fauna-art-dots" aria-hidden="true">
             ${art.images.map((_, i)=>`<span class="fauna-dot ${i===0?'fauna-active':''}"></span>`).join('')}
           </div>`
        : '';

      card.innerHTML = `
        <div class="fauna-art-thumb" ${bg} role="button" tabindex="0" aria-label="Open artwork">
          ${dots}
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function applyFilters(){
    let list = artworks.slice();

    if(currentFilter !== 'all'){
      list = list.filter(art => art.category === currentFilter);
    }

    if(currentSearch){
      const q = currentSearch.toLowerCase();
      list = list.filter(art=>{
        return (
          art.title.toLowerCase().includes(q) ||
          art.artist.toLowerCase().includes(q) ||
          (art.medium && art.medium.toLowerCase().includes(q)) ||
          (art.tags || []).some(t=>String(t).toLowerCase().includes(q))
        );
      });
    }

    if(currentSort === 'price-asc') list.sort((a,b)=>a.price - b.price);
    else if(currentSort === 'price-desc') list.sort((a,b)=>b.price - a.price);
    else if(currentSort === 'new') list.sort((a,b)=>b.sortNew - a.sortNew);
    else list.sort((a,b)=> (b.popularity + b.sortNew) - (a.popularity + a.sortNew));

    renderGallery(list);
  }

  // Filters
  if(filterBar){
    filterBar.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-gallery-filter]');
      if(!btn) return;
      currentFilter = btn.dataset.galleryFilter || 'all';
      filterBar.querySelectorAll('[data-gallery-filter]').forEach(el=>{
        el.classList.toggle('fauna-active', el === btn);
      });
      applyFilters();
    });
  }

  // Search
  if(searchInput){
    searchInput.addEventListener('input', ()=>{
      currentSearch = searchInput.value.trim();
      applyFilters();
    });
  }

  // Sort
  if(sortSelect){
    sortSelect.addEventListener('change', ()=>{
      currentSort = sortSelect.value || 'featured';
      applyFilters();
    });
  }

  // Click → modal viewer (image-first popup)
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-art-id]');
    if(!card) return;
    const art = artworks.find(a=>a.id === card.dataset.artId);
    if(!art) return;

    const imgUrl = (art.images && art.images.length) ? art.images[0] : '';
    faunaOpenModal(`
      <div class="fauna-image-modal-inner">
        <img src="${faunaEscapeHTML(imgUrl)}" alt="" />
        <div style="margin-top:12px; text-align:right;">
          <button class="fauna-btn fauna-secondary" data-close type="button">Close</button>
        </div>
      </div>
    `);
  });

  // Initial render
  applyFilters();
})();

/* =========================
   SECTION D — PRODUCT CARD INJECTOR (single mount)
   ========================= */
const faunaMount = document.getElementById('faunaSingleCardMount');

/* Persisted per-card state */
const FAUNA_CARD_STATE_KEY = 'fauna_card_state_v1';
function faunaGetCardState(){ return faunaReadJSON(FAUNA_CARD_STATE_KEY, {}); }
function faunaSetCardState(state){ faunaWriteJSON(FAUNA_CARD_STATE_KEY, state); }

function faunaEnsureCardState(cardId, defaults){
  const s = faunaGetCardState();
  if(!s[cardId]) s[cardId] = defaults;
  faunaSetCardState(s);
  return s[cardId];
}
function faunaUpdateCardState(cardId, updater){
  const s = faunaGetCardState();
  const prev = s[cardId] || {};
  const next = updater(prev) || prev;
  s[cardId] = next;
  faunaSetCardState(s);
  return next;
}

/* Renders one card (same functionality as before) */
function faunaRenderSingleCard(){
  if(!faunaMount) return;

  const item = {
    id: 'pkg_event_002',
    thumb: 'Event Photography',
    badge: 'Most Booked',
    badgeClass: 'fauna-good',
    title: 'Essential Event Coverage',
    description: '2 hours • candid + highlight shots',
    price: 'K499',
    likes: 128,
    comments: [
      { user:'Maria', text:'Loved the lighting on this session!' },
      { user:'Jason', text:'Booked this last month — solid work.' }
    ]
  };

  const safeId = faunaSafeToken(item.id);

  const defaults = {
    liked:false,
    likes:Number(item.likes)||0,
    comments:Array.isArray(item.comments) ? item.comments : []
  };

  const state = faunaEnsureCardState(safeId, defaults);

  const commentsHTML = state.comments.map((c, idx) => `
    <div class="fauna-comment" data-comment-idx="${idx}">
      <span class="fauna-who">${faunaEscapeHTML(c.user)}:</span> ${faunaEscapeHTML(c.text)}
    </div>
  `).join('');

  faunaMount.innerHTML = `
    <article class="fauna-card fauna-hover fauna-course-card"
      data-card-id="${safeId}"
      data-liked="${state.liked ? '1':'0'}"
      data-likes="${state.likes}"
    >
      <div class="fauna-media-frame" aria-label="Product media">
        <div class="fauna-media-badge fauna-badge ${faunaEscapeHTML(item.badgeClass)}">${faunaEscapeHTML(item.badge)}</div>

        <div class="fauna-media-heart" aria-label="React (like)">
          <button class="fauna-heart-btn" type="button" aria-label="React (like)">
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>

        <div class="fauna-thumb" aria-hidden="true">${faunaEscapeHTML(item.thumb)}</div>

        <div class="fauna-media-dots" aria-hidden="true">
          <span></span><span class="fauna-on"></span><span></span>
        </div>
      </div>

      <div class="fauna-meta">
        <div class="fauna-meta-category fauna-muted">${faunaEscapeHTML(item.thumb)}</div>

        <div class="fauna-meta-head">
          <div class="fauna-meta-left">
            <h3 class="fauna-h3">${faunaEscapeHTML(item.title)}</h3>
            <div class="fauna-muted">${faunaEscapeHTML(item.description)}</div>
          </div>

          <div class="fauna-meta-right" aria-label="Price and engagement">
            <div class="fauna-price">${faunaEscapeHTML(item.price)}</div>
            <div class="fauna-eng-row">
              <span class="fauna-eng-pill">
                <i class="fa-solid fa-heart"></i>
                <span data-like-count>${state.likes}</span>
              </span>
              <span class="fauna-eng-pill">
                <i class="fa-regular fa-comment"></i>
                <span data-comment-count>${state.comments.length}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="fauna-product-actions">
          <button class="fauna-btn fauna-secondary fauna-compact fauna-comment-toggle" type="button"
            aria-expanded="false" aria-controls="comments-${safeId}">
            <i class="fa-regular fa-comment"></i> Comments
          </button>

          <button class="fauna-btn fauna-secondary fauna-compact" type="button" data-play data-play-title="${faunaEscapeHTML(item.title)}">
            <i class="fa-solid fa-circle-play"></i> Preview
          </button>

          <button class="fauna-btn fauna-compact" type="button"
            data-add-cart='${faunaEscapeHTML(JSON.stringify({id:safeId,title:item.title,price:item.price}))}'>
            <i class="fa-solid fa-cart-shopping"></i> Add to cart
          </button>
        </div>

        <div class="fauna-comment-panel" id="comments-${safeId}">
          ${commentsHTML || '<div class="fauna-comment fauna-muted">No comments yet.</div>'}
          <form class="fauna-comment-form" data-comment-form>
            <input type="text" name="comment" maxlength="120" autocomplete="off"
              placeholder="Write a comment (demo)..." aria-label="Write a comment"/>
            <button class="fauna-btn fauna-secondary fauna-compact" type="submit">Post</button>
          </form>
          <div class="fauna-comment fauna-muted">Tip: comments persist locally in your browser.</div>
        </div>
      </div>
    </article>
  `;

  /* SECTION E — Card Isolation Marker
     Requirement: every card instance gets a unique marker so interactions are scoped.
     Implementation approach (safe):
     - We DO NOT remove/rename existing CSS classes (keeps visuals identical).
     - We add a unique marker class to every descendant (e.g., "fauna-uniq-<token>").
     - This ensures future selectors can target ONE card instance without affecting others.
  */
  const card = faunaMount.querySelector('[data-card-id]');
  if(card){
    const token = `${safeId}-${Date.now().toString(36)}`;
    faunaApplyUniqueMarkerClass(card, token);

    // sync initial heart UI
    const heartBtn = card.querySelector('.fauna-heart-btn');
    const liked = card.dataset.liked === '1';
    if(heartBtn) heartBtn.classList.toggle('fauna-active', liked);

    // store token on card for debugging
    card.dataset.faunaUniq = token;
  }
}

/* Adds a unique marker class to all descendants (safe isolation) */
function faunaApplyUniqueMarkerClass(root, token){
  const marker = `fauna-uniq-${faunaSafeToken(token)}`;
  root.classList.add(marker);

  fauna$$('*', root).forEach(el => {
    el.classList.add(marker);
  });
}

faunaRenderSingleCard();

/* =========================
   SECTION D (continued) — Card Interactions (scoped to mount)
   ========================= */
document.addEventListener('click', (e) => {
  if(!faunaMount) return;
  const card = faunaMount.querySelector('[data-card-id]');
  if(!card) return;

  // Heart toggle
  const heartBtn = e.target.closest('.fauna-heart-btn');
  if(heartBtn && card.contains(heartBtn)){
    const id = card.dataset.cardId;

    const next = faunaUpdateCardState(id, (prev) => {
      const liked = !prev.liked;
      const likes = Math.max(0, (Number(prev.likes)||0) + (liked ? 1 : -1));
      return { ...prev, liked, likes };
    });

    card.dataset.liked = next.liked ? '1' : '0';
    card.dataset.likes = String(next.likes);
    heartBtn.classList.toggle('fauna-active', next.liked);

    const count = card.querySelector('[data-like-count]');
    if(count) count.textContent = String(next.likes);

    faunaToast(next.liked ? 'Liked (demo).' : 'Unliked (demo).');
    return;
  }

  // Comment dropdown
  const toggle = e.target.closest('.fauna-comment-toggle');
  if(toggle && card.contains(toggle)){
    const panel = card.querySelector('.fauna-comment-panel');
    if(!panel) return;

    const open = panel.classList.toggle('fauna-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    // tap anim
    toggle.classList.remove('fauna-tap');
    void toggle.offsetWidth;
    toggle.classList.add('fauna-tap');
    window.setTimeout(() => toggle.classList.remove('fauna-tap'), 260);
    return;
  }

  // Preview
  const play = e.target.closest('[data-play]');
  if(play && card.contains(play)){
    faunaToast(`Preview: ${play.dataset.playTitle || 'Preview'} (demo).`);
    return;
  }

  // Add to cart
  const add = e.target.closest('[data-add-cart]');
  if(add && card.contains(add)){
    try{
      const item = JSON.parse(add.getAttribute('data-add-cart'));
      faunaToast(`Added to cart: ${item.title} (demo).`);
    }catch(_){
      faunaToast('Could not add to cart.');
    }
    return;
  }
});

// Comment submit (persisted)
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-comment-form]');
  if(!form || !faunaMount) return;

  const card = faunaMount.querySelector('[data-card-id]');
  if(!card || !card.contains(form)) return;

  e.preventDefault();

  const id = card.dataset.cardId;
  const input = form.querySelector('input[name="comment"]');
  const text = (input?.value || '').trim();
  if(!text){ faunaToast('Type a comment first.'); return; }

  const user = 'You';
  const next = faunaUpdateCardState(id, (prev) => {
    const comments = Array.isArray(prev.comments) ? prev.comments.slice(0) : [];
    comments.unshift({ user, text });
    return { ...prev, comments };
  });

  // Update DOM (only this card)
  const panel = card.querySelector('.fauna-comment-panel');
  if(panel){
    const node = document.createElement('div');
    node.innerHTML = `
      <div class="fauna-comment">
        <span class="fauna-who">${faunaEscapeHTML(user)}:</span> ${faunaEscapeHTML(text)}
      </div>
    `;
    panel.insertBefore(node.firstElementChild, form);
  }

  const cc = card.querySelector('[data-comment-count]');
  if(cc) cc.textContent = String(next.comments.length);

  input.value = '';
  faunaToast('Comment posted (demo).');
});

/* =========================
   OPTIONAL Redirect hooks (kept from original for parity)
   ========================= */
(function faunaSetupSettingsNav(){
  const settingsLink = fauna$('[data-page="auth"]');
  if(!settingsLink) return;
  settingsLink.addEventListener('click', (e)=>{
    e.preventDefault();
    window.location.href = "settings/settings.html";
  });
})();

(function faunaSetupViewDetailsRedirects(){
  const detailBtns = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.trim().toLowerCase() === 'view details');
  if(!detailBtns.length) return;
  detailBtns.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.location.href = "prdt-viewer/index.html";
    });
  });
})();

(function faunaSetupGlobalFeedRedirect() {
  const links = Array.from(document.querySelectorAll('a'))
    .filter(a => a.textContent.trim().toLowerCase() === 'global feed');
  if (!links.length) return;
  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '../../../World_Feed/world_feed_clean.html';
    });
  });
})();
