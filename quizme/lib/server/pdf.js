// Extracts text from a PDF in memory. Nothing is written to disk.
import { extractText, getDocumentProxy } from 'unpdf';

export function looksLikePdf(bytes) {
  // PDF files start with "%PDF-" (allow a little leading junk, as some generators add it).
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

export async function extractPdfText(bytes) {
  const pdf = await getDocumentProxy(bytes);
  try {
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return { text: Array.isArray(text) ? text.join('\n\n') : text, pages: totalPages };
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
  }
}
