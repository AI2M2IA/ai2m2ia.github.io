/* ==========================================================================
   AI(2)M(2)IA — Definitive Site Application Logic
   ========================================================================== */

'use strict';

/* --------------------------------------------------------------------------
   THEME MANAGEMENT
   Apply theme before paint to prevent FOUC.
   (Initial application happens via inline script in <head>.)
   -------------------------------------------------------------------------- */
const ThemeManager = {
  STORAGE_KEY: 'ai2m2ia-theme',

  get() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    }
  },

  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  init() {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => this.toggle());
  }
};

/* --------------------------------------------------------------------------
   SKIP LINK ACCESSIBILITY
   Move focus to main content when skip link is activated.
   -------------------------------------------------------------------------- */
const SkipLink = {
  init() {
    const skipLink = document.querySelector('.skip-link');
    const mainContent = document.getElementById('main-content');
    
    if (skipLink && mainContent) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.focus();
      });
    }
  }
};

/* --------------------------------------------------------------------------
   INTERNATIONALISATION (i18n)

   Strategy:
   - English strings are the built-in fallback (zero fetches for EN users).
   - All other languages are fetched from data/i18n/<lang>.json on first use.
   - Each remote JSON carries a `lastUpdated` date field.
   - Fetched strings are cached in localStorage under:
       ai2m2ia-i18n-<lang>          → JSON string of strings object
       ai2m2ia-i18n-<lang>-updated  → lastUpdated value from the file
   - On subsequent requests the remote JSON is fetched ONLY for its
     `lastUpdated` field (HEAD not available on static hosts, so we fetch
     the full file but compare before overwriting cache). If the date
     matches what is stored, the cached copy is used immediately.
   - Adding a new language = adding data/i18n/<lang>.json and one entry
     in AVAILABLE_LANGS below.
   -------------------------------------------------------------------------- */
