'use client';

import { useRef, useState } from 'react';
import { DIFFICULTIES, MAX_FILE_BYTES, MIN_CHARS, QUESTION_COUNTS, QUESTION_TYPES, formatBytes, isPdfFile } from '@/lib/limits';

function Segmented({ label, name, options, value, onChange, columns }) {
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      <div className={`segmented cols-${columns}`} role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <label key={opt.value} className={`segment ${value === opt.value ? 'selected' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Checks the input in the browser; returns an error message or null. The server re-checks everything. */
export function validateInput({ mode, file, text }) {
  if (mode === 'pdf') {
    if (!file) return 'Please choose a PDF to upload, or switch to “Paste text”.';
    if (!isPdfFile(file)) return 'That file type isn’t supported. Please upload a PDF (.pdf) or paste your text.';
    if (file.size > MAX_FILE_BYTES) return `That file is ${formatBytes(file.size)}. The limit is 10 MB — try a smaller PDF or paste the text.`;
    if (file.size === 0) return 'That file is empty. Please choose another PDF.';
    return null;
  }
  const trimmed = text.trim();
  if (!trimmed) return 'Please paste some study material first.';
  if (trimmed.length < MIN_CHARS)
    return `Your text is only ${trimmed.length} characters. Please add at least ${MIN_CHARS - trimmed.length} more so we have enough to write good questions.`;
  return null;
}

export default function CreateForm({ mode, setMode, file, setFile, text, setText, settings, setSettings, onSubmit, error, onRetry, notice }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState(null);

  function pickFile(f) {
    setFileError(null);
    if (!f) return;
    if (!isPdfFile(f)) {
      setFile(null);
      setFileError('That file type isn’t supported. Please upload a PDF (.pdf) or paste your text.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError(`That file is ${formatBytes(f.size)}. The limit is 10 MB — try a smaller PDF or paste the text.`);
      return;
    }
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  const chars = text.trim().length;
  const update = (key) => (value) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <form
      className="create"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <section className="hero">
        <p className="eyebrow">AI study partner</p>
        <h1>Turn your notes into practice questions</h1>
        <p className="lead">
          Upload a PDF or paste your study material. QuizMe writes exam-style questions from it, then quizzes you with instant
          feedback and explanations.
        </p>
        <ol className="steps" aria-label="How it works">
          <li>
            <b>1</b> Add your material
          </li>
          <li>
            <b>2</b> Pick your settings
          </li>
          <li>
            <b>3</b> Practise and review
          </li>
        </ol>
      </section>

      {notice && (
        <div className="alert alert-info" role="status">
          {notice}
        </div>
      )}

      <section className="card" aria-labelledby="material-heading">
        <h2 id="material-heading" className="card-title">
          Your study material
        </h2>

        <div className="tabs" role="tablist" aria-label="Input method">
          <button type="button" role="tab" aria-selected={mode === 'pdf'} className={`tab ${mode === 'pdf' ? 'active' : ''}`} onClick={() => setMode('pdf')}>
            Upload PDF
          </button>
          <button type="button" role="tab" aria-selected={mode === 'text'} className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
            Paste text
          </button>
        </div>

        {mode === 'pdf' ? (
          <div role="tabpanel">
            <div
              className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={file ? `Selected file ${file.name}. Click to choose a different PDF.` : 'Choose a PDF to upload'}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {file ? (
                <>
                  <span className="file-icon" aria-hidden="true">
                    PDF
                  </span>
                  <span className="file-name">{file.name}</span>
                  <span className="muted small">{formatBytes(file.size)} · tap to change</span>
                </>
              ) : (
                <>
                  <svg className="upload-icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 16V4M7 9l5-5 5 5" />
                    <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
                  </svg>
                  <span className="dropzone-title">Tap to choose a PDF</span>
                  <span className="muted small">or drag and drop it here · max 10 MB</span>
                </>
              )}
            </div>
            {file && (
              <button type="button" className="link-button" onClick={() => setFile(null)}>
                Remove file
              </button>
            )}
            {fileError && (
              <p className="field-error" role="alert">
                {fileError}
              </p>
            )}
          </div>
        ) : (
          <div role="tabpanel">
            <label htmlFor="material" className="sr-only">
              Paste your study material
            </label>
            <textarea
              id="material"
              className="textarea"
              placeholder="Paste your notes, a textbook section or an article here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
            />
            <p className={`char-count ${chars > 0 && chars < MIN_CHARS ? 'warn' : ''}`}>
              {chars.toLocaleString('en-US')} characters
              {chars < MIN_CHARS ? ` · at least ${MIN_CHARS} needed` : ''}
            </p>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="card-title">
          Settings
        </h2>
        <Segmented
          label="Number of questions"
          name="count"
          columns={4}
          options={QUESTION_COUNTS.map((n) => ({ value: n, label: String(n) }))}
          value={settings.count}
          onChange={update('count')}
        />
        <Segmented label="Question type" name="type" columns={2} options={QUESTION_TYPES} value={settings.type} onChange={update('type')} />
        <Segmented label="Difficulty" name="difficulty" columns={3} options={DIFFICULTIES} value={settings.difficulty} onChange={update('difficulty')} />
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <p>{error.message}</p>
          {error.retryable && (
            <button type="button" className="btn btn-small" onClick={onRetry}>
              Try again
            </button>
          )}
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block btn-large">
        Generate Questions
      </button>
    </form>
  );
}
