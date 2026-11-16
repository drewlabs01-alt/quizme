'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="QuizMe home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.5" />
              <circle cx="12" cy="18.2" r="0.6" fill="currentColor" />
            </svg>
          </span>
          QuizMe
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Create
          </Link>
          <Link href="/history" className={`nav-link ${pathname === '/history' ? 'active' : ''}`}>
            History
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