const I18N = {
  LANG_KEY:    'ai2m2ia-lang',
  CACHE_KEY:   lang => `ai2m2ia-i18n-${lang}`,
  UPDATED_KEY: lang => `ai2m2ia-i18n-${lang}-updated`,

  current: 'en',

  /* Available languages — add new entries here when new JSON files are added */
  /* RTL languages (ar, fa, he, ur) trigger dir="rtl" on <html> automatically */
  RTL_LANGS: ['ar', 'fa', 'he', 'ur'],

  AVAILABLE_LANGS: [
    { code: 'en',    label: 'English' },
    { code: 'pt-BR', label: 'Português (BR)' },
    { code: 'es-419',label: 'Español (Latinoamérica)' },
    { code: 'fr',    label: 'Français' },
    { code: 'it',    label: 'Italiano' },
    { code: 'de',    label: 'Deutsch' },
    { code: 'pl',    label: 'Polski' },
    { code: 'tr',    label: 'Türkçe' },
    { code: 'ru',    label: 'Русский' },
    { code: 'id',    label: 'Bahasa Indonesia' },
    { code: 'vi',    label: 'Tiếng Việt' },
    { code: 'fil',   label: 'Filipino' },
    { code: 'th',    label: 'ภาษาไทย' },
    { code: 'ja',    label: '日本語' },
    { code: 'zh-CN', label: '中文（简体）' },
    { code: 'zh-TW', label: '中文（繁體）' },
    { code: 'yue',   label: '粵語（香港）' },
    { code: 'ko',    label: '한국어' },
    { code: 'hi',    label: 'हिन्दी' },
    { code: 'ur',    label: 'اردو' },
    { code: 'ar',    label: 'العربية' },
    { code: 'fa',    label: 'فارسی' },
    { code: 'he',    label: 'עברית' },
  ],

  /* ── Minimal English fallback ──────────────────────────────────────────
     Guarantees the page renders correctly even when offline or if the
     remote JSON fetch fails. Keep in sync with data/i18n/en.json.
     ──────────────────────────────────────────────────────────────────── */
  _fallback: {
    skipLink:            'Skip to main content',
    navCatalog:          'Catalog',
    navCharacters:       'Characters',
    navMedia:            'Media Samples',
    navPhilosophy:       'AI & Responsibility',
    heroEyebrow:         'Narratives Shaped by Hybrid Minds',
    heroLead:            'One impossible book at a time. Read progression fantasy, gothic dark fantasy, and speculative war fiction built around complex systems and characters who do not resolve cleanly.',
    heroPrimaryCTA:      'Explore Catalog',
    heroSecondaryCTA:    'Read About Our Method',
    heroNote:            'AI accelerates production. Human direction, structure, revision, taste, and ethics remain completely non-delegable.',
    charSeriesLevelZero: 'Level Zero / Analyze',
    charSeriesCrater:    'The Crater Gospel / Bell',
    charSeriesAnalyze:   'Analyze',
    charSeriesBell:      'The Bell That Remembers',
    catalogEyebrow:      'Complete Catalog',
    catalogTitle:        'Choose a door into the work',
    catalogLead:         'Filter by genre and select any book to explore the synopsis and where to buy.',
    filterAll:           'All Works',
    filterProgression:   'Progression Fantasy',
    filterDark:          'Gothic & Dark Fantasy',
    filterWar:           'Speculative War',
    filterFantasy:       'Epic Fantasy',
    loading:             'Loading content…',
    /* Work tags & summaries (fallback = English; other langs fetched remotely) */
    'workTag_level-zero':                  'Recommended start',
    'workSummary_level-zero':              'A complete progression fantasy trilogy about Rowan Vale and Analyze, the lowest-ranked ability in a world built on ranked power.',
    'workTag_analyze':                     'Light novel adaptation',
    'workSummary_analyze':                 'A seven-volume light novel adaptation of Level Zero. Same architecture, different magnification.',
    'workTag_bell-that-remembers':         'Gothic adaptation',
    'workSummary_bell-that-remembers':     'A gothic light novel adaptation of The Crater Gospel with Mara Ansel, Saint Loss, and the bone bell.',
    'workTag_crater-gospel':               'Dark fantasy',
    'workSummary_crater-gospel':           'Dark fantasy about language as power, institutions as architecture, and grief managed like paperwork.',
    'workTag_venomous-garden':             'Literary light novel series',
    'workSummary_venomous-garden':         'A five-volume series about people processed correctly by a system that still gets them wrong.',
    'workTag_ashen-bloom':                 'Speculative war fiction',
    'workSummary_ashen-bloom':             'Literary speculative war fiction about an AI casualty-forecasting system and responsibility after uncertainty narrows.',
    'workTag_the-princess-and-the-turtle':    'Epic Fantasy',
    'workSummary_the-princess-and-the-turtle': 'A fisherman saves a wounded sea turtle and is taken to an underwater kingdom where time moves differently, war looms between sea peoples, and love grows stronger through adversity.',
    /* Philosophy section */
    philDisclosureText:    'These works are human-led with AI support. AI speeds drafting and revision; humans keep the final creative, editorial, and publication control.',
    philResponsibilityText: 'Tools can speed writing; they never replace responsibility. Humans keep control of truth, taste, and publication judgment.',
    analogyCalcText:       'Computers and calculators reduce mechanical burden, but a human remains responsible for the problem, the interpretation, and the consequences of the result.',
    analogyTypeText:       'A typewriter changes the physical act of writing without making the machine the author. AI changes drafting mechanics, but the human remains responsible for judgment and publication.',
    /* WIP & authorship badges */
    authorshipHuman:       'Human-written',
    authorshipHumanAI:     'Human + AI',
    wipBadge:              'In Progress',
    learnMore:           'Explore',
    buyOnAmazon:         'Buy on Amazon',
    charactersEyebrow:   'Character Dossiers',
    charactersTitle:     'Meet the protagonists',
    charactersLead:      'Spoiler-light portraits and identities from the main series.',
    genreProgression:    'Progression Fantasy',
    genreDark:           'Dark Fantasy',
    genreWar:            'Speculative War',
    charRowanTitle:      'The Lowest Class',
    charRowanDesc:       'Ranked as Level Zero. His ability Analyze can only read structure. In a society that ranks physical force, he uses it to dissect the system itself.',
    charMaraTitle:       'The Archivist',
    charMaraDesc:        'An archivist in the gothic city of Saint Loss. She retrieves a bone bell tied to a dead man\'s throat and begins hearing her missing brother\'s voice.',
    charSeraTitle:       'The Watcher',
    charSeraDesc:        'A core member of the lower-yard network in Analyze. She helps Rowan decode the civic scripts of Wardspire while hiding her own institutional status.',
    charTomasTitle:      'The Lost Brother',
    charTomasDesc:       'Mara\'s brother, whose disappearance leads her into the depths. His voice is the one echoing through the bone bells in the tide crypts.',
    mediaEyebrow:        'Audio & Video Samples',
    mediaTitle:          'Audiobook previews & trailers',
    mediaLead:           'Third-party players load only on request, respecting your bandwidth and privacy. YouTube embeds do not autoplay.',
    clickToLoad:         'Click to load player',
    philEyebrow:         'The Trust Frame',
    philTitle:           'AI + Human Responsibility',
    philLead:            'Humans set direction; AI handles speed and execution support.',
    philDisclosureTitle: 'Full Disclosure Statement',
    analogyCalcTitle:    'The Calculator Analogy',
    analogyTypeTitle:    'The Typewriter Analogy',
    showAudit:           'Show Sources & Audit',
    hideAudit:           'Hide Sources & Audit',
    auditTitle:          'Site Traceability Audit',
    auditDesc:           'Verified source references linking catalog metadata directly to public storefronts.',
    footerTagline:       'The symbiosis continues.'
  },

  /* Active strings object — starts as fallback, overwritten after fetch */
  _strings: null,

  /* Resolve a translation key, falling back to English fallback */
  t(key) {
    return (this._strings && this._strings[key])
      || this._fallback[key]
      || key;
  },

  /* ── Remote fetch with cache-aware strategy ─────────────────────────── */
  async _loadRemote(lang) {
    const cacheKey   = this.CACHE_KEY(lang);
    const updatedKey = this.UPDATED_KEY(lang);
    const url        = `data/i18n/${lang}.json`;

    try {
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const remoteDate = data.lastUpdated || '';
      const cachedDate = localStorage.getItem(updatedKey) || '';

      if (remoteDate && remoteDate === cachedDate) {
        /* Cache is fresh — use stored strings, discard the fetched body */
        const cached = localStorage.getItem(cacheKey);
        if (cached) return safeParseJson(cached);
      }

      /* Cache is stale or missing — store new strings and date */
      const strings = data.strings || {};
      try {
        localStorage.setItem(cacheKey, JSON.stringify(strings));
        localStorage.setItem(updatedKey, remoteDate);
      } catch (_) { /* localStorage quota exceeded — ignore, still use in-memory */ }

      return strings;

    } catch (err) {
      /* Network or parse error — fall back to stale cache if available */
      console.warn(`[i18n] Could not fetch ${url}:`, err.message);
      const cached = localStorage.getItem(cacheKey);
      return safeParseJson(cached);
    }
  },

  /* ── Apply strings to the DOM ───────────────────────────────────────── */
  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
    });
    document.documentElement.lang = this.current || 'en';
  },

  /* ── Switch language ────────────────────────────────────────────────── */
  async set(lang) {
    if (!this.AVAILABLE_LANGS.find(l => l.code === lang)) return;

    if (lang === 'en') {
      /* English uses the built-in fallback — no fetch needed */
      this._strings = this._fallback;
    } else {
      /* Show immediately with fallback strings while fetching */
      this._strings = this._fallback;
      this.apply();

      const remote = await this._loadRemote(lang);
      this._strings = remote
        ? { ...this._fallback, ...remote }  /* merge: remote wins, fallback fills gaps */
        : this._fallback;
    }

    this.current = lang;
    localStorage.setItem(this.LANG_KEY, lang);
    /* RTL support — flip document direction for Arabic, Persian, Hebrew, Urdu */
    const isRTL = this.RTL_LANGS.includes(lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    this.apply();
    /* Re-render dynamic sections that bypass data-i18n (catalog cards, philosophy) */
    if (typeof CatalogRenderer !== 'undefined') CatalogRenderer.render();
    if (typeof PhilosophyRenderer !== 'undefined') PhilosophyRenderer.render();
    this._updateDropdown();
  },

  /* ── Build language dropdown ────────────────────────────────────────── */
  _updateDropdown() {
    const btn = document.getElementById('lang-menu-btn');
    if (btn) {
      const label = languageButtonLabel(this.current);
      const text = btn.querySelector('.lang-text');
      if (text) text.textContent = label;
    }
    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === this.current);
    });
  },

  _buildDropdown() {
    const menu = document.getElementById('lang-dropdown');
    const btn  = document.getElementById('lang-menu-btn');
    if (!menu || !btn) return;

    menu.textContent = '';
    for (const lang of this.AVAILABLE_LANGS) {
      const option = document.createElement('button');
      option.className = `lang-option${lang.code === this.current ? ' active' : ''}`;
      option.dataset.lang = lang.code;
      option.type = 'button';
      option.setAttribute('role', 'menuitem');
      option.textContent = lang.label;
      menu.append(option);
    }

    const closeDropdown = () => {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    };

    const openDropdown = () => {
      menu.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
      /* Focus the active option, or the first one */
      const activeOpt = menu.querySelector('.lang-option.active') || menu.querySelector('.lang-option');
      if (activeOpt) activeOpt.focus();
    };

    const getOptions = () => Array.from(menu.querySelectorAll('.lang-option'));

    const selectOption = (opt) => {
      this.set(opt.dataset.lang);
      closeDropdown();
    };

    menu.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => selectOption(opt));
    });

    /* Keyboard navigation within the dropdown (focus trap + arrow keys) */
    menu.addEventListener('keydown', e => {
      const options = getOptions();
      const currentIndex = options.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          options[next].focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          options[prev].focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          options[0].focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          options[options.length - 1].focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          closeDropdown();
          break;
        }
        case 'Tab': {
          /* Trap focus within the dropdown: prevent Tab from leaving */
          e.preventDefault();
          if (e.shiftKey) {
            const prev = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
            options[prev].focus();
          } else {
            const next = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
            options[next].focus();
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (document.activeElement && document.activeElement.classList.contains('lang-option')) {
            selectOption(document.activeElement);
          }
          break;
        }
      }
    });

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !menu.classList.contains('hidden');
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    /* Keyboard support on the trigger button */
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        if (menu.classList.contains('hidden')) {
          e.preventDefault();
          openDropdown();
        }
      }
    });

    document.addEventListener('click', () => {
      menu.classList.add('hidden');
      btn.setAttribute('aria-expanded', 'false');
    });
  },

  /* ── Initialise ─────────────────────────────────────────────────────── */
  async init() {
    const saved = localStorage.getItem(this.LANG_KEY) || 'en';
    this._strings = this._fallback; /* render immediately with fallback */
    this._buildDropdown();
    this.apply();

    if (saved !== 'en') {
      /* Saved preference is a non-English language — load it */
      await this.set(saved);
    } else {
      this.current = 'en';
      this._updateDropdown();
    }
  }
};

