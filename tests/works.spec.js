const { test, expect } = require('@playwright/test');

const WORKS = [
  'level-zero',
  'analyze',
  'bell-that-remembers',
  'crater-gospel',
  'venomous-garden',
  'ashen-bloom',
  'the-princess-and-the-turtle',
];

test.describe('Work pages', () => {
  for (const slug of WORKS) {
    test(`${slug} renders securely and toggles theme`, async ({ page }) => {
      await page.goto(`/works/${slug}/`);

      await expect(page).toHaveTitle(/AI\(2\)M\(2\)IA/);
      await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
      
      // Security requirement: no unsafe-inline in style-src
      const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
      expect(csp).not.toContain("'unsafe-inline'");
      
      // Security requirement: img-src restricted to known origins
      expect(csp).toContain("img-src 'self' data: https://ai2m2ia.github.io");
      expect(csp).not.toMatch(/img-src[^;]*https:(?!\/\/ai2m2ia\.github\.io)/);
      
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin-when-cross-origin');
      await expect(page.getByRole('link', { name: /catalog/i }).first()).toHaveAttribute('href', /index\.html#catalog/);

      const html = page.locator('html');
      const initialTheme = await html.getAttribute('data-theme');
      expect(initialTheme).toMatch(/^(dark|light)$/);

      await page.locator('#theme-toggle').click();
      const toggledTheme = await html.getAttribute('data-theme');
      expect(toggledTheme).toBe(initialTheme === 'dark' ? 'light' : 'dark');
    });
  }

  test('applies saved language on work pages', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ai2m2ia-lang', 'pt-BR'));

    await page.goto('/works/level-zero/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  });
});
