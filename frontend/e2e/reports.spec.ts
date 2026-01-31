import { test, expect } from './auth.fixture';

test.describe('Reports', () => {
  test('should display reports page with charts', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  });

  test('should show net worth trend section', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Net Worth Trend')).toBeVisible();
  });

  test('should show cash flow and category sections', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await expect(page.getByText('Cash Flow Summary')).toBeVisible();
    await expect(page.getByText('Expense by Category')).toBeVisible();
  });
});
