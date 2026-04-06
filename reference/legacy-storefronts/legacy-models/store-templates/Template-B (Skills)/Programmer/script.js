/* Zest Developer Profile Template — autonomous cards + local persistence */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function safeToken(s){
  return String(s || 'card').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}
function escapeHTML(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function readJSON(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(_){ return fallback; }
}
function writeJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ } }

/* Mobile nav */
const navToggle = $('[data-nav-toggle]');
const nav = $('[data-nav]');
if(navToggle && nav) navToggle.addEventListener('click', () => nav.classList.toggle('open'));

/* Active nav */
(function(){
  const page = document.body.getAttribute('data-page');
  if(!page) return;
  $$('.nav a').forEach(a => { if(a.dataset.page === page) a.classList.add('active'); });
})();

/* Toast */
function toast(msg){
  const t = $('.toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-toast]');
  if(btn) toast(btn.dataset.toast);
});

/* Smooth scroll */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if(!target) return;
  e.preventDefault();
  target.scrollIntoView({behavior:'smooth', block:'start'});
});

/* FAQ */
$$('.faq .item .q').forEach(q => {
  const toggle = () => {
    const item = q.parentElement;
    const open = item.classList.toggle('open');
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  q.addEventListener('click', toggle);
  q.addEventListener('keydown', (ev) => { if(ev.key==='Enter'||ev.key===' ') { ev.preventDefault(); toggle(); } });
});

/* Modal preview */
const modal = $('[data-modal]');
const modalBody = $('[data-modal-body]');
function openModal(html){ if(modal && modalBody){ modalBody.innerHTML = html; modal.classList.add('open'); } }
function closeModal(){ if(modal) modal.classList.remove('open'); }
document.addEventListener('click', (e) => {
  const play = e.target.closest('[data-play]');
  if(play){
    openModal(`
      <div class="card">
        <div class="badge">Preview</div>
        <h3 style="margin:10px 0 0">${escapeHTML(play.dataset.playTitle || 'Preview')}</h3>
        <div style="aspect-ratio:16/9;border-radius:14px;background:#0f1a33;display:grid;place-items:center;color:#cfe0ff;font-weight:1000;margin-top:12px">
          Demo Preview Placeholder
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
  document.addEventListener('keydown', (e) => { if(e.key==='Escape' && modal.classList.contains('open')) closeModal(); });
}

/* Cart */
const CART_KEY='zest_cart_v1';
function getCart(){ return readJSON(CART_KEY, []); }
function setCart(items){ writeJSON(CART_KEY, items); syncCartBadge(); }
function syncCartBadge(){
  const badge=$('[data-cart-badge]');
  if(badge) badge.textContent=String(getCart().length);
}
syncCartBadge();

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add-cart]');
  if(!add) return;
  try{
    const item = JSON.parse(add.getAttribute('data-add-cart'));
    const cart = getCart();
    cart.push({...item, ts: Date.now()});
    setCart(cart);
    toast(`Added to cart: ${item.title}`);
  }catch(_){ toast('Could not add to cart.'); }
});

/* Per-card state */
const CARD_STATE_KEY='zest_dev_card_state_v1';
function getCardState(){ return readJSON(CARD_STATE_KEY, {}); }
function setCardState(s){ writeJSON(CARD_STATE_KEY, s); }
function ensureCardState(id, defaults){
  const s=getCardState();
  if(!s[id]) s[id]=defaults;
  setCardState(s);
  return s[id];
}
function updateCardState(id, updater){
  const s=getCardState();
  const prev=s[id]||{};
  const next=updater(prev)||prev;
  s[id]=next;
  setCardState(s);
  return next;
}

/* Render cards */
(function(){
  const grid=document.getElementById('serviceCardGrid');
  if(!grid) return;

  const data=[
    {id:'svc_landing_001',thumb:'Landing Page',badge:'Fast Delivery',badgeClass:'',title:'Professional Landing Page',description:'Next.js + Tailwind • Mobile responsive',price:'K399',likes:42,tags:['Next.js','SEO','Responsive'],comments:[{user:'Sarah',text:'Great attention to detail on UI.'},{user:'Raj',text:'Fast delivery and clean code.'}]},
    {id:'svc_fullstack_002',thumb:'Full-Stack App',badge:'Most Booked',badgeClass:'good',title:'Full-Stack Web App',description:'React + Node/PostgreSQL • Auth + Dashboard',price:'K1,299',likes:97,tags:['Auth','Dashboard','DB'],comments:[{user:'Liam',text:'Loved the dashboard UX.'},{user:'Ava',text:'The API was well documented.'}]},
    {id:'svc_api_003',thumb:'API + Backend',badge:'Enterprise',badgeClass:'warn',title:'Custom API & Backend',description:'FastAPI / Node • Docker • CI/CD',price:'K899',likes:61,tags:['API','Docker','CI/CD'],comments:[{user:'Noah',text:'Excellent performance and security.'}]}
  ];

  const cardHTML=(item)=>{
    const id=safeToken(item.id);
    const state=ensureCardState(id,{liked:false,likes:Number(item.likes)||0,comments:Array.isArray(item.comments)?item.comments:[]});
    const badgeClass=item.badgeClass?` ${escapeHTML(item.badgeClass)}`:'';
    const tags=(item.tags||[]).slice(0,3).map(t=>`<span class="code-pill"><i class="fa-solid fa-code"></i> ${escapeHTML(t)}</span>`).join('');
    const commentsHTML=state.comments.map(c=>`<div class="comment"><span class="who">${escapeHTML(c.user)}:</span> ${escapeHTML(c.text)}</div>`).join('');

    return `
      <article class="card hover service-card" data-card-id="${id}" data-liked="${state.liked?'1':'0'}" data-likes="${state.likes}">
        <div class="media-frame">
          <div class="media-badge badge${badgeClass}">${escapeHTML(item.badge)}</div>
          <button class="heart-btn media-heart" type="button" aria-label="React (like)"><i class="fa-solid fa-heart"></i></button>
          <div class="thumb">${escapeHTML(item.thumb)}</div>
          <div class="media-dots" aria-hidden="true"><span></span><span class="on"></span><span></span></div>
        </div>

        <div class="meta">
          <div class="meta-category muted">${escapeHTML(item.thumb)}</div>

          <div class="meta-head">
            <div class="meta-left">
              <h3 class="h3">${escapeHTML(item.title)}</h3>
              <div class="muted">${escapeHTML(item.description)}</div>
              <div class="row" style="margin-top:8px">${tags}</div>
            </div>

            <div class="meta-right">
              <div class="price">${escapeHTML(item.price)}</div>
              <div class="eng-row">
                <span class="eng-pill"><i class="fa-solid fa-heart"></i> <span data-like-count>${state.likes}</span></span>
                <span class="eng-pill"><i class="fa-regular fa-comment"></i> <span data-comment-count>${state.comments.length}</span></span>
              </div>
            </div>
          </div>

          <div class="product-actions">
            <button class="btn secondary compact comment-toggle" type="button" aria-expanded="false" aria-controls="comments-${id}"><i class="fa-regular fa-comment"></i> Comments</button>
            <button class="btn secondary compact" type="button" data-play data-play-title="${escapeHTML(item.title)}"><i class="fa-solid fa-circle-play"></i> Preview</button>
            <button class="btn compact" type="button" data-add-cart='${escapeHTML(JSON.stringify({id,title:item.title,price:item.price}))}'><i class="fa-solid fa-cart-shopping"></i> Add</button>
          </div>

          <div class="comment-panel" id="comments-${id}">
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

  grid.innerHTML=data.map(cardHTML).join('');
  $$('.service-card',grid).forEach(card=>{
    const liked=card.dataset.liked==='1';
    const heart=$('.heart-btn',card);
    if(heart) heart.classList.toggle('active',liked);
  });
})();

/* Interactions (scoped) */
document.addEventListener('click',(e)=>{
  const heart=e.target.closest('.heart-btn');
  if(heart){
    const card=heart.closest('.service-card');
    if(!card) return;
    const id=card.dataset.cardId;
    const next=updateCardState(id,(prev)=>{
      const liked=!prev.liked;
      const likes=Math.max(0,(Number(prev.likes)||0)+(liked?1:-1));
      return {...prev,liked,likes};
    });
    card.dataset.liked=next.liked?'1':'0';
    card.dataset.likes=String(next.likes);
    heart.classList.toggle('active',next.liked);
    const count=card.querySelector('[data-like-count]');
    if(count) count.textContent=String(next.likes);
    return;
  }

  const toggle=e.target.closest('.comment-toggle');
  if(toggle){
    const card=toggle.closest('.service-card');
    if(!card) return;
    const panel=card.querySelector('.comment-panel');
    if(!panel) return;
    const open=panel.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open?'true':'false');
    toggle.classList.remove('tap'); void toggle.offsetWidth; toggle.classList.add('tap');
    setTimeout(()=>toggle.classList.remove('tap'),260);
    return;
  }
});

/* Comment submit (scoped) */
document.addEventListener('submit',(e)=>{
  const form=e.target.closest('[data-comment-form]');
  if(!form) return;
  e.preventDefault();
  const card=form.closest('.service-card');
  if(!card) return;
  const id=card.dataset.cardId;
  const input=form.querySelector('input[name="comment"]');
  const text=(input?.value||'').trim();
  if(!text){ toast('Type a comment first.'); return; }
  const user='You';
  const next=updateCardState(id,(prev)=>{
    const comments=Array.isArray(prev.comments)?prev.comments.slice(0):[];
    comments.unshift({user,text});
    return {...prev,comments};
  });
  const panel=card.querySelector('.comment-panel');
  if(panel){
    const el=document.createElement('div');
    el.innerHTML=`<div class="comment"><span class="who">${escapeHTML(user)}:</span> ${escapeHTML(text)}</div>`;
    panel.insertBefore(el.firstElementChild, form);
  }
  const cc=card.querySelector('[data-comment-count]');
  if(cc) cc.textContent=String(next.comments.length);
  input.value='';
  toast('Comment posted (demo).');
});
