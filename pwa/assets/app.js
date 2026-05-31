const configuredApi = new URLSearchParams(window.location.search).get("api");
const CANONICAL_API_BASE_URL = "https://ai2m2ia.github.io";
const DEFAULT_API_BASE_URL = window.location.origin;
const API_PREFIX = "/api";
const API_BASE_URL = resolveConfiguredApiBaseUrl(configuredApi);
const USES_CONFIGURED_API = API_BASE_URL !== DEFAULT_API_BASE_URL;
const CATALOG_URL = `${API_BASE_URL}${API_PREFIX}/catalog.json`;
const API_CACHE = "ai2m2ia-api-v1";
const DOWNLOADED_KEY = "ai2m2ia-pwa-downloaded";
const WISHLIST_KEY = "ai2m2ia-pwa-wishlist";
const UI_LANGUAGE_KEY = "ai2m2ia-pwa-ui-language";
const DEFAULT_UI_LANGUAGE = "en";
const LIBRARY_MODES = ["catalog", "downloaded", "wishlist"];
const UI_STRINGS = {
  en: {
    nav: "Navigation",
    refresh: "Refresh catalog",
    install: "Install",
    uiShort: "UI",
    interfaceLanguage: "Interface language",
    eyebrow: "Public catalog",
    heading: "Offline reading for the AI(2)M(2)IA library",
    syncing: "Syncing",
    online: "Online",
    offline: "Offline",
    toolbar: "Library filters",
    search: "Search",
    searchPlaceholder: "Title, author, or description",
    formatAria: "Format",
    allFormats: "All formats",
    prose: "Prose",
    bookLanguageAria: "Book language",
    allBookLanguages: "All book languages",
    loadingCatalog: "Loading catalog",
    count: (visible, total) => `${visible} of ${total} books`,
    generatedAt: date => `Generated ${date}`,
    noBooks: "No books found.",
    noDescription: "No description available.",
    coverOf: title => `Cover of ${title}`,
    read: "Read",
    download: "Download",
    removeDownload: "Remove download",
    saveForLater: "Save for later",
    removeFromWishlist: "Remove from wishlist",
    downloading: "Downloading",
    downloaded: "Offline",
    viewCatalog: "Catalog",
    viewDownloaded: "Downloaded",
    viewWishlist: "Wishlist",
    seriesPrefix: "Series",
    seriesCount: count => `${count} books`,
    backToLibrary: "← Library",
    bookPlaceholder: "Book",
    previous: "Previous",
    next: "Next",
    chapterBlank: "<p>This chapter is blank.</p>",
    loadCatalogError: "Unable to load the catalog.",
    networkFallbackError: "No network connection and no offline copy is available.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} of ${total} downloaded`;
      if (mode === "wishlist") return `${visible} of ${total} saved`;
      return `${visible} of ${total} books`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "No downloaded books found.";
      if (mode === "wishlist") return "No saved books found.";
      return "No books found.";
    }
  },
  "pt-BR": {
    nav: "Navegação",
    refresh: "Atualizar catálogo",
    install: "Instalar",
    uiShort: "UI",
    interfaceLanguage: "Idioma da interface",
    eyebrow: "Catálogo público",
    heading: "Leitura offline para a biblioteca AI(2)M(2)IA",
    syncing: "Sincronizando",
    online: "Online",
    offline: "Offline",
    toolbar: "Filtros da biblioteca",
    search: "Buscar",
    searchPlaceholder: "Título, autor ou descrição",
    formatAria: "Formato",
    allFormats: "Todos os formatos",
    prose: "Prosa",
    bookLanguageAria: "Idioma do livro",
    allBookLanguages: "Todos os idiomas dos livros",
    loadingCatalog: "Carregando catálogo",
    count: (visible, total) => `${visible} de ${total} livros`,
    generatedAt: date => `Gerado em ${date}`,
    noBooks: "Nenhum livro encontrado.",
    noDescription: "Sem descrição disponível.",
    coverOf: title => `Capa de ${title}`,
    read: "Ler",
    download: "Baixar",
    removeDownload: "Remover download",
    saveForLater: "Salvar para depois",
    removeFromWishlist: "Remover da lista",
    downloading: "Baixando",
    downloaded: "Offline",
    viewCatalog: "Catálogo",
    viewDownloaded: "Baixados",
    viewWishlist: "Lista",
    seriesPrefix: "Série",
    seriesCount: count => `${count} livros`,
    backToLibrary: "← Biblioteca",
    bookPlaceholder: "Livro",
    previous: "Anterior",
    next: "Próximo",
    chapterBlank: "<p>Este capítulo está em branco.</p>",
    loadCatalogError: "Não foi possível carregar o catálogo.",
    networkFallbackError: "Sem rede e sem cópia offline disponível.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} de ${total} baixados`;
      if (mode === "wishlist") return `${visible} de ${total} salvos`;
      return `${visible} de ${total} livros`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Nenhum livro baixado encontrado.";
      if (mode === "wishlist") return "Nenhum livro salvo encontrado.";
      return "Nenhum livro encontrado.";
    }
  }
};

