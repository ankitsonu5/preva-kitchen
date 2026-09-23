import { test, expect } from '@playwright/test';

test('admin login exposes the KDS entry flow', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Preva Admin Login' })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('standalone kitchen terminal shows its lock screen', async ({ page }) => {
  await page.goto('/kitchen');
  await expect(page.getByRole('heading', { name: 'KITCHEN TERMINAL ACCESS' })).toBeVisible();
  await expect(page.getByPlaceholder('e.g. chef')).toBeVisible();
  await expect(page.getByPlaceholder('Enter kitchen password')).toBeVisible();
});
