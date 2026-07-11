/* ============================================================
   UzairTechGuide - script.js
   - Robust vanilla JS with defensive checks
   - Works with injected nav.html via window.initNavigation()
   - Theme toggle with persistence (localStorage)
   - Overlay handling + accessibility (focus move)
   - Smooth scroll for same-page anchors
   - Reveal-on-scroll using IntersectionObserver
   - Comments are verbose and aimed at non-webdev readers
   ============================================================ */

/* ---------- small utilities ---------- */
/* $() and $$() are convenience helpers to find elements quickly. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- Element references ---------- */
const themeToggle = $('#theme-toggle'); // theme toggle button
const THEME_KEY = 'utg_theme';

/* ---------- Theme toggle (dark/light) ----------
   - We persist the user's selection in localStorage
   - We respect OS preference (prefers-color-scheme) if no saved choice
   - We use simple emoji labels for stable rendering
*/
function setTheme(mode) {
  if (mode === 'light') {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
      themeToggle.title = 'Switch to dark';
      themeToggle.setAttribute('aria-pressed', 'true');
    }
  } else {
    document.body.classList.remove('light');
    document.body.classList.add('dark');
    if (themeToggle) {
      themeToggle.textContent = '🌙';
      themeToggle.title = 'Switch to light';
      themeToggle.setAttribute('aria-pressed', 'false');
    }
  }

  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch (e) {}
}

/* Initialize theme */
(function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {
    saved = null;
  }

  if (!saved) {
    const prefersLight =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    saved = prefersLight ? 'light' : 'dark';
  }

  setTheme(saved);
})();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.body.classList.contains('light') ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  themeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      themeToggle.click();
    }
  });
}

/* ---------- Navigation state ----------
   This is the important part for your injected nav.
   The nav HTML loads later, so we expose initNavigation()
   and call it again after fetch() inserts the menu.
*/
window.initNavigation = function initNavigation() {
  const hamburger = $('#hamburger-btn');
  const sideNav = $('#side-nav');
  const sideClose = $('#side-close');
  const overlay = $('#page-overlay') || $('#overlay');

  if (!hamburger || !sideNav) {
    console.warn('Navigation not ready yet: hamburger or sideNav missing.');
    return false;
  }

  // Prevent double-binding if initNavigation() gets called more than once.
  if (sideNav.dataset.utgNavBound === '1') {
    return true;
  }
  sideNav.dataset.utgNavBound = '1';

  let lastFocusedBeforeNav = null;

  function openSide() {
    try {
      lastFocusedBeforeNav = document.activeElement;
      sideNav.classList.add('open');
      hamburger.classList.add('open');

      if (overlay) {
        overlay.classList.add('show');
        overlay.hidden = false;
      }

      hamburger.setAttribute('aria-expanded', 'true');
      sideNav.setAttribute('aria-hidden', 'false');

      const firstLink = sideNav.querySelector('.side-links a');
      if (firstLink) firstLink.focus();
    } catch (err) {
      console.error('openSide error:', err);
    }
  }

  function closeSide() {
    try {
      sideNav.classList.remove('open');
      hamburger.classList.remove('open');

      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
          overlay.hidden = true;
        }, 220);
      }

      hamburger.setAttribute('aria-expanded', 'false');
      sideNav.setAttribute('aria-hidden', 'true');

      if (lastFocusedBeforeNav) {
        try {
          lastFocusedBeforeNav.focus();
        } catch (e) {}
        lastFocusedBeforeNav = null;
      }
    } catch (err) {
      console.error('closeSide error:', err);
    }
  }

  // Expose closeSide in case other code wants to call it.
  window.closeSideNav = closeSide;

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sideNav.classList.contains('open')) closeSide();
    else openSide();
  });

  if (sideClose) sideClose.addEventListener('click', closeSide);
  if (overlay) overlay.addEventListener('click', closeSide);

  document.addEventListener('click', (e) => {
    if (!sideNav.contains(e.target) && !hamburger.contains(e.target)) {
      if (sideNav.classList.contains('open')) closeSide();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideNav.classList.contains('open')) {
      closeSide();
    }
  });

  return true;
};

