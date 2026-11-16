'use client';

import { useEffect, useRef, useState } from 'react';
import CreateForm, { validateInput } from '@/components/CreateForm';
import Loading from '@/components/Loading';
import QuizRunner from '@/components/QuizRunner';
import Results from '@/components/Results';
import { downloadQuizPdf } from '@/lib/pdfExport';
import { loadHistory, makeId, saveAttempt, takeRetakeRequest } from '@/lib/storage';

const DEFAULT_SETTINGS = { count: 10, type: 'mixed', difficulty: 'medium' };

function titleFrom({ mode, file, text }) {
  if (mode === 'pdf' && file) return file.name.replace(/\.pdf$/i, '');
  const words = text.trim().split(/\s+/).slice(0, 7).join(' ');
  return words.length > 48 ? `${words.slice(0, 48)}…` : `${words}…`;
}

export default function HomePage() {
  const [view, setView] = useState('create'); // create | loading | quiz | results
  const [mode, setMode] = useState('pdf');
  const [file, setFileState] = useState(null);
  const [text, setTextState] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState(null);
  const [formNotice, setFormNotice] = useState(null);
  const [notices, setNotices] = useState([]);
  const [avoid, setAvoid] = useState([]);

  const [quiz, setQuiz] = useState(null); // the full generated set
  const [run, setRun] = useState(null); // questions in the current attempt
  const [runKey, setRunKey] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef(null);

  // Changing the material means "new questions" should no longer avoid the old ones.
  const setFile = (f) => {
    setFileState(f);
    setAvoid([]);
    setFormNotice(null);
    setError(null);
  };
  const setText = (t) => {
    setTextState(t);
    if (avoid.length) setAvoid([]);
    if (formNotice) setFormNotice(null);
    if (error) setError(null);
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  // Retake a quiz chosen on the History page.
  useEffect(() => {
    const id = takeRetakeRequest();
    if (!id) return;
    const entry = loadHistory().find((e) => e.id === id);
    if (!entry) return;
    startRun({ id: entry.quizId || entry.id, title: entry.title.replace(/ \(retry\)$/, ''), settings: entry.settings, questions: entry.questions }, entry.questions, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRun(newQuiz, questions, isRetry) {
    setQuiz(newQuiz);
    setRun({ questions, isRetry });
    setAnswers([]);
    setRunKey((k) => k + 1);
    setView('quiz');
  }

  async function generate() {
    const problem = validateInput({ mode, file, text });
    if (problem) {
      setError({ message: problem, retryable: false });
      return;
    }

    setError(null);
    setNotices([]);
    setView('loading');

    const controller = new AbortController();
    abortRef.current = controller;

    const body = new FormData();
    if (mode === 'pdf') body.append('file', file);
    else body.append('text', text);
    body.append('count', String(settings.count));
    body.append('type', settings.type);
    body.append('difficulty', settings.difficulty);
    if (avoid.length) body.append('avoid', JSON.stringify(avoid));

    let res;
    try {
      res = await fetch('/api/generate', { method: 'POST', body, signal: controller.signal });
    } catch (err) {
      if (err?.name === 'AbortError') {
        setView('create');
        return;
      }
      setError({ message: 'We couldn’t reach QuizMe. Check your internet connection and try again.', retryable: true });
      setView('create');
      return;
    } finally {
      abortRef.current = null;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error page from a proxy or host */
    }

    if (!res.ok || !Array.isArray(data?.questions) || data.questions.length === 0) {
      let message = data?.error;
      if (!message) {
        if (res.status === 413) message = 'That file is too large to upload. Please use a PDF under 10 MB, or paste the text instead.';
        else if (res.status === 504) message = 'Creating your questions took too long. Please try again — choosing fewer questions can help.';
        else message = 'Something went wrong while creating your questions. Please try again.';
      }
      setError({ message, retryable: data ? Boolean(data.retryable) : true });
      setView('create');
      return;
    }

    setNotices(data.notices || []);
    setFormNotice(null);
    startRun({ id: makeId(), title: titleFrom({ mode, file, text }), settings: { ...settings }, questions: data.questions }, data.questions, false);
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function finish(finalAnswers) {
    setAnswers(finalAnswers);
    setView('results');
    const score = finalAnswers.filter((a) => a?.correct).length;
    saveAttempt({
      id: makeId(),
      quizId: quiz.id,
      title: run.isRetry ? `${quiz.title} (retry)` : quiz.title,
      date: new Date().toISOString(),
      settings: quiz.settings,
      questions: run.questions,
      answers: finalAnswers,
      score,
      total: run.questions.length,
    });
  }

  function retryWrong() {
    const wrong = run.questions.filter((_, i) => !answers[i]?.correct);
    if (wrong.length) startRun(quiz, wrong, true);
  }

  function newQuestions() {
    const hasMaterial = mode === 'pdf' ? Boolean(file) : text.trim().length > 0;
    setAvoid(hasMaterial ? quiz.questions.map((q) => q.question) : []);
    setFormNotice(
      hasMaterial
        ? 'Your material is still loaded. Change the settings if you like, then tap Generate Questions for a fresh set.'
        : 'Add your study material below to generate a new set of questions.'
    );
    setNotices([]);
    setError(null);
    setView('create');
  }

  function exitQuiz() {
    const answered = document.querySelectorAll('.option.correct, .option.wrong, .self-marked').length > 0;
    if (answered && !window.confirm('Leave this quiz? Your progress on it will be lost.')) return;
    setView('create');
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadQuizPdf({ title: quiz.title, questions: run.questions, answers, settings: quiz.settings });
    } catch (err) {
      console.error(err);
      window.alert('Sorry, we couldn’t create the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (view === 'loading') return <Loading count={settings.count} onCancel={cancel} />;

  if (view === 'quiz' && run) {
    return (
      <>
        {notices.map((n) => (
          <div key={n} className="alert alert-info" role="status">
            {n}
          </div>
        ))}
        <QuizRunner key={runKey} title={run.isRetry ? `${quiz.title} · retry` : quiz.title} questions={run.questions} onFinish={finish} onExit={exitQuiz} />
      </>
    );
  }

  if (view === 'results' && run) {
    return (
      <Results
        title={quiz.title}
        questions={run.questions}
        answers={answers}
        onRetryWrong={retryWrong}
        onNew={newQuestions}
        onDownload={download}
        downloading={downloading}
      />
    );
  }

  return (
    <CreateForm
      mode={mode}
      setMode={(m) => {
        setMode(m);
        setError(null);
      }}
      file={file}
      setFile={setFile}
      text={text}
      setText={setText}
      settings={settings}
      setSettings={setSettings}
      onSubmit={generate}
      error={error}
      onRetry={generate}
      notice={formNotice}
    />
  );
}
