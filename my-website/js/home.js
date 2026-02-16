/* ======================================
   LoopFlix — Main Application
   ====================================== */
(function () {
  'use strict';

  // --- Config ---
  const _k = atob('M2ExNmE0MTcyZTAzZDExMTI3MGM1YmY1YzYzOGYxYTU=');
  const API_KEY = _k;
  const BASE_URL = 'https://api.themoviedb.org/3';
  const IMG_THUMB = 'https://image.tmdb.org/t/p/w342';
  const IMG_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
  const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
  const IMG_PROFILE = 'https://image.tmdb.org/t/p/w185';
  const IMG_STILL = 'https://image.tmdb.org/t/p/w300';
  const CACHE_TTL = 15 * 60 * 1000; // 15 min

  // Multi-server embed sources
  const SERVERS = [
    { id: 'vidking',  name: 'Vidking',  base: 'https://www.vidking.net',       movie: '/embed/movie/{id}', tv: '/embed/tv/{id}/{s}/{e}', params: { color: 'e50914', autoPlay: 'true', nextEpisode: 'true', episodeSelector: 'true' } },
    { id: 'vidsrc',   name: 'Vidsrc',   base: 'https://vidsrc.cc',             movie: '/v2/embed/movie/{id}', tv: '/v2/embed/tv/{id}/{s}/{e}', params: {} },
    { id: 'videasy',  name: 'Videasy',  base: 'https://player.videasy.net',    movie: '/embed/movie/{id}', tv: '/embed/tv/{id}/{s}/{e}', params: { color: 'e50914', autoPlay: 'true', nextEpisode: 'true', episodeSelector: 'true' } },
  ];
  let currentServer = SERVERS[0];

  const GENRE_ROWS = [
    { name: 'Action & Adventure', genre: 28, icon: 'fa-bolt' },
    { name: 'Comedy', genre: 35, icon: 'fa-face-laugh-squint' },
    { name: 'Sci-Fi & Fantasy', genre: 878, icon: 'fa-rocket' },
    { name: 'Horror', genre: 27, icon: 'fa-ghost' },
  ];

  // --- State ---
  let currentItem = null;
  let bannerItem = null;
  let genreMap = {};
  let trailerMuted = true;
  let trailerIframe = null;
  let carouselIndex = 0;
  let carouselTimer = null;
  let carouselItems = [];
  let searchFilter = 'all';
  let lastSearchResults = [];

  // ==============================
  //  Utilities
  // ==============================

  function debounce(fn, delay) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); };
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatRuntime(min) {
    if (!min) return 'N/A';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function getYear(item) {
    return (item.release_date || item.first_air_date || '').substring(0, 4);
  }

  function getGenreNames(ids) {
    return (ids || []).map(id => genreMap[id]).filter(Boolean);
  }

  function showToast(message, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ` ${type}` : '');
    const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
    t.innerHTML = `<i class="fas ${icon}"></i> ${escapeHTML(message)}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ==============================
  //  API Cache Layer
  // ==============================

  async function safeFetch(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
      return null;
    }
  }

  async function cachedFetch(url) {
    const key = 'lfc_' + url;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const { d, t } = JSON.parse(stored);
        if (Date.now() - t < CACHE_TTL) return d;
      }
    } catch (_) {}
    const data = await safeFetch(url);
    if (data) {
      try { sessionStorage.setItem(key, JSON.stringify({ d: data, t: Date.now() })); } catch (_) {}
    }
    return data;
  }

  // ==============================
  //  Auth System
  // ==============================

  function getUser() { try { return JSON.parse(localStorage.getItem('lf_user')); } catch (_) { return null; } }
  function setUser(u) { localStorage.setItem('lf_user', JSON.stringify(u)); updateUserUI(); }
  function logoutUser() { localStorage.removeItem('lf_user'); updateUserUI(); showToast('Logged out', 'success'); }
  function getAccounts() { try { return JSON.parse(localStorage.getItem('lf_accounts') || '{}'); } catch (_) { return {}; } }

  function updateUserUI() {
    const user = getUser();
    const el = document.getElementById('nav-username');
    const btn = document.getElementById('nav-user');
    if (user) { el.textContent = user.username; btn.title = `${user.username} — click to logout`; }
    else { el.textContent = ''; btn.title = 'Login / Register'; }
  }

  let authMode = 'login';
  function showAuthModal() {
    const m = document.getElementById('auth-modal');
    m.classList.add('active'); m.setAttribute('aria-hidden', 'false');
    document.getElementById('auth-error').textContent = '';
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('auth-username').focus(), 50);
  }
  function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    document.getElementById('auth-modal').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function setAuthTab(mode) {
    authMode = mode;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
    document.getElementById('auth-submit').textContent = mode === 'login' ? 'Login' : 'Create Account';
    document.getElementById('auth-error').textContent = '';
  }
  function handleAuthSubmit(e) {
    e.preventDefault();
    const u = document.getElementById('auth-username').value.trim();
    const p = document.getElementById('auth-password').value;
    const err = document.getElementById('auth-error');
    if (!u || !p) { err.textContent = 'Please fill in all fields.'; return; }
    const accs = getAccounts();
    if (authMode === 'register') {
      if (accs[u]) { err.textContent = 'Username already taken.'; return; }
      accs[u] = p; localStorage.setItem('lf_accounts', JSON.stringify(accs));
      setUser({ username: u }); closeAuthModal();
      showToast(`Welcome to LoopFlix, ${u}!`, 'success');
      displayWatchlistRow();
    } else {
      if (!accs[u] || accs[u] !== p) { err.textContent = 'Invalid credentials.'; return; }
      setUser({ username: u }); closeAuthModal();
      showToast(`Welcome back, ${u}!`, 'success');
      displayWatchlistRow();
    }
  }

  // ==============================
  //  Watchlist
  // ==============================

  function getWatchlist() { try { return JSON.parse(localStorage.getItem('lf_watchlist') || '[]'); } catch (_) { return []; } }
  function isInWatchlist(id) { return getWatchlist().some(i => i.id === id); }

  function toggleWatchlist(item) {
    if (!getUser()) { showAuthModal(); return; }
    let list = getWatchlist();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) { list.splice(idx, 1); showToast('Removed from watchlist', 'success'); }
    else {
      list.push({ id: item.id, title: item.title || item.name, media_type: item.media_type, poster_path: item.poster_path });
      showToast('Added to watchlist!', 'success');
    }
    localStorage.setItem('lf_watchlist', JSON.stringify(list));
    updateWatchlistButton(item.id);
    displayWatchlistRow();
  }

  function updateWatchlistButton(id) {
    const btn = document.getElementById('explore-watchlist');
    if (!btn) return;
    const inList = isInWatchlist(id);
    btn.classList.toggle('active', inList);
    btn.querySelector('i').className = inList ? 'fas fa-check' : 'fas fa-plus';
  }

  function displayWatchlistRow() {
    const list = getWatchlist();
    const row = document.getElementById('watchlist-row');
    const container = document.getElementById('watchlist-list');
    if (!list.length || !getUser()) { row.style.display = 'none'; return; }
    row.style.display = '';
    container.innerHTML = '';
    list.forEach(item => container.appendChild(createCard(item)));
  }

  // ==============================
  //  Watch History
  // ==============================

  function getWatchHistory() { try { return JSON.parse(localStorage.getItem('lf_history') || '[]'); } catch (_) { return []; } }

  function addToHistory(item) {
    let h = getWatchHistory().filter(i => i.id !== item.id);
    h.unshift({ id: item.id, title: item.title || item.name, media_type: item.media_type, poster_path: item.poster_path, ts: Date.now() });
    localStorage.setItem('lf_history', JSON.stringify(h.slice(0, 30)));
  }

  function displayHistoryRow() {
    const history = getWatchHistory();
    const row = document.getElementById('history-row');
    const list = document.getElementById('history-list');
    if (!history.length) { row.style.display = 'none'; return; }
    row.style.display = '';
    list.innerHTML = '';
    history.forEach(item => list.appendChild(createCard(item)));
  }

  // ==============================
  //  Watch Progress
  // ==============================

  function saveProgress(id, seconds, duration) {
    try {
      const s = JSON.parse(localStorage.getItem('lf_progress') || '{}');
      s[id] = { time: seconds, dur: duration || 0 };
      localStorage.setItem('lf_progress', JSON.stringify(s));
    } catch (_) {}
  }

  function getSavedProgress(id) {
    try {
      const e = JSON.parse(localStorage.getItem('lf_progress') || '{}')[id];
      if (!e) return 0;
      return typeof e === 'number' ? e : (e.time || 0);
    } catch (_) { return 0; }
  }

  function getProgressPercent(id) {
    try {
      const e = JSON.parse(localStorage.getItem('lf_progress') || '{}')[id];
      if (!e || typeof e === 'number') return 0;
      return e.dur > 0 ? (e.time / e.dur) * 100 : 0;
    } catch (_) { return 0; }
  }

  function displayContinueWatching() {
    const progress = JSON.parse(localStorage.getItem('lf_progress') || '{}');
    const history = getWatchHistory();
    const row = document.getElementById('continue-watching-row');
    const list = document.getElementById('continue-list');

    const items = history.filter(item => {
      const p = progress[item.id];
      if (!p) return false;
      const pct = typeof p === 'number' ? 0 : (p.dur > 0 ? (p.time / p.dur) * 100 : 0);
      return typeof p === 'number' ? p > 30 : (p.time > 30 && pct < 90);
    });

    if (!items.length) { row.style.display = 'none'; return; }
    row.style.display = '';
    list.innerHTML = '';
    items.forEach(item => {
      const card = createCard(item, null, { showProgress: true });
      list.appendChild(card);
    });
  }

  window.addEventListener('message', (event) => {
    try {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type !== 'PLAYER_EVENT' || !msg.data) return;
      const { event: evt, currentTime, duration, id } = msg.data;
      if ((evt === 'timeupdate' || evt === 'pause' || evt === 'seeked') && id && currentTime) {
        saveProgress(id, currentTime, duration);
      }
    } catch (_) {}
  });

  // ==============================
  //  User Ratings
  // ==============================

  function getUserRatings() { try { return JSON.parse(localStorage.getItem('lf_ratings') || '{}'); } catch (_) { return {}; } }
  function getUserRating(id) { return getUserRatings()[id] || 0; }

  function setUserRating(id, rating) {
    const r = getUserRatings(); r[id] = rating;
    localStorage.setItem('lf_ratings', JSON.stringify(r));
    updateUserRatingUI(rating);
    showToast(`Rated ${rating}/5 ★`, 'success');
  }

  function updateUserRatingUI(rating) {
    document.querySelectorAll('#user-stars span').forEach(s => {
      const v = +s.dataset.star;
      s.textContent = v <= rating ? '★' : '☆';
      s.classList.toggle('filled', v <= rating);
    });
  }

  // ==============================
  //  Recent Searches
  // ==============================

  function getRecentSearches() { try { return JSON.parse(localStorage.getItem('lf_searches') || '[]'); } catch (_) { return []; } }

  function addRecentSearch(q) {
    let s = getRecentSearches().filter(x => x !== q);
    s.unshift(q);
    localStorage.setItem('lf_searches', JSON.stringify(s.slice(0, 8)));
  }

  function displayRecentSearches() {
    const searches = getRecentSearches();
    const section = document.getElementById('recent-searches');
    const list = document.getElementById('recent-searches-list');
    if (!searches.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    list.innerHTML = '';
    searches.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'recent-search-item';
      btn.innerHTML = `<i class="fas fa-clock"></i> ${escapeHTML(q)}`;
      btn.addEventListener('click', () => {
        document.getElementById('search-input').value = q;
        performSearch(q);
      });
      list.appendChild(btn);
    });
  }

  // ==============================
  //  API Functions (cached)
  // ==============================

  async function fetchGenres() {
    const [m, t] = await Promise.all([
      cachedFetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`),
      cachedFetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`)
    ]);
    const map = {};
    if (m?.genres) m.genres.forEach(g => { map[g.id] = g.name; });
    if (t?.genres) t.genres.forEach(g => { map[g.id] = g.name; });
    return map;
  }

  async function fetchTrending(type) {
    const d = await cachedFetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    return d ? d.results : [];
  }

  async function fetchTrendingAnime() {
    const d = await cachedFetch(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`);
    return d ? d.results.map(i => ({ ...i, media_type: 'tv' })) : [];
  }

  async function fetchDetails(id, type) { return await cachedFetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`); }
  async function fetchCredits(id, type) { return await cachedFetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`); }
  async function fetchVideos(id, type) { return await cachedFetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`); }
  async function fetchSimilar(id, type) { const d = await cachedFetch(`${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}`); return d ? d.results : []; }

  async function fetchContentRating(id, type) {
    if (type === 'movie') {
      const d = await cachedFetch(`${BASE_URL}/movie/${id}/release_dates?api_key=${API_KEY}`);
      if (d?.results) { const us = d.results.find(r => r.iso_3166_1 === 'US'); if (us?.release_dates?.[0]?.certification) return us.release_dates[0].certification; }
    } else {
      const d = await cachedFetch(`${BASE_URL}/tv/${id}/content_ratings?api_key=${API_KEY}`);
      if (d?.results) { const us = d.results.find(r => r.iso_3166_1 === 'US'); if (us?.rating) return us.rating; }
    }
    return null;
  }

  async function searchTMDB(query) {
    if (!query.trim()) return [];
    const d = await cachedFetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    return d ? d.results.filter(i => i.poster_path) : [];
  }

  // ==============================
  //  Display Functions
  // ==============================

  function createCard(item, onClick, opts = {}) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', escapeHTML(item.title || item.name));

    const img = document.createElement('img');
    img.src = `${IMG_THUMB}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = 'lazy';
    card.appendChild(img);

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.title || item.name;
    card.appendChild(title);

    // Top 10 badge
    if (opts.rank) {
      const b = document.createElement('div');
      b.className = 'top-badge';
      b.textContent = opts.rank;
      card.appendChild(b);
    }

    // Rating badge
    if (opts.showRating && item.vote_average) {
      const r = document.createElement('div');
      r.className = 'card-rating';
      r.innerHTML = `<i class="fas fa-star"></i> ${item.vote_average.toFixed(1)}`;
      card.appendChild(r);
    }

    // Progress bar
    if (opts.showProgress) {
      const pct = getProgressPercent(item.id);
      if (pct > 0) {
        const w = document.createElement('div');
        w.className = 'progress-bar-wrap';
        w.innerHTML = `<div class="progress-bar-fill" style="width:${Math.min(pct, 100).toFixed(1)}%"></div>`;
        card.appendChild(w);
      }
    }

    const handler = onClick || (() => openExploreView(item));
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    return card;
  }

  function displayList(items, containerId, opts = {}) {
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    if (!items.length) { c.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No content found.</p>'; return; }
    items.forEach((item, idx) => {
      if (!item.poster_path) return;
      const cardOpts = { ...opts };
      if (opts.showTop10 && idx < 10) cardOpts.rank = idx + 1;
      c.appendChild(createCard(item, null, cardOpts));
    });
  }

  // ==============================
  //  Banner Carousel
  // ==============================

  function buildCarousel(items) {
    carouselItems = items.filter(i => i.backdrop_path).slice(0, 6);
    if (!carouselItems.length) return;
    bannerItem = carouselItems[0];

    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    track.innerHTML = ''; dots.innerHTML = '';

    carouselItems.forEach((item, idx) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide' + (idx === 0 ? ' active' : '');
      slide.style.backgroundImage = `url(${IMG_BACKDROP}${item.backdrop_path})`;
      const genres = getGenreNames(item.genre_ids).slice(0, 2);
      slide.innerHTML = `
        <div class="banner-overlay"></div>
        <div class="banner-content">
          <h1>${escapeHTML(item.title || item.name)}</h1>
          <div class="banner-meta">
            <span class="meta-badge"><i class="fas fa-star"></i> ${(item.vote_average || 0).toFixed(1)}/10</span>
            <span class="meta-badge"><i class="far fa-calendar"></i> ${getYear(item)}</span>
            ${genres.map(g => `<span class="genre-tag">${escapeHTML(g)}</span>`).join('')}
          </div>
          <p class="banner-overview">${escapeHTML(item.overview || '')}</p>
          <div class="banner-actions">
            <button class="btn-play" data-idx="${idx}"><i class="fas fa-play"></i> Play</button>
            <button class="btn-explore" data-idx="${idx}"><i class="fas fa-info-circle"></i> Explore More</button>
          </div>
        </div>`;
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.addEventListener('click', () => goToSlide(idx));
      dots.appendChild(dot);
    });

    track.querySelectorAll('.btn-play').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openPlayer(carouselItems[+btn.dataset.idx]); });
    });
    track.querySelectorAll('.btn-explore').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openExploreView(carouselItems[+btn.dataset.idx]); });
    });

    startCarouselTimer();
  }

  function goToSlide(idx) {
    carouselIndex = idx;
    bannerItem = carouselItems[idx];
    document.querySelectorAll('.carousel-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
    document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    resetCarouselTimer();
  }
  function nextSlide() { goToSlide((carouselIndex + 1) % carouselItems.length); }
  function prevSlide() { goToSlide((carouselIndex - 1 + carouselItems.length) % carouselItems.length); }
  function startCarouselTimer() { carouselTimer = setInterval(nextSlide, 8000); }
  function resetCarouselTimer() { clearInterval(carouselTimer); startCarouselTimer(); }

  // ==============================
  //  Genre Rows
  // ==============================

  async function loadGenreRows() {
    const container = document.getElementById('genre-rows');
    for (const g of GENRE_ROWS) {
      const data = await cachedFetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${g.genre}&sort_by=popularity.desc`);
      if (!data?.results?.length) continue;
      const section = document.createElement('section');
      section.className = 'row';
      const listId = `genre-${g.genre}`;
      section.innerHTML = `
        <h2><i class="fas ${g.icon}"></i> ${escapeHTML(g.name)}</h2>
        <div class="list-wrapper">
          <button class="scroll-btn scroll-left" data-target="${listId}"><i class="fas fa-chevron-left"></i></button>
          <div class="list" id="${listId}"></div>
          <button class="scroll-btn scroll-right" data-target="${listId}"><i class="fas fa-chevron-right"></i></button>
        </div>`;
      container.appendChild(section);
      const list = section.querySelector('.list');
      data.results.filter(i => i.poster_path).forEach(item => {
        item.media_type = 'movie';
        list.appendChild(createCard(item, null, { showRating: true }));
      });
      section.querySelectorAll('.scroll-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = btn.classList.contains('scroll-left') ? -1 : 1;
          list.scrollBy({ left: list.clientWidth * 0.75 * dir, behavior: 'smooth' });
        });
      });
    }
  }

  // ==============================
  //  EXPLORE VIEW
  // ==============================

  async function openExploreView(item, pushHistory = true) {
    currentItem = item;
    const type = item.media_type === 'movie' ? 'movie' : 'tv';
    const view = document.getElementById('explore-view');

    if (pushHistory) pushState(type, item.id);

    view.classList.add('active');
    view.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('navbar').classList.add('hidden');
    clearInterval(carouselTimer);

    document.getElementById('explore-title').textContent = item.title || item.name;
    document.getElementById('explore-overview').textContent = item.overview || 'No description available.';
    document.getElementById('explore-year').textContent = getYear(item);
    document.getElementById('explore-rating').textContent = String(Math.round((item.vote_average || 0) / 2));
    document.getElementById('explore-runtime').textContent = '...';
    document.getElementById('explore-content-rating').textContent = '';

    const genreContainer = document.getElementById('explore-genres');
    genreContainer.innerHTML = '';
    getGenreNames(item.genre_ids).forEach(n => {
      const t = document.createElement('span'); t.className = 'genre-tag'; t.textContent = n;
      genreContainer.appendChild(t);
    });

    updateWatchlistButton(item.id);
    updateUserRatingUI(getUserRating(item.id));

    const fallback = document.getElementById('explore-fallback-bg');
    fallback.src = `${IMG_BACKDROP}${item.backdrop_path}`;
    fallback.classList.add('visible');

    document.getElementById('explore-similar-section').style.display = 'none';
    document.getElementById('similar-grid').innerHTML = '';
    document.getElementById('cast-grid').innerHTML = '';
    document.getElementById('episode-picker').style.display = 'none';
    document.getElementById('episode-list').innerHTML = '';

    // Bind user rating stars
    document.querySelectorAll('#user-stars span').forEach(s => {
      s.onclick = () => { if (currentItem) setUserRating(currentItem.id, +s.dataset.star); };
    });

    const [details, credits, videos, contentRating] = await Promise.all([
      fetchDetails(item.id, type),
      fetchCredits(item.id, type),
      fetchVideos(item.id, type),
      fetchContentRating(item.id, type)
    ]);

    if (details) {
      const runtime = type === 'movie' ? details.runtime : (details.episode_run_time?.[0] || null);
      document.getElementById('explore-runtime').textContent = formatRuntime(runtime);
      if (details.genres?.length) {
        genreContainer.innerHTML = '';
        details.genres.forEach(g => {
          const t = document.createElement('span'); t.className = 'genre-tag'; t.textContent = g.name;
          genreContainer.appendChild(t);
        });
      }
      // TV: load episode picker
      if (type === 'tv' && details.number_of_seasons > 0) {
        loadSeasons(item.id, details.number_of_seasons);
      }
    }

    if (contentRating) document.getElementById('explore-content-rating').textContent = contentRating;
    if (credits?.cast?.length) displayCast(credits.cast.slice(0, 12));
    loadTrailer(videos);
    view.scrollTop = 0;
  }

  function closeExploreView(popHistory = true) {
    const view = document.getElementById('explore-view');
    view.classList.remove('active');
    view.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.getElementById('navbar').classList.remove('hidden');
    stopTrailer();
    currentItem = null;
    if (popHistory) clearState();
    startCarouselTimer();
  }

  // ==============================
  //  TV Season/Episode Picker
  // ==============================

  function loadSeasons(tvId, numSeasons) {
    const picker = document.getElementById('episode-picker');
    const select = document.getElementById('season-select');
    picker.style.display = '';
    select.innerHTML = '';
    for (let i = 1; i <= numSeasons; i++) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = `Season ${i}`;
      select.appendChild(opt);
    }
    select.onchange = () => loadEpisodes(tvId, +select.value);
    loadEpisodes(tvId, 1);
  }

  async function loadEpisodes(tvId, seasonNum) {
    const list = document.getElementById('episode-list');
    list.innerHTML = '<p style="color:var(--text-muted)">Loading episodes...</p>';
    const data = await cachedFetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
    if (!data?.episodes?.length) { list.innerHTML = '<p style="color:var(--text-muted)">No episodes found.</p>'; return; }
    list.innerHTML = '';
    data.episodes.forEach(ep => {
      const card = document.createElement('div');
      card.className = 'episode-card';
      const thumbSrc = ep.still_path ? `${IMG_STILL}${ep.still_path}` : '';
      card.innerHTML = `
        ${thumbSrc ? `<img class="episode-thumb" src="${thumbSrc}" alt="" loading="lazy" />` : '<div class="episode-thumb" style="background:var(--bg-elevated)"></div>'}
        <div class="episode-info">
          <div class="episode-number">E${ep.episode_number}${ep.air_date ? ` · ${ep.air_date}` : ''}</div>
          <div class="episode-title">${escapeHTML(ep.name)}</div>
          <div class="episode-overview">${escapeHTML(ep.overview || '')}</div>
        </div>
        <button class="episode-play" aria-label="Play episode ${ep.episode_number}"><i class="fas fa-play"></i></button>`;
      card.querySelector('.episode-play').addEventListener('click', (e) => { e.stopPropagation(); playEpisode(tvId, seasonNum, ep.episode_number); });
      card.addEventListener('click', () => playEpisode(tvId, seasonNum, ep.episode_number));
      list.appendChild(card);
    });
  }

  function playEpisode(tvId, season, episode) {
    const path = currentServer.tv.replace('{id}', tvId).replace('{s}', season).replace('{e}', episode);
    const params = new URLSearchParams(currentServer.params);
    const url = `${currentServer.base}${path}?${params}`;
    const player = document.getElementById('fullscreen-player');
    document.getElementById('player-iframe').src = url;
    player.classList.add('active');
    player.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    stopTrailer();
    if (currentItem) addToHistory(currentItem);
  }

  // ==============================
  //  Trailer (YouTube Background)
  // ==============================

  function loadTrailer(videosData) {
    const iframe = document.getElementById('explore-trailer');
    const fallback = document.getElementById('explore-fallback-bg');
    let trailerKey = null;
    if (videosData?.results?.length) {
      const t = videosData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
             || videosData.results.find(v => v.site === 'YouTube');
      if (t) trailerKey = t.key;
    }
    if (trailerKey) {
      iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1`;
      trailerIframe = iframe; trailerMuted = true;
      fallback.classList.remove('visible');
      updateMuteIcon();
    } else {
      iframe.src = ''; fallback.classList.add('visible');
    }
  }

  function stopTrailer() { document.getElementById('explore-trailer').src = ''; trailerIframe = null; }

  function toggleTrailerMute() {
    if (!trailerIframe) return;
    trailerMuted = !trailerMuted;
    trailerIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: trailerMuted ? 'mute' : 'unMute', args: [] }), '*');
    updateMuteIcon();
  }

  function updateMuteIcon() {
    document.getElementById('explore-mute').innerHTML = trailerMuted ? '<i class="fas fa-volume-xmark"></i>' : '<i class="fas fa-volume-high"></i>';
  }

  // ==============================
  //  Cast & Similar
  // ==============================

  function displayCast(cast) {
    const grid = document.getElementById('cast-grid');
    grid.innerHTML = '';
    cast.forEach(p => {
      const card = document.createElement('div');
      card.className = 'cast-card';
      const src = p.profile_path ? `${IMG_PROFILE}${p.profile_path}` : `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222236" width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="32" fill="%236a6a7a">?</text></svg>')}`;
      card.innerHTML = `<img class="cast-photo" src="${src}" alt="${escapeHTML(p.name)}" loading="lazy" /><div class="cast-info"><div class="cast-name">${escapeHTML(p.name)}</div><div class="cast-character">${escapeHTML(p.character || '')}</div></div>`;
      grid.appendChild(card);
    });
  }

  async function loadSimilar() {
    if (!currentItem) return;
    const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
    const section = document.getElementById('explore-similar-section');
    const grid = document.getElementById('similar-grid');
    if (section.style.display !== 'none' && grid.children.length > 0) {
      section.scrollIntoView({ behavior: 'smooth' }); return;
    }
    section.style.display = 'block';
    grid.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    const items = await fetchSimilar(currentItem.id, type);
    grid.innerHTML = '';
    if (!items.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No similar content found.</p>'; return; }
    items.filter(i => i.poster_path).slice(0, 12).forEach(item => {
      item.media_type = item.media_type || type;
      grid.appendChild(createCard(item, () => { closeExploreView(false); setTimeout(() => openExploreView(item), 100); }, { showRating: true }));
    });
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ==============================
  //  Player (Overlay with Server Selector)
  // ==============================

  function openPlayer(item) {
    if (!item) return;
    const type = item.media_type === 'movie' ? 'movie' : 'tv';
    const pathTemplate = type === 'movie' ? currentServer.movie : currentServer.tv;
    const path = pathTemplate.replace('{id}', item.id).replace('{s}', '1').replace('{e}', '1');
    const params = new URLSearchParams(currentServer.params);
    const url = `${currentServer.base}${path}?${params}`;
    const player = document.getElementById('fullscreen-player');
    document.getElementById('player-iframe').src = url;
    player.classList.add('active');
    player.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    stopTrailer();
    addToHistory(item);
  }

  function closePlayer() {
    const player = document.getElementById('fullscreen-player');
    document.getElementById('player-iframe').src = '';
    player.classList.remove('active');
    player.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    displayContinueWatching();
    displayHistoryRow();
  }

  function switchServer(serverId) {
    const server = SERVERS.find(s => s.id === serverId);
    if (!server) return;
    currentServer = server;
    document.querySelectorAll('.server-btn').forEach(b => b.classList.toggle('active', b.dataset.server === serverId));
    // If player is open, reload with new server
    if (currentItem && document.getElementById('fullscreen-player').classList.contains('active')) {
      openPlayer(currentItem);
    }
    showToast(`Switched to ${server.name}`, 'success');
  }

  // ==============================
  //  Share
  // ==============================

  async function shareContent() {
    if (!currentItem) return;
    const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
    const url = `${window.location.origin}${window.location.pathname}?type=${type}&id=${currentItem.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
    } catch (_) {
      const i = document.createElement('input'); i.value = url;
      document.body.appendChild(i); i.select(); document.execCommand('copy');
      document.body.removeChild(i);
      showToast('Link copied!', 'success');
    }
  }

  // ==============================
  //  URL Routing
  // ==============================

  function pushState(type, id) {
    const url = new URL(window.location);
    url.searchParams.set('type', type); url.searchParams.set('id', id);
    history.pushState({ type, id }, '', url);
  }

  function clearState() {
    history.pushState({}, '', window.location.pathname);
  }

  async function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');
    if (type && id) {
      const data = await cachedFetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
      if (data) { data.media_type = type; openExploreView(data, false); }
    }
  }

  window.addEventListener('popstate', (e) => {
    if (e.state?.type && e.state?.id) {
      cachedFetch(`${BASE_URL}/${e.state.type}/${e.state.id}?api_key=${API_KEY}`).then(data => {
        if (data) { data.media_type = e.state.type; openExploreView(data, false); }
      });
    } else {
      if (document.getElementById('explore-view').classList.contains('active')) closeExploreView(false);
    }
  });

  // ==============================
  //  Search
  // ==============================

  function openSearchModal() {
    const m = document.getElementById('search-modal');
    m.classList.add('active'); m.style.display = 'flex';
    const input = document.getElementById('search-input');
    input.value = ''; document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = 'hidden';
    searchFilter = 'all';
    document.querySelectorAll('.search-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
    displayRecentSearches();
    setTimeout(() => input.focus(), 50);
  }

  function closeSearchModal() {
    const m = document.getElementById('search-modal');
    m.classList.remove('active'); m.style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = '';
  }

  async function performSearch(query) {
    if (!query.trim()) return;
    addRecentSearch(query);
    document.getElementById('recent-searches').style.display = 'none';
    lastSearchResults = await searchTMDB(query);
    renderSearchResults();
  }

  function renderSearchResults() {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    let filtered = lastSearchResults;
    if (searchFilter === 'movie') filtered = filtered.filter(i => i.media_type === 'movie');
    else if (searchFilter === 'tv') filtered = filtered.filter(i => i.media_type === 'tv');
    if (!filtered.length) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">No results found.</p>';
      return;
    }
    filtered.forEach(item => {
      container.appendChild(createCard(item, () => { closeSearchModal(); openExploreView(item); }, { showRating: true }));
    });
  }

  // ==============================
  //  Scroll Arrows & Back to Top
  // ==============================

  function setupScrollButtons() {
    document.querySelectorAll('.scroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list = document.getElementById(btn.getAttribute('data-target'));
        if (!list) return;
        const dir = btn.classList.contains('scroll-left') ? -1 : 1;
        list.scrollBy({ left: list.clientWidth * 0.75 * dir, behavior: 'smooth' });
      });
    });
  }

  function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => { btn.classList.toggle('visible', window.scrollY > 400); }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ==============================
  //  Offline Detection
  // ==============================

  window.addEventListener('online', () => {
    document.getElementById('offline-bar')?.classList.remove('visible');
    showToast('Back online!', 'success');
  });
  window.addEventListener('offline', () => {
    document.getElementById('offline-bar')?.classList.add('visible');
  });

  // ==============================
  //  Event Binding
  // ==============================

  function bindEvents() {
    document.getElementById('search-trigger')?.addEventListener('click', openSearchModal);
    document.getElementById('search-close')?.addEventListener('click', closeSearchModal);

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(async () => {
        const q = searchInput.value;
        if (!q.trim()) { document.getElementById('search-results').innerHTML = ''; displayRecentSearches(); return; }
        await performSearch(q);
      }, 350));
    }

    // Search filter tabs
    document.querySelectorAll('.search-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        searchFilter = tab.dataset.filter;
        document.querySelectorAll('.search-tab').forEach(t => t.classList.toggle('active', t === tab));
        if (lastSearchResults.length) renderSearchResults();
      });
    });

    // Carousel
    document.getElementById('carousel-prev')?.addEventListener('click', prevSlide);
    document.getElementById('carousel-next')?.addEventListener('click', nextSlide);

    // Explore
    document.getElementById('explore-back')?.addEventListener('click', () => closeExploreView());
    document.getElementById('explore-mute')?.addEventListener('click', toggleTrailerMute);
    document.getElementById('explore-play')?.addEventListener('click', () => { if (currentItem) openPlayer(currentItem); });
    document.getElementById('explore-watchlist')?.addEventListener('click', () => { if (currentItem) toggleWatchlist(currentItem); });
    document.getElementById('explore-share')?.addEventListener('click', shareContent);
    document.getElementById('explore-similars-btn')?.addEventListener('click', loadSimilar);

    // Player
    document.getElementById('player-close')?.addEventListener('click', closePlayer);

    // Server selector buttons
    document.querySelectorAll('.server-btn').forEach(btn => {
      btn.addEventListener('click', () => switchServer(btn.dataset.server));
    });

    // Auth
    document.getElementById('nav-user')?.addEventListener('click', () => { if (getUser()) logoutUser(); else showAuthModal(); });
    document.getElementById('auth-close')?.addEventListener('click', closeAuthModal);
    document.getElementById('auth-backdrop')?.addEventListener('click', closeAuthModal);
    document.querySelectorAll('.auth-tab').forEach(t => t.addEventListener('click', () => setAuthTab(t.dataset.tab)));
    document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('fullscreen-player').classList.contains('active')) closePlayer();
        else if (document.getElementById('auth-modal').classList.contains('active')) closeAuthModal();
        else if (document.getElementById('search-modal').classList.contains('active')) closeSearchModal();
        else if (document.getElementById('explore-view').classList.contains('active')) closeExploreView();
      }
    });

    setupScrollButtons();
    setupBackToTop();
  }

  // ==============================
  //  Init
  // ==============================

  async function init() {
    bindEvents();
    updateUserUI();

    // Offline check
    if (!navigator.onLine) document.getElementById('offline-bar')?.classList.add('visible');

    // Genres first
    genreMap = await fetchGenres();

    // Check URL for deep link
    checkUrlParams();

    // Fetch trending concurrently
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime()
    ]);

    buildCarousel(movies);
    displayContinueWatching();
    displayWatchlistRow();
    displayList(movies, 'movies-list', { showTop10: true });
    displayList(tvShows, 'tvshows-list', { showTop10: true });
    displayList(anime, 'anime-list');
    displayHistoryRow();

    // Load genre rows in background
    loadGenreRows();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
