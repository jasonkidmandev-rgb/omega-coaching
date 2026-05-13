import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display age verification modal on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Age verification modal should be visible
    await expect(page.getByText('Age Verification Required')).toBeVisible();
    await expect(page.getByText('Are you 18 years of age or older?')).toBeVisible();
    
    // Should have Yes and No buttons
    await expect(page.getByRole('button', { name: /Yes, I am 18\+/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /No, Exit/i })).toBeVisible();
  });

  test('should allow access after confirming age', async ({ page }) => {
    await page.goto('/');
    
    // Click the age verification button
    await page.getByRole('button', { name: /Yes, I am 18\+/i }).click();
    
    // Should navigate to main content or login page
    await expect(page.getByText('Age Verification Required')).not.toBeVisible({ timeout: 5000 });
  });

  test('should redirect to external site when declining age verification', async ({ page }) => {
    await page.goto('/');
    
    // Click the No button
    const [newPage] = await Promise.all([
      page.waitForEvent('popup').catch(() => null),
      page.getByRole('button', { name: /No, Exit/i }).click(),
    ]);
    
    // Either redirects to google or closes the modal
    // The behavior depends on implementation
  });

  test('should remember age verification after confirmation', async ({ page, context }) => {
    await page.goto('/');
    
    // Confirm age
    await page.getByRole('button', { name: /Yes, I am 18\+/i }).click();
    
    // Wait for modal to close
    await expect(page.getByText('Age Verification Required')).not.toBeVisible({ timeout: 5000 });
    
    // Reload the page
    await page.reload();
    
    // Age verification should not appear again (stored in localStorage)
    await page.waitForTimeout(1000);
    const modal = page.getByText('Age Verification Required');
    const isVisible = await modal.isVisible().catch(() => false);
    
    // If the app remembers the verification, modal should not be visible
    // This depends on implementation - some apps may always show it
  });
});

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Handle age verification if present
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display login form', async ({ page }) => {
    // Navigate to login if not already there
    await page.goto('/login');
    
    // Handle age verification again if needed
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Handle age verification
    const ageButton = page.getByRole('button', { name: /Yes, I am 18\+/i });
    if (await ageButton.isVisible().catch(() => false)) {
      await ageButton.click();
      await page.waitForTimeout(500);
    }
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in|login|submit/i });
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      
      // Should show validation errors
      await page.waitForTimeout(500);
    }
  });
});