const state = {
  catalog: null,
  books: [],
  uiLanguage: DEFAULT_UI_LANGUAGE,
  libraryMode: "catalog",
  content: null,
  currentBook: null,
  currentChapter: 0,
  deferredInstall: null
};

const nodes = {
  libraryView: document.querySelector("#library-view"),
  readerView: document.querySelector("#reader-view"),
  bookGrid: document.querySelector("#book-grid"),
  count: document.querySelector("#catalog-count"),
  version: document.querySelector("#catalog-version"),
  status: document.querySelector("#network-status"),
  search: document.querySelector("#search-input"),
  libraryModes: document.querySelector("#library-modes"),
  format: document.querySelector("#format-filter"),
  bookLanguage: document.querySelector("#book-language-filter"),
  uiLanguage: document.querySelector("#ui-language"),
  uiLanguageLabel: document.querySelector("#ui-language-label"),
  searchLabel: document.querySelector("#search-label"),
  refresh: document.querySelector("#refresh-button"),
  install: document.querySelector("#install-button"),
  readerBookTitle: document.querySelector("#reader-book-title"),
  readerBookAuthor: document.querySelector("#reader-book-author"),
  chapterList: document.querySelector("#chapter-list"),
  chapterTitle: document.querySelector("#chapter-title"),
  chapterBody: document.querySelector("#chapter-body"),
  readerPosition: document.querySelector("#reader-position"),
  prev: document.querySelector("#prev-chapter"),
  next: document.querySelector("#next-chapter"),
  template: document.querySelector("#book-card-template")
};

init();

async function init() {
  state.uiLanguage = readUiLanguage();
  nodes.uiLanguage.value = state.uiLanguage;
  applyUiStrings();
  registerServiceWorker();
  bindEvents();
  updateNetworkStatus();
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  await loadCatalog();
  route();
}

function bindEvents() {
  window.addEventListener("hashchange", route);
  nodes.search.addEventListener("input", renderLibrary);
  nodes.format.addEventListener("change", renderLibrary);
  nodes.bookLanguage.addEventListener("change", renderLibrary);
  nodes.libraryModes.addEventListener("click", event => {
    const button = event.target.closest(".library-mode");
    if (!button) return;
    const mode = button.dataset.mode;
    if (!LIBRARY_MODES.includes(mode)) return;
    state.libraryMode = mode;
    updateLibraryModeButtons();
    renderLibrary();
  });
  nodes.uiLanguage.addEventListener("change", event => {
    state.uiLanguage = normalizeUiLanguage(event.target.value);
    saveUiLanguage(state.uiLanguage);
    applyUiStrings();
    if (state.books.length) renderLibrary();
  });
  nodes.refresh.addEventListener("click", () => loadCatalog({ refresh: true }));
  nodes.prev.addEventListener("click", () => setChapter(state.currentChapter - 1));
  nodes.next.addEventListener("click", () => setChapter(state.currentChapter + 1));

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    state.deferredInstall = event;
    nodes.install.hidden = false;
  });

  nodes.install.addEventListener("click", async () => {
    if (!state.deferredInstall) return;
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
    nodes.install.hidden = true;
  });
}

