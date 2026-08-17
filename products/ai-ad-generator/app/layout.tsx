import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Ad Generator — Zeely-Style Ad Automation',
  description:
    'Generate high-converting UGC video scripts, static ad creatives, and full campaign copy from any product URL — powered by AI.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        {/* Global nav */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🎯</span>
              AI Ad Generator
            </a>
            <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
              <a href="/create" className="hover:text-blue-600 transition-colors">Create Ad</a>
              <a href="/campaigns" className="hover:text-blue-600 transition-colors">Campaigns</a>
              <a href="/analytics" className="hover:text-blue-600 transition-colors">Analytics</a>
            </nav>
            <a
              href="/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + New Ad
            </a>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
          <p>AI Ad Generator · Powered by{' '}
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              OpenRouter
            </a>{' '}
            + cheerio + @napi-rs/canvas
          </p>
          <p className="mt-1">Port 3009 · revvel-standards monorepo</p>
        </footer>
      </body>
    </html>
  );
}
