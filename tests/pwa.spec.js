const { test, expect } = require('@playwright/test');

test.describe('PWA hub launcher', () => {
  test('exposes installable manifest icons', async ({ request }) => {
    const response = await request.get('/pwa/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        src: 'assets/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      }),
      expect.objectContaining({
        src: 'assets/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      }),
    ]));

    for (const icon of manifest.icons.filter(item => item.type === 'image/png')) {
      const iconResponse = await request.get(`/pwa/${icon.src}`);
      expect(iconResponse.ok()).toBeTruthy();
      expect(iconResponse.headers()['content-type']).toContain('image/png');
    }
  });

  test('opens the library and shows book cards with spoke links', async ({ page }) => {
    await page.goto('/pwa/');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
    await expect(page.getByText('1 of 1 books')).toBeVisible();
    await expect(page.locator('#ui-language')).toHaveValue('en');
    await expect(page.locator('#ui-language option')).toHaveCount(23);
    await expect(page.getByRole('heading', { name: "Let's Build on AWS Together" })).toBeVisible();

    const readLink = page.locator('.read-link').first();
    await expect(readLink).toBeVisible();
    await expect(readLink).toHaveAttribute('href', 'https://ai2m2ia.github.io/book-lets-build-on-aws-together/');
    await expect(readLink).toHaveAttribute('rel', 'external');
  });

  test('supports UI language switching with RTL', async ({ page }) => {
    await page.goto('/pwa/');
    const html = page.locator('html');

    await page.locator('#ui-language').selectOption('en');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { name: "Let's Build on AWS Together" })).toBeVisible();

    await page.locator('#ui-language').selectOption('ar');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');

    await page.locator('#ui-language').selectOption('ja');
    await expect(html).toHaveAttribute('lang', 'ja');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('ignores unsupported API origins from query string', async ({ page }) => {
    const externalRequests = [];
    page.on('request', request => {
      if (request.url().startsWith('https://evil.example/')) {
        externalRequests.push(request.url());
      }
    });

    await page.goto('/pwa/?api=https://evil.example#library');
    await expect(page.getByText('1 of 1 books')).toBeVisible();
    expect(externalRequests).toEqual([]);
  });

  test('rejects typosquatting and unauthorized origins', async ({ page }) => {
    const externalRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('https://ai2mla.github.io/') ||
          url.startsWith('http://ai2m2ia.github.io/') ||
          url.startsWith('https://ai2m2ia.github.io.evil.com/')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/pwa/?api=https://ai2mla.github.io#library');
    await expect(page.getByText('1 of 1 books')).toBeVisible();

    await page.goto('/pwa/?api=http://ai2m2ia.github.io#library');
    await expect(page.getByText('1 of 1 books')).toBeVisible();

    await page.goto('/pwa/?api=https://ai2m2ia.github.io.evil.com#library');
    await expect(page.getByText('1 of 1 books')).toBeVisible();

    expect(externalRequests).toEqual([]);
  });

  test('renders book cards that link to spoke PWAs with valid metadata', async ({ page }) => {
    const catalog = {
      schemaVersion: 2,
      generatedAt: '2026-07-23T00:00:00Z',
      apiBaseUrl: 'https://ai2m2ia.github.io',
      apiPrefix: '/api',
      books: [{
        id: 'test-book',
        title: 'Test Book',
        format: 'PROSE',
        spokeUrl: 'https://ai2m2ia.github.io/book-test/',
        languages: ['en'],
        author: 'AI(2)M(2)IA',
        coverUrl: null,
        description: 'A test book for launcher verification.',
      }],
    };

    await page.route('**/api/catalog.json', route => route.fulfill({ json: catalog }));
    await page.goto('/pwa/');

    await expect(page.getByText('1 of 1 books')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test Book' })).toBeVisible();

    const readLink = page.locator('.read-link').first();
    await expect(readLink).toHaveAttribute('href', 'https://ai2m2ia.github.io/book-test/');
    await expect(readLink).toHaveText('Read');
  });

  test('does not render any reader view or download controls', async ({ page }) => {
    await page.goto('/pwa/');

    await expect(page.locator('#reader-view')).toHaveCount(0);
    await expect(page.locator('.download-button')).toHaveCount(0);
    await expect(page.locator('.wishlist-button')).toHaveCount(0);
    await expect(page.locator('.library-mode')).toHaveCount(0);
    await expect(page.locator('#chapter-body')).toHaveCount(0);
  });

  test('rejects non-HTTPS spoke URLs in catalog data', async ({ page }) => {
    const catalog = {
      schemaVersion: 2,
      generatedAt: '2026-07-23T00:00:00Z',
      apiBaseUrl: 'https://ai2m2ia.github.io',
      apiPrefix: '/api',
      books: [{
        id: 'insecure-book',
        title: 'Insecure Book',
        spokeUrl: 'http://ai2m2ia.github.io/book-insecure/',
        languages: ['en'],
        author: 'AI(2)M(2)IA',
        coverUrl: null,
        description: 'Should be rejected.',
      }],
    };

    await page.route('**/api/catalog.json', route => route.fulfill({ json: catalog }));
    await page.goto('/pwa/');

    await expect(page.getByText('0 of 0 books')).toBeVisible();
    await expect(page.locator('.read-link')).toHaveCount(0);
  });
});
