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

  let currentItem = null;
  let bannerItem = null;

  // ==============================
  //  Utility Functions
  // ==============================

  /** Debounce wrapper */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /** Safe fetch with error handling */
  async function safeFetch(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('Something went wrong. Please try again.', true);
      return null;
    }
  }

  /** Show toast notification */
  function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${escapeHTML(message)}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  /** Basic HTML escaping */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Generate star rating HTML with aria-label */
  function starRating(voteAverage) {
    const stars = Math.round(voteAverage / 2);
    const full = '★'.repeat(stars);
    const empty = '☆'.repeat(5 - stars);
    return `<span aria-label="${stars} out of 5 stars">${full}${empty} <span class="vote-num">${voteAverage.toFixed(1)}</span></span>`;
  }

  // ==============================
  //  API Functions
  // ==============================

  async function fetchTrending(type) {
    const data = await safeFetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    return data ? data.results : [];
  }

  async function fetchTrendingAnime() {
    // Use Discover endpoint for targeted anime results instead of filtering trending
    const data = await safeFetch(
      `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`
    );
    if (!data) return [];
    // Set media_type manually since Discover doesn't include it
    return data.results.map(item => ({ ...item, media_type: 'tv' }));
  }

  async function searchTMDB(query) {
    if (!query.trim()) return [];
    const data = await safeFetch(
      `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    return data ? data.results.filter(item => item.poster_path) : [];
  }

  // ==============================
  //  Display Functions
  // ==============================

  function displayBanner(items) {
    // Filter to items that have a backdrop
    const withBackdrop = items.filter(item => item.backdrop_path);
    if (withBackdrop.length === 0) return;

    const item = withBackdrop[Math.floor(Math.random() * withBackdrop.length)];
    bannerItem = item;

    const banner = document.getElementById('banner');
    const title = document.getElementById('banner-title');
    const overview = document.getElementById('banner-overview');

    banner.style.backgroundImage = `url(${IMG_BACKDROP}${item.backdrop_path})`;
    title.textContent = item.title || item.name;
    overview.textContent = item.overview || '';
  }

  function createCard(item) {
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

    card.addEventListener('click', () => showDetails(item));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showDetails(item);
      }
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
  //  Modal Functions
  // ==============================

  function showDetails(item) {
    currentItem = item;
    document.getElementById('modal-title').textContent = item.title || item.name;
    document.getElementById('modal-description').textContent = item.overview || 'No description available.';
    document.getElementById('modal-image').src = `${IMG_POSTER}${item.poster_path}`;
    document.getElementById('modal-image').alt = item.title || item.name;
    document.getElementById('modal-rating').innerHTML = starRating(item.vote_average || 0);
    changeServer();
    document.getElementById('modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function changeServer() {
    if (!currentItem) return;
    const server = document.getElementById('server').value;
    const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
    let embedURL = '';

    switch (server) {
      case 'vidsrc.cc':
        embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
        break;
      case 'vidsrc.me':
        embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
        break;
      case 'player.videasy.net':
        embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
        break;
    }

    document.getElementById('modal-video').src = embedURL;
  }

  function closeModal() {
    document.getElementById('modal').style.display = 'none';
    document.getElementById('modal-video').src = '';
    document.body.style.overflow = '';
    currentItem = null;
  }

  function openSearchModal() {
    document.getElementById('search-modal').style.display = 'flex';
    const input = document.getElementById('search-input');
    input.value = '';
    document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = 'hidden';
    // Delay focus to ensure modal is visible
    setTimeout(() => input.focus(), 50);
  }

  function closeSearchModal() {
    document.getElementById('search-modal').style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
    document.body.style.overflow = '';
  }

  // ==============================
  //  Scroll Arrows
  // ==============================

  function setupScrollButtons() {
    document.querySelectorAll('.scroll-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const list = document.getElementById(targetId);
        if (!list) return;
        const scrollAmount = list.clientWidth * 0.75;
        const direction = btn.classList.contains('scroll-left') ? -1 : 1;
        list.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
      });
    });
  }

  // ==============================
  //  Back to Top
  // ==============================

  function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==============================
  //  Event Binding
  // ==============================

  function bindEvents() {
    // Search trigger
    const searchTrigger = document.getElementById('search-trigger');
    if (searchTrigger) searchTrigger.addEventListener('click', openSearchModal);

    // Search input (debounced)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(async () => {
        const query = searchInput.value;
        const container = document.getElementById('search-results');
        if (!query.trim()) {
          container.innerHTML = '';
          return;
        }
        const results = await searchTMDB(query);
        container.innerHTML = '';
        results.forEach(item => {
          const card = createCard(item);
          card.addEventListener('click', () => {
            closeSearchModal();
            showDetails(item);
          });
          container.appendChild(card);
        });
      }, 350));
    }

    // Modal close (X button)
    const modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', closeModal);

    // Modal close (backdrop click)
    const modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    // Search close
    const searchClose = document.getElementById('search-close');
    if (searchClose) searchClose.addEventListener('click', closeSearchModal);

    // Server change
    const serverSelect = document.getElementById('server');
    if (serverSelect) serverSelect.addEventListener('change', changeServer);

    // Banner "Watch Now" button
    const bannerBtn = document.getElementById('banner-btn');
    if (bannerBtn) {
      bannerBtn.addEventListener('click', () => {
        if (bannerItem) showDetails(bannerItem);
      });
    }

    // Keyboard: Escape to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('search-modal').style.display === 'flex') {
          closeSearchModal();
        } else if (document.getElementById('modal').style.display === 'flex') {
          closeModal();
        }
      }
    });

    // Scroll arrows
    setupScrollButtons();

    // Back to top
    setupBackToTop();
  }

  // ==============================
  //  Initialization
  // ==============================

  async function init() {
    bindEvents();

    // Fetch all data concurrently
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime()
    ]);

    // Display banner from movies
    displayBanner(movies);

    // Display lists
    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
