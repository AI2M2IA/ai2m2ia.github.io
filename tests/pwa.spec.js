const { test, expect } = require('@playwright/test');

test.describe('PWA reader', () => {
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

  test('opens the library and reader from local static files', async ({ page }) => {
    await page.goto('/pwa/');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
    await expect(page.getByText('31 of 31 books')).toBeVisible();
    await expect(page.getByRole('heading', { name: "Let's Build on AWS Together" })).toBeVisible();

    await page.goto('/pwa/#book=lets-learn-aws-together');
    await expect(page.getByRole('button', { name: 'Chapter 0: Before We Begin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chapter 0: Before We Begin' })).toBeVisible();
  });

  test('ignores unsupported API origins from query string', async ({ page }) => {
    const externalRequests = [];
    page.on('request', request => {
      if (request.url().startsWith('https://evil.example/')) {
        externalRequests.push(request.url());
      }
    });

    await page.goto('/pwa/?api=https://evil.example#library');
    await expect(page.getByText('31 of 31 books')).toBeVisible();
    expect(externalRequests).toEqual([]);
  });

  test('renders malicious prose as text instead of executable HTML', async ({ page }) => {
    const catalog = {
      schemaVersion: 1,
      generatedAt: '2026-05-30T00:00:00Z',
      apiBaseUrl: 'https://ai2m2ia.github.io',
      apiPrefix: '/api',
      books: [{
        id: 'malicious-book',
        title: 'Malicious Book',
        format: 'PROSE',
        manifestUrl: 'https://ai2m2ia.github.io/api/books/malicious-book/content.json',
        languages: ['en'],
        author: 'Security Test',
        coverUrl: null,
        description: 'Regression fixture.',
        links: {},
      }],
    };
    const content = {
      schemaVersion: 1,
      generatedAt: '2026-05-30T00:00:00Z',
      bookId: 'malicious-book',
      format: 'PROSE',
      language: 'en',
      revision: '2026-05-30',
      chapters: [{
        index: 0,
        title: 'Payloads',
        text: '## <img src=x onerror="window.XSSFLAG = true">\\n\\n<script>window.XSSFLAG = true</script>\\n\\n**safe bold** and `safe code`',
        images: [],
      }],
    };

    await page.route('**/api/catalog.json', route => route.fulfill({ json: catalog }));
    await page.route('**/api/books/malicious-book/content.json', route => route.fulfill({ json: content }));

    await page.goto('/pwa/#book=malicious-book');

    await expect(page.getByRole('heading', { name: 'Payloads' })).toBeVisible();
    await expect(page.locator('#chapter-body img')).toHaveCount(0);
    await expect(page.locator('#chapter-body script')).toHaveCount(0);
    await expect(page.locator('#chapter-body')).toContainText('<img src=x onerror="window.XSSFLAG = true">');
    await expect(page.locator('#chapter-body')).toContainText('<script>window.XSSFLAG = true</script>');
    await expect(page.locator('#chapter-body strong')).toHaveText('safe bold');
    expect(await page.evaluate(() => window.XSSFLAG)).toBeUndefined();
  });
});
