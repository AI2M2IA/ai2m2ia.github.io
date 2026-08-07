const { test, expect } = require('@playwright/test');

test.describe('404 page', () => {
  test('renders a branded not-found page, excluded from indexing', async ({ page }) => {
    await page.goto('/404.html');

    await expect(page).toHaveTitle(/Page Not Found/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await expect(page.locator('h1')).toBeVisible();

    // Escape hatches back into the real site, not a dead end.
    await expect(page.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', 'index.html');
    await expect(page.getByRole('link', { name: 'Browse the Catalog' })).toHaveAttribute('href', 'index.html#catalog');
  });
});

test.describe('Open Graph coverage beyond the homepage', () => {
  test('sources.html carries its own OG/Twitter tags instead of inheriting none', async ({ page }) => {
    await page.goto('/sources.html');

    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://ai2m2ia.github.io/sources.html');
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
  });

  test('homepage declares its actual served locale', async ({ page }) => {
    await page.goto('/');

    // og:locale:alternate is intentionally NOT declared: with i18n applied
    // client-side only (no separate URL per language), claiming 22 alternate
    // locales for crawlers that never see them would be inaccurate — same
    // open question as hreflang, tracked in the Phase 3 issue.
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(page.locator('meta[property="og:locale\\:alternate"]')).toHaveCount(0);
  });
});
