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


/* ===============================
   Artists Store – Dynamic Gallery
   =============================== */
(function setupArtGallery(){
  const grid = document.querySelector('[data-gallery-grid]');
  if(!grid) return; // only run on artist template

  const filterBar = document.querySelector('[data-gallery-filters]');
  const searchInput = document.querySelector('[data-gallery-search]');
  const sortSelect = document.querySelector('[data-gallery-sort]');
  const emptyState = document.querySelector('[data-gallery-empty]');

  // Artwork data – replace image paths with your real artwork images
  const artworks = [
    {
      id: 'aurora-waves',
      title: 'Aurora Waves',
      artist: 'Lina Kora',
      category: 'painting',
      medium: 'Acrylic on canvas',
      size: '80 x 60 cm',
      price: 820,
      currency: 'K',
      badges: ['Original', 'Ships from PNG'],
      tags: ['landscape', 'color', 'modern'],
      popularity: 98,
      sortNew: 6,
      images: ['https://picsum.photos/id/1015/600/400']
    },
    {
      id: 'highlands-carving',
      title: 'Highlands Guardian',
      artist: 'Tamo Aru',
      category: 'carving',
      medium: 'Hand-carved hardwood',
      size: '42 cm tall',
      price: 640,
      currency: 'K',
      badges: ['Carving', 'One of a kind'],
      tags: ['totem', 'tribal', 'guardian'],
      popularity: 93,
      sortNew: 5,
      images: ['https://picsum.photos/id/1016/600/400'],
      date: '2024',
      location: 'Port Moresby, PNG',
      description: 'Short description of this artwork.',
    },
    {
      id: 'market-sketch',
      title: 'Ela Beach Market',
      artist: 'Jayla Tom',
      category: 'drawing',
      medium: 'Ink & marker on paper',
      size: '29.7 x 21 cm',
      price: 220,
      currency: 'K',
      badges: ['Drawing', 'Signed print'],
      tags: ['urban', 'people', 'market'],
      popularity: 88,
      sortNew: 4,
      images: ['https://picsum.photos/id/1020/600/400'],
     date: '2024',
location: 'Port Moresby, PNG',
description: 'Short description of this artwork.',
    },
    {
      id: 'reef-light',
      title: 'Reef Light',
      artist: 'Mako S.',
      category: 'painting',
      medium: 'Oil on canvas',
      size: '70 x 50 cm',
      price: 760,
      currency: 'K',
      badges: ['Original', 'Framing available'],
      tags: ['ocean', 'reef', 'blue'],
      popularity: 91,
      sortNew: 3,
      images: ['https://picsum.photos/id/1015/600/400'],
      date: '2024',
location: 'Port Moresby, PNG',
description: 'Short description of this artwork.',
    },
    {
      id: 'spirit-mask',
      title: 'Spirit Mask Relief',
      artist: 'Kiri Naru',
      category: 'carving',
      medium: 'Burnished cedar wall piece',
      size: '55 x 35 cm',
      price: 520,
      currency: 'K',
      badges: ['Wall art', 'Hand-carved'],
      tags: ['mask', 'heritage', 'relief'],
      popularity: 86,
      sortNew: 2,
      images: ['https://picsum.photos/id/1016/600/400'],
      date: '2024',
location: 'Port Moresby, PNG',
description: 'Short description of this artwork.',
    },
    {
      id: 'night-sketch',
      title: 'Night Street Study',
      artist: 'Rafa N.',
      category: 'drawing',
      medium: 'Graphite & charcoal',
      size: '30 x 40 cm',
      price: 260,
      currency: 'K',
      badges: ['Original drawing'],
      tags: ['city', 'monochrome', 'study'],
      popularity: 80,
      sortNew: 1,
      images: ['https://picsum.photos/id/1016/600/400']
    }
  ];

  let currentFilter = 'all';
  let currentSearch = '';
  let currentSort = 'featured';

  function formatPrice(art){
    return `${art.currency || 'K'}${art.price.toLocaleString('en-PG')}`;
  }

  function renderGallery(items){
    grid.innerHTML = '';
    if(!items.length){
      if(emptyState) emptyState.style.display = 'block';
      return;
    }
    if(emptyState) emptyState.style.display = 'none';

    items.forEach(art=>{
      const card = document.createElement('article');
      card.className = 'media art-card hover';
      card.dataset.artId = art.id;

      const categoryLabel = art.category === 'painting'
        ? 'Painting'
        : art.category === 'carving'
          ? 'Carving'
          : 'Drawing';

      const badgesHtml = (art.badges || []).map(b=>`<span class="badge pill">${b}</span>`).join('');

card.innerHTML = `
  <div class="art-thumb" ${art.images && art.images.length ? `style="background-image:url('${art.images[0]}');"` : ''}>
    <div class="dots">
      ${art.images && art.images.length
        ? art.images.map((img, index) => `<span class="dot ${index === 0 ? 'active' : ''}"></span>`).join('')
        : ''
      }
    </div>
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
          (art.tags || []).some(t=>t.toLowerCase().includes(q))
        );
      });
    }

    if(currentSort === 'price-asc'){
      list.sort((a,b)=>a.price - b.price);
    }else if(currentSort === 'price-desc'){
      list.sort((a,b)=>b.price - a.price);
    }else if(currentSort === 'new'){
      list.sort((a,b)=>b.sortNew - a.sortNew);
    }else{
      // featured – combine popularity + sortNew
      list.sort((a,b)=> (b.popularity + b.sortNew) - (a.popularity + a.sortNew));
    }

    renderGallery(list);
  }

  // Filter chips
  if(filterBar){
    filterBar.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-gallery-filter]');
      if(!btn) return;
      currentFilter = btn.dataset.galleryFilter || 'all';
      filterBar.querySelectorAll('[data-gallery-filter]').forEach(el=>{
        el.classList.toggle('active', el === btn);
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

  // Card click → artwork detail modal
  grid.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-art-id]');
    if(!card) return;
    const id = card.dataset.artId;
    const art = artworks.find(a=>a.id === id);
    if(!art || !modal || !modalBody) return;

    const categoryLabel = art.category === 'painting'
      ? 'Painting'
      : art.category === 'carving'
        ? 'Carving'
        : 'Drawing';

    const badgesHtml = (art.badges || []).map(b=>`<span class="badge pill">${b}</span>`).join('');

 modalBody.innerHTML = 
 `<div class="art-viewer">
    <div class="viewer-image" style="background-image:url('${art.images && art.images.length ? art.images[0] : ''}');"></div>

    <div class="viewer-meta">
      <div><strong>Category:</strong> ${art.category || ''}</div>
      <div><strong>Size:</strong> ${art.size || ''}</div>
      <div><strong>Date:</strong> ${art.date || ''}</div>
      <div><strong>Location:</strong> ${art.location || ''}</div>
      <div class="viewer-desc">${art.description || ''}</div>
      <div class="tag-row">
        ${(art.badges || []).map(b=>`<span class="badge pill">${b}</span>`).join('')}
      </div>
    </div>

    <div style="margin-top:12px;">
      <button class="btn secondary" data-close>Close</button>
    </div>
  </div>
`;
    modal.classList.add('open');
  });

  // Initial render
  applyFilters();
})();


  // Pager Redirects

(function setupSettingsNav(){
  const settingsLink = document.querySelector('[data-page="auth"]');
  if(!settingsLink) return;

  settingsLink.addEventListener('click', (e)=>{
    e.preventDefault();
    window.location.href = "settings/settings.html"; // <-- replace with your real file
  });
})();


(function setupViewDetailsRedirects(){
  // Grab all buttons containing the words "View Details"
  const detailBtns = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent.trim().toLowerCase() === 'view details');

  if(!detailBtns.length) return;

  detailBtns.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      // Replace with your real page
      window.location.href = "prdt-viewer/index.html";
    });
  });
})();


(function setupGlobalFeedRedirect() {
  const links = Array.from(document.querySelectorAll('a'))
    .filter(a => a.textContent.trim().toLowerCase() === 'global feed');

  if (!links.length) return;

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '../../../World_Feed/world_feed_clean.html'; // <-- replace with your real file
    });
  });
})();

