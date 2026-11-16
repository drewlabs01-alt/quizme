// Shared limits and options, used by both the browser and the server.

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_CHARS = 200;
export const MAX_CHARS = 60000; // ~15k tokens of study material sent to the AI

export const QUESTION_COUNTS = [5, 10, 15, 20];

export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'mixed', label: 'Mixed' },
];

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export const TYPE_LABELS = {
  multiple_choice: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
};

export function isPdfFile(file) {
  if (!file) return false;
  const name = (file.name || '').toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