/* --------------------------------------------------------------------------
   DATA LOADER
   -------------------------------------------------------------------------- */
const DataStore = {
  works:   null,
  author:  null,
  media:   null,
  sources: null,

  _cacheKey(name) {
    return `ai2m2ia-data-${name}`;
  },

  _updatedKey(name) {
    return `ai2m2ia-data-${name}-updated`;
  },

  async _loadWithCache(name, url) {
    const cacheKey = this._cacheKey(name);
    const updatedKey = this._updatedKey(name);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const remoteDate = data.lastUpdated || '';
      const cachedDate = localStorage.getItem(updatedKey) || '';

      if (remoteDate && remoteDate === cachedDate) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = safeParseJson(cached);
          if (parsed) return parsed;
        }
      }

      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(updatedKey, remoteDate);
      } catch (_) {
        /* localStorage quota exceeded — ignore, use in-memory data */
      }

      return data;
    } catch (err) {
      console.warn(`[AI2M2IA] Could not fetch ${url}:`, err.message);
      const cached = localStorage.getItem(cacheKey);
      return safeParseJson(cached);
    }
  },

  async loadAll(entries = ['works', 'author', 'media', 'sources']) {
    const filesByName = {
      works: ['works', 'data/works.json'],
      author: ['author', 'data/author.json'],
      media: ['media', 'data/media.json'],
      sources: ['sources', 'data/sources.json'],
    };

    const selected = entries
      .map((entry) => filesByName[entry])
      .filter(Boolean);

    const results = await Promise.allSettled(
      selected.map(([name, url]) => this._loadWithCache(name, url))
    );
    results.forEach((result, index) => {
      const [key] = selected[index];
      if (result.status === 'fulfilled') {
        this[key] = result.value;
      } else {
        console.warn(`[AI2M2IA] Could not load ${key}:`, result.reason?.message);
      }
    });
  }
};

