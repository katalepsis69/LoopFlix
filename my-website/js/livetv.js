/* ======================================
   LoopFlix — Live TV Module
   Uses Shaka Player for DASH + ClearKey DRM
   Includes Ad System: Preroll, Midroll,
   Channel-Switch, Pause-Roll, Companion
   ====================================== */
(function () {
  'use strict';

  let channels = [];
  let currentFilter = 'all';
  let shakaPlayer = null;
  let currentChannel = null;

  // ==============================
  //  Ad Configuration
  // ==============================
  const AD_CONFIG = {
    prerollDuration: 5,       // seconds before stream starts
    skipAfter: 3,             // show "Skip Ad" button after N seconds
    midrollInterval: 30 * 60, // 30 minutes in seconds
    midrollDuration: 5,       // midroll ad display time
    maxAdsPerHour: 6,         // frequency cap
    pauseRollDelay: 2000,     // ms after pause before showing pause-roll
    channelSwitchAd: true,    // show ad on channel switch
  };

  // Ad state
  let adState = {
    adsShownThisHour: 0,
    hourResetTimer: null,
    midrollTimer: null,
    pauseRollTimer: null,
    isPauseRollVisible: false,
    isAdVisible: false,
    adCountdownTimer: null,
    sessionStart: Date.now(),
    channelsPlayed: 0,        // track how many channels played (skip preroll on first)
  };

  // ==============================
  //  Helpers
  // ==============================

  function hexToUint8(hex) {
    const a = [];
    for (let i = 0; i < hex.length; i += 2) a.push(parseInt(hex.substr(i, 2), 16));
    return new Uint8Array(a);
  }

  function uint8ToBase64url(u8) {
    let str = '';
    u8.forEach(b => str += String.fromCharCode(b));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  const CATEGORY_ICONS = {
    all: 'fa-border-all',
    news: 'fa-newspaper',
    sports: 'fa-futbol',
    entertainment: 'fa-masks-theater',
    movies: 'fa-film',
    documentary: 'fa-globe',
    kids: 'fa-child'
  };

  // ==============================
  //  Ad Overlay System
  // ==============================

  function createAdOverlay() {
    if (document.getElementById('lt-ad-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'lt-ad-overlay';
    overlay.className = 'lt-ad-overlay';
    overlay.innerHTML = `
      <div class="lt-ad-container">
        <div class="lt-ad-label"><i class="fas fa-ad"></i> Advertisement</div>
        <div class="lt-ad-content" id="lt-ad-content">
          <ins class="adsbygoogle"
               style="display:inline-block;width:300px;height:250px"
               data-ad-client="ca-pub-5554808956576337"
               data-ad-slot="auto"></ins>
        </div>
        <div class="lt-ad-footer">
          <span class="lt-ad-timer" id="lt-ad-timer"></span>
          <button class="lt-ad-skip" id="lt-ad-skip" style="display:none">
            Skip Ad <i class="fas fa-forward"></i>
          </button>
        </div>
      </div>`;
    document.getElementById('livetv-player-view').appendChild(overlay);
    // Push ad
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }

  function createPauseRollOverlay() {
    if (document.getElementById('lt-pauseroll')) return;
    const overlay = document.createElement('div');
    overlay.id = 'lt-pauseroll';
    overlay.className = 'lt-pauseroll';
    overlay.innerHTML = `
      <div class="lt-pauseroll-inner">
        <div class="lt-pauseroll-label"><i class="fas fa-pause-circle"></i> Paused</div>
        <div class="lt-pauseroll-ad" id="lt-pauseroll-ad">
          <ins class="adsbygoogle"
               style="display:inline-block;width:728px;height:90px"
               data-ad-client="ca-pub-5554808956576337"
               data-ad-slot="auto"></ins>
        </div>
      </div>`;
    document.getElementById('livetv-player-view').appendChild(overlay);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }

  function createCompanionBanner() {
    if (document.getElementById('lt-companion-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'lt-companion-banner';
    banner.className = 'lt-companion-banner';
    banner.innerHTML = `
      <div class="lt-companion-inner" id="lt-companion-inner">
        <ins class="adsbygoogle"
             style="display:inline-block;width:728px;height:90px"
             data-ad-client="ca-pub-5554808956576337"
             data-ad-slot="auto"></ins>
      </div>
      <button class="lt-companion-close" id="lt-companion-close" aria-label="Close ad">
        <i class="fas fa-times"></i>
      </button>`;
    document.getElementById('livetv-player-view').appendChild(banner);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
    document.getElementById('lt-companion-close').addEventListener('click', () => {
      banner.style.display = 'none';
    });
  }

  function canShowAd() {
    return adState.adsShownThisHour < AD_CONFIG.maxAdsPerHour;
  }

  function recordAdShown() {
    adState.adsShownThisHour++;
    // Reset counter every hour
    if (!adState.hourResetTimer) {
      adState.hourResetTimer = setInterval(() => {
        adState.adsShownThisHour = 0;
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Show an interstitial ad overlay (preroll or midroll).
   * Returns a Promise that resolves when the ad is dismissed.
   * @param {number} duration - seconds for the countdown
   * @param {number} skipAfter - seconds before "Skip Ad" appears
   */
  function showAdOverlay(duration, skipAfter) {
    return new Promise((resolve) => {
      if (!canShowAd()) { resolve(); return; }

      createAdOverlay();
      const overlay = document.getElementById('lt-ad-overlay');
      const timerEl = document.getElementById('lt-ad-timer');
      const skipBtn = document.getElementById('lt-ad-skip');

      overlay.classList.add('active');
      skipBtn.style.display = 'none';
      adState.isAdVisible = true;
      recordAdShown();

      let remaining = duration;
      timerEl.textContent = `Ad ends in ${remaining}s`;

      // Pause video during ad
      const videoEl = document.getElementById('livetv-video');
      if (videoEl && !videoEl.paused) videoEl.pause();

      adState.adCountdownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(adState.adCountdownTimer);
          dismissAdOverlay();
          resolve();
          return;
        }
        timerEl.textContent = `Ad ends in ${remaining}s`;
        if (duration - remaining >= skipAfter && skipBtn.style.display === 'none') {
          skipBtn.style.display = '';
        }
      }, 1000);

      // Skip button handler (one-time)
      const skipHandler = () => {
        clearInterval(adState.adCountdownTimer);
        dismissAdOverlay();
        skipBtn.removeEventListener('click', skipHandler);
        resolve();
      };
      skipBtn.addEventListener('click', skipHandler);
    });
  }

  function dismissAdOverlay() {
    const overlay = document.getElementById('lt-ad-overlay');
    if (overlay) overlay.classList.remove('active');
    adState.isAdVisible = false;
  }

  // ---- Pause-Roll ----
  function showPauseRoll() {
    if (!canShowAd() || adState.isAdVisible) return;
    createPauseRollOverlay();
    const el = document.getElementById('lt-pauseroll');
    el.classList.add('active');
    adState.isPauseRollVisible = true;
    recordAdShown();
  }

  function hidePauseRoll() {
    const el = document.getElementById('lt-pauseroll');
    if (el) el.classList.remove('active');
    adState.isPauseRollVisible = false;
  }

  function setupPauseRollListeners() {
    const videoEl = document.getElementById('livetv-video');
    if (!videoEl) return;

    videoEl.addEventListener('pause', () => {
      // Don't show pause-roll if ad overlay is active or player is closing
      if (adState.isAdVisible || !currentChannel) return;
      clearTimeout(adState.pauseRollTimer);
      adState.pauseRollTimer = setTimeout(() => showPauseRoll(), AD_CONFIG.pauseRollDelay);
    });

    videoEl.addEventListener('play', () => {
      clearTimeout(adState.pauseRollTimer);
      hidePauseRoll();
    });
  }

  // ---- Midroll ----
  function startMidrollTimer() {
    clearInterval(adState.midrollTimer);
    adState.midrollTimer = setInterval(async () => {
      if (!currentChannel || adState.isAdVisible) return;
      await showAdOverlay(AD_CONFIG.midrollDuration, AD_CONFIG.skipAfter);
      // Resume playback after midroll
      const videoEl = document.getElementById('livetv-video');
      if (videoEl) videoEl.play().catch(() => {});
    }, AD_CONFIG.midrollInterval * 1000);
  }

  function stopMidrollTimer() {
    clearInterval(adState.midrollTimer);
  }

  // ---- Companion Banner ----
  function showCompanionBanner() {
    createCompanionBanner();
    const banner = document.getElementById('lt-companion-banner');
    banner.style.display = '';
  }

  // ==============================
  //  Channel Loading
  // ==============================

  async function loadChannels() {
    try {
      const res = await fetch('js/channels.json');
      channels = await res.json();
    } catch (e) {
      console.error('Failed to load channels:', e);
      channels = [];
    }
  }

  function getCategories() {
    const cats = new Set(channels.map(c => c.category));
    return ['all', ...Array.from(cats).sort()];
  }

  function renderCategoryTabs() {
    const container = document.getElementById('livetv-category-tabs');
    if (!container) return;
    container.innerHTML = '';
    const cats = getCategories();
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'lt-cat-tab' + (cat === currentFilter ? ' active' : '');
      btn.dataset.cat = cat;
      const icon = CATEGORY_ICONS[cat] || 'fa-tv';
      btn.innerHTML = `<i class="fas ${icon}"></i> ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
      btn.addEventListener('click', () => {
        currentFilter = cat;
        document.querySelectorAll('.lt-cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
        renderChannelGrid();
      });
      container.appendChild(btn);
    });
  }

  function renderChannelGrid() {
    const grid = document.getElementById('livetv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = currentFilter === 'all' ? channels : channels.filter(c => c.category === currentFilter);
    if (!filtered.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1;">No channels found.</p>';
      return;
    }
    filtered.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'lt-channel-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', ch.title);
      const catIcon = CATEGORY_ICONS[ch.category] || 'fa-tv';
      card.innerHTML = `
        <div class="lt-card-icon"><i class="fas fa-tower-broadcast"></i></div>
        <div class="lt-card-body">
          <div class="lt-card-title">${ch.title}</div>
          <span class="lt-card-badge"><i class="fas ${catIcon}"></i> ${ch.category}</span>
        </div>
        <div class="lt-card-live"><span class="lt-live-dot"></span>LIVE</div>`;
      card.addEventListener('click', () => playChannel(ch));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playChannel(ch); } });
      grid.appendChild(card);
    });
  }

  // ==============================
  //  Playback
  // ==============================

  async function playChannel(ch) {
    const isSwitch = currentChannel !== null && currentChannel !== ch;
    currentChannel = ch;

    const playerView = document.getElementById('livetv-player-view');
    const titleEl = document.getElementById('livetv-player-title');
    const videoEl = document.getElementById('livetv-video');
    const errorEl = document.getElementById('livetv-error');

    playerView.classList.add('active');
    titleEl.textContent = ch.title;
    errorEl.style.display = 'none';
    document.body.style.overflow = 'hidden';

    // Destroy previous player
    stopMidrollTimer();
    if (shakaPlayer) {
      try { await shakaPlayer.destroy(); } catch (_) {}
      shakaPlayer = null;
    }

    // ---- Start Shaka Player FIRST ----
    if (!window.shaka) {
      errorEl.textContent = 'Shaka Player library not loaded.';
      errorEl.style.display = '';
      return;
    }

    shaka.polyfill.installAll();
    if (!shaka.Player.isBrowserSupported()) {
      errorEl.textContent = 'Your browser does not support DASH playback.';
      errorEl.style.display = '';
      return;
    }

    shakaPlayer = new shaka.Player();
    await shakaPlayer.attach(videoEl);

    const kidB64 = uint8ToBase64url(hexToUint8(ch.kid));
    const keyB64 = uint8ToBase64url(hexToUint8(ch.key));

    shakaPlayer.configure({
      drm: { clearKeys: { [kidB64]: keyB64 } },
      streaming: {
        bufferingGoal: 30,
        rebufferingGoal: 2,
        retryParameters: { maxAttempts: 5, baseDelay: 500, backoffFactor: 2, fuzzFactor: 0.5 }
      }
    });

    shakaPlayer.addEventListener('error', (event) => {
      console.error('Shaka error:', event.detail);
      errorEl.textContent = `Playback error: ${event.detail.message || 'Unknown error'}`;
      errorEl.style.display = '';
    });

    try {
      await shakaPlayer.load(ch.manifest);

      // Start playing immediately (must be done before ad overlay to keep user gesture context)
      videoEl.play().catch(err => {
        console.warn('Autoplay blocked:', err.message);
      });

      // ---- Ad logic (show AFTER stream starts, overlay appears on top visually) ----
      adState.channelsPlayed++;
      if (adState.channelsPlayed === 1 || (isSwitch && AD_CONFIG.channelSwitchAd)) {
        await showAdOverlay(AD_CONFIG.prerollDuration, AD_CONFIG.skipAfter);
        // Resume video after ad (it may have been paused during the ad overlay)
        videoEl.play().catch(() => {});
      }

      startMidrollTimer();
      showCompanionBanner();
    } catch (err) {
      console.error('Failed to load channel:', err);
      errorEl.textContent = `Failed to load: ${err.message || 'Unknown error'}`;
      errorEl.style.display = '';
    }
  }

  async function closeLiveTVPlayer() {
    const playerView = document.getElementById('livetv-player-view');
    const videoEl = document.getElementById('livetv-video');
    videoEl.pause();
    videoEl.src = '';
    stopMidrollTimer();
    clearTimeout(adState.pauseRollTimer);
    dismissAdOverlay();
    hidePauseRoll();
    if (shakaPlayer) {
      try { await shakaPlayer.destroy(); } catch (_) {}
      shakaPlayer = null;
    }
    playerView.classList.remove('active');
    document.body.style.overflow = '';
    currentChannel = null;
  }

  // ==============================
  //  View Management
  // ==============================

  function openLiveTV() {
    const mainContent = document.getElementById('main-content');
    const liveTVView = document.getElementById('livetv-view');

    mainContent.style.display = 'none';
    liveTVView.style.display = '';
    liveTVView.classList.add('active');

    // Update category tab active state
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-livetv')?.classList.add('active');

    renderCategoryTabs();
    renderChannelGrid();
  }

  function closeLiveTV() {
    const mainContent = document.getElementById('main-content');
    const liveTVView = document.getElementById('livetv-view');

    mainContent.style.display = '';
    liveTVView.style.display = 'none';
    liveTVView.classList.remove('active');
  }

  // ==============================
  //  Event Binding
  // ==============================

  function bindLiveTVEvents() {
    // Live TV category tab
    document.getElementById('tab-livetv')?.addEventListener('click', (e) => {
      e.preventDefault();
      openLiveTV();
    });

    // Close Live TV when any other category tab is clicked
    document.querySelectorAll('.category-tab:not([data-category="livetv"])').forEach(tab => {
      tab.addEventListener('click', () => {
        if (document.getElementById('livetv-view')?.classList.contains('active')) {
          closeLiveTV();
        }
      });
    });

    // Home nav link
    document.querySelector('.nav-link[data-page="home"]')?.addEventListener('click', (e) => {
      if (document.getElementById('livetv-view')?.classList.contains('active')) {
        e.preventDefault();
        closeLiveTV();
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.category-tab[data-category="all"]')?.classList.add('active');
      }
    });

    document.getElementById('livetv-player-close')?.addEventListener('click', closeLiveTVPlayer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('livetv-player-view')?.classList.contains('active')) {
        closeLiveTVPlayer();
      }
    });

    // Pause-roll listeners
    setupPauseRollListeners();
  }

  // ==============================
  //  Init
  // ==============================

  async function initLiveTV() {
    await loadChannels();
    bindLiveTVEvents();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLiveTV);
  else initLiveTV();

})();
