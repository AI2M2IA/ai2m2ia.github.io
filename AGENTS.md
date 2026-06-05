# AGENTS.md

Guidelines for AI agents working on `AI2M2IA/ai2m2ia.github.io`.

## 0) Security First

**⚠️ MANDATORY: Read [SECURITY.md](./SECURITY.md) before making any changes.**

This project implements strict security controls. Key requirements:

- **XSS Prevention:** Always use `escapeHtml()` for dynamic content, `safeUrl()` for URLs
- **Critical Function:** `renderProse()` in PWA uses "sanitize first, then format" - never modify the order of operations
- **CSP Compliance:** No `unsafe-inline` or `unsafe-eval` allowed
- **Data Validation:** All JSON data files validated against schemas in `data/schemas/`
- **Testing:** Run `npm run test:security` and `npm run test:data` before committing

For detailed security guidelines, code examples, and vulnerability reporting procedures, see **[SECURITY.md](./SECURITY.md)**.

## 1) Project Basics

- Main site: static app at repository root (`index.html`, `app.js`, `styles.css`).
- Reader app: PWA under [`/pwa`](/Volumes/WORK/projects/ai2m2ia.github.io/pwa).
- Public API content: [`/api`](/Volumes/WORK/projects/ai2m2ia.github.io/api).
- Tests: Playwright and Node tests under [`/tests`](/Volumes/WORK/projects/ai2m2ia.github.io/tests) and [`/tools/api/tests`](/Volumes/WORK/projects/ai2m2ia.github.io/tools/api/tests).

## 2) Branching and Delivery Flow

- Branch names must follow: `feature/<feature-name>`.
- Promotion flow:
  1. `feature/*` -> PR -> `develop`
  2. `develop` -> PR -> `main`
- CI automation opens promotion PRs after successful CI runs.
- `main` receives automatic tags after successful CI.

## 3) Required Validation Before Merge

Run and pass:

```bash
npm run test:unit
npm run test:e2e
```

When changing PWA behavior, also run:

```bash
npm run test:e2e -- tests/pwa.spec.js
```

Do not merge with failing checks.

## 4) i18n and Language Rules

- English (`en`) is the default interface language.
- Main site and PWA must support the same 23 UI languages.
- Interface language and book language are separate concerns:
  - UI language = interface labels/buttons.
  - Book language = content availability/filter.
- Avoid language leakage:
  - No Brazilian Portuguese strings in English UI state.
  - Preserve RTL behavior for `ar`, `fa`, `he`, `ur`.

## 5) PWA-Specific Rules

- If UI text/logic changes in PWA, bump cache/versioning to prevent stale service worker assets:
  - Update `pwa/sw.js` static cache version.
  - Update `pwa/index.html` app script query version (`app.js?v=...`) when needed.
- Keep offline behavior intact and non-breaking.
- Maintain wishlist/downloaded/remove-download workflows.

## 6) Security and Hardening Expectations

- Follow OWASP-minded defaults:
  - Keep strict CSP headers/meta.
  - Avoid unsafe HTML injection; sanitize/escape rendered user/content strings.
  - Validate and constrain external URLs/origins.
  - Keep API origin restrictions and path safety checks.
- Preserve secure defaults in tests that guard XSS and API origin abuse.

## 7) CI/CD and Automation Rules

- Do not weaken workflow permissions.
- Auto PR workflow depends on `BOT_GH_TOKEN` secret for PR creation.
- Keep concurrency controls in automation workflows to avoid duplicate PR/tag races.
- If workflows fail, prefer minimal, auditable fixes and re-run checks.

## 8) Change Scope and Style

- Keep changes minimal and directly related to the request.
- Do not refactor unrelated files opportunistically.
- Update tests with behavior changes.
- Prefer deterministic behavior over implicit magic.

## 9) Commit and PR Quality

- Use clear commit messages describing intent and scope.
- PR description should include:
  - Summary
  - What changed
  - Validation run/results
  - Operational notes (if workflow/token/settings dependent)

