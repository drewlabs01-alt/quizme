// Parses and validates the AI's response before anything is shown to the user.

const TYPE_ALIASES = {
  multiple_choice: 'multiple_choice',
  multiplechoice: 'multiple_choice',
  mcq: 'multiple_choice',
  mc: 'multiple_choice',
  true_false: 'true_false',
  truefalse: 'true_false',
  tf: 'true_false',
  boolean: 'true_false',
  short_answer: 'short_answer',
  shortanswer: 'short_answer',
  open: 'short_answer',
};

function normalizeType(value) {
  const key = String(value || '')
    .toLowerCase()
    .replace(/[\s\-/]+/g, '_');
  return TYPE_ALIASES[key] || TYPE_ALIASES[key.replace(/_/g, '')] || null;
}

const clean = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** Pull a JSON value out of the model's text, tolerating stray code fences. */
export function extractJson(raw) {
  const text = String(raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fall back to the outermost array in the text.
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)); // throws if still invalid
    }
    throw new Error('No JSON array found in the response.');
  }
}

function normalizeTrueFalse(answer) {
  if (answer === true) return 'True';
  if (answer === false) return 'False';
  const a = clean(answer).toLowerCase().replace(/[.!]$/, '');
  if (['true', 't', 'yes'].includes(a)) return 'True';
  if (['false', 'f', 'no'].includes(a)) return 'False';
  return null;
}

/** Returns a cleaned question, or null if it is unusable. */
export function normalizeQuestion(item) {
  if (!item || typeof item !== 'object') return null;

  const type = normalizeType(item.type);
  const question = clean(item.question);
  const explanation = clean(item.explanation);
  if (!type || !question || !explanation) return null;

  if (type === 'multiple_choice') {
    if (!Array.isArray(item.options)) return null;
    const options = item.options.map(clean).filter(Boolean);
    if (options.length !== 4) return null;
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;

    let answer = clean(item.answer);
    let match = options.find((o) => o === answer) || options.find((o) => o.toLowerCase() === answer.toLowerCase());
    if (!match) {
      // Accept "B", "B)", "b." or a 0-3 index and map it to the option text.
      const letter = answer.match(/^\(?([A-Da-d])[).:]?$/);
      if (letter) match = options['abcd'.indexOf(letter[1].toLowerCase())];
      else if (/^[0-3]$/.test(answer)) match = options[Number(answer)];
      else {
        // "B) Photosynthesis" style answers.
        const prefixed = answer.match(/^\(?([A-Da-d])[).:]\s+(.+)$/);
        if (prefixed) match = options.find((o) => o.toLowerCase() === prefixed[2].toLowerCase());
      }
    }
    if (!match) return null;
    return { type, question, options, answer: match, explanation };
  }

  if (type === 'true_false') {
    const answer = normalizeTrueFalse(item.answer);
    if (!answer) return null;
    return { type, question, options: ['True', 'False'], answer, explanation };
  }

  const answer = clean(item.answer);
  if (!answer) return null;
  return { type, question, answer, explanation };
}

/**
 * Validate the model's raw text.
 * Succeeds when it is valid JSON and at least 60% of the requested questions are usable.
 */
export function parseQuestions(raw, requested) {
  let data;
  try {
    data = extractJson(raw);
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${err.message}` };
  }

  if (data && !Array.isArray(data) && Array.isArray(data.questions)) data = data.questions;
  if (!Array.isArray(data)) return { ok: false, error: 'Response was not a JSON array.' };

  const seen = new Set();
  const questions = [];
  for (const item of data) {
    const q = normalizeQuestion(item);
    if (!q) continue;
    const key = q.question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(q);
  }

  const minimum = Math.max(1, Math.ceil(requested * 0.6));
  if (questions.length < minimum) {
    return {
      ok: false,
      error: `Only ${questions.length} of ${data.length} questions were valid (needed at least ${minimum}).`,
    };
  }

  return { ok: true, questions: questions.slice(0, requested) };
}
