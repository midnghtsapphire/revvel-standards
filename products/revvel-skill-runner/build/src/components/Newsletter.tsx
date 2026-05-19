import React, { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Subscribed:', email);
    setEmail('');
  };

  return (
    <div className="p-4 border rounded shadow-md mt-4">
      <h2 className="text-xl font-bold mb-2">Subscribe to our Newsletter</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="border p-2 flex-grow rounded"
          required
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Subscribe</button>
      </form>
    </div>
  );
}
