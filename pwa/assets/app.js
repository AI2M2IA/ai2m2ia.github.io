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
const SUPPORTED_UI_LANGUAGES = [
  "en", "pt-BR", "es-419", "fr", "it", "de", "pl", "tr", "ru",
  "id", "vi", "fil", "th", "ja", "zh-CN", "zh-TW", "yue",
  "ko", "hi", "ur", "ar", "fa", "he"
];
const UI_LANGUAGE_LABELS = {
  en: "English",
  "pt-BR": "Portuguese (Brazil)",
  "es-419": "Spanish (Latin America)",
  fr: "French",
  it: "Italian",
  de: "German",
  pl: "Polish",
  tr: "Turkish",
  ru: "Russian",
  id: "Indonesian",
  vi: "Vietnamese",
  fil: "Filipino",
  th: "Thai",
  ja: "Japanese",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  yue: "Cantonese",
  ko: "Korean",
  hi: "Hindi",
  ur: "Urdu",
  ar: "Arabic",
  fa: "Persian",
  he: "Hebrew"
};
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);
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
  },
  "es-419": {
    nav: "Navegación",
    refresh: "Actualizar catálogo",
    install: "Instalar",
    uiShort: "UI",
    interfaceLanguage: "Idioma de la interfaz",
    eyebrow: "Catálogo público",
    heading: "Lectura offline para la biblioteca AI(2)M(2)IA",
    syncing: "Sincronizando",
    online: "En línea",
    offline: "Sin conexión",
    toolbar: "Filtros de biblioteca",
    search: "Buscar",
    searchPlaceholder: "Título, autor o descripción",
    formatAria: "Formato",
    allFormats: "Todos los formatos",
    prose: "Prosa",
    bookLanguageAria: "Idioma del libro",
    allBookLanguages: "Todos los idiomas",
    loadingCatalog: "Cargando catálogo",
    count: (visible, total) => `${visible} de ${total} libros`,
    generatedAt: date => `Generado ${date}`,
    noBooks: "No se encontraron libros.",
    noDescription: "Sin descripción disponible.",
    coverOf: title => `Portada de ${title}`,
    read: "Leer",
    download: "Descargar",
    removeDownload: "Eliminar descarga",
    saveForLater: "Guardar para después",
    removeFromWishlist: "Eliminar de la lista",
    downloading: "Descargando",
    downloaded: "Offline",
    viewCatalog: "Catálogo",
    viewDownloaded: "Descargados",
    viewWishlist: "Lista",
    seriesPrefix: "Serie",
    seriesCount: count => `${count} libros`,
    backToLibrary: "← Biblioteca",
    bookPlaceholder: "Libro",
    previous: "Anterior",
    next: "Siguiente",
    chapterBlank: "<p>Este capítulo está en blanco.</p>",
    loadCatalogError: "No se pudo cargar el catálogo.",
    networkFallbackError: "Sin conexión y sin copia offline disponible.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} de ${total} descargados`;
      if (mode === "wishlist") return `${visible} de ${total} guardados`;
      return `${visible} de ${total} libros`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "No se encontraron libros descargados.";
      if (mode === "wishlist") return "No se encontraron libros guardados.";
      return "No se encontraron libros.";
    }
  },
  fr: {
    nav: "Navigation",
    refresh: "Actualiser le catalogue",
    install: "Installer",
    uiShort: "UI",
    interfaceLanguage: "Langue de l'interface",
    eyebrow: "Catalogue public",
    heading: "Lecture hors ligne pour la bibliothèque AI(2)M(2)IA",
    syncing: "Synchronisation",
    online: "En ligne",
    offline: "Hors ligne",
    toolbar: "Filtres de la bibliothèque",
    search: "Rechercher",
    searchPlaceholder: "Titre, auteur ou description",
    formatAria: "Format",
    allFormats: "Tous les formats",
    prose: "Prose",
    bookLanguageAria: "Langue du livre",
    allBookLanguages: "Toutes les langues",
    loadingCatalog: "Chargement du catalogue",
    count: (visible, total) => `${visible} sur ${total} livres`,
    generatedAt: date => `Généré ${date}`,
    noBooks: "Aucun livre trouvé.",
    noDescription: "Aucune description disponible.",
    coverOf: title => `Couverture de ${title}`,
    read: "Lire",
    download: "Télécharger",
    removeDownload: "Supprimer le téléchargement",
    saveForLater: "Enregistrer pour plus tard",
    removeFromWishlist: "Retirer de la liste",
    downloading: "Téléchargement",
    downloaded: "Hors ligne",
    viewCatalog: "Catalogue",
    viewDownloaded: "Téléchargés",
    viewWishlist: "Liste",
    seriesPrefix: "Série",
    seriesCount: count => `${count} livres`,
    backToLibrary: "← Bibliothèque",
    bookPlaceholder: "Livre",
    previous: "Précédent",
    next: "Suivant",
    chapterBlank: "<p>Ce chapitre est vide.</p>",
    loadCatalogError: "Impossible de charger le catalogue.",
    networkFallbackError: "Aucune connexion réseau et aucune copie hors ligne disponible.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} sur ${total} téléchargés`;
      if (mode === "wishlist") return `${visible} sur ${total} enregistrés`;
      return `${visible} sur ${total} livres`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Aucun livre téléchargé trouvé.";
      if (mode === "wishlist") return "Aucun livre enregistré trouvé.";
      return "Aucun livre trouvé.";
    }
  },
  it: {
    nav: "Navigazione",
    refresh: "Aggiorna catalogo",
    install: "Installa",
    uiShort: "UI",
    interfaceLanguage: "Lingua dell'interfaccia",
    eyebrow: "Catalogo pubblico",
    heading: "Lettura offline per la biblioteca AI(2)M(2)IA",
    syncing: "Sincronizzazione",
    online: "Online",
    offline: "Offline",
    toolbar: "Filtri della biblioteca",
    search: "Cerca",
    searchPlaceholder: "Titolo, autore o descrizione",
    formatAria: "Formato",
    allFormats: "Tutti i formati",
    prose: "Prosa",
    bookLanguageAria: "Lingua del libro",
    allBookLanguages: "Tutte le lingue",
    loadingCatalog: "Caricamento catalogo",
    count: (visible, total) => `${visible} di ${total} libri`,
    generatedAt: date => `Generato ${date}`,
    noBooks: "Nessun libro trovato.",
    noDescription: "Nessuna descrizione disponibile.",
    coverOf: title => `Copertina di ${title}`,
    read: "Leggi",
    download: "Scarica",
    removeDownload: "Rimuovi download",
    saveForLater: "Salva per dopo",
    removeFromWishlist: "Rimuovi dalla lista",
    downloading: "Scaricamento",
    downloaded: "Offline",
    viewCatalog: "Catalogo",
    viewDownloaded: "Scaricati",
    viewWishlist: "Lista",
    seriesPrefix: "Serie",
    seriesCount: count => `${count} libri`,
    backToLibrary: "← Biblioteca",
    bookPlaceholder: "Libro",
    previous: "Precedente",
    next: "Successivo",
    chapterBlank: "<p>Questo capitolo è vuoto.</p>",
    loadCatalogError: "Impossibile caricare il catalogo.",
    networkFallbackError: "Nessuna connessione di rete e nessuna copia offline disponibile.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} di ${total} scaricati`;
      if (mode === "wishlist") return `${visible} di ${total} salvati`;
      return `${visible} di ${total} libri`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Nessun libro scaricato trovato.";
      if (mode === "wishlist") return "Nessun libro salvato trovato.";
      return "Nessun libro trovato.";
    }
  },
  de: {
    nav: "Navigation",
    refresh: "Katalog aktualisieren",
    install: "Installieren",
    uiShort: "UI",
    interfaceLanguage: "Oberflächensprache",
    eyebrow: "Öffentlicher Katalog",
    heading: "Offline-Lesen für die AI(2)M(2)IA-Bibliothek",
    syncing: "Synchronisierung",
    online: "Online",
    offline: "Offline",
    toolbar: "Bibliotheksfilter",
    search: "Suchen",
    searchPlaceholder: "Titel, Autor oder Beschreibung",
    formatAria: "Format",
    allFormats: "Alle Formate",
    prose: "Prosa",
    bookLanguageAria: "Buchsprache",
    allBookLanguages: "Alle Sprachen",
    loadingCatalog: "Katalog wird geladen",
    count: (visible, total) => `${visible} von ${total} Büchern`,
    generatedAt: date => `Erstellt ${date}`,
    noBooks: "Keine Bücher gefunden.",
    noDescription: "Keine Beschreibung verfügbar.",
    coverOf: title => `Cover von ${title}`,
    read: "Lesen",
    download: "Herunterladen",
    removeDownload: "Download entfernen",
    saveForLater: "Für später speichern",
    removeFromWishlist: "Von der Liste entfernen",
    downloading: "Wird heruntergeladen",
    downloaded: "Offline",
    viewCatalog: "Katalog",
    viewDownloaded: "Heruntergeladen",
    viewWishlist: "Liste",
    seriesPrefix: "Serie",
    seriesCount: count => `${count} Bücher`,
    backToLibrary: "← Bibliothek",
    bookPlaceholder: "Buch",
    previous: "Zurück",
    next: "Weiter",
    chapterBlank: "<p>Dieses Kapitel ist leer.</p>",
    loadCatalogError: "Katalog konnte nicht geladen werden.",
    networkFallbackError: "Keine Netzwerkverbindung und keine Offline-Kopie verfügbar.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} von ${total} heruntergeladen`;
      if (mode === "wishlist") return `${visible} von ${total} gespeichert`;
      return `${visible} von ${total} Büchern`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Keine heruntergeladenen Bücher gefunden.";
      if (mode === "wishlist") return "Keine gespeicherten Bücher gefunden.";
      return "Keine Bücher gefunden.";
    }
  },
  pl: {
    nav: "Nawigacja",
    refresh: "Odśwież katalog",
    install: "Zainstaluj",
    uiShort: "UI",
    interfaceLanguage: "Język interfejsu",
    eyebrow: "Katalog publiczny",
    heading: "Czytanie offline dla biblioteki AI(2)M(2)IA",
    syncing: "Synchronizacja",
    online: "Online",
    offline: "Offline",
    toolbar: "Filtry biblioteki",
    search: "Szukaj",
    searchPlaceholder: "Tytuł, autor lub opis",
    formatAria: "Format",
    allFormats: "Wszystkie formaty",
    prose: "Proza",
    bookLanguageAria: "Język książki",
    allBookLanguages: "Wszystkie języki",
    loadingCatalog: "Ładowanie katalogu",
    count: (visible, total) => `${visible} z ${total} książek`,
    generatedAt: date => `Wygenerowano ${date}`,
    noBooks: "Nie znaleziono książek.",
    noDescription: "Brak opisu.",
    coverOf: title => `Okładka ${title}`,
    read: "Czytaj",
    download: "Pobierz",
    removeDownload: "Usuń pobranie",
    saveForLater: "Zapisz na później",
    removeFromWishlist: "Usuń z listy",
    downloading: "Pobieranie",
    downloaded: "Offline",
    viewCatalog: "Katalog",
    viewDownloaded: "Pobrane",
    viewWishlist: "Lista",
    seriesPrefix: "Seria",
    seriesCount: count => `${count} książek`,
    backToLibrary: "← Biblioteka",
    bookPlaceholder: "Książka",
    previous: "Poprzedni",
    next: "Następny",
    chapterBlank: "<p>Ten rozdział jest pusty.</p>",
    loadCatalogError: "Nie udało się załadować katalogu.",
    networkFallbackError: "Brak połączenia sieciowego i brak kopii offline.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} z ${total} pobranych`;
      if (mode === "wishlist") return `${visible} z ${total} zapisanych`;
      return `${visible} z ${total} książek`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Nie znaleziono pobranych książek.";
      if (mode === "wishlist") return "Nie znaleziono zapisanych książek.";
      return "Nie znaleziono książek.";
    }
  },
  tr: {
    nav: "Gezinti",
    refresh: "Kataloğu yenile",
    install: "Yükle",
    uiShort: "UI",
    interfaceLanguage: "Arayüz dili",
    eyebrow: "Genel katalog",
    heading: "AI(2)M(2)IA kütüphanesi için çevrimdışı okuma",
    syncing: "Senkronize ediliyor",
    online: "Çevrimiçi",
    offline: "Çevrimdışı",
    toolbar: "Kütüphane filtreleri",
    search: "Ara",
    searchPlaceholder: "Başlık, yazar veya açıklama",
    formatAria: "Biçim",
    allFormats: "Tüm biçimler",
    prose: "Düz yazı",
    bookLanguageAria: "Kitap dili",
    allBookLanguages: "Tüm diller",
    loadingCatalog: "Katalog yükleniyor",
    count: (visible, total) => `${total} kitaptan ${visible} tanesi`,
    generatedAt: date => `Oluşturulma ${date}`,
    noBooks: "Kitap bulunamadı.",
    noDescription: "Açıklama mevcut değil.",
    coverOf: title => `${title} kapağı`,
    read: "Oku",
    download: "İndir",
    removeDownload: "İndirmeyi kaldır",
    saveForLater: "Daha sonra okumak için kaydet",
    removeFromWishlist: "Listeden kaldır",
    downloading: "İndiriliyor",
    downloaded: "Çevrimdışı",
    viewCatalog: "Katalog",
    viewDownloaded: "İndirilenler",
    viewWishlist: "Liste",
    seriesPrefix: "Seri",
    seriesCount: count => `${count} kitap`,
    backToLibrary: "← Kütüphane",
    bookPlaceholder: "Kitap",
    previous: "Önceki",
    next: "Sonraki",
    chapterBlank: "<p>Bu bölüm boş.</p>",
    loadCatalogError: "Katalog yüklenemedi.",
    networkFallbackError: "Ağ bağlantısı yok ve çevrimdışı kopya mevcut değil.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${total} indirmenin ${visible} tanesi`;
      if (mode === "wishlist") return `${total} kayıtlıdan ${visible} tanesi`;
      return `${total} kitaptan ${visible} tanesi`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "İndirilmiş kitap bulunamadı.";
      if (mode === "wishlist") return "Kayıtlı kitap bulunamadı.";
      return "Kitap bulunamadı.";
    }
  },
  ru: {
    nav: "Навигация",
    refresh: "Обновить каталог",
    install: "Установить",
    uiShort: "UI",
    interfaceLanguage: "Язык интерфейса",
    eyebrow: "Публичный каталог",
    heading: "Чтение офлайн для библиотеки AI(2)M(2)IA",
    syncing: "Синхронизация",
    online: "В сети",
    offline: "Не в сети",
    toolbar: "Фильтры библиотеки",
    search: "Поиск",
    searchPlaceholder: "Название, автор или описание",
    formatAria: "Формат",
    allFormats: "Все форматы",
    prose: "Проза",
    bookLanguageAria: "Язык книги",
    allBookLanguages: "Все языки",
    loadingCatalog: "Загрузка каталога",
    count: (visible, total) => `${visible} из ${total} книг`,
    generatedAt: date => `Создано ${date}`,
    noBooks: "Книги не найдены.",
    noDescription: "Описание недоступно.",
    coverOf: title => `Обложка ${title}`,
    read: "Читать",
    download: "Скачать",
    removeDownload: "Удалить загрузку",
    saveForLater: "Сохранить на потом",
    removeFromWishlist: "Удалить из списка",
    downloading: "Загрузка",
    downloaded: "Офлайн",
    viewCatalog: "Каталог",
    viewDownloaded: "Загруженные",
    viewWishlist: "Список",
    seriesPrefix: "Серия",
    seriesCount: count => `${count} книг`,
    backToLibrary: "← Библиотека",
    bookPlaceholder: "Книга",
    previous: "Назад",
    next: "Далее",
    chapterBlank: "<p>Эта глава пуста.</p>",
    loadCatalogError: "Не удалось загрузить каталог.",
    networkFallbackError: "Нет подключения к сети и нет доступной офлайн-копии.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} из ${total} загруженных`;
      if (mode === "wishlist") return `${visible} из ${total} сохранённых`;
      return `${visible} из ${total} книг`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Загруженные книги не найдены.";
      if (mode === "wishlist") return "Сохранённые книги не найдены.";
      return "Книги не найдены.";
    }
  },
  id: {
    nav: "Navigasi",
    refresh: "Segarkan katalog",
    install: "Pasang",
    uiShort: "UI",
    interfaceLanguage: "Bahasa antarmuka",
    eyebrow: "Katalog publik",
    heading: "Bacaan offline untuk perpustakaan AI(2)M(2)IA",
    syncing: "Menyinkronkan",
    online: "Daring",
    offline: "Luring",
    toolbar: "Filter perpustakaan",
    search: "Cari",
    searchPlaceholder: "Judul, penulis, atau deskripsi",
    formatAria: "Format",
    allFormats: "Semua format",
    prose: "Prosa",
    bookLanguageAria: "Bahasa buku",
    allBookLanguages: "Semua bahasa buku",
    loadingCatalog: "Memuat katalog",
    count: (visible, total) => `${visible} dari ${total} buku`,
    generatedAt: date => `Dibuat pada ${date}`,
    noBooks: "Tidak ada buku yang ditemukan.",
    noDescription: "Tidak ada deskripsi yang tersedia.",
    coverOf: title => `Sampul ${title}`,
    read: "Baca",
    download: "Unduh",
    removeDownload: "Hapus unduhan",
    saveForLater: "Simpan untuk nanti",
    removeFromWishlist: "Hapus dari daftar keinginan",
    downloading: "Mengunduh",
    downloaded: "Offline",
    viewCatalog: "Katalog",
    viewDownloaded: "Diunduh",
    viewWishlist: "Daftar Keinginan",
    seriesPrefix: "Seri",
    seriesCount: count => `${count} buku`,
    backToLibrary: "← Perpustakaan",
    bookPlaceholder: "Buku",
    previous: "Sebelumnya",
    next: "Berikutnya",
    chapterBlank: "<p>Bab ini kosong.</p>",
    loadCatalogError: "Tidak dapat memuat katalog.",
    networkFallbackError: "Tidak ada koneksi jaringan dan tidak ada salinan offline yang tersedia.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} dari ${total} diunduh`;
      if (mode === "wishlist") return `${visible} dari ${total} disimpan`;
      return `${visible} dari ${total} buku`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Tidak ada buku yang diunduh.";
      if (mode === "wishlist") return "Tidak ada buku yang disimpan.";
      return "Tidak ada buku yang ditemukan.";
    }
  },
  vi: {
    nav: "Điều hướng",
    refresh: "Làm mới danh mục",
    install: "Cài đặt",
    uiShort: "UI",
    interfaceLanguage: "Ngôn ngữ giao diện",
    eyebrow: "Danh mục công khai",
    heading: "Đọc ngoại tuyến cho thư viện AI(2)M(2)IA",
    syncing: "Đang đồng bộ",
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    toolbar: "Bộ lọc thư viện",
    search: "Tìm kiếm",
    searchPlaceholder: "Tiêu đề, tác giả hoặc mô tả",
    formatAria: "Định dạng",
    allFormats: "Tất cả định dạng",
    prose: "Văn xuôi",
    bookLanguageAria: "Ngôn ngữ sách",
    allBookLanguages: "Tất cả ngôn ngữ sách",
    loadingCatalog: "Đang tải danh mục",
    count: (visible, total) => `${visible} trên ${total} cuốn sách`,
    generatedAt: date => `Tạo vào ${date}`,
    noBooks: "Không tìm thấy cuốn sách nào.",
    noDescription: "Không có mô tả.",
    coverOf: title => `Bìa ${title}`,
    read: "Đọc",
    download: "Tải xuống",
    removeDownload: "Xóa bản tải",
    saveForLater: "Lưu để đọc sau",
    removeFromWishlist: "Xóa khỏi danh sách yêu thích",
    downloading: "Đang tải xuống",
    downloaded: "Ngoại tuyến",
    viewCatalog: "Danh mục",
    viewDownloaded: "Đã tải",
    viewWishlist: "Yêu thích",
    seriesPrefix: "Bộ sách",
    seriesCount: count => `${count} cuốn`,
    backToLibrary: "← Thư viện",
    bookPlaceholder: "Sách",
    previous: "Trước",
    next: "Tiếp",
    chapterBlank: "<p>Chương này trống.</p>",
    loadCatalogError: "Không thể tải danh mục.",
    networkFallbackError: "Không có kết nối mạng và không có bản sao ngoại tuyến.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} trên ${total} đã tải`;
      if (mode === "wishlist") return `${visible} trên ${total} đã lưu`;
      return `${visible} trên ${total} cuốn sách`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Không tìm thấy sách đã tải.";
      if (mode === "wishlist") return "Không tìm thấy sách đã lưu.";
      return "Không tìm thấy cuốn sách nào.";
    }
  },
  fil: {
    nav: "Nabigasyon",
    refresh: "I-refresh ang katalogo",
    install: "I-install",
    uiShort: "UI",
    interfaceLanguage: "Wika ng interface",
    eyebrow: "Pampublikong katalogo",
    heading: "Offline na pagbabasa para sa aklatan ng AI(2)M(2)IA",
    syncing: "Nagse-sync",
    online: "Online",
    offline: "Offline",
    toolbar: "Mga filter ng aklatan",
    search: "Maghanap",
    searchPlaceholder: "Pamagat, may-akda, o paglalarawan",
    formatAria: "Format",
    allFormats: "Lahat ng format",
    prose: "Prosa",
    bookLanguageAria: "Wika ng aklat",
    allBookLanguages: "Lahat ng wika ng aklat",
    loadingCatalog: "Nilo-load ang katalogo",
    count: (visible, total) => `${visible} sa ${total} aklat`,
    generatedAt: date => `Ginawa noong ${date}`,
    noBooks: "Walang nahanap na aklat.",
    noDescription: "Walang available na paglalarawan.",
    coverOf: title => `Pabalat ng ${title}`,
    read: "Basahin",
    download: "I-download",
    removeDownload: "Alisin ang download",
    saveForLater: "I-save para mamaya",
    removeFromWishlist: "Alisin sa wishlist",
    downloading: "Nagda-download",
    downloaded: "Offline",
    viewCatalog: "Katalogo",
    viewDownloaded: "Na-download",
    viewWishlist: "Wishlist",
    seriesPrefix: "Serye",
    seriesCount: count => `${count} aklat`,
    backToLibrary: "← Aklatan",
    bookPlaceholder: "Aklat",
    previous: "Nakaraan",
    next: "Susunod",
    chapterBlank: "<p>Blangko ang kabanatang ito.</p>",
    loadCatalogError: "Hindi ma-load ang katalogo.",
    networkFallbackError: "Walang koneksyon sa network at walang available na offline na kopya.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} sa ${total} na-download`;
      if (mode === "wishlist") return `${visible} sa ${total} na-save`;
      return `${visible} sa ${total} aklat`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "Walang nahanap na na-download na aklat.";
      if (mode === "wishlist") return "Walang nahanap na na-save na aklat.";
      return "Walang nahanap na aklat.";
    }
  },
  th: {
    nav: "การนำทาง",
    refresh: "รีเฟรชแค็ตตาล็อก",
    install: "ติดตั้ง",
    uiShort: "UI",
    interfaceLanguage: "ภาษาอินเทอร์เฟซ",
    eyebrow: "แค็ตตาล็อกสาธารณะ",
    heading: "อ่านออฟไลน์สำหรับห้องสมุด AI(2)M(2)IA",
    syncing: "กำลังซิงค์",
    online: "ออนไลน์",
    offline: "ออฟไลน์",
    toolbar: "ตัวกรองห้องสมุด",
    search: "ค้นหา",
    searchPlaceholder: "ชื่อเรื่อง ผู้แต่ง หรือคำอธิบาย",
    formatAria: "รูปแบบ",
    allFormats: "ทุกรูปแบบ",
    prose: "ร้อยแก้ว",
    bookLanguageAria: "ภาษาของหนังสือ",
    allBookLanguages: "ทุกภาษาของหนังสือ",
    loadingCatalog: "กำลังโหลดแค็ตตาล็อก",
    count: (visible, total) => `${visible} จาก ${total} เล่ม`,
    generatedAt: date => `สร้างเมื่อ ${date}`,
    noBooks: "ไม่พบหนังสือ",
    noDescription: "ไม่มีคำอธิบาย",
    coverOf: title => `ปก ${title}`,
    read: "อ่าน",
    download: "ดาวน์โหลด",
    removeDownload: "ลบการดาวน์โหลด",
    saveForLater: "บันทึกไว้อ่านทีหลัง",
    removeFromWishlist: "ลบจากรายการที่อยากอ่าน",
    downloading: "กำลังดาวน์โหลด",
    downloaded: "ออฟไลน์",
    viewCatalog: "แค็ตตาล็อก",
    viewDownloaded: "ดาวน์โหลดแล้ว",
    viewWishlist: "รายการที่อยากอ่าน",
    seriesPrefix: "ซีรีส์",
    seriesCount: count => `${count} เล่ม`,
    backToLibrary: "← ห้องสมุด",
    bookPlaceholder: "หนังสือ",
    previous: "ก่อนหน้า",
    next: "ถัดไป",
    chapterBlank: "<p>บทนี้ว่างเปล่า</p>",
    loadCatalogError: "ไม่สามารถโหลดแค็ตตาล็อกได้",
    networkFallbackError: "ไม่มีการเชื่อมต่อเครือข่ายและไม่มีสำเนาออฟไลน์",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} จาก ${total} ดาวน์โหลดแล้ว`;
      if (mode === "wishlist") return `${visible} จาก ${total} บันทึกแล้ว`;
      return `${visible} จาก ${total} เล่ม`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "ไม่พบหนังสือที่ดาวน์โหลดแล้ว";
      if (mode === "wishlist") return "ไม่พบหนังสือที่บันทึกไว้";
      return "ไม่พบหนังสือ";
    }
  },
  ja: {
    nav: "ナビゲーション",
    refresh: "カタログを更新",
    install: "インストール",
    uiShort: "UI",
    interfaceLanguage: "インターフェース言語",
    eyebrow: "公開カタログ",
    heading: "AI(2)M(2)IA ライブラリのオフライン読書",
    syncing: "同期中",
    online: "オンライン",
    offline: "オフライン",
    toolbar: "ライブラリフィルター",
    search: "検索",
    searchPlaceholder: "タイトル、著者、または説明",
    formatAria: "形式",
    allFormats: "すべての形式",
    prose: "散文",
    bookLanguageAria: "書籍の言語",
    allBookLanguages: "すべての書籍言語",
    loadingCatalog: "カタログを読み込み中",
    count: (visible, total) => `${total}冊中${visible}冊`,
    generatedAt: date => `生成日: ${date}`,
    noBooks: "書籍が見つかりません。",
    noDescription: "説明はありません。",
    coverOf: title => `${title}の表紙`,
    read: "読む",
    download: "ダウンロード",
    removeDownload: "ダウンロードを削除",
    saveForLater: "あとで読む",
    removeFromWishlist: "ほしい物リストから削除",
    downloading: "ダウンロード中",
    downloaded: "オフライン",
    viewCatalog: "カタログ",
    viewDownloaded: "ダウンロード済み",
    viewWishlist: "ほしい物リスト",
    seriesPrefix: "シリーズ",
    seriesCount: count => `${count}冊`,
    backToLibrary: "← ライブラリ",
    bookPlaceholder: "書籍",
    previous: "前へ",
    next: "次へ",
    chapterBlank: "<p>この章は空白です。</p>",
    loadCatalogError: "カタログを読み込めませんでした。",
    networkFallbackError: "ネットワーク接続がなく、オフラインのコピーもありません。",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `ダウンロード済み: ${total}件中${visible}件`;
      if (mode === "wishlist") return `保存済み: ${total}件中${visible}件`;
      return `${total}冊中${visible}冊`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "ダウンロード済みの書籍が見つかりません。";
      if (mode === "wishlist") return "保存済みの書籍が見つかりません。";
      return "書籍が見つかりません。";
    }
  },
  "zh-CN": {
    nav: "导航",
    refresh: "刷新目录",
    install: "安装",
    uiShort: "界面",
    interfaceLanguage: "界面语言",
    eyebrow: "公开目录",
    heading: "AI(2)M(2)IA 文库离线阅读",
    syncing: "同步中",
    online: "在线",
    offline: "离线",
    toolbar: "文库筛选",
    search: "搜索",
    searchPlaceholder: "书名、作者或简介",
    formatAria: "格式",
    allFormats: "所有格式",
    prose: "散文",
    bookLanguageAria: "书籍语言",
    allBookLanguages: "所有书籍语言",
    loadingCatalog: "正在加载目录",
    count: (visible, total) => `${visible} / ${total} 本`,
    generatedAt: date => `生成于 ${date}`,
    noBooks: "未找到书籍。",
    noDescription: "暂无简介。",
    coverOf: title => `${title} 的封面`,
    read: "阅读",
    download: "下载",
    removeDownload: "移除下载",
    saveForLater: "稍后阅读",
    removeFromWishlist: "从愿望单移除",
    downloading: "下载中",
    downloaded: "离线",
    viewCatalog: "目录",
    viewDownloaded: "已下载",
    viewWishlist: "愿望单",
    seriesPrefix: "系列",
    seriesCount: count => `${count} 本`,
    backToLibrary: "← 文库",
    bookPlaceholder: "书籍",
    previous: "上一章",
    next: "下一章",
    chapterBlank: "<p>本章为空白。</p>",
    loadCatalogError: "无法加载目录。",
    networkFallbackError: "无网络连接且无可用离线副本。",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `已下载: ${visible} / ${total}`;
      if (mode === "wishlist") return `已保存: ${visible} / ${total}`;
      return `${visible} / ${total} 本`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "未找到已下载的书籍。";
      if (mode === "wishlist") return "未找到已保存的书籍。";
      return "未找到书籍。";
    }
  },
  "zh-TW": {
    nav: "導覽",
    refresh: "重新整理目錄",
    install: "安裝",
    uiShort: "介面",
    interfaceLanguage: "介面語言",
    eyebrow: "公開目錄",
    heading: "AI(2)M(2)IA 文庫離線閱讀",
    syncing: "同步中",
    online: "線上",
    offline: "離線",
    toolbar: "文庫篩選",
    search: "搜尋",
    searchPlaceholder: "書名、作者或簡介",
    formatAria: "格式",
    allFormats: "所有格式",
    prose: "散文",
    bookLanguageAria: "書籍語言",
    allBookLanguages: "所有書籍語言",
    loadingCatalog: "正在載入目錄",
    count: (visible, total) => `${visible} / ${total} 本`,
    generatedAt: date => `產生於 ${date}`,
    noBooks: "未找到書籍。",
    noDescription: "暫無簡介。",
    coverOf: title => `${title} 的封面`,
    read: "閱讀",
    download: "下載",
    removeDownload: "移除下載",
    saveForLater: "稍後閱讀",
    removeFromWishlist: "從願望清單移除",
    downloading: "下載中",
    downloaded: "離線",
    viewCatalog: "目錄",
    viewDownloaded: "已下載",
    viewWishlist: "願望清單",
    seriesPrefix: "系列",
    seriesCount: count => `${count} 本`,
    backToLibrary: "← 文庫",
    bookPlaceholder: "書籍",
    previous: "上一章",
    next: "下一章",
    chapterBlank: "<p>本章為空白。</p>",
    loadCatalogError: "無法載入目錄。",
    networkFallbackError: "無網路連線且無可用離線副本。",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `已下載: ${visible} / ${total}`;
      if (mode === "wishlist") return `已儲存: ${visible} / ${total}`;
      return `${visible} / ${total} 本`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "未找到已下載的書籍。";
      if (mode === "wishlist") return "未找到已儲存的書籍。";
      return "未找到書籍。";
    }
  },
  yue: {
    nav: "導覽",
    refresh: "重新載入目錄",
    install: "安裝",
    uiShort: "介面",
    interfaceLanguage: "介面語言",
    eyebrow: "公開目錄",
    heading: "AI(2)M(2)IA 書庫離線閱讀",
    syncing: "同步緊",
    online: "線上",
    offline: "離線",
    toolbar: "書庫篩選",
    search: "搜尋",
    searchPlaceholder: "書名、作者或者描述",
    formatAria: "格式",
    allFormats: "所有格式",
    prose: "散文",
    bookLanguageAria: "書籍語言",
    allBookLanguages: "所有書籍語言",
    loadingCatalog: "載入目錄緊",
    count: (visible, total) => `${visible} / ${total} 本書`,
    generatedAt: date => `喺 ${date} 生成`,
    noBooks: "搵唔到書。",
    noDescription: "冇描述。",
    coverOf: title => `${title} 嘅封面`,
    read: "閱讀",
    download: "下載",
    removeDownload: "移除下載",
    saveForLater: "儲存遲啲睇",
    removeFromWishlist: "從心願單移除",
    downloading: "下載緊",
    downloaded: "離線",
    viewCatalog: "目錄",
    viewDownloaded: "已下載",
    viewWishlist: "心願單",
    seriesPrefix: "系列",
    seriesCount: count => `${count} 本書`,
    backToLibrary: "← 書庫",
    bookPlaceholder: "書",
    previous: "上一頁",
    next: "下一頁",
    chapterBlank: "<p>呢章係空白嘅。</p>",
    loadCatalogError: "無法載入目錄。",
    networkFallbackError: "冇網絡連線，亦冇離線副本。",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} / ${total} 已下載`;
      if (mode === "wishlist") return `${visible} / ${total} 已儲存`;
      return `${visible} / ${total} 本書`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "搵唔到已下載嘅書。";
      if (mode === "wishlist") return "搵唔到已儲存嘅書。";
      return "搵唔到書。";
    }
  },
  ko: {
    nav: "탐색",
    refresh: "카탈로그 새로고침",
    install: "설치",
    uiShort: "UI",
    interfaceLanguage: "인터페이스 언어",
    eyebrow: "공개 카탈로그",
    heading: "AI(2)M(2)IA 라이브러리 오프라인 읽기",
    syncing: "동기화 중",
    online: "온라인",
    offline: "오프라인",
    toolbar: "라이브러리 필터",
    search: "검색",
    searchPlaceholder: "제목, 저자 또는 설명",
    formatAria: "형식",
    allFormats: "모든 형식",
    prose: "산문",
    bookLanguageAria: "책 언어",
    allBookLanguages: "모든 책 언어",
    loadingCatalog: "카탈로그 로드 중",
    count: (visible, total) => `${total}권 중 ${visible}권`,
    generatedAt: date => `${date} 생성됨`,
    noBooks: "책을 찾을 수 없습니다.",
    noDescription: "설명 없음.",
    coverOf: title => `${title}의 표지`,
    read: "읽기",
    download: "다운로드",
    removeDownload: "다운로드 삭제",
    saveForLater: "나중에 읽기",
    removeFromWishlist: "위시리스트에서 제거",
    downloading: "다운로드 중",
    downloaded: "오프라인",
    viewCatalog: "카탈로그",
    viewDownloaded: "다운로드됨",
    viewWishlist: "위시리스트",
    seriesPrefix: "시리즈",
    seriesCount: count => `${count}권`,
    backToLibrary: "← 라이브러리",
    bookPlaceholder: "책",
    previous: "이전",
    next: "다음",
    chapterBlank: "<p>이 챕터는 비어 있습니다.</p>",
    loadCatalogError: "카탈로그를 로드할 수 없습니다.",
    networkFallbackError: "네트워크 연결이 없고 오프라인 사본도 없습니다.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `다운로드 ${total}권 중 ${visible}권`;
      if (mode === "wishlist") return `저장됨 ${total}권 중 ${visible}권`;
      return `${total}권 중 ${visible}권`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "다운로드된 책이 없습니다.";
      if (mode === "wishlist") return "저장된 책이 없습니다.";
      return "책을 찾을 수 없습니다.";
    }
  },
  hi: {
    nav: "नेविगेशन",
    refresh: "कैटलॉग रीफ्रेश करें",
    install: "इंस्टॉल",
    uiShort: "UI",
    interfaceLanguage: "इंटरफ़ेस भाषा",
    eyebrow: "सार्वजनिक कैटलॉग",
    heading: "AI(2)M(2)IA लाइब्रेरी ऑफ़लाइन पठन",
    syncing: "सिंक हो रहा है",
    online: "ऑनलाइन",
    offline: "ऑफ़लाइन",
    toolbar: "लाइब्रेरी फ़िल्टर",
    search: "खोजें",
    searchPlaceholder: "शीर्षक, लेखक या विवरण",
    formatAria: "प्रारूप",
    allFormats: "सभी प्रारूप",
    prose: "गद्य",
    bookLanguageAria: "पुस्तक भाषा",
    allBookLanguages: "सभी पुस्तक भाषाएँ",
    loadingCatalog: "कैटलॉग लोड हो रहा है",
    count: (visible, total) => `${total} में से ${visible} पुस्तकें`,
    generatedAt: date => `${date} को जनरेट किया गया`,
    noBooks: "कोई पुस्तक नहीं मिली।",
    noDescription: "कोई विवरण उपलब्ध नहीं।",
    coverOf: title => `${title} का कवर`,
    read: "पढ़ें",
    download: "डाउनलोड",
    removeDownload: "डाउनलोड हटाएँ",
    saveForLater: "बाद के लिए सहेजें",
    removeFromWishlist: "विशलिस्ट से हटाएँ",
    downloading: "डाउनलोड हो रहा है",
    downloaded: "ऑफ़लाइन",
    viewCatalog: "कैटलॉग",
    viewDownloaded: "डाउनलोड किए गए",
    viewWishlist: "विशलिस्ट",
    seriesPrefix: "श्रृंखला",
    seriesCount: count => `${count} पुस्तकें`,
    backToLibrary: "← लाइब्रेरी",
    bookPlaceholder: "पुस्तक",
    previous: "पिछला",
    next: "अगला",
    chapterBlank: "<p>यह अध्याय खाली है।</p>",
    loadCatalogError: "कैटलॉग लोड नहीं हो सका।",
    networkFallbackError: "कोई नेटवर्क कनेक्शन नहीं और कोई ऑफ़लाइन कॉपी उपलब्ध नहीं।",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${total} में से ${visible} डाउनलोड किए गए`;
      if (mode === "wishlist") return `${total} में से ${visible} सहेजे गए`;
      return `${total} में से ${visible} पुस्तकें`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "कोई डाउनलोड की गई पुस्तक नहीं मिली।";
      if (mode === "wishlist") return "कोई सहेजी गई पुस्तक नहीं मिली।";
      return "कोई पुस्तक नहीं मिली।";
    }
  },
  ur: {
    nav: "نیویگیشن",
    refresh: "کیٹلاگ ریفریش کریں",
    install: "انسٹال",
    uiShort: "UI",
    interfaceLanguage: "انٹرفیس کی زبان",
    eyebrow: "عوامی کیٹلاگ",
    heading: "AI(2)M(2)IA لائبریری آف لائن پڑھنا",
    syncing: "سنک ہو رہا ہے",
    online: "آن لائن",
    offline: "آف لائن",
    toolbar: "لائبریری فلٹرز",
    search: "تلاش",
    searchPlaceholder: "عنوان، مصنف یا تفصیل",
    formatAria: "فارمیٹ",
    allFormats: "تمام فارمیٹس",
    prose: "نثر",
    bookLanguageAria: "کتاب کی زبان",
    allBookLanguages: "تمام کتاب کی زبانیں",
    loadingCatalog: "کیٹلاگ لوڈ ہو رہا ہے",
    count: (visible, total) => `${total} میں سے ${visible} کتابیں`,
    generatedAt: date => `${date} کو تیار کیا گیا`,
    noBooks: "کوئی کتاب نہیں ملی۔",
    noDescription: "کوئی تفصیل دستیاب نہیں۔",
    coverOf: title => `${title} کا سرورق`,
    read: "پڑھیں",
    download: "ڈاؤن لوڈ",
    removeDownload: "ڈاؤن لوڈ ہٹائیں",
    saveForLater: "بعد کے لیے محفوظ کریں",
    removeFromWishlist: "وش لسٹ سے ہٹائیں",
    downloading: "ڈاؤن لوڈ ہو رہا ہے",
    downloaded: "آف لائن",
    viewCatalog: "کیٹلاگ",
    viewDownloaded: "ڈاؤن لوڈ شدہ",
    viewWishlist: "وش لسٹ",
    seriesPrefix: "سلسلہ",
    seriesCount: count => `${count} کتابیں`,
    backToLibrary: "→ لائبریری",
    bookPlaceholder: "کتاب",
    previous: "پچھلا",
    next: "اگلا",
    chapterBlank: "<p>یہ باب خالی ہے۔</p>",
    loadCatalogError: "کیٹلاگ لوڈ نہیں ہو سکا۔",
    networkFallbackError: "کوئی نیٹ ورک کنکشن نہیں اور کوئی آف لائن کاپی دستیاب نہیں۔",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${total} میں سے ${visible} ڈاؤن لوڈ شدہ`;
      if (mode === "wishlist") return `${total} میں سے ${visible} محفوظ شدہ`;
      return `${total} میں سے ${visible} کتابیں`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "کوئی ڈاؤن لوڈ شدہ کتاب نہیں ملی۔";
      if (mode === "wishlist") return "کوئی محفوظ شدہ کتاب نہیں ملی۔";
      return "کوئی کتاب نہیں ملی۔";
    }
  },
  ar: {
    nav: "التنقل",
    refresh: "تحديث الفهرس",
    install: "تثبيت",
    uiShort: "الواجهة",
    interfaceLanguage: "لغة الواجهة",
    eyebrow: "الفهرس العام",
    heading: "القراءة بدون إنترنت لمكتبة AI(2)M(2)IA",
    syncing: "جارٍ المزامنة",
    online: "متصل",
    offline: "غير متصل",
    toolbar: "عوامل تصفية المكتبة",
    search: "بحث",
    searchPlaceholder: "العنوان أو المؤلف أو الوصف",
    formatAria: "التنسيق",
    allFormats: "جميع التنسيقات",
    prose: "نثر",
    bookLanguageAria: "لغة الكتاب",
    allBookLanguages: "جميع لغات الكتب",
    loadingCatalog: "جارٍ تحميل الفهرس",
    count: (visible, total) => `${visible} من ${total} كتب`,
    generatedAt: date => `تم الإنشاء في ${date}`,
    noBooks: "لم يتم العثور على كتب.",
    noDescription: "لا يوجد وصف متاح.",
    coverOf: title => `غلاف ${title}`,
    read: "قراءة",
    download: "تنزيل",
    removeDownload: "إزالة التنزيل",
    saveForLater: "حفظ لوقت لاحق",
    removeFromWishlist: "إزالة من قائمة الأمنيات",
    downloading: "جارٍ التنزيل",
    downloaded: "غير متصل",
    viewCatalog: "الفهرس",
    viewDownloaded: "المنزّلة",
    viewWishlist: "قائمة الأمنيات",
    seriesPrefix: "سلسلة",
    seriesCount: count => `${count} كتب`,
    backToLibrary: "→ المكتبة",
    bookPlaceholder: "كتاب",
    previous: "السابق",
    next: "التالي",
    chapterBlank: "<p>هذا الفصل فارغ.</p>",
    loadCatalogError: "تعذر تحميل الفهرس.",
    networkFallbackError: "لا يوجد اتصال بالإنترنت ولا نسخة متاحة بدون إنترنت.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} من ${total} منزّلة`;
      if (mode === "wishlist") return `${visible} من ${total} محفوظة`;
      return `${visible} من ${total} كتب`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "لم يتم العثور على كتب منزّلة.";
      if (mode === "wishlist") return "لم يتم العثور على كتب محفوظة.";
      return "لم يتم العثور على كتب.";
    }
  },
  fa: {
    nav: "ناوبری",
    refresh: "بازخوانی فهرست",
    install: "نصب",
    uiShort: "رابطه",
    interfaceLanguage: "زبان رابط کاربری",
    eyebrow: "فهرست عمومی",
    heading: "مطالعه آفلاین کتابخانه AI(2)M(2)IA",
    syncing: "در حال همگام‌سازی",
    online: "آنلاین",
    offline: "آفلاین",
    toolbar: "فیلترهای کتابخانه",
    search: "جستجو",
    searchPlaceholder: "عنوان، نویسنده یا توضیحات",
    formatAria: "قالب",
    allFormats: "همه قالب‌ها",
    prose: "نثر",
    bookLanguageAria: "زبان کتاب",
    allBookLanguages: "همه زبان‌های کتاب",
    loadingCatalog: "در حال بارگذاری فهرست",
    count: (visible, total) => `${visible} از ${total} کتاب`,
    generatedAt: date => `ایجاد شده در ${date}`,
    noBooks: "کتابی یافت نشد.",
    noDescription: "توضیحی موجود نیست.",
    coverOf: title => `جلد ${title}`,
    read: "خواندن",
    download: "دانلود",
    removeDownload: "حذف دانلود",
    saveForLater: "ذخیره برای بعد",
    removeFromWishlist: "حذف از لیست علاقه‌مندی",
    downloading: "در حال دانلود",
    downloaded: "آفلاین",
    viewCatalog: "فهرست",
    viewDownloaded: "دانلود شده",
    viewWishlist: "لیست علاقه‌مندی",
    seriesPrefix: "مجموعه",
    seriesCount: count => `${count} کتاب`,
    backToLibrary: "→ کتابخانه",
    bookPlaceholder: "کتاب",
    previous: "قبلی",
    next: "بعدی",
    chapterBlank: "<p>این فصل خالی است.</p>",
    loadCatalogError: "بارگذاری فهرست امکان‌پذیر نیست.",
    networkFallbackError: "اتصال شبکه موجود نیست و نسخه آفلاین هم در دسترس نیست.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} از ${total} دانلود شده`;
      if (mode === "wishlist") return `${visible} از ${total} ذخیره شده`;
      return `${visible} از ${total} کتاب`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "کتاب دانلود شده‌ای یافت نشد.";
      if (mode === "wishlist") return "کتاب ذخیره شده‌ای یافت نشد.";
      return "کتابی یافت نشد.";
    }
  },
  he: {
    nav: "ניווט",
    refresh: "רענן קטלוג",
    install: "התקן",
    uiShort: "ממשק",
    interfaceLanguage: "שפת ממשק",
    eyebrow: "קטלוג ציבורי",
    heading: "קריאה לא מקוונת לספריית AI(2)M(2)IA",
    syncing: "מסנכרן",
    online: "מחובר",
    offline: "לא מחובר",
    toolbar: "מסנני ספרייה",
    search: "חיפוש",
    searchPlaceholder: "כותרת, מחבר או תיאור",
    formatAria: "פורמט",
    allFormats: "כל הפורמטים",
    prose: "פרוזה",
    bookLanguageAria: "שפת הספר",
    allBookLanguages: "כל שפות הספרים",
    loadingCatalog: "טוען קטלוג",
    count: (visible, total) => `${visible} מתוך ${total} ספרים`,
    generatedAt: date => `נוצר ב-${date}`,
    noBooks: "לא נמצאו ספרים.",
    noDescription: "אין תיאור זמין.",
    coverOf: title => `כריכת ${title}`,
    read: "קרא",
    download: "הורד",
    removeDownload: "הסר הורדה",
    saveForLater: "שמור לאחר כך",
    removeFromWishlist: "הסר מרשימת המשאלות",
    downloading: "מוריד",
    downloaded: "לא מחובר",
    viewCatalog: "קטלוג",
    viewDownloaded: "הורדו",
    viewWishlist: "רשימת משאלות",
    seriesPrefix: "סדרה",
    seriesCount: count => `${count} ספרים`,
    backToLibrary: "→ ספרייה",
    bookPlaceholder: "ספר",
    previous: "הקודם",
    next: "הבא",
    chapterBlank: "<p>פרק זה ריק.</p>",
    loadCatalogError: "לא ניתן לטעון את הקטלוג.",
    networkFallbackError: "אין חיבור לרשת ואין עותק לא מקוון זמין.",
    booksCountForMode: (mode, visible, total) => {
      if (mode === "downloaded") return `${visible} מתוך ${total} הורדו`;
      if (mode === "wishlist") return `${visible} מתוך ${total} נשמרו`;
      return `${visible} מתוך ${total} ספרים`;
    },
    noBooksForMode: mode => {
      if (mode === "downloaded") return "לא נמצאו ספרים שהורדו.";
      if (mode === "wishlist") return "לא נמצאו ספרים שנשמרו.";
      return "לא נמצאו ספרים.";
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
  populateUiLanguageOptions();
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
    nodes.bookGrid.append(renderBookCard(standalone, downloaded, wishlist));
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
      volumeGrid.append(renderBookCard(volume, downloaded, wishlist));
    }
    header.append(summary, volumeGrid);
    section.append(header);
    nodes.bookGrid.append(section);
  }
}

