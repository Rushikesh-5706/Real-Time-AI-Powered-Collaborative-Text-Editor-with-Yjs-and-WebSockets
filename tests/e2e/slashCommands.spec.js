// @ts-check
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('collab-username', 'TestUser');
  });
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
});

test('slash command menu appears with all five commands when / typed at start of line', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();

  // Type some content then go to new line
  await page.keyboard.type('Some initial content');
  await page.keyboard.press('Enter');

  // Type the slash trigger
  await page.keyboard.type('/');

  const menu = page.locator('[data-testid="slash-command-menu"]');
  await expect(menu).toBeVisible({ timeout: 3000 });

  // All five commands must be present
  await expect(page.locator('[data-testid="slash-cmd-expand"]')).toBeVisible();
  await expect(page.locator('[data-testid="slash-cmd-summarise"]')).toBeVisible();
  await expect(page.locator('[data-testid="slash-cmd-rewrite"]')).toBeVisible();
  await expect(page.locator('[data-testid="slash-cmd-todo"]')).toBeVisible();
  await expect(page.locator('[data-testid="slash-cmd-translate"]')).toBeVisible();
});

test('selecting a slash command closes the menu', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();
  await page.keyboard.type('Testing slash commands work correctly.');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');

  const menu = page.locator('[data-testid="slash-command-menu"]');
  await expect(menu).toBeVisible({ timeout: 3000 });

  // Click expand
  await page.locator('[data-testid="slash-cmd-expand"]').click();

  // Menu should close
  await expect(menu).not.toBeVisible({ timeout: 3000 });
});
