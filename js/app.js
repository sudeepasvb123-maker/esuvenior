/**
 * VIRAMAYAK'26 - 3D Interactive Flipbook Application Engine
 * Multi-device responsive controller, gesture handling, zoom/pan & particle effects
 */

(function () {
  'use strict';

  // --- Configuration & Page Metadata ---
  const BOOK_CONFIG = {
    totalPages: 8,
    aspectRatio: 1230 / 1754, // ~0.70125
    spreadRatio: (1230 * 2) / 1754, // ~1.4025
    autoFlipIntervalMs: 5000,
    pageTitles: [
      "Front Cover: VIRAMAYAK'26",
      "Message: Windhula Gammanpila",
      "Message: Daham T. Adikari",
      "Message: Chamod Jayasinghe",
      "Sith Paura Initiative",
      "Artistic Melody Parchment",
      "Symphony & Memories",
      "Back Cover: Faculty of Engineering"
    ]
  };

  // --- State ---
  let pageFlip = null;
  let audioManager = null;
  let currentPage = 0;
  let isPortrait = false;
  let autoFlipTimer = null;
  let autoFlipProgressTimer = null;
  let isAutoFlipActive = false;
  let autoFlipProgress = 0;

  // Zoom & Pan State
  let zoomLevel = 1.0;
  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 3.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let initialPinchDistance = null;
  let initialPinchZoom = 1.0;
  let lastTapTime = 0;

  // DOM Elements Cache
  const elements = {};

  // --- Initialize Application ---
  window.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    initAudioManager();
    initParticleCanvas();
    initFlipbook();
    setupEventListeners();
    setupGestureHandlers();
    setupScrubber();
    renderThumbnailGrid();
    updateUIState();
  });

  function cacheDOMElements() {
    elements.viewport = document.getElementById('app-viewport');
    elements.stageContainer = document.getElementById('stage-container');
    elements.zoomWrapper = document.getElementById('zoom-wrapper');
    elements.bookContainer = document.getElementById('flipbook-container');
    elements.book = document.getElementById('viramayak-book');
    elements.scrubTrack = document.getElementById('scrub-track');
    elements.scrubFill = document.getElementById('scrub-fill');
    elements.scrubThumb = document.getElementById('scrub-thumb');
    elements.pageBadge = document.getElementById('page-badge');
    elements.pageIndicatorText = document.getElementById('page-indicator-text');
    elements.zoomIndicator = document.getElementById('zoom-indicator');
    elements.slideshowProgress = document.getElementById('slideshow-progress');
    elements.prevBtn = document.getElementById('btn-prev');
    elements.nextBtn = document.getElementById('btn-next');
    elements.arrowPrev = document.getElementById('arrow-prev');
    elements.arrowNext = document.getElementById('arrow-next');
    elements.firstPageBtn = document.getElementById('btn-first-page');
    elements.lastPageBtn = document.getElementById('btn-last-page');
    elements.zoomInBtn = document.getElementById('btn-zoom-in');
    elements.zoomOutBtn = document.getElementById('btn-zoom-out');
    elements.autoFlipBtn = document.getElementById('btn-autoflip');
    elements.soundBtn = document.getElementById('btn-sound');
    elements.ambienceBtn = document.getElementById('btn-ambience');
    elements.fullscreenBtn = document.getElementById('btn-fullscreen');
    elements.shareBtn = document.getElementById('btn-share');
    elements.thumbnailsBtn = document.getElementById('btn-thumbnails');
    elements.infoBtn = document.getElementById('btn-info');
    elements.videoTeaserBtn = document.getElementById('btn-video-teaser');
    elements.downloadPdfBtn = document.getElementById('btn-download-pdf');

    // Modals
    elements.thumbnailsModal = document.getElementById('modal-thumbnails');
    elements.infoModal = document.getElementById('modal-info');
    elements.videoModal = document.getElementById('modal-video');
    elements.teaserVideo = document.getElementById('teaser-video');
    elements.toastContainer = document.getElementById('toast-container');
  }

  function initAudioManager() {
    if (window.ViramayakAudioManager) {
      audioManager = new window.ViramayakAudioManager();
      updateSoundButtons();
    }
  }

  // --- Dynamic Layout & Responsive Sizing Engine ---
  function computeDimensions() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    // Responsive Breakpoint Logic:
    // >= 1024px: Desktop -> Dual-page spread
    // 768px - 1023px: Tablet -> Dual-page in landscape, Single-page in portrait
    // < 768px: Mobile -> Single-page portrait
    if (windowW >= 1024) {
      isPortrait = false;
    } else if (windowW >= 768) {
      isPortrait = windowW < windowH;
    } else {
      isPortrait = true;
    }

    // Available screen space (subtract header, toolbar dock, and margins)
    const headerH = elements.viewport.querySelector('.top-header')?.offsetHeight || 60;
    const dockH = elements.viewport.querySelector('.control-dock-wrapper')?.offsetHeight || 80;
    const paddingX = windowW < 768 ? 20 : 60;
    const paddingY = windowW < 768 ? 16 : 30;

    const availW = Math.max(260, windowW - paddingX);
    const availH = Math.max(340, windowH - headerH - dockH - paddingY);

    let singlePageW, pageH;

    if (!isPortrait) {
      // Dual-page booklet spread: Target ratio is spreadRatio (~1.4025)
      const maxSpreadW = availW;
      const maxSpreadH = availH;

      if (maxSpreadW / maxSpreadH > BOOK_CONFIG.spreadRatio) {
        pageH = maxSpreadH;
        singlePageW = Math.round((pageH * BOOK_CONFIG.spreadRatio) / 2);
      } else {
        const spreadW = maxSpreadW;
        singlePageW = Math.round(spreadW / 2);
        pageH = Math.round(singlePageW / BOOK_CONFIG.aspectRatio);
      }
    } else {
      // Single-page mobile view: Target ratio is aspectRatio (~0.70125)
      if (availW / availH > BOOK_CONFIG.aspectRatio) {
        pageH = availH;
        singlePageW = Math.round(pageH * BOOK_CONFIG.aspectRatio);
      } else {
        singlePageW = availW;
        pageH = Math.round(singlePageW / BOOK_CONFIG.aspectRatio);
      }
    }

    // Safety constraints
    singlePageW = Math.max(200, Math.min(singlePageW, 1100));
    pageH = Math.max(285, Math.min(pageH, 1600));

    return {
      width: singlePageW,
      height: pageH,
      isPortrait: isPortrait
    };
  }

  function initFlipbook() {
    const dims = computeDimensions();

    if (pageFlip) {
      try {
        pageFlip.destroy();
      } catch (e) {
        console.warn('Destroy error:', e);
      }
      pageFlip = null;
    }

    // Clear previous library wrappers inside container if any
    elements.book.innerHTML = `
      <div class="page" data-density="hard">
        <img src="assets/images/page-01.jpg" alt="VIRAMAYAK'26 Cover" loading="eager" draggable="false" />
      </div>
      <div class="page --left">
        <img src="assets/images/page-02.jpg" alt="Windhula Gammanpila's Message" loading="eager" draggable="false" />
      </div>
      <div class="page --right">
        <img src="assets/images/page-03.jpg" alt="Daham T. Adikari's Message" loading="eager" draggable="false" />
      </div>
      <div class="page --left">
        <img src="assets/images/page-04.jpg" alt="Chamod Jayasinghe's Message" loading="eager" draggable="false" />
      </div>
      <div class="page --right">
        <img src="assets/images/page-05.jpg" alt="Sith Paura Initiative" loading="eager" draggable="false" />
      </div>
      <div class="page --left">
        <img src="assets/images/page-06.jpg" alt="University of Sri Jayewardenepura Parchment" loading="eager" draggable="false" />
      </div>
      <div class="page --right">
        <img src="assets/images/page-07.jpg" alt="Symphony and Rhythm" loading="eager" draggable="false" />
      </div>
      <div class="page" data-density="hard">
        <img src="assets/images/page-08.jpg" alt="Faculty of Engineering Back Cover" loading="eager" draggable="false" />
      </div>
    `;

    // Instantiate StPageFlip
    try {
      const StClass = window.St ? window.St.PageFlip : (window.PageFlip || null);
      if (!StClass) {
        throw new Error('PageFlip library not loaded');
      }

      pageFlip = new StClass(elements.book, {
        width: dims.width,
        height: dims.height,
        size: 'fixed',
        minWidth: 200,
        maxWidth: 1200,
        minHeight: 285,
        maxHeight: 1600,
        drawShadow: true,
        flippingTime: 750,
        usePortrait: dims.isPortrait,
        startPage: currentPage,
        startZIndex: 5,
        autoSize: true,
        maxShadowOpacity: 0.65,
        showCover: !dims.isPortrait, // Cover mode in dual spread
        mobileScrollSupport: false,
        swipeDistance: 25,
        clickEventForward: true,
        useMouseEvents: true,
        showPageCorners: true,
        disableFlipByClick: false
      });

      pageFlip.loadFromHTML(elements.book.querySelectorAll('.page'));

      // Event Listeners
      pageFlip.on('flip', (e) => {
        currentPage = e.data;
        onPageChanged();
        if (audioManager) {
          audioManager.playPageTurn();
        }
      });

      pageFlip.on('changeOrientation', (e) => {
        isPortrait = (e.data === 'portrait');
        updateUIState();
      });

      pageFlip.on('init', () => {
        updateUIState();
      });

    } catch (err) {
      console.error('Failed to initialize flipbook:', err);
      showToast('Error initializing 3D flipbook engine.');
    }

    resetZoom();
  }

  // Debounced Window Resize Handling
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const oldPortrait = isPortrait;
      const dims = computeDimensions();
      // Reinitialize if orientation or layout changed significantly
      if (oldPortrait !== dims.isPortrait || !pageFlip) {
        initFlipbook();
      } else {
        // Smooth update if same mode
        initFlipbook();
      }
    }, 200);
  });

  // Handle Orientation Change on Mobile
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      initFlipbook();
    }, 250);
  });

  // --- Navigation Controls ---
  function flipPrev() {
    if (!pageFlip) return;
    if (zoomLevel > 1) resetZoom();
    pageFlip.flipPrev();
  }

  function flipNext() {
    if (!pageFlip) return;
    if (zoomLevel > 1) resetZoom();
    pageFlip.flipNext();
  }

  function turnToPage(index) {
    if (!pageFlip) return;
    if (zoomLevel > 1) resetZoom();
    const target = Math.max(0, Math.min(index, BOOK_CONFIG.totalPages - 1));
    pageFlip.turnToPage(target);
  }

  function onPageChanged() {
    updateUIState();
    if (isAutoFlipActive) {
      resetAutoFlipTimer();
    }
  }

  function updateUIState() {
    const pageNum = currentPage + 1;
    const total = BOOK_CONFIG.totalPages;

    // Update Page Indicator
    if (!isPortrait && currentPage > 0 && currentPage < total - 1) {
      // In dual spread, show spread (e.g. Page 2-3 of 8)
      const leftPage = currentPage;
      const rightPage = Math.min(currentPage + 1, total - 1);
      elements.pageIndicatorText.textContent = `Pages ${leftPage + 1}-${rightPage + 1} of ${total}`;
    } else {
      elements.pageIndicatorText.textContent = `Page ${pageNum} of ${total}`;
    }

    // Update Scrubber Fill & Thumb
    const progressPercent = (currentPage / (total - 1)) * 100;
    elements.scrubFill.style.width = `${progressPercent}%`;
    elements.scrubThumb.style.left = `${progressPercent}%`;

    // Update Navigation Button States
    const isAtStart = currentPage === 0;
    const isAtEnd = currentPage >= total - 1;

    elements.prevBtn.disabled = isAtStart;
    elements.nextBtn.disabled = isAtEnd;
    elements.arrowPrev.disabled = isAtStart;
    elements.arrowNext.disabled = isAtEnd;
    elements.firstPageBtn.disabled = isAtStart;
    elements.lastPageBtn.disabled = isAtEnd;

    // Highlight active thumbnail in drawer
    const thumbCards = document.querySelectorAll('.thumbnail-card');
    thumbCards.forEach((card, idx) => {
      card.classList.toggle('active', idx === currentPage);
    });
  }

  // --- Scrubber Bar Interaction ---
  function setupScrubber() {
    let isDraggingScrubber = false;

    function handleScrub(e) {
      const rect = elements.scrubTrack.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetPage = Math.round(ratio * (BOOK_CONFIG.totalPages - 1));
      if (targetPage !== currentPage) {
        turnToPage(targetPage);
      }
    }

    elements.scrubTrack.addEventListener('mousedown', (e) => {
      isDraggingScrubber = true;
      handleScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingScrubber) {
        handleScrub(e);
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingScrubber = false;
    });

    // Touch support for scrubber
    elements.scrubTrack.addEventListener('touchstart', (e) => {
      isDraggingScrubber = true;
      handleScrub(e);
    }, { passive: true });

    elements.scrubTrack.addEventListener('touchmove', (e) => {
      if (isDraggingScrubber) {
        handleScrub(e);
      }
    }, { passive: true });

    elements.scrubTrack.addEventListener('touchend', () => {
      isDraggingScrubber = false;
    });
  }

  // --- Zoom, Pan & Pinch-to-Zoom Engine ---
  function setZoom(level, centerX, centerY) {
    const prevZoom = zoomLevel;
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));

    if (zoomLevel === 1.0) {
      panX = 0;
      panY = 0;
    } else if (centerX !== undefined && centerY !== undefined) {
      // Zoom toward cursor/touch point
      const scaleDelta = zoomLevel / prevZoom;
      panX = centerX - scaleDelta * (centerX - panX);
      panY = centerY - scaleDelta * (centerY - panY);
    }

    applyTransform();
    updateZoomUI();
  }

  function applyTransform() {
    if (zoomLevel === 1.0) {
      elements.zoomWrapper.style.transform = `scale(1) translate(0px, 0px)`;
      elements.zoomWrapper.style.cursor = 'default';
    } else {
      elements.zoomWrapper.style.transform = `scale(${zoomLevel}) translate(${panX / zoomLevel}px, ${panY / zoomLevel}px)`;
      elements.zoomWrapper.style.cursor = isPanning ? 'grabbing' : 'grab';
    }
  }

  function resetZoom() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    applyTransform();
    updateZoomUI();
  }

  function updateZoomUI() {
    elements.zoomIndicator.textContent = `${Math.round(zoomLevel * 100)}%`;
    elements.zoomInBtn.disabled = zoomLevel >= MAX_ZOOM;
    elements.zoomOutBtn.disabled = zoomLevel <= MIN_ZOOM;
  }

  function setupGestureHandlers() {
    const stage = elements.stageContainer;

    // Double-tap on mobile / Double-click on desktop
    stage.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (zoomLevel > 1.0) {
        resetZoom();
      } else {
        const rect = stage.getBoundingClientRect();
        const tapX = e.clientX - rect.left - rect.width / 2;
        const tapY = e.clientY - rect.top - rect.height / 2;
        setZoom(2.0, -tapX * 0.5, -tapY * 0.5);
      }
    });

    // Mouse Pan when zoomed
    stage.addEventListener('mousedown', (e) => {
      if (zoomLevel > 1.0 && e.button === 0) {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        elements.zoomWrapper.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning && zoomLevel > 1.0) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        // Clamp panning bounds based on zoom
        const maxPanX = (elements.stageContainer.clientWidth * (zoomLevel - 1)) / 2;
        const maxPanY = (elements.stageContainer.clientHeight * (zoomLevel - 1)) / 2;
        panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
        panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        applyTransform();
      }
    });

    // Touch Events: Pinch-to-zoom & Double-tap
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // Pinch start
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialPinchZoom = zoomLevel;
      } else if (e.touches.length === 1) {
        // Check for double-tap
        const now = Date.now();
        if (now - lastTapTime < 320) {
          // Double-tap triggered!
          e.preventDefault();
          if (zoomLevel > 1.0) {
            resetZoom();
          } else {
            const rect = stage.getBoundingClientRect();
            const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
            const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
            setZoom(2.0, -tapX * 0.5, -tapY * 0.5);
          }
        }
        lastTapTime = now;

        if (zoomLevel > 1.0) {
          isPanning = true;
          startPanX = e.touches[0].clientX - panX;
          startPanY = e.touches[0].clientY - panY;
        }
      }
    }, { passive: false });

    stage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDist / initialPinchDistance;
        setZoom(initialPinchZoom * factor);
      } else if (e.touches.length === 1 && isPanning && zoomLevel > 1.0) {
        e.preventDefault();
        panX = e.touches[0].clientX - startPanX;
        panY = e.touches[0].clientY - startPanY;
        const maxPanX = (elements.stageContainer.clientWidth * (zoomLevel - 1)) / 2;
        const maxPanY = (elements.stageContainer.clientHeight * (zoomLevel - 1)) / 2;
        panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
        panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
        applyTransform();
      }
    }, { passive: false });

    stage.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
      }
      if (e.touches.length === 0) {
        isPanning = false;
      }
    });

    // Mouse Wheel Zoom (with Ctrl key or pinch pad)
    stage.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        const rect = stage.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;
        setZoom(zoomLevel + delta, -cursorX * 0.2, -cursorY * 0.2);
      }
    }, { passive: false });
  }

  // --- Auto-Flip / Slideshow Mode ---
  function toggleAutoFlip() {
    isAutoFlipActive = !isAutoFlipActive;
    elements.autoFlipBtn.classList.toggle('active', isAutoFlipActive);

    if (isAutoFlipActive) {
      showToast('Auto-flip presentation activated');
      startAutoFlipTimer();
    } else {
      stopAutoFlipTimer();
      showToast('Auto-flip paused');
    }
  }

  function startAutoFlipTimer() {
    stopAutoFlipTimer();
    autoFlipProgress = 0;
    const updateRateMs = 50;
    const step = 100 / (BOOK_CONFIG.autoFlipIntervalMs / updateRateMs);

    autoFlipProgressTimer = setInterval(() => {
      autoFlipProgress += step;
      elements.slideshowProgress.style.width = `${Math.min(100, autoFlipProgress)}%`;
      if (autoFlipProgress >= 100) {
        autoFlipProgress = 0;
        if (currentPage >= BOOK_CONFIG.totalPages - 1) {
          turnToPage(0); // Loop back to cover
        } else {
          flipNext();
        }
      }
    }, updateRateMs);
  }

  function resetAutoFlipTimer() {
    if (isAutoFlipActive) {
      startAutoFlipTimer();
    }
  }

  function stopAutoFlipTimer() {
    if (autoFlipProgressTimer) {
      clearInterval(autoFlipProgressTimer);
      autoFlipProgressTimer = null;
    }
    elements.slideshowProgress.style.width = '0%';
  }

  // --- Sound & Ambience Controls ---
  function toggleSound() {
    if (!audioManager) return;
    const isEnabled = audioManager.toggleSound();
    updateSoundButtons();
    showToast(isEnabled ? 'Sound effects enabled' : 'Sound effects muted');
  }

  function toggleAmbience() {
    if (!audioManager) return;
    const isPlaying = audioManager.toggleAmbience();
    elements.ambienceBtn.classList.toggle('active', isPlaying);
    showToast(isPlaying ? 'Concert hall ambience playing' : 'Concert ambience stopped');
  }

  function updateSoundButtons() {
    if (!audioManager) return;
    const isMuted = !audioManager.soundEnabled;
    elements.soundBtn.classList.toggle('active', audioManager.soundEnabled);

    // Swap sound icon SVG
    const icon = elements.soundBtn.querySelector('svg');
    if (icon) {
      if (isMuted) {
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        `;
      } else {
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        `;
      }
    }
  }

  // --- Fullscreen Toggle ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        elements.fullscreenBtn.classList.add('active');
        showToast('Entered Fullscreen');
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          elements.fullscreenBtn.classList.remove('active');
        });
      }
    }
  }

  // --- Thumbnails Drawer & Grid ---
  function renderThumbnailGrid() {
    const grid = document.getElementById('thumbnail-grid');
    if (!grid) return;

    grid.innerHTML = '';
    for (let i = 0; i < BOOK_CONFIG.totalPages; i++) {
      const pageNum = i + 1;
      const formattedNum = pageNum.toString().padStart(2, '0');
      const card = document.createElement('div');
      card.className = `thumbnail-card ${i === currentPage ? 'active' : ''}`;
      card.innerHTML = `
        <div class="thumbnail-img-wrap">
          <img src="assets/images/page-${formattedNum}.jpg" alt="${BOOK_CONFIG.pageTitles[i]}" loading="lazy" />
        </div>
        <div class="thumbnail-info">
          <span class="thumbnail-page-num">P. ${pageNum}</span>
          <span class="thumbnail-title" title="${BOOK_CONFIG.pageTitles[i]}">${BOOK_CONFIG.pageTitles[i]}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        turnToPage(i);
        closeModal(elements.thumbnailsModal);
      });
      grid.appendChild(card);
    }
  }

  // --- Share & PDF Download ---
  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "VIRAMAYAK'26 - 3D Interactive Flipbook",
        text: "Experience the official Viramayak'26 concert souvenir & digital booklet by the Students' Union, Faculty of Engineering, University of Sri Jayewardenepura.",
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied to clipboard!');
      }).catch(() => {
        showToast('Unable to copy link.');
      });
    }
  }

  function downloadPDF() {
    const link = document.createElement('a');
    link.href = 'assets/pdf/1000033374.pdf';
    link.download = 'VIRAMAYAK-26-Souvenir-Booklet.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloading VIRAMAYAK\'26 Souvenir PDF...');
  }

  // --- Modals Management ---
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    if (modal === elements.videoModal && elements.teaserVideo) {
      elements.teaserVideo.currentTime = 0;
      elements.teaserVideo.play().catch(() => {});
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    if (modal === elements.videoModal && elements.teaserVideo) {
      elements.teaserVideo.pause();
    }
  }

  // --- Toast Notifications ---
  function showToast(message, duration = 2400) {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Navigation Buttons
    elements.prevBtn.addEventListener('click', flipPrev);
    elements.nextBtn.addEventListener('click', flipNext);
    elements.arrowPrev.addEventListener('click', flipPrev);
    elements.arrowNext.addEventListener('click', flipNext);
    elements.firstPageBtn.addEventListener('click', () => turnToPage(0));
    elements.lastPageBtn.addEventListener('click', () => turnToPage(BOOK_CONFIG.totalPages - 1));

    // Page Badge Click -> Jump to page dialog or open thumbnails
    elements.pageBadge.addEventListener('click', () => {
      openModal(elements.thumbnailsModal);
    });

    // Zoom Controls
    elements.zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + 0.3));
    elements.zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - 0.3));
    elements.zoomIndicator.addEventListener('click', resetZoom);

    // Action Controls
    elements.autoFlipBtn.addEventListener('click', toggleAutoFlip);
    elements.soundBtn.addEventListener('click', toggleSound);
    elements.ambienceBtn.addEventListener('click', toggleAmbience);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    elements.shareBtn.addEventListener('click', handleShare);
    elements.downloadPdfBtn.addEventListener('click', downloadPDF);

    // Modal Triggers
    elements.thumbnailsBtn.addEventListener('click', () => openModal(elements.thumbnailsModal));
    elements.infoBtn.addEventListener('click', () => openModal(elements.infoModal));
    elements.videoTeaserBtn.addEventListener('click', () => openModal(elements.videoModal));

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        closeModal(modal);
      });
    });

    // Close modal on click backdrop
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        flipPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        flipNext();
      } else if (e.key === 'Home') {
        turnToPage(0);
      } else if (e.key === 'End') {
        turnToPage(BOOK_CONFIG.totalPages - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
        resetZoom();
      }
    });
  }

  // --- Glowing Concert Star Particles Animation ---
  function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    const particleCount = window.innerWidth < 768 ? 35 : 70;

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 20;
        this.size = Math.random() * 2.5 + 0.8;
        this.speedY = -(Math.random() * 0.45 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.alpha = Math.random() * 0.6 + 0.2;
        this.pulseSpeed = Math.random() * 0.02 + 0.005;
        this.hue = Math.random() > 0.4 ? 42 : 275; // Gold or Violet
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.alpha += Math.sin(Date.now() * this.pulseSpeed) * 0.005;

        if (this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        if (this.hue === 42) {
          ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0, this.alpha)})`;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
        } else {
          ctx.fillStyle = `rgba(199, 125, 255, ${Math.max(0, this.alpha)})`;
          ctx.shadowColor = 'rgba(157, 78, 221, 0.7)';
        }
        ctx.shadowBlur = this.size * 4;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }

    animate();
  }

})();

