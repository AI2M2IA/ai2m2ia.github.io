const { test, expect } = require('@playwright/test');

test.describe('PWA reader', () => {
  test('opens the library and reader from local static files', async ({ page }) => {
    await page.goto('/pwa/');
    await expect(page.getByText('31 de 31 livros')).toBeVisible();
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
    await expect(page.getByText('31 de 31 livros')).toBeVisible();
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
