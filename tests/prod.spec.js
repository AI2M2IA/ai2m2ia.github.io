const { test, expect } = require('@playwright/test');

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://ai2m2ia.github.io';

function absolute(path) {
  return new URL(path, PROD_BASE_URL).toString();
}

test.describe('Production smoke checks', () => {
  test('serves the public author site', async ({ request }) => {
    const response = await request.get(absolute('/'));
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');

    const body = await response.text();
    expect(body).toContain('AI(2)M(2)IA');
    expect(body).toContain('pwa/');
    expect(body).toContain('http-equiv="Content-Security-Policy"');
    expect(body).toContain('name="referrer" content="strict-origin-when-cross-origin"');
  });

  test('serves a valid public API catalog with spoke URLs', async ({ request }) => {
    const catalogResponse = await request.get(absolute('/api/catalog.json'));
    expect(catalogResponse.status()).toBe(200);
    expect(catalogResponse.headers()['content-type']).toContain('application/json');

    const catalog = await catalogResponse.json();
    expect(catalog.schemaVersion).toBe(2);
    expect(catalog.apiBaseUrl).toBe(PROD_BASE_URL);
    expect(catalog.apiPrefix).toBe('/api');
    expect(catalog.books.length).toBeGreaterThan(0);

    const firstBook = catalog.books[0];
    expect(firstBook.id).toBeTruthy();
    expect(firstBook.title).toBeTruthy();
    expect(firstBook.spokeUrl).toMatch(/^https:\/\/ai2m2ia\.github\.io\//);
  });

  test('loads the public PWA hub and manifest', async ({ page, request }) => {
    const manifestResponse = await request.get(absolute('/pwa/manifest.webmanifest'));
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()['content-type']).toContain('manifest');

    const webManifest = await manifestResponse.json();
    expect(webManifest.name).toContain('AI(2)M(2)IA');
    expect(webManifest.start_url).toBe('./#library');

    await page.goto(absolute('/pwa/'));
    await expect(page).toHaveTitle(/AI\(2\)M\(2\)IA Books/);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
    await expect(page.getByRole('heading', { name: "Let's Build on AWS Together" })).toBeVisible();
  });
});
