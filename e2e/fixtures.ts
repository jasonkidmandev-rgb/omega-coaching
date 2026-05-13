import { test as base, expect } from '@playwright/test';
import path from 'path';

// Path to stored authentication state
const authFile = path.join(__dirname, '../.playwright/.auth/admin.json');

/**
 * Extended test fixture with authentication support
 * Use this for tests that require admin authentication
 */
export const test = base.extend<{
  authenticatedPage: typeof base;
}>({
  // Provide an authenticated page context
  authenticatedPage: async ({ browser }, use) => {
    // Try to use stored auth state, fall back to anonymous if not available
    let context;
    try {
      context = await browser.newContext({ storageState: authFile });
    } catch {
      console.log('No auth state found, using anonymous context');
      context = await browser.newContext();
    }
    const page = await context.newPage();
    await use(page as any);
    await context.close();
  },
});

export { expect };

/**
 * Helper to bypass age verification modal
 */
export async function bypassAgeVerification(page: any) {
  const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
  if (await ageButton.isVisible().catch(() => false)) {
    await ageButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: any): Promise<boolean> {
  // Check for common authenticated UI elements
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  const userMenu = page.locator('[data-testid="user-menu"]');
  const adminNav = page.locator('nav').filter({ hasText: /admin|dashboard/i });
  
  return (
    await logoutButton.isVisible().catch(() => false) ||
    await userMenu.isVisible().catch(() => false) ||
    await adminNav.isVisible().catch(() => false)
  );
}

/**
 * Helper to wait for page to be fully loaded
 */
export async function waitForPageLoad(page: any, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Helper to take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: any, name: string) {
  const screenshotPath = path.join(__dirname, '../.playwright/screenshots', `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}
