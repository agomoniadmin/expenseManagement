import { test, expect } from './auth.fixture';

test.describe('Reconciliation', () => {
  test('should display reconciliation page', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Reconcile' }).click();
    await expect(page.getByRole('heading', { name: 'Reconciliation' })).toBeVisible();
  });

  test('should show empty state when no candidates', async ({ authenticatedPage: page }) => {
    await page.goto('/reconciliation');
    await expect(page.getByText('No reconciliation candidates found')).toBeVisible();
  });
});