async function loadCatalog(options = {}) {
  try {
    state.catalog = await fetchJson(CATALOG_URL, options);
    state.books = state.catalog.books || [];
    populateBookLanguageFilter(state.books);
    renderLibrary();
  } catch (error) {
    nodes.count.textContent = t().loadCatalogError;
    renderEmptyState(nodes.bookGrid, error.message);
  }
}

async function fetchJson(url, options = {}) {
  const cache = await caches.open(API_CACHE);
  if (!options.refresh) {
    const cached = await cache.match(url);
    if (cached && !navigator.onLine) return cached.json();
  }

  try {
    const response = await fetch(url, { cache: options.refresh ? "reload" : "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await cache.put(url, response.clone());
    return response.json();
  } catch (error) {
    const cached = await cache.match(url);
    if (cached) return cached.json();
    throw new Error(t().networkFallbackError);
  }
}

function populateBookLanguageFilter(books) {
  const selected = nodes.bookLanguage.value;
  const languages = [...new Set(books.flatMap(book => book.languages || []))].sort();
  nodes.bookLanguage.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = t().allBookLanguages;
  nodes.bookLanguage.append(allOption);
  for (const language of languages) {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language.toUpperCase();
    nodes.bookLanguage.append(option);
  }
  nodes.bookLanguage.value = languages.includes(selected) ? selected : "";
}

function renderLibrary() {
  const downloaded = getDownloaded();
  const wishlist = getWishlist();
  const baseBooks = booksForMode(state.libraryMode, downloaded, wishlist);
  const query = nodes.search.value.trim().toLowerCase();
  const format = nodes.format.value;
  const language = nodes.bookLanguage.value;
  const books = baseBooks.filter(book => {
    const seriesTitle = resolveSeriesMeta(book).title;
    const haystack = [book.title, book.author, book.description, seriesTitle].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) &&
      (!format || book.format === format) &&
      (!language || (book.languages || []).includes(language));
  });

  nodes.count.textContent = t().booksCountForMode(state.libraryMode, books.length, baseBooks.length);
  nodes.version.textContent = state.catalog?.generatedAt ? t().generatedAt(formatDate(state.catalog.generatedAt)) : "";
  nodes.bookGrid.textContent = "";

  if (!books.length) {
    renderEmptyState(nodes.bookGrid, t().noBooksForMode(state.libraryMode));
    return;
  }

  const grouped = groupBooks(books);
  for (const standalone of grouped.standalone) {
    nodes.bookGrid.append(renderBookCard(standalone, downloaded));
  }
  for (const series of grouped.series) {
    const section = document.createElement("section");
    section.className = "series-group";
    const header = document.createElement("details");
    header.className = "series-details";
    header.open = true;
    const summary = document.createElement("summary");
    summary.className = "series-summary";
    const title = document.createElement("strong");
    title.textContent = series.title;
    const meta = document.createElement("span");
    meta.textContent = `${t().seriesPrefix} · ${t().seriesCount(series.books.length)}`;
    summary.append(title, meta);
    const volumeGrid = document.createElement("div");
    volumeGrid.className = "series-book-grid";
    for (const volume of series.books) {
      volumeGrid.append(renderBookCard(volume, downloaded));
    }
    header.append(summary, volumeGrid);
    section.append(header);
    nodes.bookGrid.append(section);
  }
}

function renderBookCard(book, downloaded) {
  const wishlist = getWishlist();
  const card = nodes.template.content.firstElementChild.cloneNode(true);
  const cover = card.querySelector(".cover-slot");
  const kicker = card.querySelector(".book-kicker");
  const title = card.querySelector("h2");
  const description = card.querySelector("p");
  const read = card.querySelector(".read-link");
  const download = card.querySelector(".download-button");
  const actions = card.querySelector(".book-actions");
  const series = resolveSeriesMeta(book);
  const seriesKicker = series.volumeLabel ? `${series.title} · ${series.volumeLabel}` : labelFormat(book.format);
  renderCover(cover, book);
  kicker.textContent = `${seriesKicker} · ${(book.languages || []).join(", ").toUpperCase()}`;
  title.textContent = series.displayTitle || book.title;
  description.textContent = book.description || t().noDescription;
  read.href = `#book=${encodeURIComponent(book.id)}`;
  read.textContent = t().read;
  download.textContent = downloaded.has(book.id) ? t().downloaded : t().download;
  download.disabled = downloaded.has(book.id);
  download.classList.toggle("cached", downloaded.has(book.id));
  download.addEventListener("click", () => downloadBook(book, download));
  const wishlistButton = document.createElement("button");
  wishlistButton.type = "button";
  wishlistButton.className = "wishlist-button";
  wishlistButton.textContent = wishlist.has(book.id) ? t().removeFromWishlist : t().saveForLater;
  wishlistButton.addEventListener("click", () => {
    toggleWishlist(book.id);
    renderLibrary();
  });
  actions.append(wishlistButton);

  if (downloaded.has(book.id)) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = t().removeDownload;
    removeButton.addEventListener("click", () => removeDownloadedBook(book, removeButton));
    actions.append(removeButton);
  }
  return card;
}

