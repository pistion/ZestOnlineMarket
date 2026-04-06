/* ===============================
   Music Store V2 – Global Scripts
   Clean + Real Audio Preview Player
   =============================== */

// ---------------- Mobile Nav ----------------
const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
if (navToggle && nav){
  navToggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// ---------------- Active Nav ----------------
(function highlightNav(){
  const page = document.body.getAttribute('data-page');
  if (!page) return;
  document.querySelectorAll('.nav a').forEach(a => {
    if (a.dataset.page === page) a.classList.add('active');
  });
})();

// ---------------- Toast ----------------
function toast(msg){
  const t = document.querySelector('.toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-toast]');
  if (btn) toast(btn.dataset.toast);
});

// ---------------- Smooth Scroll ----------------
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------------- FAQ ----------------
document.querySelectorAll('.faq .item .q').forEach(q => {
  q.addEventListener('click', () => {
    q.parentElement.classList.toggle('open');
  });
});

// ---------------- Modal ----------------
const modal = document.querySelector('[data-modal]');
const modalBody = document.querySelector('[data-modal-body]');
function closeModal(){
  if (!modal) return;
  modal.classList.remove('open');
}
if (modal){
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeModal();
});

// ===============================
// Music Data
// ===============================
const musicData = (() => {

  const PREVIEW =
    'https://cdn.pixabay.com/download/audio/2022/03/15/audio_0d3b9b2f8c.mp3';

  const tracks = [
    {
      id:'midnight-skyline',
      title:'Midnight Skyline',
      artist:'Skyline Sound Collective',
      type:'single',
      genre:'Afrobeats',
      bpm:102,
      durationSec:184,
      cover:'images/music-midnight-skyline.jpg',
      popularity:98,
      sortNew:6,
      preview: PREVIEW
    },
    {
      id:'islands-of-gold',
      title:'Islands of Gold',
      artist:'Skyline Sound Collective',
      type:'single',
      genre:'Pop',
      bpm:110,
      durationSec:201,
      cover:'images/music-islands-of-gold.jpg',
      popularity:95,
      sortNew:5,
      preview: PREVIEW
    },
    {
      id:'harbour-lights',
      title:'Harbour Lights',
      artist:'Skyline Sound Collective',
      type:'single',
      genre:'R&B',
      bpm:90,
      durationSec:210,
      cover:'images/music-harbour-lights.jpg',
      popularity:91,
      sortNew:3,
      preview: PREVIEW
    }
  ];

  const albums = [
    {
      id:'city-of-clouds',
      title:'City of Clouds',
      artist:'Skyline Sound Collective',
      year:2025,
      genre:'Alt Pop',
      price:29,
      currency:'K',
      cover:'images/album-city-of-clouds.jpg',
      description:'A night-drive inspired album blending PNG city lights with electronic textures.',
      trackIds:['midnight-skyline','islands-of-gold']
    }
  ];

  const reviews = [
    { initial:'M', name:'Maria T.', stars:5, text:'PNG sound with global quality.' },
    { initial:'J', name:'Jason L.', stars:5, text:'Clean production and easy licensing.' }
  ];

  return { tracks, albums, reviews };
})();

// ===============================
// Helpers
// ===============================
function formatDuration(sec){
  if (!sec) return '--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ===============================
// Sticky Player – REAL MP3 Preview
// ===============================
/* ===============================
   Audio Debug Utility
   =============================== */
window.__audioDebug = {
  log(step, data){
    console.log(`🎧 [AudioDebug] ${step}`, data ?? '');
  },
  warn(step, data){
    console.warn(`⚠️ [AudioDebug] ${step}`, data ?? '');
  },
  error(step, err){
    console.error(`❌ [AudioDebug] ${step}`, err);
  }
};

/* ===============================
   Sticky Player – REAL MP3 Preview (DEBUG SAFE)
   =============================== */
(function setupPlayer(){
  const player = document.querySelector('[data-player]');
  const audio = document.getElementById('preview-audio');
  if (!player || !audio) return;

  const cover = player.querySelector('[data-player-cover]');
  const title = player.querySelector('[data-player-title]');
  const sub = player.querySelector('[data-player-sub]');
  const progress = player.querySelector('[data-player-progress]');
  const cur = player.querySelector('[data-player-current]');
  const dur = player.querySelector('[data-player-duration]');
  const playBtn = player.querySelector('[data-player-play]');
  const closeBtn = player.querySelector('[data-player-close]');

  // ---------- DEBUG: audio lifecycle ----------
  audio.addEventListener('error', () => {
    window.__audioDebug.error('Audio element error', audio.error);
  });

  audio.addEventListener('loadedmetadata', () => {
    window.__audioDebug.log('Metadata loaded', { duration: audio.duration });
  });

  audio.addEventListener('canplay', () => {
    window.__audioDebug.log('Audio can play');
  });

  audio.addEventListener('play', () => {
    window.__audioDebug.log('Audio play event fired');
  });

  audio.addEventListener('pause', () => {
    window.__audioDebug.log('Audio paused');
  });

  function fmt(t){
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function open(track){
    if (!track || !track.preview){
      window.__audioDebug.warn('Track missing preview', track);
      return;
    }

    window.__audioDebug.log('Play requested', {
      trackId: track.id,
      preview: track.preview
    });

    audio.src = track.preview;

    const playPromise = audio.play();
    if (playPromise !== undefined){
      playPromise
        .then(() => {
          window.__audioDebug.log('Playback started successfully');
        })
        .catch(err => {
          window.__audioDebug.error('Playback failed', err);
        });
    }

    player.classList.remove('hidden');
    cover.style.backgroundImage = track.cover
      ? `url('${track.cover}')`
      : 'none';
    title.textContent = track.title || 'Unknown title';
    sub.textContent = track.artist || '';
    playBtn.textContent = '⏸ Pause';
  }

  playBtn.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused){
      audio.play().catch(err =>
        window.__audioDebug.error('Manual play failed', err)
      );
      playBtn.textContent = '⏸ Pause';
    } else {
      audio.pause();
      playBtn.textContent = '▶ Play';
    }
  });

  closeBtn.addEventListener('click', () => {
    audio.pause();
    audio.src = '';
    player.classList.add('hidden');
    window.__audioDebug.log('Player closed');
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    progress.style.width =
      `${(audio.currentTime / audio.duration) * 100}%`;
    cur.textContent = fmt(audio.currentTime);
    dur.textContent = fmt(audio.duration);
  });

  // ---------- GLOBAL CLICK: Play Preview ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-play-track]');
    if (!btn) return;

    const trackId = btn.dataset.playTrack;
    window.__audioDebug.log('Play button clicked', trackId);

    const track = musicData.tracks.find(t => t.id === trackId);
    if (!track){
      window.__audioDebug.error('Track not found', trackId);
      return;
    }

    open(track);
  });

})();

// ===============================
// Page Redirects
// ===============================

document.querySelector('[data-page="settings"]')?.addEventListener(
  'click',
  e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.location.assign('settings/settings.html');
  },
  true // ← CAPTURE MODE (IMPORTANT)
);


