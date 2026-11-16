'use client';

import { TYPE_LABELS } from '@/lib/limits';

function message(pct) {
  if (pct === 100) return 'Perfect score — you really know this!';
  if (pct >= 80) return 'Great work! Just a few things to polish.';
  if (pct >= 60) return 'Good effort. Review the ones you missed and try again.';
  if (pct >= 40) return 'You’re getting there. Retry the wrong ones to lock them in.';
  return 'Every miss is something new learned. Review and retry!';
}

export default function Results({ title, questions, answers, onRetryWrong, onNew, onDownload, downloading }) {
  const total = questions.length;
  const score = answers.filter((a) => a?.correct).length;
  const pct = Math.round((score / total) * 100);
  const wrong = questions.map((q, i) => ({ q, a: answers[i], n: i + 1 })).filter(({ a }) => !a?.correct);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <section className="results">
      <div className="card results-hero">
        <p className="eyebrow">{title}</p>
        <div className="score-ring" role="img" aria-label={`You scored ${score} out of ${total}, ${pct} percent`}>
          <svg viewBox="0 0 120 120" width="148" height="148" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} className="ring-track" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="ring-value"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / total)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="score-text">
            <strong>{pct}%</strong>
            <span>
              {score} / {total}
            </span>
          </div>
        </div>
        <h1 className="results-message">{message(pct)}</h1>

        <div className="results-actions">
          <button type="button" className="btn btn-primary btn-large" onClick={onRetryWrong} disabled={wrong.length === 0}>
            Retry wrong questions{wrong.length ? ` (${wrong.length})` : ''}
          </button>
          <button type="button" className="btn btn-secondary btn-large" onClick={onNew}>
            Generate new questions
          </button>
          <button type="button" className="btn btn-ghost btn-large" onClick={onDownload} disabled={downloading}>
            {downloading ? 'Preparing PDF…' : 'Download as PDF'}
          </button>
        </div>
      </div>

      <h2 className="section-title">{wrong.length ? `Questions to review (${wrong.length})` : 'Nothing to review'}</h2>
      {wrong.length === 0 ? (
        <p className="muted">You answered every question correctly. Try a harder difficulty or generate a fresh set!</p>
      ) : (
        <ul className="review-list">
          {wrong.map(({ q, a, n }) => (
            <li key={n} className="card review-item">
              <span className="pill">
                Q{n} · {TYPE_LABELS[q.type]}
              </span>
              <p className="review-question">{q.question}</p>
              <dl className="review-answers">
                <div className="your">
                  <dt>Your answer</dt>
                  <dd>{a?.response || '(no answer)'}</dd>
                </div>
                <div className="right">
                  <dt>Correct answer</dt>
                  <dd>{q.answer}</dd>
                </div>
              </dl>
              <p className="explanation">{q.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
