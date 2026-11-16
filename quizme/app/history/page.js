'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearHistory, deleteAttempt, loadHistory, requestRetake } from '@/lib/storage';
import { downloadQuizPdf } from '@/lib/pdfExport';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function scoreClass(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 50) return 'ok';
  return 'low';
}

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  function retake(id) {
    requestRetake(id);
    router.push('/');
  }

  function remove(id) {
    deleteAttempt(id);
    setEntries(loadHistory());
  }

  function clearAll() {
    if (!window.confirm('Delete your whole quiz history from this browser?')) return;
    clearHistory();
    setEntries([]);
  }

  if (entries === null) return null;

  return (
    <section className="history">
      <div className="history-head">
        <div>
          <h1>Your quiz history</h1>
          <p className="muted">Saved only in this browser.</p>
        </div>
        {entries.length > 0 && (
          <button type="button" className="btn btn-ghost btn-small" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="card empty-state">
          <p className="empty-emoji" aria-hidden="true">
            📚
          </p>
          <h2>No quizzes yet</h2>
          <p className="muted">Finish a quiz and it will show up here so you can retake it later.</p>
          <Link href="/" className="btn btn-primary">
            Create your first quiz
          </Link>
        </div>
      ) : (
        <ul className="history-list">
          {entries.map((e) => {
            const pct = Math.round((e.score / e.total) * 100);
            return (
              <li key={e.id} className="card history-item">
                <div className={`history-score ${scoreClass(pct)}`}>
                  <strong>{pct}%</strong>
                  <span>
                    {e.score}/{e.total}
                  </span>
                </div>
                <div className="history-info">
                  <h2 className="history-title">{e.title}</h2>
                  <p className="muted small">
                    {formatDate(e.date)}
                    {e.settings ? ` · ${e.settings.difficulty} · ${e.total} questions` : ''}
                  </p>
                  <div className="history-actions">
                    <button type="button" className="btn btn-primary btn-small" onClick={() => retake(e.id)}>
                      Retake
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => downloadQuizPdf({ title: e.title, questions: e.questions, answers: e.answers, settings: e.settings })}
                    >
                      PDF
                    </button>
                    <button type="button" className="btn btn-ghost btn-small danger" onClick={() => remove(e.id)} aria-label={`Delete ${e.title}`}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
