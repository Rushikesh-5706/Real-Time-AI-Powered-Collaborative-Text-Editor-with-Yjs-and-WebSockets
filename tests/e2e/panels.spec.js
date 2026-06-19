// @ts-check
import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('collab-username', 'TestUser');
  });
  // Mock AI endpoint to prevent rate limit failures during UI testing
  await page.route('**/api/ai/complete', async route => {
    const stream = [
      'data: {"token":" panel"}\n\n',
      'data: {"token":" mock"}\n\n',
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

test.describe('AI stats panel', () => {
  test('stats start at 0', async ({ page }) => {
    const accepted = page.locator('[data-testid="ai-stats-accepted"]');
    const rejected = page.locator('[data-testid="ai-stats-rejected"]');
    await expect(accepted).toHaveText('0');
    await expect(rejected).toHaveText('0');
  });

  test('accepted increments after Tab on ghost text', async ({ page }) => {
    const editor = page.locator('.tiptap-editor');
    await editor.click();
    await page.keyboard.type('Renewable energy sources such as solar and wind power are becoming increasingly cost-effective. Battery storage technology has improved dramatically. Many countries are transitioning away from fossil fuels.');

    const ghostText = page.locator('[data-testid="ghost-text"]');
    await expect(ghostText).toBeVisible({ timeout: 20000 });

    await page.keyboard.press('Tab');

    const accepted = page.locator('[data-testid="ai-stats-accepted"]');
    await expect(accepted).toHaveText('1', { timeout: 3000 });
  });

  test('rejected increments after Escape on ghost text', async ({ page }) => {
    const editor = page.locator('.tiptap-editor');
    await editor.click();
    await page.keyboard.type('Space exploration has entered a new era with private companies participating. Reusable rockets have dramatically reduced launch costs. Mars missions are now being planned in detail.');

    const ghostText = page.locator('[data-testid="ghost-text"]');
    await expect(ghostText).toBeVisible({ timeout: 20000 });

    await page.keyboard.press('Escape');

    const rejected = page.locator('[data-testid="ai-stats-rejected"]');
    await expect(rejected).toHaveText('1', { timeout: 3000 });
  });
});

test.describe('AI context panel', () => {
  test('intent shows continue_paragraph by default', async ({ page }) => {
    const intentEl = page.locator('[data-testid="ai-context-intent"]');
    await expect(intentEl).toHaveText('continue_paragraph');
  });

  test('context chars is non-zero after typing', async ({ page }) => {
    const editor = page.locator('.tiptap-editor');
    await editor.click();
    await page.keyboard.type('Some text to count characters.');

    const charsEl = page.locator('[data-testid="ai-context-chars"]');
    await expect(charsEl).not.toHaveText('0', { timeout: 3000 });
    const val = await charsEl.textContent();
    expect(parseInt(val, 10)).toBeGreaterThan(0);
  });
});

test.describe('summarise slash command', () => {
  test('summarise inserts ai-suggestion-accepted span after completing', async ({ page }) => {
    const editor = page.locator('.tiptap-editor');
    await editor.click();

    // Seed 200+ words above the cursor
    const seedText = `Artificial intelligence is transforming industries across the globe.
Machine learning algorithms can now recognize images with superhuman accuracy.
Natural language processing has enabled computers to understand and generate human text.
Deep learning neural networks power everything from search engines to medical diagnosis.
Autonomous vehicles use AI to navigate complex road conditions safely.
Recommendation systems powered by AI help users discover relevant content.
Financial institutions use machine learning for fraud detection and risk assessment.
Healthcare providers leverage AI for drug discovery and treatment planning.
Robotics combined with AI is automating manufacturing processes worldwide.
Climate scientists use machine learning models to better predict weather patterns.
AI ethics has emerged as a critical field addressing bias and fairness in algorithms.
The global AI market is projected to reach trillions of dollars in the coming decade.
Governments are developing regulatory frameworks to oversee AI development.
Educational technology platforms use AI to personalize learning experiences.
Voice assistants powered by AI have become commonplace in homes and businesses.`;

    await editor.click();
    await page.keyboard.type(seedText);
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    const menu = page.locator('[data-testid="slash-command-menu"]');
    await expect(menu).toBeVisible({ timeout: 3000 });

    await page.locator('[data-testid="slash-cmd-summarise"]').click();

    // Wait for AI to complete and insert
    const accepted = page.locator('[data-testid="ai-suggestion-accepted"]');
    await expect(accepted).toBeAttached({ timeout: 30000 });
  });
});