/* Try to initialize navigation now too.
   If nav.html is injected later, your fetch callback can call initNavigation()
   again and it will bind safely only once. */
window.initNavigation();

/* ---------- Hamburger fallback detection ----------
   Some devices or CSS glitches may render the 3 bars badly.
   We detect whether the bars are usable; if not, show the Unicode fallback.
*/
(function hamburgerFallbackCheck() {
  try {
    const hamburger = $('#hamburger-btn');
    if (!hamburger) return;

    const spans = Array.from(hamburger.querySelectorAll('span'));
    const bars = spans.filter((s) => !s.classList.contains('hamburger-fallback'));

    let needFallback = false;

    if (!bars.length) {
      needFallback = true;
    } else {
      const rect = bars[0].getBoundingClientRect();
      if (rect.width < 6 || rect.height < 2) needFallback = true;
    }

    const fb = hamburger.querySelector('.hamburger-fallback');

    if (needFallback) {
      hamburger.classList.add('use-fallback');
      if (fb) {
        fb.style.display = 'block';
        fb.textContent = '☰';
      }
      bars.forEach((s) => {
        s.style.display = 'none';
      });
    } else {
      hamburger.classList.remove('use-fallback');
      if (fb) fb.style.display = 'none';
      bars.forEach((s) => {
        s.style.display = 'block';
      });
    }
  } catch (e) {
    try {
      const hamburger = $('#hamburger-btn');
      if (!hamburger) return;
      const fb = hamburger.querySelector('.hamburger-fallback');
      if (fb) {
        fb.style.display = 'block';
        fb.textContent = '☰';
      }
      const spans = hamburger.querySelectorAll('span:not(.hamburger-fallback)');
      spans.forEach((s) => {
        s.style.display = 'none';
      });
      hamburger.classList.add('use-fallback');
    } catch (err) {}
  }
})();

/* ---------- Smooth scroll for internal anchors ----------
   Clicking "#tutorials" etc. scrolls smoothly. Also close side nav.
*/
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;

  const href = a.getAttribute('href');
  if (!href || href === '#') return;

  const target = document.querySelector(href);
  if (!target) return;

  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (typeof window.closeSideNav === 'function') {
    window.closeSideNav();
  }
});

/* ---------- Reveal-on-scroll ----------
   Items with classes .reveal, .tile, .card will fade in as they appear.
*/
(function setupReveal() {
  try {
    const selector = '.reveal, .tile, .card, .hero-inner';
    const elements = Array.from(document.querySelectorAll(selector));
    if (!elements.length) return;

    elements.forEach((el) => {
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
    });

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((el) => io.observe(el));
  } catch (e) {
    console.warn('Reveal setup failed:', e);
  }
})();

/* ---------- Keep hero height reasonable on tiny viewports ---------- */
function adjustHeroForViewport() {
  try {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    if (window.innerHeight < 500) hero.style.minHeight = '56vh';
    else hero.style.minHeight = '';
  } catch (e) {}
}

function debounce(fn, wait, maxWait) {
  let t = null;
  let last = null;
  return function (...args) {
    const now = Date.now();
    if (!last) last = now;
    clearTimeout(t);
    t = setTimeout(() => {
      fn.apply(this, args);
      last = null;
    }, wait);

    if (maxWait && now - last >= maxWait) {
      clearTimeout(t);
      fn.apply(this, args);
      last = null;
    }
  };
}

window.addEventListener('resize', debounce(adjustHeroForViewport, 120, 300));
adjustHeroForViewport();

/* ---------- Small safety: ensure overlay exists if script loaded early ----------
   Your HTML uses page-overlay, so we make sure that element exists.
*/
(function ensureOverlayAgain() {
  try {
    if (!document.getElementById('page-overlay')) {
      const ov = document.createElement('div');
      ov.id = 'page-overlay';
      ov.className = 'overlay';
      ov.hidden = true;
      document.body.appendChild(ov);
    }
  } catch (e) {}
})();

/* Optional: auto-hide menu after clicking any nav link */
document.addEventListener('click', (e) => {
  const link = e.target.closest('.side-links a');
  if (!link) return;

  if (typeof window.closeSideNav === 'function') {
    window.closeSideNav();
  }
});

/* ========== End of script ========== */