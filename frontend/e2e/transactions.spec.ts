import { test, expect } from './auth.fixture';

test.describe('Transactions', () => {
  test('should display transactions page with filters', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('should create a transaction with line items', async ({ authenticatedPage: page }) => {
    // Create account first
    await page.goto('/accounts/new');
    await page.getByLabel('Account Name').fill('Txn Test Account');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Create transaction
    await page.goto('/transactions/new');
    await page.locator('select[name="accountId"]').selectOption({ label: 'Txn Test Account' });
    await page.getByLabel('Merchant').fill('Test Grocery');
    await page.getByLabel('Total Amount').fill('42.50');

    // Add line item
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.locator('input[name="lineItems.0.name"]').fill('Milk');
    await page.locator('input[name="lineItems.0.unitPrice"]').fill('4.99');

    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page).toHaveURL('/transactions');
  });

  test('should search and filter transactions', async ({ authenticatedPage: page }) => {
    await page.goto('/transactions');
    // Verify date filters are present
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('should navigate to transfer page', async ({ authenticatedPage: page }) => {
    await page.goto('/transactions/transfer');
    await expect(page.getByRole('heading', { name: 'Transfer Between Accounts' })).toBeVisible();
  });
});
