// @ts-check
import { test, expect, chromium } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('presence cursors', () => {
  test('cursor from context 1 appears as data-testid in context 2', async () => {
    const browser = await chromium.launch();

    // Context 1 — force username to User1
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();
    await page1.addInitScript(() => {
      sessionStorage.setItem('collab-username', 'User1');
    });
    await page1.goto(FRONTEND_URL);
    await page1.waitForLoadState('networkidle');

    // Context 2 — force username to User2
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.addInitScript(() => {
      sessionStorage.setItem('collab-username', 'User2');
    });
    await page2.goto(FRONTEND_URL);
    await page2.waitForLoadState('networkidle');

    // Give time for socket connections and awareness handshake
    await page1.waitForTimeout(2000);

    // User1 clicks editor and types — triggers awareness update with cursor position
    const editor1 = page1.locator('.tiptap-editor');
    await editor1.click();
    await page1.keyboard.type('Hello collaboration from User1');

    // Give awareness time to propagate over socket
    await page2.waitForTimeout(2000);

    // user-cursor-User1 is now unique — the in-editor Tiptap cursor only
    const cursorOnPage2 = page2.locator('[data-testid="user-cursor-User1"]');
    await expect(cursorOnPage2).toBeAttached({ timeout: 10000 });

    // User2 types — verify User2's cursor appears in page1
    const editor2 = page2.locator('.tiptap-editor');
    await editor2.click();
    await page2.keyboard.type('Hello from User2');
    await page1.waitForTimeout(2000);

    // Page1 should see User2's cursor (in-editor inline cursor only)
    const user2CursorOnPage1 = page1.locator('[data-testid="user-cursor-User2"]');
    await expect(user2CursorOnPage1).toBeAttached({ timeout: 10000 });

    await browser.close();
  });
});
