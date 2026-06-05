# AI(2)M(2)IA — Definitive Site

This is the definitive static web platform for the **AI(2)M(2)IA** author brand, featuring internationalization (i18n) for 23 languages, visual light/dark theme toggles, book catalog filtering, interactive character showcases, and a collapsible source audit panel.

## Project Structure

```text
├── assets/                  # Site images (book covers, character portraits, brand vectors)
├── data/
│   ├── i18n/                # Translation string JSON files for 23 languages
│   ├── author.json          # Bio and metadata profiles
│   ├── media.json           # Sample players and previews
│   ├── sources.json         # Traceability data for catalog entries
│   └── works.json           # Catalog dataset for books and adaptations
├── api/                     # Public static books API served from /api/
├── pwa/                     # Public reader PWA served from /pwa/
├── tools/
│   └── api/                 # API build, schema, validation, and unit test tooling
├── tests/
│   ├── api.spec.js          # Static API E2E contract smoke test
│   ├── app.spec.js          # Desktop E2E tests (theme toggle, i18n pages, catalog filters, audit panel)
│   ├── mobile.spec.js       # Mobile E2E tests (hamburger menu, responsiveness visibility, and stack grids)
│   ├── pwa.spec.js          # PWA library and reader E2E tests
│   ├── i18n.test.js         # Integration tests for i18n JSON schema coverage
│   └── server.js            # Custom local HTTP test server with directory traversal protection
├── app.js                   # Client-side core application logic
├── styles.css               # Main visual stylesheet with tablet/mobile media queries
├── index.html               # Web interface entry point
├── package.json             # Package scripts and pinned dependencies
└── playwright.config.js     # Playwright browser testing configuration
```

---

## Branching and Releases

Work should flow from `feature/**` branches into `develop`, then from `develop`
into `main`. Public releases are tagged from `main` with version tags such as
`v1.0.0`.

See `CONTRIBUTING.md` for the pull request policy, required gates, and
recommended GitHub branch protection settings.

## License

This project is licensed under AGPL-3.0-only. See `LICENSE`.

---

## Available Scripts

Use the following scripts in the project directory to serve files and run testing suites:

### `npm test`
Runs the API contract validation, API unit tests, translation coverage suite, and all Playwright browser E2E tests across site, API, PWA, desktop, and mobile viewports.

### `npm run test:ci`
Runs the same gate used by GitHub Actions.

## Local PR Smoke

Before opening or updating a PR, run the focused smoke checks below:

```bash
npm run test:unit
npm run test:data
npm run test:security
```

Then add the area-specific check for the change, such as `npm run test:pwa`
for PWA behavior, `npm run test:api` for API or schema changes, or
`npm run test:e2e` for layout and interaction changes.

### `npm run test:coverage`
Runs the Node.js API/i18n tests with the built-in coverage checker. The minimum
threshold is 80% for lines, branches, and functions.

### `npm run build:api`
Rebuilds the public static API under `api/` from the source manuscripts configured in `tools/api/scripts/build_catalog.py`.

### `npm run test:api`
Runs the API contract validation, API unit tests, and static API E2E smoke test.

### `npm run test:api:contract`
Validates the public JSON contract under `api/`.

### `npm run test:api:unit`
Runs the Node.js unit tests for the API contract tooling.

### `npm run test:pwa`
Runs the PWA E2E test against `/pwa/`.

### `npm run test:prod`
Runs smoke checks against the public production site at
`https://ai2m2ia.github.io`. This is also scheduled in GitHub Actions.

### `npm run test:i18n`
Runs validation checks across all 23 language files inside `data/i18n/` to ensure:
- JSON structures are valid.
- No key translations are missing or contain empty strings.
- Direction keys (`dir="rtl"` vs `"ltr"`) are correctly set.

### `npm run test:data`
Validates JSON data files in `data/` against their schemas to ensure:
- `works.json` matches the catalog and character schema
- `author.json` matches the author profile schema
- `media.json` matches the media content schema
- `sources.json` matches the external references schema

Schemas are located in `data/schemas/` and use JSON Schema 2020-12. This validation runs automatically in CI and prevents structural regressions in data files.

### `npm run test:e2e`
Runs the complete browser-based end-to-end (E2E) testing suite across all configured device viewports (Desktop Chrome, Mobile Chrome, and Mobile Safari).

### `npm run test:e2e:desktop`
Runs only the desktop-specific E2E tests (`tests/app.spec.js`) inside a desktop Chrome browser.

### `npm run test:e2e:mobile`
Runs only the mobile-specific E2E tests (`tests/mobile.spec.js`) on mobile emulators:
- Chrome emulated on `Pixel 5` viewport.
- Safari emulated on `iPhone 12` viewport.

### `npm run test:e2e:ui`
Launches the interactive Playwright UI runner, allowing you to debug, inspect, step-through, and visually execute tests in a graphical window.

---

## Under the Hood: Testing Assertions

### Desktop E2E Tests (`tests/app.spec.js`)
- **Theme Toggle**: Validates transitions between light/dark mode and aria labels.
- **23-Language Coverage**: Exercises dropdown menu option clicks, verifying translation updates on key DOM nodes and appropriate bidirectional directionality flags (`dir="rtl"`).
- **Genre Filters**: Verifies books in the catalog grid filter dynamically without broken DOM elements.
- **Audit Panel**: Tests expansion/collapse actions and accessibility attribute updates (`aria-expanded`).

### Mobile E2E Tests (`tests/mobile.spec.js`)
- **Hamburger Menu**: Simulates menu button clicks, asserting state changes (`mobile-open` navigation layout class) and proper accessibility attributes.
- **Nav Menu Auto-close**: Tests that clicking nav links closes the drawer menu overlay.
- **Responsive Controls**: Asserts that theme and language buttons are hidden from the header on viewports `< 600px` to fit mobile widths.
- **Responsive Grids**: Retrives element bounding-box dimensions (`boundingBox()`) to assert single-column vertical stacks on mobile grids (like `#books-grid`) and two-column matrices on tablet/mobile showcases (like `.character-showcase-grid`).

---

## Security

This project follows a layered security approach combining automated tools with LLM-assisted analysis.

### Security Posture

- **Zero production dependencies** — minimal attack surface
- **Strict CSP headers** — no `unsafe-inline` or `unsafe-eval`
- **XSS prevention** — all user/content strings pass through `escapeHtml()` or `safeUrl()`
- **Path traversal protection** — test server and build scripts validate paths
- **Secrets scanning** — comprehensive `.gitignore` prevents committing sensitive files

### Running Security Scans

```bash
# Secrets scanning (install: brew install gitleaks)
gitleaks detect --source .

# SAST scanning (install: pip install semgrep)
semgrep scan --config auto

# Filesystem/misconfig scanning (install: brew install trivy)
trivy fs .

# Dependencies (no install required, runs in CI)
npm audit --omit=dev
```

### Security Workflow

1. **Run scanners first** — gather raw findings from all tools
2. **Classify with LLM** — prioritize by real impact and exploitability, map to OWASP Top 10
3. **Fix minimal and test** — apply targeted fixes with regression tests
4. **Block regressions in CI** — use tools, not LLM, to enforce security gates

See `AGENTS.md` section 12 for detailed security scanning guidelines and CI integration examples.
