const assert = require('node:assert/strict');
const test = require('node:test');

const { escapeHtml, safeMediaId, safeUrl } = require('../lib/sanitize.js');

const TEST_PAGE_URL = 'https://ai2m2ia.test/';

function testSafeUrl(value, options) {
  return safeUrl(value, { ...(options || {}), baseUrl: TEST_PAGE_URL });
}

function isSafeYouTubeId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || ''));
}

function isSafeTikTokId(value) {
  return /^\d{15,20}$/.test(String(value || ''));
}

function renderProse(text) {
  if (!text.trim()) return '';
  return text.split(/\n\s*\n+/).map(block => {
    const clean = escapeHtml(block.trim());
    if (!clean) return '';
    if (clean.startsWith('&gt;')) return `<blockquote>${inlineMarkdown(clean.replace(/^&gt;\s*/, ''))}</blockquote>`;
    if (clean.startsWith('### ')) return `<h3>${inlineMarkdown(clean.slice(4))}</h3>`;
    if (clean.startsWith('## ')) return `<h2>${inlineMarkdown(clean.slice(3))}</h2>`;
    return `<p>${inlineMarkdown(clean).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

test('escapeHtml escapes all dangerous characters', () => {
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('<'), '&lt;');
  assert.equal(escapeHtml('>'), '&gt;');
  assert.equal(escapeHtml('"'), '&quot;');
  assert.equal(escapeHtml("'"), '&#039;');
});

test('escapeHtml handles multiple dangerous characters', () => {
  assert.equal(
    escapeHtml('<script>alert("XSS")</script>'),
    '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
  );
});

test('escapeHtml handles null and undefined', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml preserves safe strings', () => {
  assert.equal(escapeHtml('Hello World'), 'Hello World');
  assert.equal(escapeHtml('AI(2)M(2)IA'), 'AI(2)M(2)IA');
  assert.equal(escapeHtml('123'), '123');
});

test('escapeHtml handles empty string', () => {
  assert.equal(escapeHtml(''), '');
});

test('escapeHtml handles numbers', () => {
  assert.equal(escapeHtml(123), '123');
  assert.equal(escapeHtml(0), '0');
});

test('safeMediaId validates alphanumeric IDs', () => {
  assert.equal(safeMediaId('abc123'), 'abc123');
  assert.equal(safeMediaId('ABC-123_XYZ'), 'ABC-123_XYZ');
  assert.equal(safeMediaId('valid_id'), 'valid_id');
});

test('safeMediaId rejects dangerous characters', () => {
  assert.equal(safeMediaId('<script>'), '');
  assert.equal(safeMediaId('" onload='), '');
  assert.equal(safeMediaId('javascript:'), '');
  assert.equal(safeMediaId('id with spaces'), '');
  assert.equal(safeMediaId('id/with/slashes'), '');
});

test('safeMediaId handles empty and null', () => {
  assert.equal(safeMediaId(''), '');
  assert.equal(safeMediaId(null), '');
  assert.equal(safeMediaId(undefined), '');
});

test('safeUrl allows same-origin URLs', () => {
    assert.equal(testSafeUrl('/works/level-zero/'), '/works/level-zero/');
    assert.equal(testSafeUrl('https://ai2m2ia.test/pwa/'), 'https://ai2m2ia.test/pwa/');
});

test('safeUrl rejects external URLs unless explicitly allowed', () => {
    assert.equal(testSafeUrl('https://example.com/book'), '#');
    assert.equal(testSafeUrl('https://example.com/book', { external: true }), 'https://example.com/book');
});

test('safeUrl rejects unsafe protocols', () => {
    assert.equal(testSafeUrl('javascript:alert(1)'), '#');
    assert.equal(testSafeUrl('data:text/html,<script>alert(1)</script>'), '#');
    assert.equal(testSafeUrl('ftp://example.com/file'), '#');
});

test('safeUrl handles empty and null', () => {
  assert.equal(safeUrl(''), '');
  assert.equal(safeUrl(null), '');
  assert.equal(safeUrl(undefined), '');
});

test('renderProse escapes malicious HTML before markdown formatting', () => {
  const html = renderProse('**<script>alert("XSS")</script>**\n\n<img src=x onerror=alert(1)>');

  assert.match(html, /<strong>&lt;script&gt;alert\(&quot;XSS&quot;\)&lt;\/script&gt;<\/strong>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img/i);
});

test('renderProse keeps escaped headings and blockquotes safe', () => {
  const html = renderProse('## <svg onload=alert(1)>\n\n> `javascript:alert(1)`');

  assert.match(html, /<h2>&lt;svg onload=alert\(1\)&gt;<\/h2>/);
  assert.match(html, /<blockquote><code>javascript:alert\(1\)<\/code><\/blockquote>/);
  assert.doesNotMatch(html, /<svg/i);
});

test('isSafeYouTubeId validates 11-character IDs', () => {
  assert.equal(isSafeYouTubeId('dQw4w9WgXcQ'), true);
  assert.equal(isSafeYouTubeId('abc12345678'), true);
  assert.equal(isSafeYouTubeId('ABC-123_XYZ'), true);
});

test('isSafeYouTubeId rejects invalid lengths', () => {
  assert.equal(isSafeYouTubeId('short'), false);
  assert.equal(isSafeYouTubeId('too_long_id_here'), false);
  assert.equal(isSafeYouTubeId(''), false);
  assert.equal(isSafeYouTubeId('12345678901'), true);  // exactly 11
  assert.equal(isSafeYouTubeId('123456789012'), false); // 12 chars
});

test('isSafeYouTubeId rejects invalid characters', () => {
  assert.equal(isSafeYouTubeId('abc1234567!'), false);
  assert.equal(isSafeYouTubeId('abc1234567<'), false);
  assert.equal(isSafeYouTubeId('abc1234567 '), false);
});

test('isSafeYouTubeId handles null and undefined', () => {
  assert.equal(isSafeYouTubeId(null), false);
  assert.equal(isSafeYouTubeId(undefined), false);
});

test('isSafeTikTokId validates 15-20 digit IDs', () => {
  assert.equal(isSafeTikTokId('123456789012345'), true);      // 15 digits
  assert.equal(isSafeTikTokId('1234567890123456'), true);     // 16 digits
  assert.equal(isSafeTikTokId('12345678901234567890'), true); // 20 digits
  assert.equal(isSafeTikTokId('7638811117527010577'), true);  // real TikTok ID
});

test('isSafeTikTokId rejects invalid lengths', () => {
  assert.equal(isSafeTikTokId('12345678901234'), false);      // 14 digits
  assert.equal(isSafeTikTokId('123456789012345678901'), false); // 21 digits
  assert.equal(isSafeTikTokId(''), false);
});

test('isSafeTikTokId rejects non-numeric', () => {
  assert.equal(isSafeTikTokId('abc123456789012'), false);
  assert.equal(isSafeTikTokId('12345678901234a'), false);
  assert.equal(isSafeTikTokId('123456789012345 '), false);
});

test('isSafeTikTokId handles null and undefined', () => {
  assert.equal(isSafeTikTokId(null), false);
  assert.equal(isSafeTikTokId(undefined), false);
});

// theme-init.js localStorage lang regex — must accept every SUPPORTED_UI_LANGUAGES code
// to avoid setting <html lang> to the wrong value during first paint.
const themeInitLangRegex = /^[a-z]{2,3}(?:-[A-Z0-9]{2,3})?$/;

test('theme-init lang regex accepts every supported BCP-47 code', () => {
  const supported = [
    'en', 'pt-BR', 'es-419', 'fr', 'it', 'de', 'pl', 'tr', 'ru',
    'id', 'vi', 'fil', 'th', 'ja', 'zh-CN', 'zh-TW', 'yue',
    'ko', 'hi', 'ur', 'ar', 'fa', 'he',
  ];
  for (const code of supported) {
    assert.equal(themeInitLangRegex.test(code), true, `should accept ${code}`);
  }
});

test('theme-init lang regex rejects injection / overly long input', () => {
  assert.equal(themeInitLangRegex.test('"><script>'), false);
  assert.equal(themeInitLangRegex.test('en" onload="alert(1)'), false);
  assert.equal(themeInitLangRegex.test('a'.repeat(50)), false);
  assert.equal(themeInitLangRegex.test('en-US-extra-tag'), false);
  assert.equal(themeInitLangRegex.test(''), false);
});
