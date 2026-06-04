# Security Guidelines

This document provides detailed security guidelines for developers and AI agents working on the AI(2)M(2)IA platform.

## Table of Contents

1. [Security Posture](#security-posture)
2. [Secure Coding Practices](#secure-coding-practices)
3. [Critical Security Functions](#critical-security-functions)
4. [Data Validation](#data-validation)
5. [Content Security Policy (CSP)](#content-security-policy-csp)
6. [Security Testing](#security-testing)
7. [Reporting Vulnerabilities](#reporting-vulnerabilities)

## Security Posture

This project follows OWASP Top 10 2021 guidelines and implements defense-in-depth security controls:

- **Zero production dependencies** - Minimal attack surface
- **Strict CSP** - No `unsafe-inline` or `unsafe-eval`
- **Input validation** - All user data validated via JSON schemas
- **Output encoding** - All dynamic content properly escaped
- **Origin validation** - API endpoints validate request origins
- **Path traversal protection** - All file paths validated and sanitized

## Secure Coding Practices

### XSS Prevention

**Rule:** Never insert untrusted data into HTML without proper escaping.

#### Safe Pattern (MANDATORY)

```javascript
// ✅ CORRECT: Use escapeHtml() for all dynamic content
const html = `<h3>${escapeHtml(book.title)}</h3>`;
const html = `<p>${escapeHtml(book.description)}</p>`;
const html = `<span>${escapeHtml(I18N.t('someKey'))}</span>`;
```

#### Unsafe Pattern (FORBIDDEN)

```javascript
// ❌ WRONG: Direct interpolation of untrusted data
const html = `<h3>${book.title}</h3>`;  // XSS vulnerability!
const html = `<p>${userInput}</p>`;     // XSS vulnerability!
```

### URL Validation

**Rule:** Always validate URLs before using them in `href`, `src`, or other attributes.

#### Safe Pattern (MANDATORY)

```javascript
// ✅ CORRECT: Use safeUrl() for all URLs
const html = `<a href="${safeUrl(link.url)}">Link</a>`;
const html = `<img src="${safeUrl(image.src)}" alt="...">`;

// For external URLs (Amazon, etc.)
const html = `<a href="${safeUrl(book.amazonUrl, { external: true })}">Buy</a>`;
```

#### Unsafe Pattern (FORBIDDEN)

```javascript
// ❌ WRONG: Direct use of URLs
const html = `<a href="${link.url}">Link</a>`;  // Injection vulnerability!
```

### innerHTML Usage

**Rule:** Minimize `innerHTML` usage. When required, ensure all dynamic content is escaped.

```javascript
// ✅ ACCEPTABLE: All content escaped
container.innerHTML = data.map(item => `
  <div class="card">
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.description)}</p>
    <a href="${safeUrl(item.url)}">Read more</a>
  </div>
`).join('');

// ❌ FORBIDDEN: Mixed escaped/unescaped content
container.innerHTML = data.map(item => `
  <div class="card">
    <h3>${item.title}</h3>  <!-- XSS vulnerability! -->
    <p>${escapeHtml(item.description)}</p>
  </div>
`).join('');
```

## Critical Security Functions

### `escapeHtml(str)`

**Location:** `pwa/assets/app.js` (line ~2000)

**Purpose:** Escapes HTML special characters to prevent XSS.

**Characters escaped:**
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#x27;`

**When to use:** ALL dynamic content inserted into HTML.

```javascript
// ✅ Use for: titles, descriptions, labels, user input
escapeHtml(book.title)
escapeHtml(I18N.t('someKey'))
escapeHtml(userProvidedText)
```

### `safeUrl(url, options)`

**Location:** `pwa/assets/app.js` (line ~2010)

**Purpose:** Validates and sanitizes URLs to prevent injection attacks.

**Options:**
- `{ external: false }` (default) - Only allows same-origin URLs
- `{ external: true }` - Allows external HTTPS URLs

**When to use:** ALL URLs in `href`, `src`, `action`, or similar attributes.

```javascript
// ✅ Same-origin URLs (internal links, images)
safeUrl('/works/level-zero/')
safeUrl(book.coverImage)

// ✅ External URLs (Amazon, social media)
safeUrl(book.amazonUrl, { external: true })
safeUrl('https://twitter.com/...', { external: true })
```

### `renderProse(text)` - PWA Reader

**Location:** `pwa/assets/app.js` (line ~1695)

**Purpose:** Renders markdown-like text as HTML for the PWA reader.

**⚠️ CRITICAL SECURITY NOTE:**

```javascript
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
    const clean = escapeHtml(block.trim());  // ⚠️ ESCAPE FIRST
    if (!clean) return "";
    if (clean.startsWith("&gt; ")) return `<blockquote>${inlineMarkdown(clean.slice(5))}</blockquote>`;
    if (clean.startsWith("### ")) return `<h3>${inlineMarkdown(clean.slice(4))}</h3>`;
    if (clean.startsWith("## ")) return `<h2>${inlineMarkdown(clean.slice(3))}</h2>`;
    return `<p>${inlineMarkdown(clean)}</p>`;
  }).join("");
}
```

**Why this order matters:**

1. ✅ **Correct order:** `escapeHtml()` → `inlineMarkdown()`
   - User input: `<script>alert('XSS')</script>`
   - After escapeHtml: `&lt;script&gt;alert('XSS')&lt;/script&gt;`
   - After inlineMarkdown: `&lt;script&gt;alert('XSS')&lt;/script&gt;` (safe, rendered as text)

2. ❌ **Wrong order:** `inlineMarkdown()` → `escapeHtml()`
   - User input: `<script>alert('XSS')</script>`
   - After inlineMarkdown: `<script>alert('XSS')</script>` (unchanged)
   - After escapeHtml: `&lt;script&gt;alert('XSS')&lt;/script&gt;` (safe, but risky pattern)

**When adding new markdown features:**

```javascript
// ❌ WRONG: Adding raw HTML tags
if (clean.startsWith("!!! ")) return `<div class="alert">${clean.slice(4)}</div>`;

// ✅ CORRECT: Content already escaped, safe to wrap in HTML
if (clean.startsWith("!!! ")) return `<div class="alert">${inlineMarkdown(clean.slice(4))}</div>`;
```

### `inlineMarkdown(text)`

**Location:** `pwa/assets/app.js` (line ~1710)

**Purpose:** Converts basic markdown syntax to HTML.

**Supported syntax:**
- `**bold**` → `<strong>bold</strong>`
- `*italic*` → `<em>italic</em>`
- `` `code` `` → `<code>code</code>`

**⚠️ IMPORTANT:** This function assumes input is already escaped. Never call it on untrusted data without escaping first.

## Data Validation

### JSON Schema Validation

All JSON data files in `data/` are validated against schemas in `data/schemas/`.

**When modifying data files:**

1. Ensure your changes match the schema
2. Run `npm run test:data` locally before committing
3. If you add new fields, update the corresponding schema
4. Schemas use JSON Schema 2020-12 format

**Example - Adding a new work:**

```json
{
  "id": "new-book",
  "name": "New Book",
  "type": "standalone",  // Must be: series|standalone|complete-edition|adaptation|wip
  "genre": "fantasy",    // Must be: progression|dark-fantasy|war|fantasy
  "tag": "Coming soon",
  "summary": "A brief description",
  "route": "works/new-book/",
  "coverImage": "assets/covers/new-book.jpg",
  "coverAlt": "Cover art for New Book"
}
```

**Validation enforces:**
- Required fields are present
- Enum values are valid
- URL patterns are correct
- ID formats follow conventions
- Array items have correct types

**Run validation:**

```bash
npm run test:data
```

## Content Security Policy (CSP)

### Current CSP Configuration

All HTML files include this CSP meta tag:

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           base-uri 'self'; 
           object-src 'none'; 
           script-src 'self'; 
           style-src 'self'; 
           font-src 'self'; 
           img-src 'self' data: https://ai2m2ia.github.io; 
           connect-src 'self'; 
           frame-src https://www.youtube-nocookie.com https://www.tiktok.com; 
           form-action 'self'">
```

### What This Means

✅ **Allowed:**
- Scripts from same origin only
- Styles from same origin only
- Fonts from same origin only (self-hosted)
- Images from same origin, data URIs, and `ai2m2ia.github.io`
- YouTube and TikTok embeds (via `frame-src`)

❌ **Blocked:**
- Inline scripts (`<script>code</script>`)
- Inline event handlers (`onclick="..."`)
- `eval()` and `new Function()`
- External scripts (except same origin)
- External styles (except same origin)
- External fonts (except same origin)
- Plugins (Flash, Java, etc.)

### When Modifying HTML

**DO:**
- Keep CSP meta tag in all HTML files
- Use external CSS/JS files only
- Use `safeUrl()` for all URLs

**DON'T:**
- Add `'unsafe-inline'` to CSP
- Add `'unsafe-eval'` to CSP
- Add external script/style origins without security review
- Remove the CSP meta tag

## Security Testing

### Automated Tests

**XSS Prevention Tests:**

```bash
npm run test:security
```

Tests in `tests/security.test.js`:
- `escapeHtml()` escapes all dangerous characters
- `escapeHtml()` handles multiple dangerous characters
- `escapeHtml()` handles null and undefined
- `safeMediaId()` validates alphanumeric IDs
- `safeMediaId()` rejects dangerous characters
- `isSafeYouTubeId()` validates 11-character IDs
- `isSafeTikTokId()` validates 15-20 digit IDs

**API Origin Validation Tests:**

Tests in `tests/pwa.spec.js`:
- `ignores unsupported API origins from query string`
- `rejects typosquatting and unauthorized origins`

**CSP Tests:**

Tests in `tests/works.spec.js`:
- Verifies CSP does not contain `'unsafe-inline'`
- Verifies `img-src` is restricted to known origins

### Manual Testing Checklist

When adding features that handle user input:

- [ ] Test with XSS payloads: `<script>alert('XSS')</script>`
- [ ] Test with SQL injection: `' OR '1'='1`
- [ ] Test with path traversal: `../../etc/passwd`
- [ ] Test with malformed URLs: `javascript:alert(1)`
- [ ] Test with extremely long input (10,000+ characters)
- [ ] Test with Unicode/emoji characters
- [ ] Test with null bytes: `\0`

## Reporting Vulnerabilities

### For Developers

If you discover a security vulnerability:

1. **DO NOT** commit a fix directly to main
2. Create a new branch: `fix/security-<description>`
3. Implement the fix with tests
4. Submit a PR with detailed description
5. Request review from security-conscious team members

### For External Researchers

**Responsible Disclosure:**

1. Email: security@ai2m2ia.com (or contact via GitHub Security Advisories)
2. Provide detailed description of the vulnerability
3. Include steps to reproduce
4. Allow reasonable time for fix before public disclosure
5. We will credit you in the security advisory (unless you prefer anonymity)

**What we consider a vulnerability:**

- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Path traversal
- Information disclosure
- Authentication/authorization bypass
- CSP bypass
- Any issue that could compromise user data or site integrity

**What we don't consider a vulnerability:**

- Missing security headers that don't apply to our architecture (e.g., `X-Content-Type-Options` on GitHub Pages)
- Theoretical vulnerabilities without proof of concept
- Issues in third-party dependencies (report to the dependency maintainers)

## References

### OWASP Resources

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

### MDN Documentation

- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Glossary/Cross-site_scripting)
- [HTML escaping](https://developer.mozilla.org/en-US/docs/Glossary/Entity)

### Project Documentation

- [AGENTS.md](./AGENTS.md) - AI agent guidelines
- [README.md](./README.md) - Project overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

---

**Last Updated:** 2026-06-01  
**Maintained by:** AI(2)M(2)IA Security Team
