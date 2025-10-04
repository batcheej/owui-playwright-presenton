import { test, expect } from '@playwright/test';

test('Basic automation test', async ({ page }) => {
  // This is a basic test to verify Playwright is working
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
  
  console.log('Playwright is working correctly!');
});