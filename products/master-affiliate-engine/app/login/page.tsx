"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire to auth provider (NextAuth / Supabase)
    window.location.href = "/dashboard";
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 text-slate-100">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="mb-8 block text-center text-lg font-black text-white">
          Master<span className="text-emerald-400">Affiliate</span>Engine
        </Link>
        <h1 className="text-2xl font-black text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to your pipeline dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-semibold text-slate-400">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 backdrop-blur placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-slate-400">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 backdrop-blur placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-gray-950 transition hover:from-emerald-400 hover:to-cyan-400"
          >
            Sign In →
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/checkout" className="text-emerald-400 hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </main>
  );
}
