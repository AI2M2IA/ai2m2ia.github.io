const { test, expect } = require('@playwright/test');

test.describe('AI(2)M(2)IA Website E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the local server
    await page.goto('/');
    // Wait for the app to finish loading async data
    await page.waitForSelector('#books-grid:not(:has-text("Loading content"))');
  });

  test('should load the page and show correct metadata', async ({ page }) => {
    await expect(page).toHaveTitle(/AI\(2\)M\(2\)IA/);
    const heroTitle = page.locator('.hero-title');
    await expect(heroTitle).toContainText('AI(2)M(2)IA');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
  });

  test('should toggle theme between light and dark modes', async ({ page }) => {
    const html = page.locator('html');
    
    // Initial theme check (default is usually dark or system, let's read it)
    const initialTheme = await html.getAttribute('data-theme');
    expect(initialTheme).toMatch(/^(dark|light)$/);

    const expectedToggledTheme = initialTheme === 'dark' ? 'light' : 'dark';

    // Click theme toggle button
    const themeBtn = page.locator('#theme-toggle');
    await themeBtn.click();

    // Verify it changed
    const toggledTheme = await html.getAttribute('data-theme');
    expect(toggledTheme).toBe(expectedToggledTheme);

    // Click again to toggle back
    await themeBtn.click();
    const finalTheme = await html.getAttribute('data-theme');
    expect(finalTheme).toBe(initialTheme);
  });

  test('should switch and verify all 23 languages correctly', async ({ page }) => {
    const fs = require('fs');
    const path = require('path');

    const ALL_LANGS = [
      'en', 'pt-BR', 'es-419', 'fr', 'it', 'de', 'pl', 'tr', 'ru',
      'id', 'vi', 'fil', 'th', 'ja', 'zh-CN', 'zh-TW', 'yue',
      'ko', 'hi', 'ur', 'ar', 'fa', 'he',
    ];
    const RTL_LANGS = ['ar', 'fa', 'he', 'ur'];

    const html = page.locator('html');
    const langMenuBtn = page.locator('#lang-menu-btn');
    const langDropdown = page.locator('#lang-dropdown');
    const exploreBtn = page.locator('a[data-i18n="heroPrimaryCTA"]');

    // Default language is English
    await expect(html).toHaveAttribute('lang', 'en');

    for (const lang of ALL_LANGS) {
      // 1. Get the expected translation text
      let expectedText = 'Explore Catalog'; // English fallback
      if (lang !== 'en') {
        if (!ALL_LANGS.includes(lang)) {
          throw new Error(`Invalid language code: ${lang}`);
        }
        const basePath = path.resolve(__dirname, '../data/i18n');
        const resolvedPath = path.resolve(basePath, `${lang}.json`);

        // Ensure path remains inside basePath to prevent path traversal
        if (!resolvedPath.startsWith(basePath)) {
          throw new Error(`Path traversal attempt detected: ${resolvedPath}`);
        }

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const fileContent = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        expectedText = fileContent.strings.heroPrimaryCTA || expectedText;
      }

      // 2. Click language menu button to open dropdown
      await langMenuBtn.click();
      await expect(langDropdown).not.toHaveClass(/hidden/);

      // 3. Click language option
      const option = page.locator(`.lang-option[data-lang="${lang}"]`);
      await option.click();

      // 4. Verify lang attribute changed
      await expect(html).toHaveAttribute('lang', lang);

      // 5. Verify text direction (RTL vs LTR)
      const expectedDir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
      await expect(html).toHaveAttribute('dir', expectedDir);

      // 6. Verify the text translated correctly
      await expect(exploreBtn).toHaveText(expectedText);
    }
  });

  test('should filter book catalog based on selected genre filter tab', async ({ page }) => {
    const booksGrid = page.locator('#books-grid');
    
    // Ensure book cards are loaded
    const bookCards = booksGrid.locator('.book-card');
    const totalCount = await bookCards.count();
    expect(totalCount).toBeGreaterThan(0);

    // Click "Progression Fantasy" filter tab
    const progressionTab = page.locator('.filter-tab[data-filter="progression"]');
    await progressionTab.click();

    // Wait short time or check classes
    // Verify only progression cards are visible, others are hidden (have class 'hidden')
    const visibleCards = booksGrid.locator('.book-card:not(.hidden)');
    const visibleCount = await visibleCards.count();
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(totalCount);

    // Ensure all visible cards have data-genre="progression"
    for (let i = 0; i < visibleCount; i++) {
      const cardGenre = await visibleCards.nth(i).getAttribute('data-genre');
      expect(cardGenre).toBe('progression');
    }

    // Click "All Works" filter tab to reset
    const allTab = page.locator('.filter-tab[data-filter="all"]');
    await allTab.click();

    // All should be visible again
    const resetVisibleCount = await booksGrid.locator('.book-card:not(.hidden)').count();
    expect(resetVisibleCount).toBe(totalCount);
  });

  test('should collapse and expand the source audit panel', async ({ page }) => {
    const auditPanel = page.locator('#audit-panel');
    const toggleBtn = page.locator('#audit-toggle-btn');

    // Initially, it should be collapsed (aria-expanded="false" or not have class 'open')
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(auditPanel).not.toHaveClass(/open/);

    // Click to expand
    await toggleBtn.click();

    // Now it should be open
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(auditPanel).toHaveClass(/open/);
    
    // Verify that audit items are rendered
    const sourceItems = auditPanel.locator('.source-item');
    expect(await sourceItems.count()).toBeGreaterThan(0);

    // Click again to collapse
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(auditPanel).not.toHaveClass(/open/);
  });

});