function fetchJson(url) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}

function safeParseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function languageButtonLabel(lang) {
  return ({
    'pt-BR': 'PT-BR',
    'es-419': 'ES',
    'zh-CN': 'ZH',
    'zh-TW': 'ZH',
    yue: 'YUE',
  })[lang] || String(lang || 'en').split('-')[0].toUpperCase();
}

const sanitizer = globalThis.sanitize || {};
const escapeHtml = typeof sanitizer.escapeHtml === 'function'
  ? sanitizer.escapeHtml
  : function (value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

const safeUrl = typeof sanitizer.safeUrl === 'function'
  ? sanitizer.safeUrl
  : function (value, { external = false } = {}) {
      if (!value) return '';
      try {
        const url = new URL(value, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) return '#';
        if (!external && url.origin !== window.location.origin) return '#';
        return value;
      } catch (_) {
        return '#';
      }
    };

const safeMediaId = typeof sanitizer.safeMediaId === 'function'
  ? sanitizer.safeMediaId
  : function (value) {
      return /^[A-Za-z0-9_-]+$/.test(String(value || '')) ? String(value) : '';
    };

function isSafeYouTubeId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || ''));
}

function isSafeTikTokId(value) {
  return /^\d{15,20}$/.test(String(value || ''));
}

/* --------------------------------------------------------------------------
   CATALOG RENDERER
   -------------------------------------------------------------------------- */
