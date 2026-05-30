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
});
