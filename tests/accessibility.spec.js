const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility Tests (WCAG 2.1 AA)', () => {
  
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('PWA library should have no accessibility violations', async ({ page }) => {
    await page.goto('/pwa/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('work pages should have no accessibility violations', async ({ page }) => {
    const workPages = [
      '/works/level-zero/',
      '/works/analyze/',
      '/works/crater-gospel/',
      '/works/bell-that-remembers/',
      '/works/venomous-garden/',
      '/works/ashen-bloom/',
      '/works/the-princess-and-the-turtle/'
    ];

    for (const workPage of workPages) {
      await page.goto(workPage, { waitUntil: 'domcontentloaded' });
      await page.locator('main').waitFor();
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(
        accessibilityScanResults.violations,
        `Accessibility violations found on ${workPage}`
      ).toEqual([]);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = [];
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      headingLevels.push(level);
    }
    
    // Check that heading levels don't skip (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];
      
      // Allow same level or one level deeper, or any level shallower
      const isValidJump = currentLevel <= previousLevel + 1;
      expect(isValidJump, `Heading level skipped from h${previousLevel} to h${currentLevel}`).toBe(true);
    }
  });

  test('all images should have alt attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt, 'Image missing alt attribute').not.toBeNull();
    }
  });

  test('all form inputs should have labels', async ({ page }) => {
    await page.goto('/');
    
    const inputs = await page.locator('input, select, textarea').all();
    
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const hasAssociatedLabel = id && document.querySelector(`label[for="${id}"]`);
        
        return !!(ariaLabel || ariaLabelledBy || hasAssociatedLabel);
      });
      
      expect(hasLabel, 'Form input missing label').toBe(true);
    }
  });

  test('skip link should be present and functional', async ({ page }) => {
    await page.goto('/');
    
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
    
    // Tab to focus skip link
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    
    // Activate skip link
    await skipLink.press('Enter');
    
    // Verify focus moved to main content
    const mainContent = page.locator('#main-content, main');
    await expect(mainContent).toBeFocused();
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    const interactiveElements = await page.locator('button, a, input, select, textarea').all();
    
    for (const element of interactiveElements) {
      const isFocusable = await element.evaluate(el => {
        const tabIndex = el.getAttribute('tabindex');
        const isDisabled = el.hasAttribute('disabled');
        
        if (isDisabled) return true; // Disabled elements don't need to be focusable
        if (tabIndex && parseInt(tabIndex) < 0) return false;
        
        return true;
      });
      
      expect(isFocusable, 'Interactive element not keyboard accessible').toBe(true);
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    
    const focusableElements = await page.locator('button, a, input, select, textarea').all();
    
    // Test first few focusable elements
    const elementsToTest = focusableElements.slice(0, 5);
    
    for (const element of elementsToTest) {
      await element.focus();
      
      const hasFocusStyle = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        const outline = style.outline;
        const boxShadow = style.boxShadow;
        
        // Check if element has visible focus indicator
        return outline !== 'none' || boxShadow !== 'none';
      });
      
      expect(hasFocusStyle, 'Element missing visible focus indicator').toBe(true);
    }
  });

  test('ARIA attributes should be valid', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules([
        'aria-allowed-attr',
        'aria-hidden-body',
        'aria-required-attr',
        'aria-required-children',
        'aria-required-parent',
        'aria-roles',
        'aria-valid-attr',
        'aria-valid-attr-value'
      ])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

});
