'use client';
import React, { useState } from 'react';
import { Send } from 'lucide-react';

export default function NewsletterModule() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // In a real app, send to API route -> database / CRM
    setSubscribed(true);
    setEmail('');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-sm text-white">
      <h3 className="text-xl font-bold mb-2">Join the Creator Club</h3>
      <p className="text-indigo-100 text-sm mb-4">Get the latest AI video tips and exclusive deals sent to your inbox.</p>

      {subscribed ? (
        <div className="bg-white/20 p-3 rounded-lg text-center font-medium">
          Thanks for subscribing! 🎉
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-3 py-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
            required
          />
          <button
            type="submit"
            aria-label="Subscribe"
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