## 10) Safe Operations

- **Never push to remote without explicit user authorization.** Always ask for confirmation before executing `git push`, even if tests pass and commits are ready.
- Never run destructive git commands (`reset --hard`, forced history rewrites) unless explicitly requested.
- Do not revert user-authored changes outside requested scope.
- If repository settings are required (Actions permissions/secrets), document exact UI path and required value.

## 11) innerHTML Discipline

**Mandatory rule:** Any new field from JSON that will be rendered via `innerHTML` must pass through `escapeHtml()` or `safeUrl()`.

### Current Usage

The main site uses `innerHTML` in templates at `app.js` (lines 572, 646, 678, 790). Currently all relevant fields are properly escaped. The PWA uses safer DOM APIs (`createElement`, `textContent`) for book cards, but `innerHTML` for chapter prose — same rules apply.

### Mandatory Checklist

When adding or modifying code that renders JSON data via `innerHTML`:

- [ ] **Audit all strings** — identify every field from JSON that will be interpolated
- [ ] **Apply `escapeHtml()`** to all text content (titles, descriptions, summaries, names)
- [ ] **Apply `safeUrl()`** to all URLs/href attributes (links, images, buttons)
- [ ] **Validate URLs** — ensure `safeUrl()` is called with appropriate `external` parameter
- [ ] **Test with XSS payloads** — add Playwright test with malicious JSON data
- [ ] **Review template literals** — verify no unescaped interpolation in backtick strings
- [ ] **Check markdown rendering** — if using `renderProse()`, verify input is escaped first

### Security Functions Reference

```javascript
// Escape HTML special characters to prevent XSS
escapeHtml(str) → string
// Escapes: & < > " '

// Validate and sanitize URLs
safeUrl(url, { external = false }) → string
// Returns empty string if invalid
// external: true allows any https:// URL
// external: false (default) only allows same-origin URLs

// Validate media IDs (YouTube, TikTok)
safeMediaId(id) → string | null
// Returns null if ID doesn't match expected pattern
```

### Examples

**✅ CORRECT — Text content escaped:**
```javascript
const card = `
  <div class="book-card">
    <h3>${escapeHtml(book.title)}</h3>
    <p>${escapeHtml(book.description)}</p>
  </div>
`;
```

**✅ CORRECT — URLs validated:**
```javascript
const link = `<a href="${safeUrl(book.url, { external: true })}">Buy</a>`;
const img = `<img src="${safeUrl(book.coverImage)}" alt="${escapeHtml(book.title)}">`;
```

**❌ INCORRECT — Unescaped user content:**
```javascript
// DANGER: XSS vulnerability if book.title contains <script>
const card = `<h3>${book.title}</h3>`;

// DANGER: javascript: URL injection
const link = `<a href="${book.url}">Buy</a>`;
```

**❌ INCORRECT — Wrong parameter for external URLs:**
```javascript
// DANGER: Allows any URL, should use { external: true } only when intentional
const link = `<a href="${safeUrl(book.amazonUrl)}">Buy on Amazon</a>`;
```

### Markdown Rendering (PWA)

The PWA uses `renderProse()` for chapter content. This function:
1. Splits text into paragraphs
2. **Escapes HTML first** via `escapeHtml()`
3. Then applies markdown formatting (bold, italic, code, blockquotes)

**Never pass unescaped content to `renderProse()`.**

### Testing Requirements

Every PR that modifies `innerHTML` usage must include:

1. **Unit test** — verify `escapeHtml()` and `safeUrl()` work correctly
2. **Integration test** — render actual JSON data and verify output
3. **XSS test** — inject malicious payloads and verify no script execution

Example Playwright test:
```javascript
test('renders malicious book title safely', async ({ page }) => {
  await page.route('**/api/books/*.json', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: '<script>alert("XSS")</script>',
        description: '"><img src=x onerror=alert(1)>'
      })
    });
  });
  
  await page.goto('/');
  const title = await page.locator('.book-title').textContent();
  expect(title).toBe('<script>alert("XSS")</script>'); // Escaped, not executed
});
```

