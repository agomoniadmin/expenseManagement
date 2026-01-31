import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e+${Date.now()}@example.com`;
const VALID_PASSWORD = 'TestPassword123!';

test.describe('Authentication', () => {
  test('should register a new user and redirect to dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First name').fill('E2E');
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login with valid credentials', async ({ page }) => {
    const email = uniqueEmail();
    // Register first
    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.getByRole('button', { name: email }).click();
    await page.getByText('Sign out').click();
    await expect(page).toHaveURL('/login');

    // Login
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
