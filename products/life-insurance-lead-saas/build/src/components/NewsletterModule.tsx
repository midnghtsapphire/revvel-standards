"use client"
import React, { useState } from 'react';

export const NewsletterModule = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="bg-gray-100 border border-gray-200 p-6 rounded-xl my-8 text-center">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Join our Newsletter</h3>
      <p className="text-gray-600 mb-6 max-w-lg mx-auto">
        Get the latest updates on high-quality insurance leads, sales tips, and industry news delivered straight to your inbox.
      </p>

      {subscribed ? (
        <div className="bg-green-100 text-green-800 p-4 rounded-md font-medium">
          Thanks for subscribing! Keep an eye on your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
          <input
            type="email"
            placeholder="Enter your email address"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
};