### Code Review Checklist

When reviewing PRs, check for:

- [ ] New `innerHTML` assignments use `escapeHtml()` / `safeUrl()`
- [ ] Template literals don't have unescaped interpolation
- [ ] External URLs use `safeUrl(url, { external: true })`
- [ ] Same-origin URLs use `safeUrl(url)` (no external parameter)
- [ ] Tests include XSS payload scenarios
- [ ] No direct DOM manipulation with user input (prefer `textContent`)

## 12) Security Scanning

This project follows a layered security approach combining automated tools with LLM-assisted analysis.

### Recommended Tools

| Category | Tool | Usage |
|----------|------|-------|
| SAST | Semgrep CE | Scan for insecure code patterns in JS/Python |
| Secrets | Gitleaks | Detect committed tokens, keys, passwords |
| Dependencies | npm audit | Check for vulnerable npm packages (runs in CI) |
| Filesystem/Config | Trivy | Scan for misconfigurations and known CVEs |

### Running Security Scans

```bash
# Secrets scanning (requires: brew install gitleaks)
gitleaks detect --source .

# SAST scanning (requires: pip install semgrep)
semgrep scan --config auto

# Filesystem/misconfig scanning (requires: brew install trivy)
trivy fs .

# Dependencies (no install required, runs in CI)
npm audit --omit=dev
```

### Security Workflow

1. **Run scanners first** — gather raw findings from all tools
2. **Classify with LLM** — prioritize by real impact and exploitability, map to OWASP Top 10
3. **Fix minimal and test** — apply targeted fixes with regression tests
4. **Block regressions in CI** — use tools, not LLM, to enforce security gates

### Example LLM Prompt

```
Analyze these Semgrep/Gitleaks/Trivy findings.
Remove likely false positives, prioritize by real risk,
map to OWASP Top 10, and suggest minimal fixes with tests.
Do not invent CVEs or vulnerabilities without evidence.
```

### CI Integration

The CI workflow already runs `npm audit --omit=dev --audit-level=high`. To add more scanners:

```yaml
- name: Secrets scan
  run: gitleaks detect --source . --no-git

- name: SAST scan
  run: semgrep scan --config auto --error

- name: Filesystem scan
  run: trivy fs --exit-code 1 .
```

## 13) X-Content-Type-Options Header — Accepted Risk

GitHub Pages does not support custom HTTP headers, which means we cannot set `X-Content-Type-Options: nosniff` via server configuration.

### What is X-Content-Type-Options?

The `X-Content-Type-Options: nosniff` header prevents browsers from MIME-type sniffing a response away from the declared content-type. This helps prevent attacks where a browser interprets a non-executable MIME type as executable (e.g., treating a text file as JavaScript).

### Why this is acceptable for this project

1. **Strict CSP already in place** — Our `Content-Security-Policy` meta tag restricts script execution to `'self'` only, which is a stronger protection than MIME sniffing prevention
2. **No user-uploaded content** — All files are committed to the repository and served with correct content types
3. **Static site architecture** — No dynamic content generation that could produce mismatched content types
4. **GitHub Pages serves correct types** — GitHub's CDN correctly identifies and serves common file types (HTML, CSS, JS, JSON, images)

### Mitigations in place

- **CSP meta tag**: All pages include `<meta http-equiv="Content-Security-Policy">` with `script-src 'self'`
- **File extensions**: All files use correct extensions that browsers recognize
- **Content-Type in responses**: GitHub Pages serves files with appropriate Content-Type headers based on file extension

### When to revisit

If the project adds:
- User-uploaded files or dynamic content
- Files with ambiguous extensions
- Custom MIME types
- Server-side rendering that could produce mismatched types

Then `X-Content-Type-Options: nosniff` should be implemented via a CDN or hosting platform that supports custom headers.

