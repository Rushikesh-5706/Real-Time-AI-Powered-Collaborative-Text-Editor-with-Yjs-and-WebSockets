import { intentToPromptBuilder } from '../prompts/promptTemplates.js';
import { streamCompletion } from '../llm/llmProvider.js';

const SUPPORTED_INTENTS = new Set([
  'continue_paragraph',
  'rewrite_selection',
  'expand',
  'summarise',
  'todo',
  'translate',
]);

/**
 * Routes the request to the correct prompt builder and returns an async
 * iterable of token strings from the LLM.
 *
 * @param {{ intent, documentContent, cursorPosition, precedingText, followingText, selectedText, targetLanguage, signal }} opts
 * @returns {AsyncIterable<string>}
 */
export async function streamAICompletion(opts) {
  const { intent, signal, ...rest } = opts;

  if (!SUPPORTED_INTENTS.has(intent)) {
    throw Object.assign(new Error(`unsupported intent: ${intent}`), { code: 'UNSUPPORTED_INTENT' });
  }

  const builder = intentToPromptBuilder[intent];
  const { systemPrompt, userPrompt } = builder(rest);

  return streamCompletion({ systemPrompt, userPrompt, signal });
}

export { SUPPORTED_INTENTS };
