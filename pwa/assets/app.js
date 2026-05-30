const configuredApi = new URLSearchParams(window.location.search).get("api");
const CANONICAL_API_BASE_URL = "https://ai2m2ia.github.io";
const DEFAULT_API_BASE_URL = window.location.origin;
const API_PREFIX = "/api";
const API_BASE_URL = resolveConfiguredApiBaseUrl(configuredApi);
const USES_CONFIGURED_API = API_BASE_URL !== DEFAULT_API_BASE_URL;
const CATALOG_URL = `${API_BASE_URL}${API_PREFIX}/catalog.json`;
const API_CACHE = "ai2m2ia-api-v1";
const DOWNLOADED_KEY = "ai2m2ia-pwa-downloaded";

const state = {
  catalog: null,
  books: [],
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
  format: document.querySelector("#format-filter"),
  language: document.querySelector("#language-filter"),
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
  nodes.language.addEventListener("change", renderLibrary);
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
    populateLanguageFilter(state.books);
    renderLibrary();
  } catch (error) {
    nodes.count.textContent = "Não foi possível carregar o catálogo.";
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
    throw new Error("Sem rede e sem cópia offline disponível.");
  }
}

function populateLanguageFilter(books) {
  const selected = nodes.language.value;
  const languages = [...new Set(books.flatMap(book => book.languages || []))].sort();
  nodes.language.textContent = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Todos os idiomas";
  nodes.language.append(allOption);
  for (const language of languages) {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = language.toUpperCase();
    nodes.language.append(option);
  }
  nodes.language.value = languages.includes(selected) ? selected : "";
}

function renderLibrary() {
  const downloaded = getDownloaded();
  const query = nodes.search.value.trim().toLowerCase();
  const format = nodes.format.value;
  const language = nodes.language.value;
  const books = state.books.filter(book => {
    const haystack = [book.title, book.author, book.description].filter(Boolean).join(" ").toLowerCase();
    return (!query || haystack.includes(query)) &&
      (!format || book.format === format) &&
      (!language || (book.languages || []).includes(language));
  });

  nodes.count.textContent = `${books.length} de ${state.books.length} livros`;
  nodes.version.textContent = state.catalog?.generatedAt ? `Gerado em ${formatDate(state.catalog.generatedAt)}` : "";
  nodes.bookGrid.textContent = "";

  if (!books.length) {
    renderEmptyState(nodes.bookGrid, "Nenhum livro encontrado.");
    return;
  }

  for (const book of books) {
    const card = nodes.template.content.firstElementChild.cloneNode(true);
    const cover = card.querySelector(".cover-slot");
    const kicker = card.querySelector(".book-kicker");
    const title = card.querySelector("h2");
    const description = card.querySelector("p");
    const read = card.querySelector(".read-link");
    const download = card.querySelector(".download-button");

    renderCover(cover, book);
    kicker.textContent = `${labelFormat(book.format)} · ${(book.languages || []).join(", ").toUpperCase()}`;
    title.textContent = book.title;
    description.textContent = book.description || "Sem descrição disponível.";
    read.href = `#book=${encodeURIComponent(book.id)}`;
    download.textContent = downloaded.has(book.id) ? "Offline" : "Baixar";
    download.classList.toggle("cached", downloaded.has(book.id));
    download.addEventListener("click", () => downloadBook(book, download));
    nodes.bookGrid.append(card);
  }
}

function renderCover(container, book) {
  container.textContent = "";
  if (book.coverUrl) {
    const img = document.createElement("img");
    img.src = resolveApiUrl(book.coverUrl);
    img.alt = `Capa de ${book.title}`;
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
  button.textContent = "Baixando";
  try {
    const manifestUrl = resolveApiUrl(book.manifestUrl);
    const content = await fetchJson(manifestUrl, { refresh: true });
    const cache = await caches.open(API_CACHE);
    const urls = [manifestUrl, book.coverUrl, ...extractImageUrls(content)].filter(Boolean).map(resolveApiUrl);
    await Promise.all(urls.map(url => fetch(url).then(response => {
      if (response.ok) return cache.put(url, response);
      return undefined;
    }).catch(() => undefined)));
    const downloaded = getDownloaded();
    downloaded.add(book.id);
    saveDownloaded(downloaded);
    button.classList.add("cached");
    button.textContent = "Offline";
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
  if (!text.trim()) return "<p>Este capítulo está em branco.</p>";
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
  return new Set(JSON.parse(localStorage.getItem(DOWNLOADED_KEY) || "[]"));
}

function saveDownloaded(downloaded) {
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...downloaded]));
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
  nodes.status.textContent = navigator.onLine ? "Online" : "Offline";
  nodes.status.classList.toggle("offline", !navigator.onLine);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
  }
}

function labelFormat(format) {
  return {
    PROSE: "Prosa",
    LIGHT_NOVEL: "Light novel",
    MANGA: "Manga",
    MANHWA: "Manhwa"
  }[format] || format;
}

function shortTitle(title) {
  return title.includes(" — ") ? title.split(" — ").pop() : title;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
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
