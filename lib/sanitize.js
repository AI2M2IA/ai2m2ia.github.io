/**
 * Shared sanitization helpers used by site + PWA.
 */
(function (global) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function resolveBaseUrl(baseUrl) {
    if (typeof baseUrl === 'string' && baseUrl) return baseUrl;
    if (typeof window === 'undefined' || !window.location) return '';
    return window.location.href;
  }

  function safeUrl(value, { external = false, baseUrl } = {}) {
    const origin = typeof window === 'undefined'
      ? (baseUrl ? new URL(baseUrl).origin : null)
      : window.location.origin;
    const resolvedBaseUrl = resolveBaseUrl(baseUrl);
    if (!value) return '';

    try {
      const url = new URL(value, resolvedBaseUrl || undefined);
      if (!['http:', 'https:'].includes(url.protocol)) return '#';
      if (!external && origin && url.origin !== origin) return '#';
      return value;
    } catch (_) {
      return '#';
    }
  }

  function safeMediaId(value) {
    return /^[A-Za-z0-9_-]+$/.test(String(value || '')) ? String(value) : '';
  }

  const sanitize = {
    escapeHtml,
    safeUrl,
    safeMediaId,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = sanitize;
  }

  global.escapeHtml = global.escapeHtml || escapeHtml;
  global.safeUrl = global.safeUrl || safeUrl;
  global.safeMediaId = global.safeMediaId || safeMediaId;
  global.sanitize = sanitize;
})(typeof window !== 'undefined' ? window : globalThis);
