/*
  Zest Photography Store Template
  Autonomy rules:
  - No global toggles that affect multiple cards.
  - Always: clicked element -> closest(.course-card) -> query within card.
  - State persisted per-card in localStorage.
*/

/* ---------- Helpers ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function safeToken(s){
  return String(s || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
function escapeHTML(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function readJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    if(!v) return fallback;
    return JSON.parse(v);
  }catch(_){ return fallback; }
}
function writeJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){}
}

/* ---------- Mobile nav ---------- */
const navToggle = $('[data-nav-toggle]');
const nav = $('[data-nav]');
if (navToggle && nav) navToggle.addEventListener('click', () => nav.classList.toggle('open'));

/* ---------- Active nav highlight ---------- */
(function highlightNav(){
  const page = document.body.getAttribute('data-page');
  if(!page) return;
  $$('.nav a').forEach(a => {
    if(a.dataset.page === page) a.classList.add('active');
  });
})();

/* ---------- Toast ---------- */
function toast(msg){
  const t = $('.toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => t.classList.remove('show'), 2200);
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toast]');
  if (btn) toast(btn.dataset.toast);
});

/* ---------- Smooth scroll ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if(!target) return;
  e.preventDefault();
  target.scrollIntoView({behavior:'smooth', block:'start'});
});

/* ---------- FAQ toggles (mouse + keyboard) ---------- */
$$('.faq .item .q').forEach(q => {
  const toggle = () => {
    const item = q.parentElement;
    const open = item.classList.toggle('open');
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  q.addEventListener('click', toggle);
  q.addEventListener('keydown', (ev) => {
    if(ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
  });
});

/* ---------- Modal preview ---------- */
const modal = $('[data-modal]');
const modalBody = $('[data-modal-body]');
function openModal(html){
  if(!modal || !modalBody) return;
  modalBody.innerHTML = html;
  modal.classList.add('open');
  // focus first close if exists
  const close = modalBody.querySelector('[data-close]');
  if(close) close.focus();
}
function closeModal(){
  if(!modal) return;
  modal.classList.remove('open');
}
document.addEventListener('click', (e) => {
  const play = e.target.closest('[data-play]');
  if(play){
    openModal(`
      <div class="card">
        <div class="badge">Preview</div>
        <h3 style="margin:10px 0 0">${escapeHTML(play.dataset.playTitle || 'Preview')}</h3>
        <div style="aspect-ratio:16/9;border-radius:14px;background:#0f1a33;display:grid;place-items:center;color:#cfe0ff;font-weight:1000;margin-top:12px">
          Video / Gallery Placeholder
        </div>
        <div class="row" style="margin-top:14px;justify-content:flex-end">
          <button class="btn secondary" data-close>Close</button>
          <button class="btn" data-toast="Checkout is frontend-only in this demo.">Continue</button>
        </div>
      </div>
    `);
    return;
  }
  if(e.target.closest('[data-close]')) closeModal();
});
if(modal){
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
}

/* ===========================================================
   Cart (frontend-only) — stored in localStorage
   =========================================================== */
const CART_KEY = 'zest_cart_v1';
function getCart(){ return readJSON(CART_KEY, []); }
function setCart(items){ writeJSON(CART_KEY, items); syncCartBadge(); }
function syncCartBadge(){
  const badge = $('[data-cart-badge]');
  if(!badge) return;
  badge.textContent = String(getCart().length);
}
syncCartBadge();

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add-cart]');
  if(!add) return;
  try{
    const item = JSON.parse(add.getAttribute('data-add-cart'));
    const cart = getCart();
    cart.push({ ...item, ts: Date.now() });
    setCart(cart);
    toast(`Added to cart: ${item.title}`);
  }catch(_){
    toast('Could not add to cart.');
  }
});

/* ===========================================================
   Product Post Cards — generator + per-card state persistence
   =========================================================== */
