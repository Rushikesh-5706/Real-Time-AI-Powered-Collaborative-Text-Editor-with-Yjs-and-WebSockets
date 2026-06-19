/**
 * Prompt template builders for each supported AI intent.
 * Each function returns { systemPrompt, userPrompt }.
 */

export function buildContinueParagraphPrompt({ precedingText, followingText }) {
  const systemPrompt = `You are a writing assistant. Continue the text naturally from where it ends.
Output ONLY the continuation text — no repetition of preceding text, no quotation marks, no preamble, no explanation.
Keep the same tone and style as the existing text.`;

  const userPrompt = `Continue this text naturally:

${precedingText}`;

  return { systemPrompt, userPrompt };
}

export function buildRewriteSelectionPrompt({ selectedText, precedingText }) {
  const systemPrompt = `You are a writing assistant. Rewrite the given text to improve clarity and style while preserving its meaning.
Output ONLY the replacement text — nothing else. Do not repeat the original. Do not append to it. Do not add preamble or explanation.`;

  const userPrompt = `Rewrite this text (produce a replacement, not an addition):

${selectedText}`;

  return { systemPrompt, userPrompt };
}

export function buildExpandPrompt({ precedingText, followingText }) {
  const systemPrompt = `You are a writing assistant. Expand the provided text with more detail, examples, or explanation.
Output ONLY the expanded version — no preamble, no explanation of what you changed.`;

  const userPrompt = `Expand this text with more detail:

${precedingText}`;

  return { systemPrompt, userPrompt };
}

export function buildSummarisePrompt({ precedingText }) {
  const systemPrompt = `You are a writing assistant. Produce a concise summary of the provided text.
Output ONLY the summary — no preamble, no explanation, no header.`;

  const userPrompt = `Summarise this text concisely:

${precedingText}`;

  return { systemPrompt, userPrompt };
}

export function buildTodoPrompt({ precedingText, selectedText }) {
  const content = selectedText || precedingText;
  const systemPrompt = `You are a writing assistant. Convert the provided content into a checklist of actionable to-do items.
Format each item as "- [ ] item text". Output ONLY the checklist — no preamble or explanation.`;

  const userPrompt = `Convert this content into a to-do checklist:

${content}`;

  return { systemPrompt, userPrompt };
}

export function buildTranslatePrompt({ precedingText, selectedText, targetLanguage }) {
  const content = selectedText || precedingText;
  const lang = targetLanguage || 'Hindi';
  const systemPrompt = `You are a translation assistant. Translate the provided text to ${lang}.
Output ONLY the translated text — no preamble, no explanation, no language label.`;

  const userPrompt = `Translate this text to ${lang}:

${content}`;

  return { systemPrompt, userPrompt };
}

export const intentToPromptBuilder = {
  continue_paragraph: buildContinueParagraphPrompt,
  rewrite_selection: buildRewriteSelectionPrompt,
  expand: buildExpandPrompt,
  summarise: buildSummarisePrompt,
  todo: buildTodoPrompt,
  translate: buildTranslatePrompt,
};
