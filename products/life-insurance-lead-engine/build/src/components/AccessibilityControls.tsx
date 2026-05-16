'use client';

import React, { useEffect, useState } from 'react';

export default function AccessibilityControls() {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    if (largeText) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }
  }, [largeText]);

  return (
    <div className="fixed bottom-4 right-4 flex gap-2 z-50">
      <button
        onClick={() => setHighContrast(!highContrast)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-colors ${
          highContrast ? 'bg-black text-yellow-400 border-yellow-400' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
        aria-label="Toggle high contrast"
      >
        Contrast
      </button>
      <button
        onClick={() => setLargeText(!largeText)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border transition-colors ${
          largeText ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
        aria-label="Toggle large text"
      >
        A+
      </button>
    </div>
  );
}