### References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)
- [GitHub Pages limitations](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#limitations)

## 14) AI-Assisted Code Review

We use a two-layer review architecture. See [CODE_REVIEW.md](./CODE_REVIEW.md) for full details, setup, costs, and troubleshooting.

### Layer 1 — Local pre-review (free)

Before opening a PR, run:

```bash
./scripts/local-review.sh          # working tree vs HEAD
./scripts/local-review.sh develop  # current branch vs develop
```

This invokes Qwen2.5-Coder-14B via MLX on Apple Silicon (~20 s per ~1,000-line diff on a Mac with sufficient unified memory). No marginal cost. Catches the obvious findings before the diff reaches CI.

### Layer 2 — CI release-gate review

Two reviewers auto-run in parallel on PRs targeting `main`. They live in `.github/workflows/release-gate-review.yml`:

- **Claude** — `claude-sonnet-4-6` via Claude Max subscription (OAuth, no API charge).
- **Qwen-Coder** — `qwen3-coder-plus` via DashScope API.

A separate workflow, `.github/workflows/claude-mention.yml`, lets a maintainer invoke Claude on any PR (including `feature → develop`) by writing `@claude` in a comment.

**Codex is not in this workflow.** Codex review is handled by the user's integrated Codex account through OpenAI's Codex Cloud GitHub integration. Codex Cloud posts an independent third comment on PRs but does not participate in the merge gate.

### The merge gate: at least one reviewer must pass

The aggregator job `AI review gate` is the only required status check on `main`. It passes if **at least one** of the two reviewer jobs in this workflow completed successfully. Failure of one reviewer does not block the merge — that resilience is the point: a missing secret, a provider outage, or a rate limit on one provider does not stop the release.

"Pass" means the workflow job ran successfully and the model produced output. It does **not** mean the AI approved the diff — comments are advisory.

Estimated cost at 4–8 release-gate PRs per month: **up to $1 USD/month** (Claude and Codex are covered by subscriptions/integration; only Qwen runs on token billing).

### Required GitHub App for the Claude reviewer

The Claude reviewer uses an OAuth token (`CLAUDE_CODE_AUTH_TOKEN`) tied to the Claude Max subscription. In addition to the secret, the **Claude Code GitHub App** (https://github.com/apps/claude) must be installed on this repository or on the org with scope on this repository. Without it the run fails at the OIDC token exchange with `401 Unauthorized — Claude Code is not installed on this repository`. See [CODE_REVIEW.md](./CODE_REVIEW.md#required-github-app-for-the-oauth-path) for the install steps.

### Rules for AI agents

- Always run Layer 1 locally before pushing if you have access to a Mac with the MLX environment configured.
- Do not flag accepted-risk findings (X-Content-Type-Options absence, clickjacking on GitHub Pages) — they are documented in this file and in CODE_REVIEW.md.
- Reviewer findings are advisory, not gating. Resolve or defend each comment in the PR thread.
- If a reviewer is wrong, leave a reply explaining why and update CODE_REVIEW.md if it represents a new accepted risk.
- Do not change the gate from "at least one" to "all" without explicit user confirmation — the resilience is intentional.

## Identity Policy (MANDATORY)

These rules apply to EVERY agent and tool (Claude, Codex, ChatGPT, Gemini/Antigravity, scripts, CI) contributing to this repository.

1. **Single identity.** Every commit and tag MUST use exactly
   `AI(2)M(2)IA <AI2M2IA@users.noreply.github.com>` as BOTH author and committer (and tagger).
2. **Forbidden — no exceptions.** The author's real name and any personal e-mail address must NEVER appear in commits, tags, commit messages, file contents, or metadata (manifests, license files, EXIF, build artifacts). Under no circumstances.
3. **Mandatory double check.**
   - BEFORE any commit: run `git config user.name && git config user.email` and confirm the pseudonymous identity above.
   - AFTER committing: run `git log -1 --format='%an <%ae> | %cn <%ce>'` and confirm both fields match it.
4. **On violation: stop.** If a wrong identity is detected, halt immediately and fix it (amend/rewrite) before any further work — and never push it.
