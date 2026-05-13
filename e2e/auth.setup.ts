import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.playwright/.auth/admin.json');

/**
 * Authentication setup for E2E tests
 * This file creates an authenticated session that can be reused across tests
 * 
 * To use authenticated tests:
 * 1. Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables
 * 2. Run: pnpm test:e2e --project=chromium
 */
setup('authenticate as admin', async ({ page }) => {
  // Skip if no test credentials are provided
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;
  
  if (!email || !password) {
    console.log('Skipping auth setup: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set');
    console.log('To run authenticated tests, set these environment variables');
    return;
  }

  // Navigate to the app
  await page.goto('/');
  
  // Handle age verification if present
  const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
  if (await ageButton.isVisible().catch(() => false)) {
    await ageButton.click();
    await page.waitForTimeout(500);
  }
  
  // Navigate to login page
  await page.goto('/login');
  
  // Handle age verification again if it appears
  if (await ageButton.isVisible().catch(() => false)) {
    await ageButton.click();
    await page.waitForTimeout(500);
  }
  
  // Wait for login form to be visible
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill in login credentials
  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
  const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));
  
  await emailInput.fill(email);
  await passwordInput.fill(password);
  
  // Submit the form
  const submitButton = page.getByRole('button', { name: /sign in|login|submit/i });
  await submitButton.click();
  
  // Wait for successful login - look for redirect to admin or dashboard
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 15000 });
  
  // Verify we're logged in
  await expect(page).toHaveURL(/\/(admin|dashboard)/);
  
  // Save the authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('Authentication state saved to:', authFile);
});
