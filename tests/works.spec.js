const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

const WORKS = [
  { slug: 'lets-build-on-aws-together', destination: 'https://www.amazon.com/dp/B0D5WSMD8D' },
  { slug: 'level-zero', destination: '/index.html#catalog' },
  { slug: 'analyze', destination: '/index.html#catalog' },
  { slug: 'bell-that-remembers', destination: '/index.html#catalog' },
  { slug: 'crater-gospel', destination: '/index.html#catalog' },
  { slug: 'venomous-garden', destination: '/index.html#catalog' },
  { slug: 'ashen-bloom', destination: '/index.html#catalog' },
  { slug: 'the-princess-and-the-turtle', destination: '/index.html#catalog' },
];

test.describe('Work pages', () => {
  const isExternalDestination = destination => /^https?:\/\/./.test(destination);

  const expectedDestination = destination =>
    isExternalDestination(destination) ? destination : `${BASE_URL}${destination}`;

  for (const { slug, destination } of WORKS) {
    test(`${slug} redirects to canonical destination`, async ({ page }) => {
      await page.goto(`/works/${slug}/`);

      await expect(page).toHaveURL(expectedDestination(destination));

      if (!isExternalDestination(destination)) {
        await expect(page).toHaveTitle(/AI\(2\)M\(2\)IA/);
        await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
        await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
        await expect(page.getByRole('link', { name: /catalog/i }).first()).toHaveAttribute('href', '#catalog');
      }
    });
  }

  test('home has no links to removed /works routes', async ({ page }) => {
    await page.goto('/');
    const staleWorkLinks = await page.$$eval('a[href]', links =>
      links
        .map(link => link.getAttribute('href'))
        .filter(href => href && href.startsWith('/works/'))
    );
    expect(staleWorkLinks).toEqual([]);
  });

  test('applies saved language on work pages', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ai2m2ia-lang', 'pt-BR'));

    await page.goto('/works/level-zero/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });

});
