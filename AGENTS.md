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

- Never run destructive git commands (`reset --hard`, forced history rewrites) unless explicitly requested.
- Do not revert user-authored changes outside requested scope.
- If repository settings are required (Actions permissions/secrets), document exact UI path and required value.
