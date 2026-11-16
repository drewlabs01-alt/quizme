import { Plus_Jakarta_Sans } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

export const metadata = {
  title: 'QuizMe — Turn your notes into practice questions',
  description: 'Upload a PDF or paste your notes and QuizMe uses AI to write practice questions with instant feedback.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1120' },
  ],
};

// Applies the saved (or system) theme before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem('quizme:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" className="container">
          {children}
        </main>
        <footer className="site-footer container">
          <p>QuizMe never stores your files or notes on our server. Quiz history stays in your browser.</p>
        </footer>
      </body>
    </html>
  );
}
