import { test as base, type Page } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';
const TEST_FIRST_NAME = 'Test';
const TEST_LAST_NAME = 'User';

function uniqueEmail() {
  return `testuser+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const email = uniqueEmail();
    // Register
    await page.goto('/register');
    await page.getByLabel('First name').fill(TEST_FIRST_NAME);
    await page.getByLabel('Last name').fill(TEST_LAST_NAME);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { TEST_PASSWORD, TEST_FIRST_NAME, TEST_LAST_NAME };
export { expect } from '@playwright/test';
