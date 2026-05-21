import React from 'react';

export const NewsletterModule = () => {
  return (
    <div className="bg-gray-100 p-6 rounded-lg my-6">
      <h3 className="text-xl font-bold mb-2">Subscribe to our Developer Newsletter</h3>
      <p className="text-gray-600 mb-4">Get weekly insights on codebase management and architecture.</p>
      <form className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Email address"
        />
        <button
          type="button"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
};
