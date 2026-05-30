const { test, expect } = require('@playwright/test');

test.describe('AI(2)M(2)IA Website Mobile E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the local server
    await page.goto('/');
    // Wait for the app to finish loading async data
    await page.waitForSelector('#books-grid:not(:has-text("Loading content"))');
  });

  test('should toggle mobile hamburger menu and update accessibility attributes', async ({ page }) => {
    const menuBtn = page.locator('#menu-btn');
    const siteNav = page.locator('.site-nav');

    // 1. Verify hamburger menu button is visible on mobile
    await expect(menuBtn).toBeVisible();

    // 2. Navigation menu should be hidden by default
    await expect(siteNav).not.toBeVisible();

    // 3. Click menu button to open navigation menu
    await menuBtn.click();
    await expect(siteNav).toBeVisible();
    await expect(siteNav).toHaveClass(/mobile-open/);
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // 4. Click menu button again to close
    await menuBtn.click();
    await expect(siteNav).not.toBeVisible();
    await expect(siteNav).not.toHaveClass(/mobile-open/);
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('should automatically close mobile menu when a navigation link is clicked', async ({ page }) => {
    const menuBtn = page.locator('#menu-btn');
    const siteNav = page.locator('.site-nav');
    
    // 1. Open the menu
    await menuBtn.click();
    await expect(siteNav).toBeVisible();

    // 2. Click a link inside the mobile menu (e.g., Catalog)
    const catalogLink = siteNav.locator('a[href="#catalog"]');
    await catalogLink.click();

    // 3. Menu should close automatically
    await expect(siteNav).not.toBeVisible();
    await expect(siteNav).not.toHaveClass(/mobile-open/);
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('should toggle theme between light and dark modes on mobile', async ({ page }) => {
    const html = page.locator('html');
    const themeBtn = page.locator('#theme-toggle');

    await expect(themeBtn).toBeVisible();

    const initialTheme = await html.getAttribute('data-theme');
    expect(initialTheme).toMatch(/^(dark|light)$/);

    const expectedToggledTheme = initialTheme === 'dark' ? 'light' : 'dark';

    await themeBtn.click();
    const toggledTheme = await html.getAttribute('data-theme');
    expect(toggledTheme).toBe(expectedToggledTheme);

    await themeBtn.click();
    const finalTheme = await html.getAttribute('data-theme');
    expect(finalTheme).toBe(initialTheme);
  });

  test('should switch language to Portuguese on mobile', async ({ page }) => {
    const html = page.locator('html');
    const langMenuBtn = page.locator('#lang-menu-btn');
    const langDropdown = page.locator('#lang-dropdown');
    const exploreBtn = page.locator('a[data-i18n="heroPrimaryCTA"]');

    await expect(langMenuBtn).toBeVisible();

    // Default language is English
    await expect(html).toHaveAttribute('lang', 'en');

    // Open dropdown
    await langMenuBtn.click();
    await expect(langDropdown).not.toHaveClass(/hidden/);

    // Click Portuguese option
    const option = page.locator('.lang-option[data-lang="pt-BR"]');
    await option.click();

    // Verify lang attribute and text update
    await expect(html).toHaveAttribute('lang', 'pt-BR');
    await expect(exploreBtn).toHaveText('Explorar Catálogo');
  });

  test('should stack books catalog in a single column layout on mobile', async ({ page }) => {
    const booksGrid = page.locator('#books-grid');
    const bookCards = booksGrid.locator('.book-card');
    
    const count = await bookCards.count();
    expect(count).toBeGreaterThan(1);

    const box1 = await bookCards.nth(0).boundingBox();
    const box2 = await bookCards.nth(1).boundingBox();

    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // In a single-column layout, the horizontal start positions (X) must align
    expect(Math.abs(box1.x - box2.x)).toBeLessThan(2);
    // The second card must be placed vertically below the first card
    expect(box2.y).toBeGreaterThan(box1.y);
  });

  test('should render character showcase in a two-column grid layout on mobile', async ({ page }) => {
    const charGrid = page.locator('.character-showcase-grid');
    const charCards = charGrid.locator('.character-card');

    const count = await charCards.count();
    expect(count).toBeGreaterThan(2);

    const box1 = await charCards.nth(0).boundingBox();
    const box2 = await charCards.nth(1).boundingBox();
    const box3 = await charCards.nth(2).boundingBox();

    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    expect(box3).not.toBeNull();

    // In a two-column layout, first and second cards are side-by-side
    expect(Math.abs(box1.y - box2.y)).toBeLessThan(2);
    expect(box2.x).toBeGreaterThan(box1.x);

    // Third card is in the next row, aligned in the first column directly below the first card
    expect(Math.abs(box1.x - box3.x)).toBeLessThan(2);
    expect(box3.y).toBeGreaterThan(box1.y);
  });

});
