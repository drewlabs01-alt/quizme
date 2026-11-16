// Builds a printable PDF of a quiz in the browser with jsPDF.
import { TYPE_LABELS } from './limits.js';

// jsPDF's built-in fonts only cover Latin-1, so swap common typographic characters.
function toLatin1(text) {
  return String(text ?? '')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•●]/g, '-')
    .replace(/ /g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

export async function downloadQuizPdf({ title, questions, answers, settings }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  let y = margin;

  const ink = [29, 35, 51];
  const muted = [100, 108, 130];
  const accent = [79, 70, 229];
  const green = [21, 128, 61];
  const red = [185, 28, 28];

  function write(text, { size = 11, bold = false, color = ink, gapAfter = 4, indent = 0 } = {}) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineHeight = size * 1.4;
    const lines = doc.splitTextToSize(toLatin1(text), width - indent);
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indent, y + size);
      y += lineHeight;
    }
    y += gapAfter;
  }

  function ensureSpace(needed) {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // Header
  write('QuizMe', { size: 12, bold: true, color: accent, gapAfter: 2 });
  write(title || 'Practice quiz', { size: 20, bold: true, gapAfter: 6 });

  const details = [
    new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    `${questions.length} questions`,
  ];
  if (settings?.difficulty) details.push(`${settings.difficulty[0].toUpperCase()}${settings.difficulty.slice(1)} difficulty`);
  write(details.join('  |  '), { size: 10, color: muted, gapAfter: 8 });

  const answered = Array.isArray(answers) && answers.length === questions.length;
  if (answered) {
    const score = answers.filter((a) => a.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    write(`Score: ${score} / ${questions.length} (${pct}%)`, { size: 14, bold: true, gapAfter: 2 });
    const missed = answers.map((a, i) => (a.correct ? null : i + 1)).filter(Boolean);
    write(missed.length ? `Questions to review: ${missed.join(', ')}` : 'You answered every question correctly.', {
      size: 10,
      color: muted,
      gapAfter: 10,
    });
  }

  doc.setDrawColor(220, 223, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  questions.forEach((q, i) => {
    ensureSpace(80);
    write(`${i + 1}. ${TYPE_LABELS[q.type] || ''}`, { size: 9, bold: true, color: muted, gapAfter: 2 });
    write(q.question, { size: 12, bold: true, gapAfter: 6 });

    if (q.options) {
      q.options.forEach((opt, j) => {
        const isAnswer = opt === q.answer;
        const prefix = q.type === 'multiple_choice' ? `${'ABCD'[j]}. ` : '';
        write(`${prefix}${opt}${isAnswer ? '   (correct)' : ''}`, {
          size: 11,
          bold: isAnswer,
          color: isAnswer ? green : ink,
          indent: 14,
          gapAfter: 1,
        });
      });
      y += 4;
    } else {
      write(`Model answer: ${q.answer}`, { size: 11, color: green, indent: 14, gapAfter: 4 });
    }

    if (answered) {
      const a = answers[i];
      write(`Your answer: ${a.response || '(no answer)'}  -  ${a.correct ? 'Correct' : 'Incorrect'}`, {
        size: 10,
        color: a.correct ? green : red,
        indent: 14,
        gapAfter: 2,
      });
    }

    write(`Why: ${q.explanation}`, { size: 10, color: muted, indent: 14, gapAfter: 14 });
  });

  const slug =
    (title || 'quiz')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'quiz';
  doc.save(`quizme-${slug}.pdf`);
}
