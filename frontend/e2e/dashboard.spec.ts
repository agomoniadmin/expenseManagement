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

  test('should show Today for transactions created today', async ({ authenticatedPage: page }) => {
    // Create an account first
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Checking Account' }).click();
    await page.getByLabel('Account Name *').fill('Dashboard Test Account');
    await page.getByLabel('Financial Institution *').fill('Test Bank');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Create a transaction with today's date
    await page.goto('/transactions/new');
    await page.locator('select[name="accountId"]').selectOption({ label: 'Dashboard Test Account' });
    await page.getByLabel('Merchant').fill('Today Test Merchant');
    await page.getByLabel('Total Amount').fill('99.99');
    // Date field defaults to today, so no need to change it
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await page.waitForURL('/transactions');

    // Go to dashboard and verify the transaction shows "Today"
    await page.goto('/dashboard');
    await expect(page.getByText('Recent Transactions')).toBeVisible();
    await expect(page.getByText('Today Test Merchant')).toBeVisible();
    // The transaction created today should show "Today" not "Yesterday"
    const transactionRow = page.locator('div').filter({ hasText: 'Today Test Merchant' }).first();
    await expect(transactionRow.getByText('Today', { exact: true })).toBeVisible();
  });
});
