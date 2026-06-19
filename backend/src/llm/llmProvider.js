import OpenAI from 'openai';

if (!process.env.LLM_API_KEY) {
  throw new Error('LLM_API_KEY environment variable is required but not set');
}

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';

/**
 * Returns an async iterable of token strings from the LLM.
 * @param {{ systemPrompt: string, userPrompt: string, signal?: AbortSignal }} opts
 */
export async function streamCompletion({ systemPrompt, userPrompt, signal }) {
  const stream = await client.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 512,
    },
    { signal }
  );

  return (async function* () {
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        yield token;
      }
    }
  })();
}
