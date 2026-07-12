const { test, expect } = require('@playwright/test');

test.describe('Static API', () => {
  test('serves the books catalog from /api/catalog.json', async ({ request }) => {
    const response = await request.get('/api/catalog.json');
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');

    const catalog = await response.json();
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.apiBaseUrl).toBe('https://ai2m2ia.github.io');
    expect(catalog.apiPrefix).toBe('/api');
    expect(catalog.books.length).toBeGreaterThan(0);
    expect(catalog.books[0].manifestUrl).toContain('/api/books/');
  });
});
