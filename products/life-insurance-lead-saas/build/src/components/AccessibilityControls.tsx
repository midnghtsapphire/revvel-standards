"use client"
import React, { useState, useEffect } from 'react';

export const AccessibilityControls = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  }, [highContrast]);

  useEffect(() => {
    if (largeText) {
      document.body.classList.add('large-text-mode');
    } else {
      document.body.classList.remove('large-text-mode');
    }
  }, [largeText]);

  return (
    <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-xl border border-gray-200 z-50 flex space-x-2">
      <button
        onClick={() => setHighContrast(!highContrast)}
        className={`px-3 py-1 text-sm rounded ${highContrast ? 'bg-black text-yellow-300' : 'bg-gray-200 text-gray-800'}`}
        aria-pressed={highContrast}
      >
        Contrast
      </button>
      <button
        onClick={() => setLargeText(!largeText)}
        className={`px-3 py-1 text-sm rounded font-bold ${largeText ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        aria-pressed={largeText}
      >
        A+
      </button>
    </div>
  );
};