const CARD_STATE_KEY = 'zest_card_state_v1';
function getCardState(){
  return readJSON(CARD_STATE_KEY, {});
}
function setCardState(state){
  writeJSON(CARD_STATE_KEY, state);
}
function ensureCardState(cardId, defaults){
  const s = getCardState();
  if(!s[cardId]) s[cardId] = defaults;
  setCardState(s);
  return s[cardId];
}
function updateCardState(cardId, updater){
  const s = getCardState();
  const prev = s[cardId] || {};
  const next = updater(prev) || prev;
  s[cardId] = next;
  setCardState(s);
  return next;
}

function renderCourseCards(){
  const grid = document.getElementById('courseCardGrid');
  if(!grid) return;

  const data = [
    {
      id:'pkg_portrait_001',
      thumb:'Portrait Session',
      badge:'60 Minutes',
      badgeClass:'',
      title:'Signature Portrait Shoot',
      description:'Studio lighting • 12 edited photos',
      price:'K249',
      likes:86,
      comments:[
        { user:'Ava', text:'Perfect for profile photos — super sharp.' },
        { user:'Noah', text:'Great editing and fast delivery.' }
      ]
    },
    {
      id:'pkg_event_002',
      thumb:'Event Photography',
      badge:'Most Booked',
      badgeClass:'good',
      title:'Essential Event Coverage',
      description:'2 hours • candid + highlight shots',
      price:'K499',
      likes:128,
      comments:[
        { user:'Maria', text:'Loved the lighting on this session!' },
        { user:'Jason', text:'Booked this last month — solid work.' }
      ]
    },
    {
      id:'pkg_outdoor_003',
      thumb:'Outdoor Session',
      badge:'Premium',
      badgeClass:'warn',
      title:'Lifestyle Outdoor Shoot',
      description:'Golden hour • 20 edited photos',
      price:'K699',
      likes:54,
      comments:[
        { user:'Leah', text:'Golden hour shots came out amazing.' },
        { user:'Ethan', text:'Very professional direction and posing help.' }
      ]
    }
  ];

  const cardHTML = (item) => {
    const safeId = safeToken(item.id);
    // defaults for storage
    const defaults = {
      liked:false,
      likes:Number(item.likes)||0,
      comments:Array.isArray(item.comments) ? item.comments : []
    };
    const state = ensureCardState(safeId, defaults);

    const commentsHTML = state.comments.map((c, idx) => `
      <div class="comment" data-comment-idx="${idx}">
        <span class="who">${escapeHTML(c.user)}:</span> ${escapeHTML(c.text)}
      </div>
    `).join('');

    const badgeClass = item.badgeClass ? ` ${escapeHTML(item.badgeClass)}` : '';

    return `
      <article class="card hover course-card" data-card-id="${safeId}" data-liked="${state.liked ? '1':'0'}" data-likes="${state.likes}">
        <div class="media-frame" aria-label="Product media">
          <div class="media-badge badge${badgeClass}">${escapeHTML(item.badge)}</div>

          <button class="heart-btn media-heart" type="button" aria-label="React (like)">
            <i class="fa-solid fa-heart"></i>
          </button>

          <div class="thumb" aria-hidden="true">${escapeHTML(item.thumb)}</div>

          <div class="media-dots" aria-hidden="true">
            <span></span><span class="on"></span><span></span>
          </div>
        </div>

        <div class="meta">
          <div class="meta-category muted">${escapeHTML(item.thumb)}</div>

          <div class="meta-head">
            <div class="meta-left">
              <h3 class="h3">${escapeHTML(item.title)}</h3>
              <div class="muted">${escapeHTML(item.description)}</div>
            </div>

            <div class="meta-right" aria-label="Price and engagement">
              <div class="price">${escapeHTML(item.price)}</div>
              <div class="eng-row">
                <span class="eng-pill"><i class="fa-solid fa-heart"></i> <span data-like-count>${state.likes}</span></span>
                <span class="eng-pill"><i class="fa-regular fa-comment"></i> <span data-comment-count>${state.comments.length}</span></span>
              </div>
            </div>
          </div>

          <div class="product-actions">
            <button class="btn secondary compact comment-toggle" type="button" aria-expanded="false" aria-controls="comments-${safeId}">
              <i class="fa-regular fa-comment"></i> Comments
            </button>
            <button class="btn secondary compact" type="button" data-play data-play-title="${escapeHTML(item.title)}">
              <i class="fa-solid fa-circle-play"></i> Preview
            </button>
            <button class="btn compact" type="button"
              data-add-cart='${escapeHTML(JSON.stringify({id:safeId,title:item.title,price:item.price}))}'>
              <i class="fa-solid fa-cart-shopping"></i> Add to cart
            </button>
          </div>

          <div class="comment-panel" id="comments-${safeId}">
            ${commentsHTML || '<div class="comment muted">No comments yet.</div>'}
            <form class="comment-form" data-comment-form>
              <input type="text" name="comment" maxlength="120" autocomplete="off" placeholder="Write a comment (demo)..." aria-label="Write a comment"/>
              <button class="btn secondary compact" type="submit">Post</button>
            </form>
            <div class="comment muted">Tip: comments persist locally in your browser.</div>
          </div>
        </div>
      </article>
    `;
  };

  grid.innerHTML = data.map(cardHTML).join('');

  // sync heart active states on render
  $$('.course-card', grid).forEach(card => {
    const liked = card.dataset.liked === '1';
    const heart = $('.heart-btn', card);
    if(heart) heart.classList.toggle('active', liked);
  });
}
renderCourseCards();