function renderBookCard(book, downloaded, wishlist) {
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
    const results = await Promise.allSettled(urls.map(url => 
      fetch(url).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return cache.put(url, response);
      })
    ));
    
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length > 0) {
      console.warn(`Failed to cache ${failed.length}/${urls.length} assets for ${book.title}`);
      button.textContent = t().download;
      button.disabled = false;
      button.classList.remove("cached");
      return;
    }
    
    const downloaded = getDownloaded();
    downloaded.add(book.id);
    saveDownloaded(downloaded);
    button.classList.add("cached");
    button.textContent = t().downloaded;
    button.disabled = true;
    renderLibrary();
  } catch (error) {
    console.error(`Download failed for ${book.title}:`, error);
    button.textContent = t().download;
    button.disabled = false;
    button.classList.remove("cached");
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

/**
 * Converts plain text to HTML with basic markdown formatting.
 * 
 * SECURITY: This function uses a "sanitize first, then format" approach.
 * The input text is escaped via escapeHtml() BEFORE any markdown processing.
 * This prevents XSS attacks by ensuring all user content is neutralized before
 * HTML tags are added.
 * 
 * IMPORTANT: Do NOT modify the order of operations. The escapeHtml() call MUST
 * happen before inlineMarkdown() to prevent injection attacks. If you need to
 * support additional markdown features, ensure they don't introduce raw HTML
 * that could bypass the sanitization.
 */
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
  return SUPPORTED_UI_LANGUAGES.includes(value) ? value : DEFAULT_UI_LANGUAGE;
}

function readUiLanguage() {
  return normalizeUiLanguage(localStorage.getItem(UI_LANGUAGE_KEY) || DEFAULT_UI_LANGUAGE);
}

function saveUiLanguage(value) {
  localStorage.setItem(UI_LANGUAGE_KEY, value);
}

function applyUiStrings() {
  const strings = t();
  document.documentElement.lang = state.uiLanguage;
  document.documentElement.dir = RTL_LANGUAGES.has(state.uiLanguage) ? "rtl" : "ltr";
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

function populateUiLanguageOptions() {
  const selected = nodes.uiLanguage.value || DEFAULT_UI_LANGUAGE;
  nodes.uiLanguage.textContent = "";
  for (const language of SUPPORTED_UI_LANGUAGES) {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = UI_LANGUAGE_LABELS[language] || language;
    nodes.uiLanguage.append(option);
  }
  nodes.uiLanguage.value = SUPPORTED_UI_LANGUAGES.includes(selected) ? selected : DEFAULT_UI_LANGUAGE;
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
