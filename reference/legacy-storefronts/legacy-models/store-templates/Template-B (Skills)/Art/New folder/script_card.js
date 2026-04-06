/*
  Single-card isolate from Zest Photography Template
  - Only one .course-card is rendered (injected)
  - Only card-related state + interactions included
*/

const mount = document.getElementById('singleCardMount');

/* ---------- Helpers (from your script) ---------- */
const $ = (sel, root=document) => root.querySelector(sel);

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

/* ---------- Toast (minimal) ---------- */
function toast(msg){
  const t = $('.toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => t.classList.remove('show'), 2200);
}

/* ===========================================================
   Per-card state (likes/comments) — persisted
   =========================================================== */
const CARD_STATE_KEY = 'zest_card_state_v1';

function getCardState(){ return readJSON(CARD_STATE_KEY, {}); }
function setCardState(state){ writeJSON(CARD_STATE_KEY, state); }

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

/* ===========================================================
   Render ONE card (same template shape as your generator)
   =========================================================== */
function renderSingleCard(){
  // Pick one item from your data shape
  const item = {
    id: 'pkg_event_002',
    thumb: 'Event Photography',
    badge: 'Most Booked',
    badgeClass: 'good',
    title: 'Essential Event Coverage',
    description: '2 hours • candid + highlight shots',
    price: 'K499',
    likes: 128,
    comments: [
      { user:'Maria', text:'Loved the lighting on this session!' },
      { user:'Jason', text:'Booked this last month — solid work.' }
    ]
  };

  const safeId = safeToken(item.id);

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

  mount.innerHTML = `
    <article class="card hover course-card"
      data-card-id="${safeId}"
      data-liked="${state.liked ? '1':'0'}"
      data-likes="${state.likes}"
    >
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
              <span class="eng-pill">
                <i class="fa-solid fa-heart"></i>
                <span data-like-count>${state.likes}</span>
              </span>
              <span class="eng-pill">
                <i class="fa-regular fa-comment"></i>
                <span data-comment-count>${state.comments.length}</span>
              </span>
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
          <button class="btn compact" type="button" data-add-cart='${escapeHTML(JSON.stringify({id:safeId,title:item.title,price:item.price}))}'>
            <i class="fa-solid fa-cart-shopping"></i> Add to cart
          </button>
        </div>

        <div class="comment-panel" id="comments-${safeId}">
          ${commentsHTML || '<div class="comment muted">No comments yet.</div>'}
          <form class="comment-form" data-comment-form>
            <input type="text" name="comment" maxlength="120" autocomplete="off"
              placeholder="Write a comment (demo)..." aria-label="Write a comment"/>
            <button class="btn secondary compact" type="submit">Post</button>
          </form>
          <div class="comment muted">Tip: comments persist locally in your browser.</div>
        </div>
      </div>
    </article>
  `;

  // sync initial heart UI
  const card = mount.querySelector('.course-card');
  if(card){
    const heart = card.querySelector('.heart-btn');
    const liked = card.dataset.liked === '1';
    if(heart) heart.classList.toggle('active', liked);
  }
}

renderSingleCard();

/* ===========================================================
   Interactions (scoped to THIS single card)
   =========================================================== */
document.addEventListener('click', (e) => {
  const card = mount.querySelector('.course-card');
  if(!card) return;

  // Heart
  const heart = e.target.closest('.heart-btn');
  if(heart && card.contains(heart)){
    const id = card.dataset.cardId;

    const next = updateCardState(id, (prev) => {
      const liked = !prev.liked;
      const likes = Math.max(0, (Number(prev.likes)||0) + (liked ? 1 : -1));
      return { ...prev, liked, likes };
    });

    card.dataset.liked = next.liked ? '1' : '0';
    card.dataset.likes = String(next.likes);
    heart.classList.toggle('active', next.liked);

    const count = card.querySelector('[data-like-count]');
    if(count) count.textContent = String(next.likes);

    toast(next.liked ? 'Liked (demo).' : 'Unliked (demo).');
    return;
  }

  // Comment dropdown
  const toggle = e.target.closest('.comment-toggle');
  if(toggle && card.contains(toggle)){
    const panel = card.querySelector('.comment-panel');
    if(!panel) return;

    const open = panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    // tap anim
    toggle.classList.remove('tap');
    void toggle.offsetWidth;
    toggle.classList.add('tap');
    window.setTimeout(() => toggle.classList.remove('tap'), 260);
    return;
  }

  // Preview (minimal)
  const play = e.target.closest('[data-play]');
  if(play && card.contains(play)){
    toast(`Preview: ${play.dataset.playTitle || 'Preview'} (demo).`);
    return;
  }

  // Add to cart (minimal)
  const add = e.target.closest('[data-add-cart]');
  if(add && card.contains(add)){
    try{
      const item = JSON.parse(add.getAttribute('data-add-cart'));
      toast(`Added to cart: ${item.title} (demo).`);
    }catch(_){
      toast('Could not add to cart.');
    }
    return;
  }
});

// Comment submit (persisted)
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-comment-form]');
  if(!form) return;

  const card = mount.querySelector('.course-card');
  if(!card || !card.contains(form)) return;

  e.preventDefault();

  const id = card.dataset.cardId;
  const input = form.querySelector('input[name="comment"]');
  const text = (input?.value || '').trim();
  if(!text){ toast('Type a comment first.'); return; }

  const user = 'You';
  const next = updateCardState(id, (prev) => {
    const comments = Array.isArray(prev.comments) ? prev.comments.slice(0) : [];
    comments.unshift({ user, text });
    return { ...prev, comments };
  });

  // Update DOM (only this card)
  const panel = card.querySelector('.comment-panel');
  if(panel){
    const node = document.createElement('div');
    node.innerHTML = `
      <div class="comment">
        <span class="who">${escapeHTML(user)}:</span> ${escapeHTML(text)}
      </div>
    `;
    panel.insertBefore(node.firstElementChild, form);
  }

  const cc = card.querySelector('[data-comment-count]');
  if(cc) cc.textContent = String(next.comments.length);

  input.value = '';
  toast('Comment posted (demo).');
});
