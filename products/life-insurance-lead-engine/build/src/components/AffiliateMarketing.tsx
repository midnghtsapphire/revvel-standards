import React from 'react';

export default function AffiliateMarketing() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-8">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Recommended Tools</h3>
      <p className="text-sm text-gray-500 mb-4">Enhance your lead generation with these tools.</p>
      <div className="space-y-3">
        <a href="https://make.com/?ref=revvel" target="_blank" rel="noopener noreferrer" className="block hover:bg-gray-50 p-2 -mx-2 rounded transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-600">Make.com</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">20% Off</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Automate your lead syncing workflows.</p>
        </a>
      </div>
    </div>
  );
}
