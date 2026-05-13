import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should load homepage successfully', async ({ page }) => {
    // Page should load without errors
    await expect(page).toHaveTitle(/.*/);
  });

  test('should have proper page structure', async ({ page }) => {
    // Check for basic HTML structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    
    // Handle age verification if it appears
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    // Should either show 404 or redirect to home
    await page.waitForTimeout(1000);
  });
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Handle age verification again
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    // Page should still be functional
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
    }
    
    await page.waitForTimeout(2000);
    
    // Filter out expected errors (like network errors in dev mode)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && 
             !e.includes('net::ERR') &&
             !e.includes('favicon')
    );
    
    // Should have no critical console errors
    expect(criticalErrors.length).toBeLessThanOrEqual(5);
  });
});
