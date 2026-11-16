# QuizMe

Turn your own study material into AI-generated practice questions. Upload a PDF or paste text, choose your settings, and get an interactive quiz with instant feedback, explanations, a results screen, PDF export and browser-saved history.

## Quick start

Requirements: Node.js 18.18 or newer and an Anthropic API key (https://console.anthropic.com).

```bash
npm install
cp .env.example .env.local      # then put your key in ANTHROPIC_API_KEY
npm run dev                     # open http://localhost:3000
```

For production: `npm run build && npm start`.

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Server-only Claude API key. Never sent to the browser. |
| `ANTHROPIC_MODEL` | no | Claude model ID. Defaults to `claude-sonnet-5-5`. |

## How it works

1. **Home** (`app/page.js`, `components/CreateForm.js`): upload a PDF (drag and drop or tap) or paste text, then pick the number of questions (5/10/15/20), the type (multiple choice, true/false, short answer or mixed) and the difficulty.
2. **API** (`app/api/generate/route.js`): receives the form in memory, extracts PDF text with `unpdf`, validates it, trims long material and calls Claude. Nothing is written to disk or kept after the request.
3. **Prompt** (`lib/prompt.js`): Claude acts as an experienced teacher. It writes questions only from the material, tests understanding rather than recall, uses 4 plausible options for multiple choice, adds a short explanation to every answer and returns only JSON.
4. **Validation** (`lib/validate.js`): checks the JSON and every question (4 unique options, an answer that matches one of them, an explanation, and so on). If the response is invalid, the server retries once with a stricter prompt.
5. **Quiz** (`components/QuizRunner.js`): one question at a time with a progress bar. Multiple choice and true/false answers get instant green or red feedback. For short answers, you type, tap **Reveal Answer**, then mark yourself right or wrong.
6. **Results** (`components/Results.js`): shows your score, percentage and the questions you got wrong, with buttons for **Retry wrong questions**, **Generate new questions** (keeps your material and avoids repeating the same questions) and **Download as PDF**.
7. **History** (`app/history/page.js`): past attempts are saved in `localStorage` only. You can retake one, download it as a PDF or delete it.

## Error handling

| Situation | What the user sees |
| --- | --- |
| No file or text | "Please upload a PDF or paste some study material first." |
| Not a PDF (checked by extension, MIME type and file signature) | Unsupported file type message |
| Over 10 MB | File too large message (checked in the browser and on the server) |
| Scanned or image-only PDF | Explains there is no selectable text and suggests pasting the text |
| Password-protected or damaged PDF | Specific message |
| Under 200 characters | Shows how many more characters are needed |
| Over 60,000 characters | Evenly spaced excerpts from across the whole document are used, and the quiz shows a notice saying so |
| AI busy, timeout, network failure or bad output | Message with a **Try again** button |

## Tests

```bash
npm test
```

The tests cover JSON parsing and validation, text normalisation, trimming and the prompt builder.

## Deploying

The app works on any Node host, including Vercel. Note: **Vercel limits request bodies to about 4.5 MB**, so PDFs larger than that fail there with a "file too large" message even though QuizMe allows 10 MB. To accept the full 10 MB, host it somewhere without that limit (Render, Railway, Fly.io, a VPS) or use Vercel Blob for client uploads. The route sets `maxDuration = 120` so longer generations aren't cut off.

## Customising

- Limits (file size, minimum and maximum characters): `lib/limits.js`
- Colours and light/dark themes: CSS variables at the top of `app/globals.css`
- AI instructions: `lib/prompt.js`
