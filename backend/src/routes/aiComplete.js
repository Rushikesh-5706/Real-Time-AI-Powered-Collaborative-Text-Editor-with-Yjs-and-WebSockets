import { Router } from 'express';
import { streamAICompletion } from '../services/aiService.js';

const router = Router();

const REQUIRED_FIELDS = {
  documentContent: 'string',
  cursorPosition: 'number',
  intent: 'string',
};

const OPTIONAL_FIELDS = {
  precedingText: 'string',
  followingText: 'string',
  selectedText: ['string', 'null', 'undefined'],
  targetLanguage: ['string', 'undefined'],
};

function validateBody(body) {
  const errors = [];

  for (const [field, expectedType] of Object.entries(REQUIRED_FIELDS)) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`${field} is required`);
    } else if (typeof body[field] !== expectedType) {
      errors.push(`${field} must be a ${expectedType}, got ${typeof body[field]}`);
    }
  }

  return errors;
}

router.post('/complete', async (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'validation failed', details: errors });
  }

  const {
    documentContent,
    cursorPosition,
    precedingText = '',
    followingText = '',
    intent,
    selectedText = null,
    targetLanguage,
  } = req.body;

  const timeoutMs = parseInt(process.env.LLM_REQUEST_TIMEOUT_MS || '15000', 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = await streamAICompletion({
      intent,
      documentContent,
      cursorPosition,
      precedingText,
      followingText,
      selectedText,
      targetLanguage,
      signal: controller.signal,
    });

    for await (const token of stream) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || controller.signal.aborted;

    if (err.status === 429 || (err.error && err.error.code === 'rate_limit_exceeded')) {
      console.error(`ai rate limit hit intent=${intent}`, err.message);
      res.write(`data: ${JSON.stringify({ error: 'AI service temporarily rate-limited, try again shortly' })}\n\n`);
    } else if (isTimeout) {
      console.error(`ai request timed out intent=${intent}`);
      res.write(`data: ${JSON.stringify({ error: 'AI request timed out' })}\n\n`);
    } else if (err.code === 'UNSUPPORTED_INTENT') {
      console.error(`unsupported intent: ${intent}`);
      res.write(`data: ${JSON.stringify({ error: `unsupported intent: ${intent}` })}\n\n`);
    } else {
      console.error(`ai completion error intent=${intent}`, err.message);
      res.write(`data: ${JSON.stringify({ error: 'AI service error, try again' })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
