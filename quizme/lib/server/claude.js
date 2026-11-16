// Minimal server-side client for the Claude Messages API.
// Only ever imported by the API route, so the key never reaches the browser.

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5-5';

export class AIError extends Error {
  constructor(message, { status = 502, code = 'AI_FAILURE', retryable = true } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export async function callClaude({ system, user, maxTokens, timeoutMs = 55000 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIError('The server is missing its AI key. Add ANTHROPIC_API_KEY to your environment and restart.', {
      status: 500,
      code: 'CONFIG',
      retryable: false,
    });
  }

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw new AIError(
      timedOut
        ? 'The AI took too long to respond. Please try again — fewer questions can help.'
        : 'We could not reach the AI service. Please try again in a moment.',
      { status: timedOut ? 504 : 502 }
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      /* ignore */
    }
    console.error(`[quizme] Claude API error ${res.status}: ${detail}`);

    if (res.status === 401 || res.status === 403) {
      throw new AIError('The AI service rejected the server’s API key. Check ANTHROPIC_API_KEY.', {
        status: 500,
        code: 'CONFIG',
        retryable: false,
      });
    }
    if (res.status === 429 || res.status === 529 || res.status >= 500) {
      throw new AIError('The AI service is busy right now. Please wait a few seconds and try again.', { status: 503 });
    }
    throw new AIError('The AI could not process this material. Please try again, or try a shorter section.');
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return { text, stopReason: data.stop_reason };
}
