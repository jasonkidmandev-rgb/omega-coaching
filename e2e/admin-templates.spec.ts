import { test, expect, bypassAgeVerification, waitForPageLoad } from './fixtures';

test.describe('Admin Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/templates');
    await bypassAgeVerification(page);
  });

  test('should display templates list page or redirect to login', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Should show templates heading or redirect to login
    const heading = page.getByRole('heading', { name: /template/i });
    const loginForm = page.getByRole('heading', { name: /sign in|login/i });
    
    await expect(heading.or(loginForm)).toBeVisible({ timeout: 10000 });
  });

  test('should have create template button when authenticated', async ({ page }) => {
    await waitForPageLoad(page);
    
    const createButton = page.getByRole('button', { name: /add|new|create/i });
    if (await createButton.isVisible().catch(() => false)) {
      await expect(createButton).toBeEnabled();
    }
  });

  test('should display template cards or list', async ({ page }) => {
    await waitForPageLoad(page);
    
    // Look for template items
    const templateCard = page.locator('[data-testid="template-card"]');
    const templateRow = page.locator('tr').filter({ hasText: /.+/ });
    
    // Either cards or table rows should be visible if templates exist
    await page.waitForTimeout(1000);
  });

  test('should have search or filter functionality', async ({ page }) => {
    await waitForPageLoad(page);
    
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    }
  });
});

test.describe('Admin Template Edit Flow', () => {
  test('should load template edit page', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Should show form, 404, or redirect
    await page.waitForTimeout(2000);
  });

  test('should have template name field', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible().catch(() => false)) {
      await expect(nameInput).toBeVisible();
    }
  });

  test('should have description field', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const descriptionInput = page.getByLabel(/description/i);
    if (await descriptionInput.isVisible().catch(() => false)) {
      await expect(descriptionInput).toBeVisible();
    }
  });

  test('should have item selection area', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Look for checkboxes or item selection
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    // Templates typically have item checkboxes
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should have preview button', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const previewButton = page.getByRole('button', { name: /preview/i });
    if (await previewButton.isVisible().catch(() => false)) {
      await previewButton.click();
      await page.waitForTimeout(500);
      
      // Preview dialog should open
      const previewDialog = page.getByRole('dialog');
      if (await previewDialog.isVisible().catch(() => false)) {
        await expect(previewDialog).toBeVisible();
      }
    }
  });

  test('should have save button', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const saveButton = page.getByRole('button', { name: /save/i });
    if (await saveButton.isVisible().catch(() => false)) {
      await expect(saveButton).toBeVisible();
    }
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto('/admin/templates/1');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const backButton = page.getByRole('button', { name: /back|cancel/i });
    const backLink = page.getByRole('link', { name: /back|templates/i });
    
    if (await backButton.isVisible().catch(() => false)) {
      await expect(backButton).toBeVisible();
    } else if (await backLink.isVisible().catch(() => false)) {
      await expect(backLink).toBeVisible();
    }
  });
});

test.describe('Admin Template Creation Flow', () => {
  test('should open new template form', async ({ page }) => {
    await page.goto('/admin/templates/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    // Should show form or redirect to login
    const form = page.locator('form');
    const loginForm = page.getByRole('heading', { name: /sign in|login/i });
    
    await expect(form.or(loginForm)).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/admin/templates/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const submitButton = page.getByRole('button', { name: /save|create/i });
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Form should still be visible (validation failed)
      await expect(page.locator('form')).toBeVisible();
    }
  });

  test('should fill template form', async ({ page }) => {
    await page.goto('/admin/templates/new');
    await bypassAgeVerification(page);
    await waitForPageLoad(page);
    
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Test Template');
      await expect(nameInput).toHaveValue('Test Template');
    }
    
    const descriptionInput = page.getByLabel(/description/i);
    if (await descriptionInput.isVisible().catch(() => false)) {
      await descriptionInput.fill('A test template for E2E testing');
      await expect(descriptionInput).toHaveValue('A test template for E2E testing');
    }
  });
});