const CatalogRenderer = {
  activeFilter: 'all',

  genreTagClass: {
    progression:    'tag-progression',
    'dark-fantasy': 'tag-dark-fantasy',
    war:            'tag-war',
    fantasy:        'tag-fantasy'
  },

  render() {
    const grid = document.getElementById('books-grid');
    if (!grid || !DataStore.works) return;
    grid.innerHTML = DataStore.works.workFamilies.map(w => this._card(w)).join('');
    this._applyFilter(this.activeFilter);
  },

  _card(work) {
    const tagClass = this.genreTagClass[work.genre] || 'tag-start';
    const coverEl  = work.coverImage
      ? `<img class="book-cover" src="${escapeHtml(safeUrl(work.coverImage))}" alt="${escapeHtml(work.coverAlt)}" loading="lazy" width="562" height="900">`
      : `<div class="book-cover-placeholder"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>`;

    /* WIP badge */
    const wipEl = work.wip
      ? `<span class="book-wip-badge">${escapeHtml(I18N.t('wipBadge') || 'In Progress')}</span>`
      : '';

    /* Dual-authorship badges */
    const authorshipEl = (work.authorshipVariants && work.authorshipVariants.length)
      ? `<div class="book-authorship">${work.authorshipVariants.map(v =>
          v === 'human'
            ? `<span class="authorship-badge human"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHtml(I18N.t('authorshipHuman') || 'Human-written')}</span>`
            : `<span class="authorship-badge human-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>${escapeHtml(I18N.t('authorshipHumanAI') || 'Human + AI')}</span>`
        ).join('')}</div>`
      : '';

    const studyUrl = safeUrl(work.studyUrl, { external: true });
    const studyLabel = String(work.studyLabel || I18N.t('learnMore') || 'Study app');
    const kindleUrl = safeUrl(work.amazonUrl, { external: true });
    const kindleLabel = String(work.kindleLabel || I18N.t('buyOnAmazon') || 'Kindle');

    const primaryLinks = [];
    if (studyUrl !== '#') {
      primaryLinks.push(`
            <a class="book-link" href="${escapeHtml(studyUrl)}" target="_blank" rel="noopener">
              <span>${escapeHtml(studyLabel)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>`);
    }

    if (kindleUrl !== '#') {
      primaryLinks.push(`
            <a class="book-link" href="${escapeHtml(kindleUrl)}" target="_blank" rel="noopener">
              <span>${escapeHtml(kindleLabel)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>`);
    }

    if (!primaryLinks.length) {
      primaryLinks.push(`
            <span class="book-link book-link--disabled" aria-disabled="true">Coming Soon</span>`);
    }

    return `
      <article class="book-card" data-genre="${escapeHtml(work.genre)}" data-id="${escapeHtml(work.id)}">
        ${coverEl}
        <div class="book-body">
          ${wipEl}
          <span class="book-tag ${tagClass}">${escapeHtml(I18N.t('workTag_' + work.id) || work.tag || '')}</span>
          ${authorshipEl}
          <h3 class="book-title">${escapeHtml(work.name)}</h3>
          <p class="book-summary">${escapeHtml(I18N.t('workSummary_' + work.id) || work.summary)}</p>
          <div class="book-actions">
            ${primaryLinks.join('')}
          </div>
        </div>
      </article>`;
  },

  _applyFilter(filter) {
    this.activeFilter = filter;
    document.querySelectorAll('.book-card').forEach(card => {
      card.classList.toggle('hidden', filter !== 'all' && card.dataset.genre !== filter);
    });
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
      tab.setAttribute('aria-pressed', String(tab.dataset.filter === filter));
    });
  },

  initFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => this._applyFilter(tab.dataset.filter));
    });
  }
};

/* --------------------------------------------------------------------------
   CHARACTER RENDERER
   -------------------------------------------------------------------------- */
const CharacterRenderer = {
  render() {
    const grid = document.getElementById('characters-grid');
    if (!grid || !DataStore.works?.characters) return;
    grid.innerHTML = DataStore.works.characters.map(c => this._card(c)).join('');
  },

  _card(c) {
    const genreTagClass = { progression: 'tag-progression', 'dark-fantasy': 'tag-dark-fantasy', war: 'tag-war' }[c.genre] || 'tag-start';
    const titleKey = `char${c.id.charAt(0).toUpperCase() + c.id.slice(1)}Title`;
    const descKey  = `char${c.id.charAt(0).toUpperCase() + c.id.slice(1)}Desc`;
    const genreKey = { progression: 'genreProgression', 'dark-fantasy': 'genreDark', war: 'genreWar' }[c.genre] || 'genreProgression';

    return `
      <article class="character-card">
        <div class="char-portrait-container">
          ${c.portraitImage ? `<img src="${escapeHtml(safeUrl(c.portraitImage))}" alt="${escapeHtml(c.portraitAlt)}" loading="lazy">` : ''}
          <div class="card-glow-bg ${escapeHtml(c.glowClass)}"></div>
        </div>
        <div class="char-info">
          <h3>${escapeHtml(c.name)}</h3>
          <span class="char-title-role" data-i18n="${titleKey}">${escapeHtml(I18N.t(titleKey))}</span>
          <p class="char-desc" data-i18n="${descKey}">${escapeHtml(I18N.t(descKey))}</p>
          <span class="char-tag ${genreTagClass}" data-i18n="${genreKey}">${escapeHtml(I18N.t(genreKey))}</span>
        </div>
      </article>`;
  }
};

/* --------------------------------------------------------------------------
   MEDIA RENDERER — privacy-respecting lazy embed
   -------------------------------------------------------------------------- */
const MediaRenderer = {
  render() {
    const grid = document.getElementById('media-grid');
    if (!grid || !DataStore.media?.items?.length) return;
    grid.innerHTML = DataStore.media.items.map(item => this._card(item)).join('');
    this.bindEmbeds(grid);
  },

  _card(item) {
    if (item.type === 'coming-soon') {
      return `
        <div class="media-card media-card--coming-soon">
          <div class="media-embed-wrapper">
            <div class="media-coming-soon-placeholder" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Coming Soon</span>
            </div>
          </div>
          <div class="media-body">
            <p class="media-title">${escapeHtml(item.title)}</p>
            <p class="media-desc">${escapeHtml(item.description)}</p>
          </div>
        </div>`;
    }

    const isTikTok   = item.type === 'tiktok';
    const mediaId = isTikTok ? safeMediaId(item.tiktokId) : safeMediaId(item.youtubeId);
    const dataAttr   = isTikTok
      ? `data-tiktok-id="${escapeHtml(mediaId)}"`
      : `data-youtube-id="${escapeHtml(mediaId)}"`;
    const platformBadge = isTikTok
      ? `<span class="media-platform-badge tiktok" aria-hidden="true">TikTok</span>`
      : `<span class="media-platform-badge youtube" aria-hidden="true">YouTube</span>`;
    return `
      <div class="media-card${isTikTok ? ' media-card--tiktok' : ''}">
        <div class="media-embed-wrapper">
          <div class="media-embed-placeholder" role="button" tabindex="0"
               aria-label="${escapeHtml(I18N.t('clickToLoad'))}: ${escapeHtml(item.title)}"
               ${dataAttr}>
            <div class="play-btn-ring" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <span class="embed-load-label" data-i18n="clickToLoad">${escapeHtml(I18N.t('clickToLoad'))}</span>
            ${platformBadge}
          </div>
        </div>
        <div class="media-body">
          <p class="media-title">${escapeHtml(item.title)}</p>
          <p class="media-desc">${escapeHtml(item.description)}</p>
        </div>
      </div>`;
  },

  bindEmbeds(root) {
    root.querySelectorAll('.media-embed-placeholder').forEach(placeholder => {
      const load = () => this.loadEmbed(placeholder);
      placeholder.addEventListener('click', load);
      placeholder.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          load();
        }
      });
    });
  },

  loadEmbed(placeholder) {
    const ytId  = placeholder.dataset.youtubeId;
    const ttId  = placeholder.dataset.tiktokId;
    if (!ytId && !ttId) return;
    if (ytId && !isSafeYouTubeId(ytId)) return;
    if (ttId && !isSafeTikTokId(ttId)) return;
    const wrapper = placeholder.parentElement;
    placeholder.remove();
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    if (ytId) {
      iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
      iframe.title = 'YouTube video player';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
    } else {
      iframe.src = `https://www.tiktok.com/embed/v2/${ttId}`;
      iframe.title = 'TikTok video player';
      iframe.allow = 'autoplay; fullscreen';
      iframe.allowFullscreen = true;
    }
    iframe.loading = 'lazy';
    wrapper.appendChild(iframe);
  }
};
window.MediaRenderer = MediaRenderer;

