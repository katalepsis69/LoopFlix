/* ======================================
   LoopFlix — Main Application
   ====================================== */
(function () {
  'use strict';

  // --- Config ---
  const API_KEY = '3a16a4172e03d111270c5bf5c638f1a5';
  const BASE_URL = 'https://api.themoviedb.org/3';
  const IMG_THUMB = 'https://image.tmdb.org/t/p/w342';
  const IMG_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
  const IMG_POSTER = 'https://image.tmdb.org/t/p/w500';
  const IMG_PROFILE = 'https://image.tmdb.org/t/p/w185';
  const EMBED_BASE = 'https://www.vidking.net';

  let currentItem = null;
  let bannerItem = null;
  let genreMap = {};
  let trailerMuted = true;
  let trailerIframe = null;

  // ==============================
  //  Utilities
  // ==============================

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function safeFetch(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Something went wrong. Please try again.', 'error');
      return null;
    }
  }

  function showToast(message, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ` ${type}` : '');
    const icon = type === 'error' ? 'fa-exclamation-circle'
      : type === 'success' ? 'fa-check-circle'
        : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHTML(message)}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function starRating(voteAverage) {
    const stars = Math.round(voteAverage / 2);
    return `<span aria-label="${stars} out of 5 stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>`;
  }

  function formatRuntime(minutes) {
    if (!minutes) return 'N/A';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function getYear(item) {
    const d = item.release_date || item.first_air_date || '';
    return d ? d.substring(0, 4) : '';
  }

  function getGenreNames(genreIds) {
    if (!genreIds) return [];
    return genreIds.map(id => genreMap[id]).filter(Boolean);
  }

  // ==============================
  //  Auth System (localStorage)
  // ==============================

  function getUser() {
    try { return JSON.parse(localStorage.getItem('lf_user')); } catch (_) { return null; }
  }

  function setUser(user) {
    localStorage.setItem('lf_user', JSON.stringify(user));
    updateUserUI();
  }

  function logoutUser() {
    localStorage.removeItem('lf_user');
    updateUserUI();
    showToast('Logged out successfully', 'success');
  }

  function getAccounts() {
    try { return JSON.parse(localStorage.getItem('lf_accounts') || '{}'); } catch (_) { return {}; }
  }

  function updateUserUI() {
    const user = getUser();
    const el = document.getElementById('nav-username');
    const btn = document.getElementById('nav-user');
    if (user) {
      el.textContent = user.username;
      btn.title = `Logged in as ${user.username} — click to logout`;
    } else {
      el.textContent = '';
      btn.title = 'Login / Register';
    }
  }

  function showAuthModal() {
    document.getElementById('auth-modal').classList.add('active');
    document.getElementById('auth-modal').setAttribute('aria-hidden', 'false');
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

  let authMode = 'login';
  function setAuthTab(mode) {
    authMode = mode;
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === mode);
    });
    document.getElementById('auth-submit').textContent = mode === 'login' ? 'Login' : 'Create Account';
    document.getElementById('auth-error').textContent = '';
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');

    if (!username || !password) { errorEl.textContent = 'Please fill in all fields.'; return; }

    const accounts = getAccounts();
    if (authMode === 'register') {
      if (accounts[username]) { errorEl.textContent = 'Username already taken.'; return; }
      accounts[username] = password;
      localStorage.setItem('lf_accounts', JSON.stringify(accounts));
      setUser({ username });
      closeAuthModal();
      showToast(`Welcome to LoopFlix, ${username}!`, 'success');
    } else {
      if (!accounts[username] || accounts[username] !== password) {
        errorEl.textContent = 'Invalid username or password.'; return;
      }
      setUser({ username });
      closeAuthModal();
      showToast(`Welcome back, ${username}!`, 'success');
    }
  }

  // ==============================
  //  Watchlist
  // ==============================

  function getWatchlist() {
    try { return JSON.parse(localStorage.getItem('lf_watchlist') || '[]'); } catch (_) { return []; }
  }

  function isInWatchlist(id) {
    return getWatchlist().some(item => item.id === id);
  }

  function toggleWatchlist(item) {
    if (!getUser()) { showAuthModal(); return; }
    let list = getWatchlist();
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      showToast('Removed from watchlist', 'success');
    } else {
      list.push({ id: item.id, title: item.title || item.name, media_type: item.media_type, poster_path: item.poster_path });
      showToast('Added to watchlist!', 'success');
    }
    localStorage.setItem('lf_watchlist', JSON.stringify(list));
    updateWatchlistButton(item.id);
  }

  function updateWatchlistButton(id) {
    const btn = document.getElementById('explore-watchlist');
    if (!btn) return;
    const inList = isInWatchlist(id);
    btn.classList.toggle('active', inList);
    btn.querySelector('i').className = inList ? 'fas fa-check' : 'fas fa-plus';
    btn.setAttribute('aria-label', inList ? 'Remove from watchlist' : 'Add to watchlist');
  }

  // ==============================
  //  API Functions
  // ==============================

  async function fetchGenres() {
    const [movieGenres, tvGenres] = await Promise.all([
      safeFetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`),
      safeFetch(`${BASE_URL}/genre/tv/list?api_key=${API_KEY}`)
    ]);
    const map = {};
    if (movieGenres?.genres) movieGenres.genres.forEach(g => { map[g.id] = g.name; });
    if (tvGenres?.genres) tvGenres.genres.forEach(g => { map[g.id] = g.name; });
    return map;
  }

  async function fetchTrending(type) {
    const data = await safeFetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    return data ? data.results : [];
  }

  async function fetchTrendingAnime() {
    const data = await safeFetch(
      `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`
    );
    if (!data) return [];
    return data.results.map(item => ({ ...item, media_type: 'tv' }));
  }

  async function fetchDetails(id, type) {
    return await safeFetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}`);
  }

  async function fetchCredits(id, type) {
    return await safeFetch(`${BASE_URL}/${type}/${id}/credits?api_key=${API_KEY}`);
  }

  async function fetchVideos(id, type) {
    return await safeFetch(`${BASE_URL}/${type}/${id}/videos?api_key=${API_KEY}`);
  }

  async function fetchSimilar(id, type) {
    const data = await safeFetch(`${BASE_URL}/${type}/${id}/similar?api_key=${API_KEY}`);
    return data ? data.results : [];
  }

  async function searchTMDB(query) {
    if (!query.trim()) return [];
    const data = await safeFetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    return data ? data.results.filter(item => item.poster_path) : [];
  }

  // ==============================
  //  Display Functions
  // ==============================

  function displayBanner(items) {
    const withBackdrop = items.filter(i => i.backdrop_path);
    if (withBackdrop.length === 0) return;
    const item = withBackdrop[Math.floor(Math.random() * withBackdrop.length)];
    bannerItem = item;

    document.getElementById('banner').style.backgroundImage = `url(${IMG_BACKDROP}${item.backdrop_path})`;
    document.getElementById('banner-title').textContent = item.title || item.name;
    document.getElementById('banner-overview').textContent = item.overview || '';
    document.getElementById('banner-rating').textContent = `${(item.vote_average || 0).toFixed(1)}/10`;
    document.getElementById('banner-year').textContent = getYear(item);

    const genres = getGenreNames(item.genre_ids);
    document.getElementById('banner-genre').textContent = genres[0] || '';
    document.getElementById('banner-genre').style.display = genres[0] ? '' : 'none';
  }

  function createCard(item, onClick) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View details for ${escapeHTML(item.title || item.name)}`);

    const img = document.createElement('img');
    img.src = `${IMG_THUMB}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.loading = 'lazy';

    const titleEl = document.createElement('div');
    titleEl.className = 'card-title';
    titleEl.textContent = item.title || item.name;

    card.appendChild(img);
    card.appendChild(titleEl);

    const handler = onClick || (() => openExploreView(item));
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
    return card;
  }

  function displayList(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No content found.</p>';
      return;
    }
    items.forEach(item => {
      if (!item.poster_path) return;
      container.appendChild(createCard(item));
    });
  }

  // ==============================
  //  EXPLORE VIEW
  // ==============================

  async function openExploreView(item) {
    currentItem = item;
    const view = document.getElementById('explore-view');
    const type = item.media_type === 'movie' ? 'movie' : 'tv';

    // Show immediately with basic info
    view.classList.add('active');
    view.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('navbar').classList.add('hidden');

    document.getElementById('explore-title').textContent = item.title || item.name;
    document.getElementById('explore-overview').textContent = item.overview || 'No description available.';
    document.getElementById('explore-year').textContent = getYear(item);
    document.getElementById('explore-rating').textContent = String(Math.round(item.vote_average / 2));
    document.getElementById('explore-runtime').textContent = '...';

    // Genre badges from cache
    const genreContainer = document.getElementById('explore-genres');
    genreContainer.innerHTML = '';
    getGenreNames(item.genre_ids).forEach(name => {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = name;
      genreContainer.appendChild(tag);
    });

    // Watchlist state
    updateWatchlistButton(item.id);

    // Set fallback backdrop
    const fallbackBg = document.getElementById('explore-fallback-bg');
    fallbackBg.src = `${IMG_BACKDROP}${item.backdrop_path}`;
    fallbackBg.classList.add('visible');

    // Reset similar section
    document.getElementById('explore-similar-section').style.display = 'none';
    document.getElementById('similar-grid').innerHTML = '';
    document.getElementById('cast-grid').innerHTML = '';

    // Fetch detailed data concurrently
    const [details, credits, videos] = await Promise.all([
      fetchDetails(item.id, type),
      fetchCredits(item.id, type),
      fetchVideos(item.id, type)
    ]);

    // Runtime
    if (details) {
      const runtime = type === 'movie' ? details.runtime : (details.episode_run_time?.[0] || null);
      document.getElementById('explore-runtime').textContent = formatRuntime(runtime);

      // Full genres from details
      if (details.genres?.length) {
        genreContainer.innerHTML = '';
        details.genres.forEach(g => {
          const tag = document.createElement('span');
          tag.className = 'genre-tag';
          tag.textContent = g.name;
          genreContainer.appendChild(tag);
        });
      }
    }

    // Cast
    if (credits?.cast?.length) {
      displayCast(credits.cast.slice(0, 12));
    }

    // Trailer
    loadTrailer(videos);

    // Scroll to top of explore view
    view.scrollTop = 0;
  }

  function closeExploreView() {
    const view = document.getElementById('explore-view');
    view.classList.remove('active');
    view.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.getElementById('navbar').classList.remove('hidden');
    stopTrailer();
    currentItem = null;
  }

  // ==============================
  //  Trailer (YouTube Background)
  // ==============================

  function loadTrailer(videosData) {
    const iframe = document.getElementById('explore-trailer');
    const fallback = document.getElementById('explore-fallback-bg');

    // Find official trailer or teaser
    let trailerKey = null;
    if (videosData?.results?.length) {
      const trailer = videosData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
        || videosData.results.find(v => v.site === 'YouTube');
      if (trailer) trailerKey = trailer.key;
    }

    if (trailerKey) {
      iframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&playsinline=1`;
      trailerIframe = iframe;
      trailerMuted = true;
      fallback.classList.remove('visible');
      updateMuteIcon();
    } else {
      iframe.src = '';
      fallback.classList.add('visible');
    }
  }

  function stopTrailer() {
    const iframe = document.getElementById('explore-trailer');
    iframe.src = '';
    trailerIframe = null;
  }

  function toggleTrailerMute() {
    if (!trailerIframe) return;
    trailerMuted = !trailerMuted;
    const cmd = trailerMuted ? 'mute' : 'unMute';
    trailerIframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: [] }), '*'
    );
    updateMuteIcon();
  }

  function updateMuteIcon() {
    const btn = document.getElementById('explore-mute');
    btn.innerHTML = trailerMuted
      ? '<i class="fas fa-volume-xmark"></i>'
      : '<i class="fas fa-volume-high"></i>';
  }

  // ==============================
  //  Cast Display
  // ==============================

  function displayCast(cast) {
    const grid = document.getElementById('cast-grid');
    grid.innerHTML = '';
    cast.forEach(person => {
      const card = document.createElement('div');
      card.className = 'cast-card';

      const photo = document.createElement('img');
      photo.className = 'cast-photo';
      photo.alt = person.name;
      photo.loading = 'lazy';
      photo.src = person.profile_path
        ? `${IMG_PROFILE}${person.profile_path}`
        : `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23222236" width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="32" fill="%236a6a7a">?</text></svg>')}`;

      const info = document.createElement('div');
      info.className = 'cast-info';
      info.innerHTML = `<div class="cast-name">${escapeHTML(person.name)}</div>
                         <div class="cast-character">${escapeHTML(person.character || '')}</div>`;

      card.appendChild(photo);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  // ==============================
  //  Similar Content
  // ==============================

  async function loadSimilar() {
    if (!currentItem) return;
    const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
    const section = document.getElementById('explore-similar-section');
    const grid = document.getElementById('similar-grid');

    // Toggle visibility
    if (section.style.display !== 'none' && grid.children.length > 0) {
      section.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    section.style.display = 'block';
    grid.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';

    const items = await fetchSimilar(currentItem.id, type);
    grid.innerHTML = '';
    if (items.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted)">No similar content found.</p>';
    } else {
      items.filter(i => i.poster_path).slice(0, 12).forEach(item => {
        item.media_type = item.media_type || type;
        grid.appendChild(createCard(item, () => {
          closeExploreView();
          setTimeout(() => openExploreView(item), 100);
        }));
      });
    }
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  // ==============================
  //  Fullscreen VidKing Player
  // ==============================

  function openPlayer(item) {
    if (!item) return;
    const type = item.media_type === 'movie' ? 'movie' : 'tv';
    const id = item.id;
    const path = type === 'movie' ? `/embed/movie/${id}` : `/embed/tv/${id}/1/1`;
    const params = new URLSearchParams({
      color: 'e50914',
      autoPlay: 'true',
      nextEpisode: 'true',
      episodeSelector: 'true',
    });

    const saved = getSavedProgress(id);
    if (saved > 0) params.set('progress', String(Math.floor(saved)));

    const player = document.getElementById('fullscreen-player');
    document.getElementById('player-iframe').src = `${EMBED_BASE}${path}?${params}`;
    player.classList.add('active');
    player.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    stopTrailer();

    // Try to go fullscreen
    try {
      if (player.requestFullscreen) player.requestFullscreen();
      else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
    } catch (_) { /* fullscreen may be blocked */ }
  }

  function closePlayer() {
    const player = document.getElementById('fullscreen-player');
    document.getElementById('player-iframe').src = '';
    player.classList.remove('active');
    player.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (document.fullscreenElement) {
      try { document.exitFullscreen(); } catch (_) { }
    }
  }

  // ==============================
  //  Watch Progress Tracking
  // ==============================

  function saveProgress(contentId, seconds) {
    try {
      const store = JSON.parse(localStorage.getItem('lf_progress') || '{}');
      store[contentId] = seconds;
      localStorage.setItem('lf_progress', JSON.stringify(store));
    } catch (_) { }
  }

  function getSavedProgress(contentId) {
    try {
      const store = JSON.parse(localStorage.getItem('lf_progress') || '{}');
      return store[contentId] || 0;
    } catch (_) { return 0; }
  }

  window.addEventListener('message', (event) => {
    try {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (msg.type !== 'PLAYER_EVENT' || !msg.data) return;
      const { event: evt, currentTime, id } = msg.data;
      if ((evt === 'timeupdate' || evt === 'pause' || evt === 'seeked') && id && currentTime) {
        saveProgress(id, currentTime);
      }
    } catch (_) { }
  });

  // ==============================
  //  Search Modal
  // ==============================

  function openSearchModal() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 50);
  }

  function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = '';
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
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ==============================
  //  Event Binding
  // ==============================

  function bindEvents() {
    // Search
    const searchTrigger = document.getElementById('search-trigger');
    if (searchTrigger) searchTrigger.addEventListener('click', openSearchModal);

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(async () => {
        const query = searchInput.value;
        const container = document.getElementById('search-results');
        if (!query.trim()) { container.innerHTML = ''; return; }
        const results = await searchTMDB(query);
        container.innerHTML = '';
        results.forEach(item => {
          container.appendChild(createCard(item, () => {
            closeSearchModal();
            openExploreView(item);
          }));
        });
      }, 350));
    }

    const searchClose = document.getElementById('search-close');
    if (searchClose) searchClose.addEventListener('click', closeSearchModal);

    // Banner buttons
    const bannerPlay = document.getElementById('banner-play');
    if (bannerPlay) bannerPlay.addEventListener('click', () => { if (bannerItem) openPlayer(bannerItem); });

    const bannerExplore = document.getElementById('banner-explore');
    if (bannerExplore) bannerExplore.addEventListener('click', () => { if (bannerItem) openExploreView(bannerItem); });

    // Explore view
    document.getElementById('explore-back')?.addEventListener('click', closeExploreView);
    document.getElementById('explore-mute')?.addEventListener('click', toggleTrailerMute);
    document.getElementById('explore-play')?.addEventListener('click', () => { if (currentItem) openPlayer(currentItem); });
    document.getElementById('explore-watchlist')?.addEventListener('click', () => { if (currentItem) toggleWatchlist(currentItem); });
    document.getElementById('explore-download')?.addEventListener('click', () => showToast('Download feature coming soon!'));
    document.getElementById('explore-similars-btn')?.addEventListener('click', loadSimilar);

    // Fullscreen player
    document.getElementById('player-close')?.addEventListener('click', closePlayer);

    // Auth
    document.getElementById('nav-user')?.addEventListener('click', () => {
      if (getUser()) logoutUser();
      else showAuthModal();
    });
    document.getElementById('auth-close')?.addEventListener('click', closeAuthModal);
    document.getElementById('auth-backdrop')?.addEventListener('click', closeAuthModal);
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => setAuthTab(tab.dataset.tab));
    });
    document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);

    // Keyboard: Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('fullscreen-player').classList.contains('active')) closePlayer();
        else if (document.getElementById('auth-modal').classList.contains('active')) closeAuthModal();
        else if (document.getElementById('search-modal').classList.contains('active')) closeSearchModal();
        else if (document.getElementById('explore-view').classList.contains('active')) closeExploreView();
      }
    });

    // Fullscreen change handler
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && document.getElementById('fullscreen-player').classList.contains('active')) {
        // User exited fullscreen but player is still visible — that's ok
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

    // Fetch genres first (needed for banner display)
    genreMap = await fetchGenres();

    // Fetch all trending data concurrently
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime()
    ]);

    displayBanner(movies);
    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