function renderCover(container, book) {
  container.textContent = "";
  if (book.coverUrl) {
    const img = document.createElement("img");
    img.src = resolveApiUrl(book.coverUrl);
    img.alt = t().coverOf(book.title);
    img.loading = "lazy";
    img.addEventListener("error", () => renderFallbackCover(container, book));
    container.append(img);
  } else {
    renderFallbackCover(container, book);
  }
}

function renderFallbackCover(container, book) {
  container.textContent = "";
  const fallback = document.createElement("div");
  fallback.className = "fallback-cover";
  const format = document.createElement("span");
  format.textContent = book.format;
  const title = document.createElement("strong");
  title.textContent = shortTitle(book.title);
  const author = document.createElement("span");
  author.textContent = book.author || "AI(2)M(2)IA";
  fallback.append(format, title, author);
  container.append(fallback);
}

function renderEmptyState(container, message) {
  container.textContent = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  container.append(empty);
}

async function downloadBook(book, button) {
  button.disabled = true;
  button.textContent = t().downloading;
  try {
    const manifestUrl = resolveApiUrl(book.manifestUrl);
    const content = await fetchJson(manifestUrl, { refresh: true });
    const cache = await caches.open(API_CACHE);
    const urls = collectBookAssetUrls(book, content);
    await Promise.all(urls.map(url => fetch(url).then(response => {
      if (response.ok) return cache.put(url, response);
      return undefined;
    }).catch(() => undefined)));
    const downloaded = getDownloaded();
    downloaded.add(book.id);
    saveDownloaded(downloaded);
    button.classList.add("cached");
    button.textContent = t().downloaded;
    button.disabled = true;
    renderLibrary();
  } finally {
    if (!getDownloaded().has(book.id)) button.disabled = false;
  }
}

async function removeDownloadedBook(book, button) {
  button.disabled = true;
  try {
    await removeBookFromCache(book);
    const downloaded = getDownloaded();
    downloaded.delete(book.id);
    saveDownloaded(downloaded);
    renderLibrary();
  } finally {
    button.disabled = false;
  }
}

async function route() {
  const hash = window.location.hash || "#library";
  if (hash.startsWith("#book=")) {
    const id = decodeURIComponent(hash.slice("#book=".length));
    await openBook(id);
  } else {
    state.content = null;
    state.currentBook = null;
    nodes.readerView.hidden = true;
    nodes.libraryView.hidden = false;
  }
}