/* --------------------------------------------------------------------------
   PHILOSOPHY RENDERER
   -------------------------------------------------------------------------- */
const PhilosophyRenderer = {
  render() {
    if (!DataStore.author) return;
    const a = DataStore.author;
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('author-disclosure',   I18N.t('philDisclosureText') || a.aiDisclosure);
  }
};

/* --------------------------------------------------------------------------
   HERO COLLAGE — interactive character highlight
   -------------------------------------------------------------------------- */
const HeroCollage = {
  init() {
    const items = document.querySelectorAll('.collage-item');
    if (!items.length) return;

    items.forEach(item => {
      item.addEventListener('mouseenter', () => this._activate(item, items));
      item.addEventListener('mouseleave', () => this._reset(items));
    });
  },

  _activate(active, all) {
    all.forEach(item => item.classList.toggle('item-active', item === active));
  },

  _reset(all) {
    all.forEach(item => item.classList.remove('item-active'));
    if (all[0]) all[0].classList.add('item-active');
  }
};

/* --------------------------------------------------------------------------
   MOBILE NAVIGATION
   -------------------------------------------------------------------------- */
const MobileNav = {
  init() {
    const btn = document.getElementById('menu-btn');
    const nav = document.querySelector('.site-nav');
    if (!btn || !nav) return;

    const getFocusableElements = () =>
      [...nav.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')].filter(el =>
        el.offsetParent !== null || el.tagName === 'A' || el.tagName === 'BUTTON'
      );
    let previousActiveElement = null;
    let onKeyDown;

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('mobile-open');
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        previousActiveElement = document.activeElement;
        const focusables = getFocusableElements();
        if (focusables[0]) {
          focusables[0].focus();
        }
        onKeyDown = event => {
          if (event.key === 'Escape') {
            nav.classList.remove('mobile-open');
            btn.setAttribute('aria-expanded', 'false');
            if (previousActiveElement) previousActiveElement.focus();
            document.removeEventListener('keydown', onKeyDown);
            return;
          }

          if (event.key !== 'Tab') return;

          const focusablesNow = getFocusableElements();
          if (!focusablesNow.length) return;
          const first = focusablesNow[0];
          const last = focusablesNow[focusablesNow.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        };
        document.addEventListener('keydown', onKeyDown);
      } else if (onKeyDown) {
        document.removeEventListener('keydown', onKeyDown);
      }
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('mobile-open');
        btn.setAttribute('aria-expanded', 'false');
        if (onKeyDown) {
          document.removeEventListener('keydown', onKeyDown);
        }
        if (previousActiveElement) {
          previousActiveElement.focus();
        }
      });
    });
  }
};

