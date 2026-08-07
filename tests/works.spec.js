const { test, expect } = require('@playwright/test');
const { SPOKE_WORKS, SPOKE_WORK_IDS } = require('./spoke-works');

const BASE_URL = `http://localhost:${process.env.AI2M2IA_TEST_PORT || '34781'}`;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * Works with their own spoke deployment (see ./spoke-works.js) redirect out
 * to it instead of showing an in-site page.
 */
const REDIRECTS = SPOKE_WORKS.map(({ id, destination }) => ({ slug: id, destination }));

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

      // Open Graph: enough for a shared link to render a real card, even
      // without og:image (no cover-art/social-image decision made yet).
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'book');
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://ai2m2ia.github.io/works/${slug}/`);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);

      // Structured data: a Book + BreadcrumbList graph, no book content —
      // just the same catalog metadata already public elsewhere on the page.
      const ldJson = await page.locator('script[type="application/ld+json"]').first().textContent();
      const ld = JSON.parse(ldJson);
      const book = ld['@graph'].find(node => node['@type'] === 'Book');
      const breadcrumbs = ld['@graph'].find(node => node['@type'] === 'BreadcrumbList');

      expect(book).toBeTruthy();
      expect(book.name).toBe(title);
      expect(book.url).toBe(`https://ai2m2ia.github.io/works/${slug}/`);
      expect(book.author['@id']).toBe('https://ai2m2ia.github.io/#author');

      expect(breadcrumbs).toBeTruthy();
      const lastCrumb = breadcrumbs.itemListElement.at(-1);
      expect(lastCrumb.name).toBe(title);
      expect(lastCrumb.item).toBe(`https://ai2m2ia.github.io/works/${slug}/`);
    });
  }

  test('catalog cards link to each restored work page', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#books-grid:not(:has-text("Loading content"))');

    for (const { slug } of REAL_PAGES) {
      const link = page.locator(`.book-card a.book-link[href="works/${slug}/"]`);
      await expect(link, `expected a catalog link to works/${slug}/`).toHaveCount(1);
    }

    // Works with their own spoke deployment keep their external link only —
    // no redundant internal one, since their /works/<slug>/ page just
    // redirects back out to that same spoke.
    for (const id of SPOKE_WORK_IDS) {
      const spokeCard = page.locator(`.book-card[data-id="${id}"]`);
      await expect(spokeCard.locator('a.book-link[href^="works/"]')).toHaveCount(0);
    }
  });

  test('REAL_PAGES + SPOKE_WORKS covers every work in data/works.json', async () => {
    // Guards against a new entry in data/works.json going untested because
    // nobody remembered to add it to one of these two lists.
    const works = require('../data/works.json');
    const knownIds = new Set([...REAL_PAGES.map(w => w.slug), ...SPOKE_WORK_IDS]);
    const actualIds = works.workFamilies.map(w => w.id);

    expect(actualIds.filter(id => !knownIds.has(id))).toEqual([]);
    expect([...knownIds].filter(id => !actualIds.includes(id))).toEqual([]);
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
