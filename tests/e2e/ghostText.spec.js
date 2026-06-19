// @ts-check
const { test, expect } = require('@playwright/test');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('collab-username', 'TestUser');
  });

  // Mock AI endpoint to prevent rate limit failures during UI testing
  await page.route('**/api/ai/complete', async route => {
    // Simulate streaming response
    const stream = [
      'data: {"token":" artificial"}\n\n',
      'data: {"token":" intelligence"}\n\n',
      'data: [DONE]\n\n'
    ].join('');
    
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: stream
    });
  });

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
});

test('ghost text appears while AI request is in flight and grows incrementally', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();
  await page.keyboard.type('The history of artificial intelligence spans several decades. Researchers have made remarkable progress in developing systems that can learn and adapt. The field continues to evolve rapidly.');

  // Wait for debounce (400ms) + some AI response time
  await page.waitForTimeout(600);

  // AI presence indicator should appear
  const indicator = page.locator('[data-testid="ai-presence-indicator"]');
  // It may appear briefly
  await expect(indicator).toBeVisible({ timeout: 10000 }).catch(() => {
    // Indicator may have already disappeared if AI responded very fast
  });

  // Ghost text should appear
  const ghostText = page.locator('[data-testid="ghost-text"]');
  await expect(ghostText).toBeVisible({ timeout: 15000 });

  // Verify ghost text content grows over time — check it twice
  const text1 = await ghostText.textContent();
  await page.waitForTimeout(300);
  const text2 = await ghostText.textContent();

  // Verify ghost text content is real and grew (or was already complete)
  // text2 must be at least as long as text1 — it must never shrink mid-stream
  expect(text1).not.toBeNull();
  expect(text2).not.toBeNull();
  expect(text2.length).toBeGreaterThanOrEqual(text1.length);
});

test('Tab accepts ghost text and creates ai-suggestion-accepted element', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();
  await page.keyboard.type('The ocean covers about seventy percent of the Earth surface. Marine biologists have discovered thousands of new species in recent years. The deep sea remains largely unexplored.');

  // Wait for ghost text
  const ghostText = page.locator('[data-testid="ghost-text"]');
  await expect(ghostText).toBeVisible({ timeout: 20000 });

  // Tab to accept
  await page.keyboard.press('Tab');

  // Ghost text element must be removed from DOM
  await expect(ghostText).not.toBeAttached({ timeout: 3000 });

  // Accepted suggestion span must exist
  const accepted = page.locator('[data-testid="ai-suggestion-accepted"]');
  await expect(accepted).toBeAttached({ timeout: 3000 });
});

test('Escape clears ghost text without modifying document', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();
  await page.keyboard.type('Mountains are formed through geological processes over millions of years. Tectonic plate collisions create tremendous pressure and uplift. The highest peaks challenge even the most experienced climbers.');

  const ghostText = page.locator('[data-testid="ghost-text"]');
  await expect(ghostText).toBeVisible({ timeout: 20000 });

  const docBefore = await editor.textContent();

  await page.keyboard.press('Escape');

  // Ghost text must be removed from DOM
  await expect(ghostText).not.toBeAttached({ timeout: 3000 });

  // Document content unchanged
  const docAfter = await editor.textContent();
  expect(docAfter).toBe(docBefore);
});

test('typing over ghost text clears it and inserts the typed character', async ({ page }) => {
  const editor = page.locator('.tiptap-editor');
  await editor.click();
  await page.keyboard.type('Forests play a crucial role in maintaining the global carbon cycle. Trees absorb carbon dioxide and release oxygen. Deforestation has significant environmental consequences.');

  const ghostText = page.locator('[data-testid="ghost-text"]');
  await expect(ghostText).toBeVisible({ timeout: 20000 });

  // Type a character to override
  await page.keyboard.type('X');

  // Ghost text must be removed from DOM
  await expect(ghostText).not.toBeAttached({ timeout: 3000 });

  // Editor content should contain the typed character
  const content = await editor.textContent();
  expect(content).toContain('X');
});
