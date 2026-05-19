"use client";

import { useState, useEffect } from "react";

export default function AccessibilityControls() {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [fontSize, highContrast]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        aria-label="Open accessibility controls"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full bg-blue-600 text-white shadow"
      >
        ♿
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          className="mt-2 p-4 bg-white dark:bg-gray-900 border rounded-lg shadow-lg w-64"
        >
          <h2 className="font-semibold mb-2">Accessibility</h2>
          <label className="block mb-3">
            <span className="text-sm">Font size: {fontSize}%</span>
            <input
              type="range"
              min={80}
              max={150}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
              aria-label="Adjust font size"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            <span className="text-sm">High contrast</span>
          </label>
        </div>
      )}
    </div>
  );
}
