# AGENTS.md

Guidelines for AI agents working on `AI2M2IA/ai2m2ia.github.io`.

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

- **Any new field from JSON that will be rendered via innerHTML must pass through `escapeHtml()` or `safeUrl()`.**
- The main site uses `innerHTML` in templates at `app.js` (lines 572, 646, 678, 790). Currently all relevant fields are properly escaped.
- When adding new data-driven content:
  - Audit all user/content strings before insertion.
  - Apply `escapeHtml()` to text content.
  - Apply `safeUrl()` to any URL/href attributes.
  - Test with malicious payloads in Playwright E2E tests.
- The PWA uses safer DOM APIs (`createElement`, `textContent`) for book cards, but `innerHTML` for chapter prose — same rules apply.

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
