'use client';

import { useEffect, useState } from 'react';

export default function AccessibilityControls() {
  const [highContrast, setHighContrast] = useState(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem('a11y-hc') === '1' : false,
  );
  const [largeText, setLargeText] = useState(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem('a11y-lt') === '1' : false,
  );

  useEffect(() => {
    document.body.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('a11y-hc', highContrast ? '1' : '0');
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle('large-text', largeText);
    localStorage.setItem('a11y-lt', largeText ? '1' : '0');
  }, [largeText]);

  return (
    <div
      role="region"
      aria-label="Accessibility controls"
      className="fixed top-2 right-2 z-50 bg-white border rounded shadow px-3 py-2 text-xs flex gap-2"
    >
      <button
        onClick={() => setHighContrast(!highContrast)}
        aria-pressed={highContrast}
        className="px-2 py-1 border rounded hover:bg-slate-100"
      >
        {highContrast ? '✓' : ''} Contrast
      </button>
      <button
        onClick={() => setLargeText(!largeText)}
        aria-pressed={largeText}
        className="px-2 py-1 border rounded hover:bg-slate-100"
      >
        {largeText ? '✓' : ''} Large Text
      </button>
    </div>
  );
}
