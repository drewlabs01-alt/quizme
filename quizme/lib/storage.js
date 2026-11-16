// Quiz history, saved only in this browser (localStorage). Study material is never saved.

const HISTORY_KEY = 'quizme:history';
const RETAKE_KEY = 'quizme:retake';
const MAX_ENTRIES = 30;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: keep the most recent few.
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 5)));
    } catch {
      /* give up silently */
    }
  }
}

export function saveAttempt(entry) {
  writeHistory([entry, ...loadHistory().filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES));
}

export function deleteAttempt(id) {
  writeHistory(loadHistory().filter((e) => e.id !== id));
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function requestRetake(id) {
  try {
    sessionStorage.setItem(RETAKE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takeRetakeRequest() {
  try {
    const id = sessionStorage.getItem(RETAKE_KEY);
    sessionStorage.removeItem(RETAKE_KEY);
    return id;
  } catch {
    return null;
  }
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
