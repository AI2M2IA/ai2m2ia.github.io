(() => {
  const SOURCES_ENDPOINT = 'data/sources.json';
  const container = document.getElementById('sources-container');

  if (!container) return;

  const esc = typeof window.sanitize?.escapeHtml === 'function'
    ? window.sanitize.escapeHtml
    : (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const safeLink = typeof window.sanitize?.safeUrl === 'function'
    ? (value) => window.sanitize.safeUrl(value, { external: true })
    : (value) => String(value ?? '');

  (async function renderSources() {
    try {
      const response = await fetch(SOURCES_ENDPOINT);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const sources = Array.isArray(payload.sources) ? payload.sources : [];

      if (!sources.length) {
        container.innerHTML = '<p class="sources-empty">No sources found.</p>';
        return;
      }

      container.innerHTML = sources.map((source) => {
        const link = source.url
          ? `<a class="source-link" href="${esc(safeLink(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.url)}</a>`
          : '';

        return `
          <div class="source-item">
            <p class="source-label">${esc(source.label || 'Source')}</p>
            <p class="source-type">${esc(source.type || 'source')}</p>
            <p class="source-note">${esc(source.note || 'No note provided')}</p>
            ${link}
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = '<p class="sources-error">Unable to load source references.</p>';
      console.error('[AI2M2IA] Failed to load sources:', err);
    }
  }());
})();
