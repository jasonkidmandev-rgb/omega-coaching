import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * 
 * These tests capture screenshots of key pages and compare them against baseline images.
 * Run with: pnpm test:e2e --project=visual
 * 
 * To update baselines: pnpm test:e2e --project=visual --update-snapshots
 */

test.describe('Visual Regression - Public Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('homepage visual appearance', async ({ page }) => {
    await page.goto('/');
    
    // Handle age verification if present
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        // Mask dynamic content that changes between runs
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="dynamic-content"]'),
      ],
    });
  });

  test('age verification modal visual appearance', async ({ page }) => {
    // Clear any stored age verification
    await page.context().clearCookies();
    await page.goto('/');
    
    // Wait for age verification modal
    await page.waitForTimeout(1000);
    
    // Take screenshot of the modal
    const modal = page.locator('[role="dialog"]').or(page.locator('.age-verification'));
    if (await modal.isVisible().catch(() => false)) {
      await expect(modal).toHaveScreenshot('age-verification-modal.png', {
        animations: 'disabled',
      });
    }
  });

  test('login page visual appearance', async ({ page }) => {
    await page.goto('/login');
    
    // Handle age verification if present
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('store page visual appearance', async ({ page }) => {
    await page.goto('/store');
    
    // Handle age verification if present
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('store-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('navigation header visual appearance', async ({ page }) => {
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    
    // Screenshot just the header
    const header = page.locator('header').first();
    if (await header.isVisible().catch(() => false)) {
      await expect(header).toHaveScreenshot('navigation-header.png', {
        animations: 'disabled',
      });
    }
  });

  test('footer visual appearance', async ({ page }) => {
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    
    // Screenshot just the footer
    const footer = page.locator('footer').first();
    if (await footer.isVisible().catch(() => false)) {
      await expect(footer).toHaveScreenshot('footer.png', {
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Responsive Design', () => {
  test('mobile viewport homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('tablet viewport homepage', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('wide desktop viewport homepage', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-wide-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Error States', () => {
  test('404 page visual appearance', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/non-existent-page-12345');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('404-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test('homepage in dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Set dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
