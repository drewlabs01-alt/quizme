'use client';

import { useEffect, useState } from 'react';

const TIPS = [
  'Reading your material…',
  'Picking out the key ideas…',
  'Writing questions that test understanding…',
  'Crafting tricky-but-fair wrong answers…',
  'Writing explanations for every answer…',
  'Almost there…',
];

export default function Loading({ count, onCancel }) {
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => Math.min(t + 1, TIPS.length - 1)), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="loading" role="status" aria-live="polite">
      <div className="loading-cards" aria-hidden="true">
        <div className="loading-card c1">
          <span />
          <span />
          <span />
        </div>
        <div className="loading-card c2">
          <span />
          <span />
          <span />
        </div>
        <div className="loading-card c3">
          <i>?</i>
        </div>
      </div>
      <h1 className="loading-title">Creating your questions...</h1>
      <p className="loading-tip">{TIPS[tip]}</p>
      <p className="muted small">
        Writing {count} questions usually takes 10–40 seconds.
      </p>
      {onCancel && (
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
    </section>
  );
}
