import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, extractJson } from '../lib/validate.js';
import { fitToLimit, normalizeText } from '../lib/text.js';
import { buildUserPrompt } from '../lib/prompt.js';

const mc = {
  type: 'multiple_choice',
  question: 'Why do plants need chlorophyll?',
  options: ['To absorb light', 'To absorb water', 'To store sugar', 'To release oxygen'],
  answer: 'To absorb light',
  explanation: 'Chlorophyll captures light energy for photosynthesis.',
};
const tf = { type: 'true_false', question: 'Photosynthesis releases oxygen.', options: ['True', 'False'], answer: true, explanation: 'Oxygen is a by-product.' };
const sa = { type: 'short_answer', question: 'What are the products of photosynthesis?', answer: 'Glucose and oxygen.', explanation: 'The material lists both.' };

test('parses a clean JSON array', () => {
  const r = parseQuestions(JSON.stringify([mc, tf, sa]), 3);
  assert.equal(r.ok, true);
  assert.equal(r.questions.length, 3);
  assert.equal(r.questions[1].answer, 'True');
  assert.equal(r.questions[2].options, undefined);
});

test('tolerates code fences and surrounding text', () => {
  const r = parseQuestions('Here you go:\n```json\n' + JSON.stringify([mc, tf]) + '\n```', 2);
  assert.equal(r.ok, true);
});

test('accepts {questions: [...]} wrapper', () => {
  assert.equal(parseQuestions(JSON.stringify({ questions: [mc] }), 1).ok, true);
});

test('maps letter answers to option text', () => {
  const r = parseQuestions(JSON.stringify([{ ...mc, answer: 'B' }]), 1);
  assert.equal(r.questions[0].answer, 'To absorb water');
});

test('rejects invalid JSON', () => {
  assert.equal(parseQuestions('[{"type": "mul', 5).ok, false);
  assert.throws(() => extractJson('nothing here'));
});

test('drops MC questions with wrong option count or unmatched answer', () => {
  const bad1 = { ...mc, options: ['a', 'b', 'c'] };
  const bad2 = { ...mc, question: 'Other?', answer: 'Not an option' };
  const r = parseQuestions(JSON.stringify([bad1, bad2, tf]), 3);
  assert.equal(r.ok, false); // only 1 of 3 valid (< 60%)
});

test('fails when too few questions are valid, trims extras', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ ...sa, question: `Q${i}?` }));
  const r = parseQuestions(JSON.stringify(many), 5);
  assert.equal(r.ok, true);
  assert.equal(r.questions.length, 5);
});

test('missing explanation invalidates the question', () => {
  assert.equal(parseQuestions(JSON.stringify([{ ...mc, explanation: '' }]), 1).ok, false);
});

test('normalizeText cleans whitespace and hyphenation', () => {
  assert.equal(normalizeText('photo-\nsynthesis   is\r\n\n\n\ngreat'), 'photosynthesis is\n\ngreat');
});

test('fitToLimit keeps short text and samples long text across the document', () => {
  assert.equal(fitToLimit('short', 100).trimmed, false);
  const long = Array.from({ length: 2000 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
  const r = fitToLimit(long, 10000);
  assert.equal(r.trimmed, true);
  assert.ok(r.text.length <= 10000, `length ${r.text.length}`);
  assert.ok(r.text.includes('Sentence number 0 '));
  assert.ok(/Sentence number 17\d\d/.test(r.text), 'includes content from the final section');
});

test('prompt includes settings and material', () => {
  const p = buildUserPrompt({ material: 'MATERIAL', count: 15, type: 'mixed', difficulty: 'hard', avoid: ['Old Q?'], strict: true });
  assert.match(p, /exactly 15/);
  assert.match(p, /balanced mix/);
  assert.match(p, /HARD/);
  assert.match(p, /Old Q\?/);
  assert.match(p, /<material>\nMATERIAL\n<\/material>/);
  assert.match(p, /previous attempt/);
});
