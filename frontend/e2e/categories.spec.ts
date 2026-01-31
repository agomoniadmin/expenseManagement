import { test, expect } from './auth.fixture';

test.describe('Categories', () => {
  test('should display category tree', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  });

  test('should open create category modal', async ({ authenticatedPage: page }) => {
    await page.goto('/categories');
    await page.getByRole('button', { name: 'New Category' }).click();
    await expect(page.getByRole('heading', { name: 'Create Category' })).toBeVisible();
    await page.getByLabel('Name').fill('E2E Category');
    await page.getByRole('button', { name: 'Create' }).click();
  });

  test('should navigate to mappings page', async ({ authenticatedPage: page }) => {
    await page.goto('/categories');
    await page.getByRole('link', { name: 'Mappings' }).click();
    await expect(page.getByRole('heading', { name: 'Category Mappings' })).toBeVisible();
  });

  test('should open create mapping modal', async ({ authenticatedPage: page }) => {
    await page.goto('/categories/mappings');
    await page.getByRole('button', { name: 'New Mapping' }).click();
    await expect(page.getByRole('heading', { name: 'Create Mapping' })).toBeVisible();
  });
});
