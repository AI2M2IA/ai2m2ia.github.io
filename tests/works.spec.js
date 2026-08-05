const { test, expect } = require('@playwright/test');

const BASE_URL = `http://localhost:${process.env.AI2M2IA_TEST_PORT || '34781'}`;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * lets-build-on-aws-together is the only work with an independent spoke
 * deployment (see api/catalog.json's hub-and-spoke model). Its /works/ page
 * exists purely to forward readers to that spoke — it legitimately redirects.
 */
const REDIRECTS = [
  { slug: 'lets-build-on-aws-together', destination: 'https://ai2m2ia.github.io/book-lets-build-on-aws-together/' },
];

/*
 * Every other work now has a real, standalone page (restored in Etapa 2 —
 * these previously redirected to /index.html#catalog, hiding fully-built
 * content behind an instant refresh).
 */
const REAL_PAGES = [
  { slug: 'level-zero', title: 'Level Zero' },
  { slug: 'analyze', title: 'Analyze' },
  { slug: 'bell-that-remembers', title: 'The Bell That Remembers' },
  { slug: 'crater-gospel', title: 'The Crater Gospel' },
  { slug: 'venomous-garden', title: 'The Venomous Garden' },
  { slug: 'ashen-bloom', title: 'Ashen Bloom' },
  { slug: 'the-princess-and-the-turtle', title: 'The Princess and the Turtle' },
];

test.describe('Work pages', () => {

  for (const { slug, destination } of REDIRECTS) {
    test(`${slug} redirects to canonical destination`, async ({ page }) => {
      await page.goto(`/works/${slug}/`);
      await expect(page).toHaveURL(destination);
    });
  }

  for (const { slug, title } of REAL_PAGES) {
    test(`${slug} is a real, reachable page`, async ({ page }) => {
      await page.goto(`/works/${slug}/`);

      // No redirect — the page itself loads and stays put.
      await expect(page).toHaveURL(`${BASE_URL}/works/${slug}/`);
      await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);

      await expect(page).toHaveTitle(new RegExp(escapeRegex(title)));
      await expect(page).toHaveTitle(/AI\(2\)M\(2\)IA/);

      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://ai2m2ia.github.io/works/${slug}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

      // Real page content rendered, not a blank shell.
      await expect(page.locator('.work-page-hero')).toBeVisible();

      // Every restored page links back to the catalog.
      await expect(page.getByRole('link', { name: /catalog/i }).first()).toHaveAttribute('href', '../../index.html#catalog');
    });
  }

  test('catalog cards link to each restored work page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#books-grid:not(:has-text("Loading content"))');

    for (const { slug } of REAL_PAGES) {
      const link = page.locator(`.book-card a.book-link[href="works/${slug}/"]`);
      await expect(link, `expected a catalog link to works/${slug}/`).toHaveCount(1);
    }

    // The AWS book keeps its external spoke link only — no redundant internal one,
    // since /works/lets-build-on-aws-together/ just redirects back out to the same place.
    const awsCard = page.locator('.book-card[data-id="lets-build-on-aws-together"]');
    await expect(awsCard.locator('a.book-link[href^="works/"]')).toHaveCount(0);
  });

  test('reflects the saved site language on <html> like every other page, but keeps page content in English', async ({ page }) => {
    // theme-init.js syncs <html lang> from the saved preference on every
    // page (sources.html — another static, untranslated page — does the
    // same) to avoid a flash of the wrong lang attribute on load. Work pages
    // are static content pages though: the book title/summary/volumes stay
    // in English regardless, consistent with the KDP-published content
    // itself being English-only. This test pins down both halves so a
    // future change can't quietly break either one.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ai2m2ia-lang', 'pt-BR'));

    await page.goto('/works/level-zero/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('.work-title')).toHaveText('Level Zero');
  });

});
