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

  test('should navigate to transaction details when clicking transaction in Recent Transactions', async ({ authenticatedPage: page }) => {
    // First create an account
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Checking Account' }).click();
    await page.getByLabel('Account Name *').fill('Transaction Link Test Account');
    await page.getByLabel('Financial Institution *').fill('Test Bank');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Create a transaction
    await page.goto('/transactions/new');
    await page.locator('select[name="accountId"]').selectOption({ label: 'Transaction Link Test Account' });
    await page.getByLabel('Merchant').fill('Dashboard Click Test Merchant');
    await page.getByLabel('Total Amount').fill('123.45');
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await page.waitForURL('/transactions');

    // Go to dashboard
    await page.goto('/dashboard');
    await expect(page.getByText('Recent Transactions')).toBeVisible();

    // Click on the transaction merchant name in Recent Transactions card
    const transactionLink = page.getByRole('link', { name: 'Dashboard Click Test Merchant' });
    await expect(transactionLink).toBeVisible();
    await transactionLink.click();

    // Verify we're on the transaction details page
    await expect(page).toHaveURL(/\/transactions\/[a-f0-9-]+$/);
    // Use heading selector to be specific
    await expect(page.getByRole('heading', { name: 'Dashboard Click Test Merchant' })).toBeVisible();
  });

  test('should navigate to account details when clicking account name in Account Balances', async ({ authenticatedPage: page }) => {
    // First create an account
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Savings Account' }).click();
    await page.getByLabel('Account Name *').fill('Dashboard Link Test Account');
    await page.getByLabel('Financial Institution *').fill('Test Bank');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Go to dashboard
    await page.goto('/dashboard');
    await expect(page.getByText('Account Balances')).toBeVisible();

    // Click on the account name in Account Balances card
    const accountLink = page.getByRole('link', { name: 'Dashboard Link Test Account' });
    await expect(accountLink).toBeVisible();
    await accountLink.click();

    // Verify we're on the account details page
    await expect(page).toHaveURL(/\/accounts\/[a-f0-9-]+$/);
    await expect(page.getByText('Dashboard Link Test Account')).toBeVisible();
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
