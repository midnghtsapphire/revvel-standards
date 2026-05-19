import React from 'react';

export default function AccessibilityControls() {
  return (
    <div className="p-4 border rounded shadow-md mt-4">
      <h2 className="text-xl font-bold mb-2">Accessibility Controls</h2>
      <div className="flex gap-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => document.body.classList.toggle('high-contrast')}>Toggle High Contrast</button>
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => document.body.style.fontSize = '1.2em'}>Large Text</button>
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => document.body.style.fontSize = ''}>Normal Text</button>
      </div>
    </div>
  );
}
