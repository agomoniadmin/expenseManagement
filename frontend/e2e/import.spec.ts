import { test, expect } from './auth.fixture';

test.describe('Import', () => {
  test('should display import page with upload form', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Import' }).click();
    await expect(page.getByRole('heading', { name: 'Import Statements' })).toBeVisible();
    await expect(page.getByText('Upload CSV')).toBeVisible();
  });

  test('should display import history section', async ({ authenticatedPage: page }) => {
    await page.goto('/import');
    await expect(page.getByText('Import History')).toBeVisible();
  });

  test('should have account selector for upload', async ({ authenticatedPage: page }) => {
    await page.goto('/import');
    await expect(page.locator('select').first()).toBeVisible();
  });
});
