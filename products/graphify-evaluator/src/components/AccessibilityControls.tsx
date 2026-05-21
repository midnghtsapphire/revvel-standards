"use client";
import React, { useState, useEffect } from 'react';

export const AccessibilityControls = () => {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setHighContrast(!highContrast)}
        className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        aria-label="Toggle high contrast mode"
      >
        <span className="sr-only">Toggle high contrast</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>
      <style dangerouslySetInnerHTML={{__html: `
        .high-contrast {
          filter: contrast(150%) saturate(120%);
        }
      `}} />
    </div>
  );
};