/* ---------- Card interactions (delegated, scoped) ---------- */
document.addEventListener('click', (e) => {
  // Heart
  const heart = e.target.closest('.heart-btn');
  if(heart){
    const card = heart.closest('.course-card');
    if(!card) return;

    const id = card.dataset.cardId;
    const next = updateCardState(id, (prev) => {
      const liked = !prev.liked;
      const likes = Math.max(0, (Number(prev.likes)||0) + (liked ? 1 : -1));
      return { ...prev, liked, likes };
    });

    // update DOM (only this card)
    card.dataset.liked = next.liked ? '1' : '0';
    card.dataset.likes = String(next.likes);
    heart.classList.toggle('active', next.liked);
    const count = card.querySelector('[data-like-count]');
    if(count) count.textContent = String(next.likes);
    return;
  }

  // Comment dropdown
  const toggle = e.target.closest('.comment-toggle');
  if(toggle){
    const card = toggle.closest('.course-card');
    if(!card) return;
    const panel = card.querySelector('.comment-panel');
    if(!panel) return;

    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    // micro tap
    toggle.classList.remove('tap');
    void toggle.offsetWidth;
    toggle.classList.add('tap');
    window.setTimeout(() => toggle.classList.remove('tap'), 260);
    return;
  }
});

/* ---------- Comment form submit (per card, persisted) ---------- */
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-comment-form]');
  if(!form) return;
  e.preventDefault();

  const card = form.closest('.course-card');
  if(!card) return;

  const id = card.dataset.cardId;
  const input = form.querySelector('input[name="comment"]');
  const text = (input?.value || '').trim();
  if(!text){ toast('Type a comment first.'); return; }

  // demo user
  const user = 'You';
  const next = updateCardState(id, (prev) => {
    const comments = Array.isArray(prev.comments) ? prev.comments.slice(0) : [];
    comments.unshift({ user, text });
    return { ...prev, comments };
  });

  // update only this card panel and count
  const panel = card.querySelector('.comment-panel');
  if(panel){
    const list = document.createElement('div');
    list.innerHTML = `
      <div class="comment">
        <span class="who">${escapeHTML(user)}:</span> ${escapeHTML(text)}
      </div>
    `;
    // insert before form
    panel.insertBefore(list.firstElementChild, form);
  }
  const cc = card.querySelector('[data-comment-count]');
  if(cc) cc.textContent = String(next.comments.length);

  input.value = '';
  toast('Comment posted (demo).');
});
