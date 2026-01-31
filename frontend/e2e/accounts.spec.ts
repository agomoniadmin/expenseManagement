import { test, expect } from './auth.fixture';

test.describe('Accounts', () => {
  test('should navigate to accounts page', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Accounts' }).click();
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
  });

  test('should create a new checking account', async ({ authenticatedPage: page }) => {
    await page.goto('/accounts/new');

    // Verify progress stepper is visible (use exact match to avoid duplicate matches)
    await expect(page.getByText('Account Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Account Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Review & Create', { exact: true })).toBeVisible();

    // Step 1: Select account type - click on the radio button for Checking Account
    await page.getByRole('radio', { name: 'Checking Account' }).click();

    // Step 2: Fill in account details (form appears after type selection)
    await page.getByLabel('Account Name *').fill('E2E Checking');
    await page.getByLabel('Financial Institution *').fill('Test Bank');

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/accounts');
    await expect(page.getByText('E2E Checking')).toBeVisible();
  });

  test('should create a new credit card account', async ({ authenticatedPage: page }) => {
    await page.goto('/accounts/new');

    // Select Credit Card type using radio button
    await page.getByRole('radio', { name: 'Credit Card' }).click();

    // Fill credit card specific fields
    await page.getByLabel('Account Name *').fill('E2E Credit Card');
    await page.getByLabel('Financial Institution *').fill('Chase Bank');
    await page.getByLabel('Last 4 Digits of Card').fill('1234');
    await page.getByLabel('Credit Limit *').fill('5000');

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/accounts');
    await expect(page.getByText('E2E Credit Card')).toBeVisible();
  });

  test('should view account detail with ledger', async ({ authenticatedPage: page }) => {
    // Create account first
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Checking Account' }).click();
    await page.getByLabel('Account Name *').fill('Detail Test Account');
    await page.getByLabel('Financial Institution *').fill('Test Bank');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/accounts');

    // Click on the account
    await page.getByText('Detail Test Account').click();
    await expect(page.getByText('Current Balance')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ledger/ })).toBeVisible();
  });

  test('should display all account type options', async ({ authenticatedPage: page }) => {
    await page.goto('/accounts/new');

    // Verify all five account group headings are displayed
    await expect(page.getByRole('heading', { name: 'Banking Account' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Credit Account' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Investment Account' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assets & Liabilities' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cash' })).toBeVisible();

    // Verify subtypes exist as radio button options
    await expect(page.getByRole('radio', { name: 'Checking Account' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Savings Account' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Money Market' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Certificate of Deposit' })).toBeVisible();

    // Verify subtypes in Credit group
    await expect(page.getByRole('radio', { name: 'Credit Card' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Line of Credit' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Store Credit' })).toBeVisible();

    // Verify Cash option
    await expect(page.getByRole('radio', { name: 'Cash' })).toBeVisible();
  });

  test('should create a new cash account', async ({ authenticatedPage: page }) => {
    await page.goto('/accounts/new');

    // Select Cash type
    await page.getByRole('radio', { name: 'Cash' }).click();

    // Fill in account details (no institution required for cash)
    await page.getByLabel('Account Name *').fill('E2E Wallet');
    await page.getByLabel('Current Balance').fill('500');

    // Submit
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL('/accounts');
    await expect(page.getByText('E2E Wallet')).toBeVisible();
  });

  test('should cancel and return to accounts list', async ({ authenticatedPage: page }) => {
    await page.goto('/accounts/new');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/accounts');
  });

  test('should filter accounts by tab and group in All Accounts view', async ({ authenticatedPage: page }) => {
    // Create a Checking account (Banking group)
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Checking Account' }).click();
    await page.getByLabel('Account Name *').fill('Filter Test Checking');
    await page.getByLabel('Financial Institution *').fill('Test Bank');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Create a Cash account (Cash group)
    await page.goto('/accounts/new');
    await page.getByRole('radio', { name: 'Cash' }).click();
    await page.getByLabel('Account Name *').fill('Filter Test Cash');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForURL('/accounts');

    // Verify All Accounts tab shows both accounts with group headers
    await expect(page.getByRole('button', { name: 'All Accounts' })).toHaveClass(/text-primary-600/);
    await expect(page.getByText('Filter Test Checking')).toBeVisible();
    await expect(page.getByText('Filter Test Cash')).toBeVisible();
    // Verify group headers are visible
    await expect(page.locator('h2').filter({ hasText: 'Banking' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Cash' })).toBeVisible();

    // Click Banking tab - should only show Banking accounts
    await page.getByRole('button', { name: 'Banking' }).click();
    await expect(page.getByText('Filter Test Checking')).toBeVisible();
    await expect(page.getByText('Filter Test Cash')).not.toBeVisible();

    // Click Cash tab - should only show Cash accounts
    await page.getByRole('button', { name: 'Cash' }).click();
    await expect(page.getByText('Filter Test Cash')).toBeVisible();
    await expect(page.getByText('Filter Test Checking')).not.toBeVisible();
  });
});
