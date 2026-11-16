import { NextResponse } from 'next/server';
import { DIFFICULTIES, MAX_FILE_BYTES, MIN_CHARS, QUESTION_COUNTS, QUESTION_TYPES } from '@/lib/limits';
import { fitToLimit, normalizeText, visibleCharCount } from '@/lib/text';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompt';
import { parseQuestions } from '@/lib/validate';
import { AIError, callClaude } from '@/lib/server/claude';
import { extractPdfText, looksLikePdf } from '@/lib/server/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // seconds (used by Vercel and similar hosts)

function fail(status, code, message, retryable = false) {
  return NextResponse.json({ error: message, code, retryable }, { status, headers: { 'cache-control': 'no-store' } });
}

function readSettings(form) {
  const count = Number(form.get('count'));
  const type = String(form.get('type') || '');
  const difficulty = String(form.get('difficulty') || '');
  if (!QUESTION_COUNTS.includes(count)) return null;
  if (!QUESTION_TYPES.some((t) => t.value === type)) return null;
  if (!DIFFICULTIES.some((d) => d.value === difficulty)) return null;
  return { count, type, difficulty };
}

function readAvoidList(form) {
  try {
    const list = JSON.parse(String(form.get('avoid') || '[]'));
    if (!Array.isArray(list)) return [];
    return list
      .filter((q) => typeof q === 'string')
      .slice(0, 40)
      .map((q) => q.slice(0, 300));
  } catch {
    return [];
  }
}

export async function POST(request) {
  // Uploaded files and text live only in memory for the duration of this request.
  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'BAD_REQUEST', 'We could not read your upload. Please try again.');
  }

  const settings = readSettings(form);
  if (!settings) return fail(400, 'BAD_SETTINGS', 'Please choose a valid number of questions, type and difficulty.');

  const file = form.get('file');
  const pasted = form.get('text');
  let material = '';
  let source = 'text';

  if (file && typeof file === 'object' && file.size > 0) {
    source = 'pdf';
    if (file.size > MAX_FILE_BYTES) {
      return fail(413, 'FILE_TOO_LARGE', 'That file is larger than 10 MB. Please upload a smaller PDF or paste the text instead.');
    }
    const name = (file.name || '').toLowerCase();
    if (file.type !== 'application/pdf' && !name.endsWith('.pdf')) {
      return fail(415, 'UNSUPPORTED_FILE', 'Only PDF files are supported. Please upload a .pdf file or paste your text.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikePdf(bytes)) {
      return fail(415, 'UNSUPPORTED_FILE', 'This file does not look like a valid PDF. Please upload a .pdf file or paste your text.');
    }

    try {
      const { text } = await extractPdfText(bytes);
      material = normalizeText(text);
    } catch (err) {
      const isPassword = /password/i.test(err?.name || '') || /password/i.test(err?.message || '');
      console.error('[quizme] PDF extraction failed:', err?.message);
      return fail(
        422,
        'PDF_UNREADABLE',
        isPassword
          ? 'This PDF is password-protected. Please remove the password or paste the text instead.'
          : 'We could not read this PDF. It may be damaged — try another file or paste the text instead.'
      );
    }

    if (visibleCharCount(material) < 50) {
      return fail(
        422,
        'SCANNED_PDF',
        'We couldn’t find any readable text in this PDF. It looks like a scanned document or images of pages. Try a PDF with selectable text, or copy the text and paste it instead.'
      );
    }
  } else if (typeof pasted === 'string') {
    material = normalizeText(pasted);
  }

  if (!material) {
    return fail(400, 'EMPTY_INPUT', 'Please upload a PDF or paste some study material first.');
  }
  if (material.length < MIN_CHARS) {
    return fail(
      400,
      'TEXT_TOO_SHORT',
      source === 'pdf'
        ? `This PDF only contains ${material.length} characters of readable text. We need at least ${MIN_CHARS} to write good questions.`
        : `Your text is ${material.length} characters long. Please add at least ${MIN_CHARS} characters so we have enough to work with.`
    );
  }

  const fitted = fitToLimit(material);
  const avoid = readAvoidList(form);
  const maxTokens = Math.min(16000, 1200 + settings.count * 400);

  let lastError = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    let result;
    try {
      result = await callClaude({
        system: SYSTEM_PROMPT,
        user: buildUserPrompt({
          material: fitted.text,
          ...settings,
          avoid,
          trimmed: fitted.trimmed,
          strict: attempt > 0,
        }),
        maxTokens,
      });
    } catch (err) {
      if (err instanceof AIError) return fail(err.status, err.code, err.message, err.retryable);
      console.error('[quizme] Unexpected error:', err);
      return fail(500, 'AI_FAILURE', 'Something went wrong while creating your questions. Please try again.', true);
    }

    if (result.stopReason === 'max_tokens') {
      lastError = 'Response was cut off (max_tokens).';
    } else {
      const parsed = parseQuestions(result.text, settings.count);
      if (parsed.ok) {
        const notices = [];
        if (fitted.trimmed) {
          const pct = Math.round((fitted.usedLength / fitted.originalLength) * 100);
          notices.push(
            `Your material was long (${fitted.originalLength.toLocaleString('en-US')} characters), so we used excerpts from across the whole document — about ${pct}% of it. For full coverage, generate questions one chapter at a time.`
          );
        }
        if (parsed.questions.length < settings.count) {
          notices.push(`We could only write ${parsed.questions.length} good questions from this material.`);
        }
        return NextResponse.json(
          { questions: parsed.questions, notices, trimmed: fitted.trimmed },
          { headers: { 'cache-control': 'no-store' } }
        );
      }
      lastError = parsed.error;
    }
    console.warn(`[quizme] Attempt ${attempt + 1} returned unusable output: ${lastError}`);
  }

  return fail(502, 'AI_BAD_OUTPUT', 'The AI returned questions in an unexpected format. Please try again.', true);
}

export function GET() {
  return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST to generate questions.');
}
