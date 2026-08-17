'use client';
import React from 'react';

export default function AffiliateModule() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-bold mb-4">Recommended Tools</h3>
      <ul className="space-y-4">
        <li>
          <a href="https://www.make.com/en/register?pc=risingaloha" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <span className="font-semibold block">Make.com</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Automate your video workflows</span>
          </a>
        </li>
        <li>
          <a href="https://videogen.io/?fpr=audrey21" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <span className="font-semibold block">VideoGen</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Create AI videos instantly</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
