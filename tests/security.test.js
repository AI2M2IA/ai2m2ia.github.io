const assert = require('node:assert/strict');
const test = require('node:test');

// Extract pure functions from app.js for testing
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeMediaId(value) {
  return /^[A-Za-z0-9_-]+$/.test(String(value || '')) ? String(value) : '';
}

function isSafeYouTubeId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || ''));
}

function isSafeTikTokId(value) {
  return /^\d{15,20}$/.test(String(value || ''));
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
