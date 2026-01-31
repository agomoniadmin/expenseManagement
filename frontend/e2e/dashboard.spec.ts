import { test, expect } from './auth.fixture';

test.describe('Dashboard', () => {
  test('should display dashboard with summary cards', async ({ authenticatedPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Net Worth')).toBeVisible();
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByText('Total Expenses')).toBeVisible();
  });

  test('should display charts section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Cash Flow Overview')).toBeVisible();
    await expect(page.getByText('Expenses by Category')).toBeVisible();
  });

  test('should display accounts section', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Account Balances')).toBeVisible();
  });
});
