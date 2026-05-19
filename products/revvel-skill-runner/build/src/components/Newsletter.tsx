"use client";

import { useState, FormEvent } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("err");
      return;
    }
    // TODO: wire to ESP (Resend/Buttondown)
    setStatus("ok");
    setEmail("");
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
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Subscribe
        </button>
      </form>
      {status === "ok" && (
        <p role="status" className="mt-3 text-green-600">
          Subscribed! Check your inbox.
        </p>
      )}
      {status === "err" && (
        <p role="alert" className="mt-3 text-red-600">
          Please enter a valid email.
        </p>
      )}
    </section>
  );
}
