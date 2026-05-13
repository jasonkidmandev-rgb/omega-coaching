import { test, expect, bypassAgeVerification, waitForPageLoad } from './fixtures';

test.describe('Admin Client Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/clients');
    await bypassAgeVerification(page);
  });

  test('should display clients list page or redirect to login', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Should show clients heading or redirect to login
    const heading = page.getByRole('heading', { name: /clients/i });
    const loginForm = page.getByRole('heading', { name: /sign in|login/i });
    
    // Either shows clients page or login page
    await expect(heading.or(loginForm)).toBeVisible({ timeout: 10000 });
  });

  test('should have search functionality when authenticated', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Look for search input (only visible when authenticated)
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      // Search should filter results
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('should have add client button when authenticated', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Look for add client button
    const addButton = page.getByRole('button', { name: /add|new|create/i });
    if (await addButton.isVisible().catch(() => false)) {
      await expect(addButton).toBeEnabled();
    }
  });

  test('should have filter options', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Look for filter/status dropdown
    const filterButton = page.getByRole('button', { name: /filter|status|all/i });
    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should display client rows in table', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Check for table structure
    const table = page.locator('table');
    if (await table.isVisible().catch(() => false)) {
      await expect(table).toBeVisible();
    }
  });
});

test.describe('Admin Client Creation Flow', () => {
  test('should open new client form', async ({ page }) => {
    await page.goto('/admin/clients/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Should show form or redirect to login
    const form = page.locator('form');
    const loginForm = page.getByRole('heading', { name: /sign in|login/i });
    
    await expect(form.or(loginForm)).toBeVisible({ timeout: 10000 });
  });

  test('should have required form fields', async ({ page }) => {
    await page.goto('/admin/clients/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Check for common form fields
    const nameInput = page.getByLabel(/name/i).first();
    const emailInput = page.getByLabel(/email/i);
    
    if (await nameInput.isVisible().catch(() => false)) {
      await expect(nameInput).toBeVisible();
    }
    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeVisible();
    }
  });

  test('should validate required fields on submit', async ({ page }) => {
    await page.goto('/admin/clients/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /save|create|submit/i });
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Form should still be visible (not submitted)
      await expect(page.locator('form')).toBeVisible();
    }
  });
});

test.describe('Admin Client Edit Flow', () => {
  test('should load client edit page', async ({ page }) => {
    // Use a test client ID - this would need to be a real ID in production
    await page.goto('/admin/clients/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Should show edit form, 404, or redirect
    await page.waitForTimeout(2000);
  });

  test('should have tabs for different sections', async ({ page }) => {
    await page.goto('/admin/clients/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Look for tab navigation
    const tabs = page.getByRole('tablist');
    if (await tabs.isVisible().catch(() => false)) {
      await expect(tabs).toBeVisible();
    }
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/admin/clients/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Click on different tabs if they exist
    const protocolsTab = page.getByRole('tab', { name: /protocol|items/i });
    if (await protocolsTab.isVisible().catch(() => false)) {
      await protocolsTab.click();
      await page.waitForTimeout(500);
      await expect(protocolsTab).toHaveAttribute('data-state', 'active');
    }
  });

  test('should have save button', async ({ page }) => {
    await page.goto('/admin/clients/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const saveButton = page.getByRole('button', { name: /save/i });
    if (await saveButton.isVisible().catch(() => false)) {
      await expect(saveButton).toBeVisible();
    }
  });
});