/* --------------------------------------------------------------------------
   SCROLL — header shadow
   -------------------------------------------------------------------------- */
const ScrollBehavior = {
  init() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    }, { passive: true });
  }
};

/* --------------------------------------------------------------------------
   ERROR BOUNDARY HELPERS
   -------------------------------------------------------------------------- */

/* Show a non-intrusive error message inside a specific section container. */
function showSectionError(containerId, resourceName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const notice = document.createElement('div');
  notice.className = 'data-error-notice';
  notice.setAttribute('role', 'alert');
  notice.innerHTML = '<p style="margin:0;padding:1rem;text-align:center;color:var(--text-muted,#999);font-size:0.95rem;">'
    + 'Unable to load ' + escapeHtml(resourceName) + '. Please check your connection and reload.</p>';
  container.prepend(notice);
}

/* --------------------------------------------------------------------------
   ENTRY POINT
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Theme button (FOUC prevention already handled by inline <head> script)
  ThemeManager.init();

  // 2. i18n — renders with fallback immediately, fetches remote if needed
  try {
    await I18N.init();
  } catch (err) {
    console.error('[AI2M2IA] i18n initialisation failed:', err);
  }

  // 3. Fetch content data (wrapped in error boundary)
  try {
    await DataStore.loadAll(['works', 'author']);
  } catch (err) {
    console.error('[AI2M2IA] DataStore.loadAll() failed:', err);
  }

  // 4. Render dynamic sections — each guarded against missing data
  try {
    if (DataStore.works) {
      CatalogRenderer.render();
      CatalogRenderer.initFilters();
    } else {
      showSectionError('books-grid', 'catalog');
      throw new Error('Missing catalog payload');
    }
  } catch (err) {
    console.error('[AI2M2IA] Catalog rendering failed:', err);
    showSectionError('books-grid', 'catalog');
  }

  try {
    PhilosophyRenderer.render();
  } catch (err) {
    console.error('[AI2M2IA] Philosophy rendering failed:', err);
  }

  // 5. Re-apply i18n to dynamically rendered content
  I18N.apply();

  // 6. UI interactions (DOM-only, unlikely to throw, but guarded)
  try {
    SkipLink.init();
    HeroCollage.init();
    MobileNav.init();
    ScrollBehavior.init();
  } catch (err) {
    console.error('[AI2M2IA] UI interaction init failed:', err);
  }
});
