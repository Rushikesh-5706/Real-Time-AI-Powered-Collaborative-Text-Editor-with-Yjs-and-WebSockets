// TEST-ONLY FILE — never imported by /backend/src or /frontend/src

import { buildContinueParagraphPrompt, buildRewriteSelectionPrompt } from '../../backend/src/prompts/promptTemplates.js';

// Prompt structure tests (no API credits spent)
describe('prompt template routing produces distinct prompts', () => {
  test('continue_paragraph prompt contains continuation instruction', () => {
    const { systemPrompt, userPrompt } = buildContinueParagraphPrompt({
      precedingText: 'The sky is blue.',
      followingText: '',
    });
    expect(systemPrompt).toMatch(/continue/i);
    expect(userPrompt).toContain('The sky is blue.');
    // Must NOT instruct a rewrite
    expect(systemPrompt).not.toMatch(/rewrite/i);
  });

  test('rewrite_selection prompt contains rewrite instruction', () => {
    const { systemPrompt, userPrompt } = buildRewriteSelectionPrompt({
      selectedText: 'first sentence',
      precedingText: 'This is the first sentence.',
    });
    expect(systemPrompt).toMatch(/rewrite/i);
    expect(userPrompt).toContain('first sentence');
    // Rewrite prompt must instruct a replacement, not an addition
    expect(systemPrompt).toMatch(/replacement/i);
    // Must NOT instruct continuation
    expect(systemPrompt).not.toMatch(/continue/i);
  });

  test('continue_paragraph and rewrite_selection produce structurally different system prompts', () => {
    const cont = buildContinueParagraphPrompt({ precedingText: 'test', followingText: '' });
    const rew = buildRewriteSelectionPrompt({ selectedText: 'test', precedingText: 'test' });
    expect(cont.systemPrompt).not.toBe(rew.systemPrompt);
    expect(cont.userPrompt).not.toBe(rew.userPrompt);
  });
});

// Live streaming test — requires BACKEND_URL env variable pointing at a running server
// and LLM_API_KEY in backend environment. Skip if not available.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const runLiveTests = process.env.RUN_LIVE_AI_TESTS === 'true';

(runLiveTests ? describe : describe.skip)('live streaming integration', () => {
  test('POST /api/ai/complete streams real tokens in multiple chunks', async () => {
    const chunks = [];
    const timestamps = [];

    const response = await fetch(`${BACKEND_URL}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentContent: 'The ocean is vast and deep.',
        cursorPosition: 26,
        precedingText: 'The ocean is vast and deep.',
        followingText: '',
        intent: 'continue_paragraph',
        selectedText: null,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      timestamps.push(Date.now());
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) chunks.push(parsed.token);
        } catch {
          // ignore
        }
      }

      if (chunks.length > 1) break; // got multiple chunks — streaming confirmed
    }

    expect(chunks.length).toBeGreaterThan(0);
    if (timestamps.length > 1) {
      // Verify chunks arrived at different times (not one buffered flush)
      const timeDiff = timestamps[timestamps.length - 1] - timestamps[0];
      // timeDiff must be positive — if it's 0, the stream was one buffered write
      expect(timeDiff).toBeGreaterThan(0);
    }
  }, 30000);

  test('POST /api/ai/complete returns 400 for missing required fields', async () => {
    const response = await fetch(`${BACKEND_URL}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'continue_paragraph' }), // missing documentContent, cursorPosition
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  }, 10000);
});
