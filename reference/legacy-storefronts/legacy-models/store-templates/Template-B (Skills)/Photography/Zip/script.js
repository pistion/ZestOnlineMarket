/* ===============================
   Glondia Marketplace Front-End
   Store Profile Templates Bundle
   Global Scripts (script.js)
   =============================== */

// Mobile nav
const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
if(navToggle && nav){
  navToggle.addEventListener('click', ()=> nav.classList.toggle('open'));
}

// Highlight active nav link based on body data-page
(function highlightNav(){
  const page = document.body.getAttribute('data-page');
  if(!page) return;
  document.querySelectorAll('.nav a').forEach(a=>{
    if(a.dataset.page === page) a.classList.add('active');
  });
})();

// Toast
function toast(msg){
  const t = document.querySelector('.toast');
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-toast]');
  if(btn){ toast(btn.dataset.toast); }
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
document.querySelectorAll('.faq .item .q').forEach(q=>{
  q.addEventListener('click', ()=>{
    q.parentElement.classList.toggle('open');
  });
});

// Demo "Play preview" modal (simple)
const modal = document.querySelector('[data-modal]');
const modalBody = document.querySelector('[data-modal-body]');
document.addEventListener('click', (e)=>{
  const play = e.target.closest('[data-play]');
  if(play && modal && modalBody){
    modalBody.innerHTML = `
      <div class="card">
        <div class="badge dark">Preview</div>
        <h3 style="margin-top:8px">${play.dataset.playTitle || 'Preview Video'}</h3>
        <div style="aspect-ratio:16/9;border-radius:12px;background:#0f1a33;display:grid;place-items:center;color:#cfe0ff;font-weight:800;margin-top:10px">
          Video Player Placeholder (replace with real embed)
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn secondary" data-close>Close</button>
          <button class="btn" data-toast="Enroll flow is frontend-only in this demo.">Enroll Now</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
  }
  if(e.target.closest('[data-close]') && modal){
    modal.classList.remove('open');
  }
});
if(modal){
  modal.addEventListener('click', (e)=>{
    if(e.target === modal) modal.classList.remove('open');
  });
}

// Heart toggle (frontend-only)
document.addEventListener('click', (e)=>{
  const heart = e.target.closest('.heart-btn');
  if(!heart) return;
  heart.classList.toggle('active');
});

// Comment toggle (product cards only)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.comment-toggle');
  if(!btn) return;

  const panel = btn.nextElementSibling;
  if(!panel || !panel.classList.contains('comment-panel')) return;

  const open = panel.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
});
