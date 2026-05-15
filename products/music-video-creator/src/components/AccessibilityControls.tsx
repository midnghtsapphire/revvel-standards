'use client';
import React, { useState, useEffect } from 'react';
import { Eye, Brain, Sun, Battery } from 'lucide-react';

export default function AccessibilityControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('default');

  useEffect(() => {
    // Reset classes
    document.documentElement.classList.remove('neuro-mode', 'eco-mode', 'dyslexic-mode', 'dark');

    // Apply selected mode
    if (mode === 'neuro') {
      document.documentElement.classList.add('neuro-mode');
    } else if (mode === 'eco') {
      document.documentElement.classList.add('eco-mode');
    } else if (mode === 'dyslexic') {
      document.documentElement.classList.add('dyslexic-mode');
    }
  }, [mode]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Accessibility Settings"
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        className="p-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform"
      >
        <Eye className="w-5 h-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div id="accessibility-panel" className="absolute top-14 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Accessibility Modes</h3>
          <div className="space-y-2 text-sm">
            <button
              onClick={() => setMode('default')}
              className={`w-full flex items-center gap-2 p-2 rounded ${mode === 'default' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Eye className="w-4 h-4" /> Default (WCAG AAA)
            </button>
            <button
              onClick={() => setMode('neuro')}
              className={`w-full flex items-center gap-2 p-2 rounded ${mode === 'neuro' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Brain className="w-4 h-4" /> Neuro Mode
            </button>
            <button
              onClick={() => setMode('eco')}
              className={`w-full flex items-center gap-2 p-2 rounded ${mode === 'eco' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Battery className="w-4 h-4" /> ECO CODE Mode
            </button>
            <button
              onClick={() => setMode('dyslexic')}
              className={`w-full flex items-center gap-2 p-2 rounded ${mode === 'dyslexic' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <Sun className="w-4 h-4" /> Dyslexic Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
