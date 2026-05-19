"use client";

import { useState, FormEvent } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "loading">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("err");
      setMessage("Please enter a valid email.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStatus("err");
        setMessage(data.message ?? "Unable to subscribe right now.");
        return;
      }

      setStatus("ok");
      setMessage(data.message ?? "Subscribed! Check your inbox.");
      setEmail("");
    } catch {
      setStatus("err");
      setMessage("Unable to subscribe right now.");
    }
  }

  return (
    <section className="my-16 p-8 border rounded-xl bg-gray-50 dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-2">Get launch updates</h2>
      <p className="opacity-80 mb-4">
        Join the newsletter — be first to access new skills and revenue tips.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-black"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </form>
      {status === "ok" && (
        <p role="status" className="mt-3 text-green-600">
          {message}
        </p>
      )}
      {status === "err" && (
        <p role="alert" className="mt-3 text-red-600">
          {message}
        </p>
      )}
    </section>
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
