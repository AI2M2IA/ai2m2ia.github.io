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
├── tests/
│   ├── app.spec.js          # Desktop E2E tests (theme toggle, i18n pages, catalog filters, audit panel)
│   ├── mobile.spec.js       # Mobile E2E tests (hamburger menu, responsiveness visibility, and stack grids)
│   ├── i18n.test.js         # Integration tests for i18n JSON schema coverage
│   └── server.js            # Custom local HTTP test server with directory traversal protection
├── app.js                   # Client-side core application logic
├── styles.css               # Main visual stylesheet with tablet/mobile media queries
├── index.html               # Web interface entry point
├── package.json             # Package scripts and pinned dependencies
└── playwright.config.js     # Playwright browser testing configuration
```

---

## Available Scripts

Use the following scripts in the project directory to serve files and run testing suites:

### `npm test`
Runs both the translation coverage suite and all Playwright browser E2E tests across both desktop and mobile viewports.

### `npm run test:i18n`
Runs validation checks across all 23 language files inside `data/i18n/` to ensure:
- JSON structures are valid.
- No key translations are missing or contain empty strings.
- Direction keys (`dir="rtl"` vs `"ltr"`) are correctly set.

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