async function openBook(bookId) {
  const book = state.books.find(item => item.id === bookId);
  if (!book) {
    window.location.hash = "#library";
    return;
  }
  state.currentBook = book;
  state.content = await fetchJson(resolveApiUrl(book.manifestUrl));
  state.currentChapter = readProgress(book.id);

  nodes.libraryView.hidden = true;
  nodes.readerView.hidden = false;
  nodes.readerBookTitle.textContent = book.title;
  nodes.readerBookAuthor.textContent = book.author || "";
  renderChapterList();
  setChapter(state.currentChapter);
}

function renderChapterList() {
  nodes.chapterList.textContent = "";
  for (const [index, chapter] of (state.content.chapters || []).entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = chapter.title;
    button.addEventListener("click", () => setChapter(index));
    nodes.chapterList.append(button);
  }
}

function setChapter(index) {
  const chapters = state.content?.chapters || [];
  if (!chapters.length) return;
  state.currentChapter = Math.max(0, Math.min(index, chapters.length - 1));
  const chapter = chapters[state.currentChapter];

  nodes.chapterTitle.textContent = chapter.title;
  nodes.chapterBody.innerHTML = renderProse(chapter.text || "");
  nodes.readerPosition.textContent = `${state.currentChapter + 1} / ${chapters.length}`;
  nodes.prev.disabled = state.currentChapter === 0;
  nodes.next.disabled = state.currentChapter === chapters.length - 1;
  [...nodes.chapterList.children].forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === state.currentChapter);
  });
  if (state.currentBook) saveProgress(state.currentBook.id, state.currentChapter);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderProse(text) {
  if (!text.trim()) return t().chapterBlank;
  return text.split(/\n\s*\n+/).map(block => {
    const clean = escapeHtml(block.trim());
    if (!clean) return "";
    if (clean.startsWith("&gt;")) return `<blockquote>${inlineMarkdown(clean.replace(/^&gt;\s*/, ""))}</blockquote>`;
    if (clean.startsWith("### ")) return `<h3>${inlineMarkdown(clean.slice(4))}</h3>`;
    if (clean.startsWith("## ")) return `<h2>${inlineMarkdown(clean.slice(3))}</h2>`;
    return `<p>${inlineMarkdown(clean).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function extractImageUrls(content) {
  return (content.chapters || []).flatMap(chapter => chapter.images || []).map(image => image.url);
}

function resolveApiUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (
      parsed.pathname.startsWith(`${API_PREFIX}/`) &&
      (USES_CONFIGURED_API || parsed.origin === CANONICAL_API_BASE_URL)
    ) {
      return `${API_BASE_URL}${parsed.pathname}`;
    }
  } catch {
    return url;
  }
  return url;
}

function resolveConfiguredApiBaseUrl(value) {
  if (!value) return DEFAULT_API_BASE_URL;
  try {
    const parsed = new URL(value, window.location.href);
    if (!["http:", "https:"].includes(parsed.protocol)) return DEFAULT_API_BASE_URL;
    if (
      parsed.origin === DEFAULT_API_BASE_URL ||
      parsed.origin === CANONICAL_API_BASE_URL ||
      isLocalDevOrigin(parsed)
    ) {
      return parsed.origin.replace(/\/$/, "");
    }
  } catch (_) {
    return DEFAULT_API_BASE_URL;
  }
  console.warn("[AI2M2IA] Ignoring unsupported API origin:", value);
  return DEFAULT_API_BASE_URL;
}

function isLocalDevOrigin(url) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

function getDownloaded() {
  return readIdSet(DOWNLOADED_KEY);
}

function saveDownloaded(downloaded) {
  saveIdSet(DOWNLOADED_KEY, downloaded);
}

function getWishlist() {
  return readIdSet(WISHLIST_KEY);
}

function saveWishlist(wishlist) {
  saveIdSet(WISHLIST_KEY, wishlist);
}

function toggleWishlist(bookId) {
  const wishlist = getWishlist();
  if (wishlist.has(bookId)) wishlist.delete(bookId);
  else wishlist.add(bookId);
  saveWishlist(wishlist);
}

function readIdSet(key) {
  const validIds = new Set(state.books.map(book => book.id));
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    const safeIds = Array.isArray(raw) ? raw.filter(value => typeof value === "string" && validIds.has(value)) : [];
    const result = new Set(safeIds);
    localStorage.setItem(key, JSON.stringify([...result]));
    return result;
  } catch {
    localStorage.setItem(key, "[]");
    return new Set();
  }
}

function saveIdSet(key, values) {
  localStorage.setItem(key, JSON.stringify([...values]));
}

function readProgress(bookId) {
  const raw = localStorage.getItem(`ai2m2ia-pwa-progress-${bookId}`);
  if (!raw) return 0;
  try {
    return JSON.parse(raw).chapterIndex || 0;
  } catch {
    return 0;
  }
}

function saveProgress(bookId, chapterIndex) {
  localStorage.setItem(`ai2m2ia-pwa-progress-${bookId}`, JSON.stringify({
    chapterIndex,
    updatedAt: new Date().toISOString()
  }));
}

function updateNetworkStatus() {
  nodes.status.textContent = navigator.onLine ? t().online : t().offline;
  nodes.status.classList.toggle("offline", !navigator.onLine);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
  }
}

function labelFormat(format) {
  return {
    PROSE: t().prose,
    LIGHT_NOVEL: "Light novel",
    MANGA: "Manga",
    MANHWA: "Manhwa"
  }[format] || format;
}

function booksForMode(mode, downloaded, wishlist) {
  if (mode === "downloaded") return state.books.filter(book => downloaded.has(book.id));
  if (mode === "wishlist") return state.books.filter(book => wishlist.has(book.id));
  return state.books;
}

async function removeBookFromCache(book) {
  try {
    const cache = await caches.open(API_CACHE);
    const manifestUrl = resolveApiUrl(book.manifestUrl);
    const manifest = await fetchJson(manifestUrl);
    const urls = collectBookAssetUrls(book, manifest);
    await Promise.all(urls.map(url => cache.delete(url)));
  } catch (_) {
    // Best-effort cleanup: if manifest is unavailable, still clear local state.
  }
}

function groupBooks(books) {
  const standalone = [];
  const grouped = new Map();
  for (const book of books) {
    const series = resolveSeriesMeta(book);
    if (!series.id) {
      standalone.push(book);
      continue;
    }
    if (!grouped.has(series.id)) grouped.set(series.id, { id: series.id, title: series.title, books: [] });
    grouped.get(series.id).books.push(book);
  }
  for (const series of grouped.values()) {
    series.books.sort((a, b) => resolveSeriesMeta(a).sortOrder - resolveSeriesMeta(b).sortOrder);
  }
  return {
    standalone,
    series: [...grouped.values()].sort((a, b) => a.title.localeCompare(b.title))
  };
}

function resolveSeriesMeta(book) {
  const explicitSeries = book.series;
  if (explicitSeries?.id && explicitSeries?.title) {
    return {
      id: explicitSeries.id,
      title: explicitSeries.title,
      volumeLabel: explicitSeries.volume || null,
      sortOrder: Number(explicitSeries.order || 0),
      displayTitle: book.title
    };
  }
  const lastArchiveMatch = /^the-last-archive-vol-(\d{3})$/.exec(book.id);
  if (lastArchiveMatch) {
    const volumeNumber = Number(lastArchiveMatch[1]);
    const volumeLabelMatch = /^The Last Archive:\s*(Volume [^—]+)\s*—\s*(.+)$/.exec(book.title);
    return {
      id: "the-last-archive",
      title: "The Last Archive",
      volumeLabel: volumeLabelMatch ? volumeLabelMatch[1] : `Volume ${volumeNumber}`,
      sortOrder: volumeNumber,
      displayTitle: volumeLabelMatch ? volumeLabelMatch[2] : book.title
    };
  }
  return {
    id: null,
    title: null,
    volumeLabel: null,
    sortOrder: 0,
    displayTitle: book.title
  };
}

function t() {
  return UI_STRINGS[state.uiLanguage] || UI_STRINGS[DEFAULT_UI_LANGUAGE];
}

function normalizeUiLanguage(value) {
  return Object.hasOwn(UI_STRINGS, value) ? value : DEFAULT_UI_LANGUAGE;
}

function readUiLanguage() {
  return normalizeUiLanguage(localStorage.getItem(UI_LANGUAGE_KEY) || DEFAULT_UI_LANGUAGE);
}

function saveUiLanguage(value) {
  localStorage.setItem(UI_LANGUAGE_KEY, value);
}

function applyUiStrings() {
  const strings = t();
  nodes.refresh.title = strings.refresh;
  nodes.refresh.setAttribute("aria-label", strings.refresh);
  document.querySelector(".top-actions").setAttribute("aria-label", strings.nav);
  nodes.install.textContent = strings.install;
  nodes.uiLanguageLabel.textContent = strings.uiShort;
  nodes.uiLanguage.setAttribute("aria-label", strings.interfaceLanguage);
  document.querySelector(".eyebrow").textContent = strings.eyebrow;
  document.querySelector(".library-header h1").textContent = strings.heading;
  if (!nodes.status.textContent || nodes.status.textContent === UI_STRINGS.en.syncing || nodes.status.textContent === UI_STRINGS["pt-BR"].syncing) {
    nodes.status.textContent = strings.syncing;
  }
  document.querySelector(".toolbar").setAttribute("aria-label", strings.toolbar);
  nodes.searchLabel.textContent = strings.search;
  nodes.search.placeholder = strings.searchPlaceholder;
  nodes.format.setAttribute("aria-label", strings.formatAria);
  nodes.format.options[0].textContent = strings.allFormats;
  nodes.format.options[1].textContent = strings.prose;
  const modeButtons = nodes.libraryModes.querySelectorAll(".library-mode");
  modeButtons[0].textContent = strings.viewCatalog;
  modeButtons[1].textContent = strings.viewDownloaded;
  modeButtons[2].textContent = strings.viewWishlist;
  nodes.bookLanguage.setAttribute("aria-label", strings.bookLanguageAria);
  nodes.count.textContent = strings.loadingCatalog;
  document.querySelector(".back-link").textContent = strings.backToLibrary;
  nodes.readerBookTitle.textContent = strings.bookPlaceholder;
  nodes.prev.textContent = strings.previous;
  nodes.next.textContent = strings.next;
  updateLibraryModeButtons();
  populateBookLanguageFilter(state.books);
}

function updateLibraryModeButtons() {
  nodes.libraryModes.querySelectorAll(".library-mode").forEach(button => {
    const active = button.dataset.mode === state.libraryMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function collectBookAssetUrls(book, manifest) {
  const manifestUrl = resolveApiUrl(book.manifestUrl);
  const coverUrl = resolveApiUrl(book.coverUrl);
  const imageUrls = extractImageUrls(manifest).map(resolveApiUrl);
  return [manifestUrl, coverUrl, ...imageUrls]
    .filter(Boolean)
    .filter(url => isTrustedBookAssetUrl(book.id, url));
}

function isTrustedBookAssetUrl(bookId, value) {
  try {
    const url = new URL(value, window.location.href);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (![CANONICAL_API_BASE_URL, DEFAULT_API_BASE_URL].includes(url.origin)) return false;
    const path = `${API_PREFIX}/books/${bookId}/`;
    return url.pathname.startsWith(path);
  } catch {
    return false;
  }
}

function shortTitle(title) {
  return title.includes(" — ") ? title.split(" — ").pop() : title;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(state.uiLanguage, { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
