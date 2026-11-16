import { MAX_CHARS } from './limits.js';

/** Clean up text extracted from PDFs or pasted by the user. */
export function normalizeText(raw) {
  return String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2') // re-join words hyphenated across lines
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Number of non-whitespace characters — used to spot scanned (image-only) PDFs. */
export function visibleCharCount(text) {
  return String(text || '').replace(/\s/g, '').length;
}

/**
 * If the material is longer than the limit, split it into evenly spaced sections
 * and keep the start of each, so the questions still cover the whole document
 * rather than only its first pages.
 */
export function fitToLimit(text, limit = MAX_CHARS, sections = 8) {
  if (text.length <= limit) {
    return { text, trimmed: false, originalLength: text.length, usedLength: text.length };
  }

  const joiner = '\n\n[…]\n\n';
  const perSection = Math.floor((limit - joiner.length * (sections - 1)) / sections);
  const parts = [];

  for (let i = 0; i < sections; i++) {
    let start = Math.floor((i * text.length) / sections);
    // Start at a paragraph or sentence boundary when one is close by.
    if (i > 0) {
      const window = text.slice(start, start + 400);
      const para = window.indexOf('\n');
      const sentence = window.search(/[.!?]\s/);
      if (para !== -1) start += para + 1;
      else if (sentence !== -1) start += sentence + 2;
    }
    let chunk = text.slice(start, start + perSection);
    // End at a sentence boundary if one is in the last 30% of the chunk.
    const lastStop = Math.max(chunk.lastIndexOf('. '), chunk.lastIndexOf('.\n'), chunk.lastIndexOf('? '), chunk.lastIndexOf('! '));
    if (lastStop > perSection * 0.7) chunk = chunk.slice(0, lastStop + 1);
    parts.push(chunk.trim());
  }

  const out = parts.join(joiner);
  return { text: out, trimmed: true, originalLength: text.length, usedLength: out.length };
}
