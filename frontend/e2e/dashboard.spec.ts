import { test, expect } from './auth.fixture';

test.describe('Dashboard', () => {
  test('should display dashboard with summary cards', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Net Worth')).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Income' })).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: 'Expenses' })).toBeVisible();
  });

  test('should display charts section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Cash Flow')).toBeVisible();
    await expect(page.getByText('Expenses by Category')).toBeVisible();
  });

  test('should display accounts section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Accounts')).toBeVisible();
  });
});
