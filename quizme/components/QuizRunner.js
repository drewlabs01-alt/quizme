'use client';

import { useEffect, useRef, useState } from 'react';
import { TYPE_LABELS } from '@/lib/limits';

const Check = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
const Cross = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default function QuizRunner({ title, questions, onFinish, onExit }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const headingRef = useRef(null);
  const nextRef = useRef(null);

  const total = questions.length;
  const q = questions[index];
  const current = answers[index];
  const done = current !== undefined;
  const isLast = index === total - 1;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [index]);

  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true });
  }, [done]);

  function record(answer) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = answer;
      return next;
    });
  }

  function choose(option) {
    if (done) return;
    record({ response: option, correct: option === q.answer });
  }

  function goNext() {
    if (isLast) {
      onFinish(answers);
      return;
    }
    setIndex((i) => i + 1);
    setTyped('');
    setRevealed(false);
  }

  const progress = ((index + (done ? 1 : 0)) / total) * 100;

  function optionState(option) {
    if (!done) return '';
    if (option === q.answer) return 'correct';
    if (option === current.response) return 'wrong';
    return 'dimmed';
  }

  return (
    <section className="quiz">
      <div className="quiz-top">
        <button type="button" className="link-button" onClick={onExit}>
          ← Exit quiz
        </button>
        <span className="quiz-title" title={title}>
          {title}
        </span>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>
            Question {index + 1} of {total}
          </span>
          <span className="muted">{answers.filter((a) => a?.correct).length} correct</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (done ? 1 : 0)} aria-label="Quiz progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="card question-card" key={index}>
        <span className="pill">{TYPE_LABELS[q.type]}</span>
        <h1 className="question" tabIndex={-1} ref={headingRef}>
          {q.question}
        </h1>

        {q.type !== 'short_answer' ? (
          <div className={`options ${q.type === 'true_false' ? 'options-tf' : ''}`}>
            {q.options.map((opt, i) => {
              const state = optionState(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`option ${state}`}
                  onClick={() => choose(opt)}
                  disabled={done}
                  aria-pressed={done && current.response === opt}
                >
                  {q.type === 'multiple_choice' && <span className="option-letter">{'ABCD'[i]}</span>}
                  <span className="option-text">{opt}</span>
                  {state === 'correct' && <Check />}
                  {state === 'wrong' && <Cross />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="short-answer">
            <label htmlFor="sa-input" className="field-label">
              Your answer
            </label>
            <textarea
              id="sa-input"
              className="textarea"
              rows={4}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={revealed}
              placeholder="Type your answer in your own words…"
            />
            {!revealed && (
              <button type="button" className="btn btn-primary btn-block" onClick={() => setRevealed(true)}>
                Reveal Answer
              </button>
            )}
          </div>
        )}

        <div aria-live="polite">
          {q.type === 'short_answer' && revealed && (
            <div className="feedback feedback-neutral">
              <p className="feedback-label">Correct answer</p>
              <p className="model-answer">{q.answer}</p>
              <p className="explanation">{q.explanation}</p>
              {!done ? (
                <>
                  <p className="self-mark-prompt">Compare with your answer. Did you get it right?</p>
                  <div className="self-mark">
                    <button type="button" className="btn btn-correct" onClick={() => record({ response: typed.trim() || '(no answer)', correct: true })}>
                      <Check /> I got it right
                    </button>
                    <button type="button" className="btn btn-wrong" onClick={() => record({ response: typed.trim() || '(no answer)', correct: false })}>
                      <Cross /> I got it wrong
                    </button>
                  </div>
                </>
              ) : (
                <p className={`self-marked ${current.correct ? 'is-correct' : 'is-wrong'}`}>
                  {current.correct ? 'Marked as correct' : 'Marked as wrong — you’ll see it in your review'}
                </p>
              )}
            </div>
          )}

          {q.type !== 'short_answer' && done && (
            <div className={`feedback ${current.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
              <p className="feedback-label">
                {current.correct ? 'Correct!' : (
                  <>
                    Not quite — the answer is <strong>{q.answer}</strong>
                  </>
                )}
              </p>
              <p className="explanation">{q.explanation}</p>
            </div>
          )}
        </div>
      </article>

      {done && (
        <button type="button" ref={nextRef} className="btn btn-primary btn-block btn-large next-button" onClick={goNext}>
          {isLast ? 'See results' : 'Next question →'}
        </button>
      )}
    </section>
  );
}
