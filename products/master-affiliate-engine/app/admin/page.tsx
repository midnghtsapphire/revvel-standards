"use client";

import Link from "next/link";

const managedLinks = [
  { id: 1, name: "Polar.sh Funding", url: "https://polar.sh?ref=mae", clicks: 2841, commission: "$1,420", status: "Active" },
  { id: 2, name: "Vercel Pro", url: "https://vercel.com?ref=mae", clicks: 1590, commission: "$795", status: "Active" },
  { id: 3, name: "Resend Email API", url: "https://resend.com?ref=mae", clicks: 980, commission: "$294", status: "Active" },
  { id: 4, name: "OpenRouter AI", url: "https://openrouter.ai?ref=mae", clicks: 3210, commission: "$2,247", status: "Active" },
  { id: 5, name: "Stripe Payments", url: "https://stripe.com?ref=mae", clicks: 1102, commission: "$551", status: "Active" },
];

export default function AdminPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950 text-slate-100">
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 border-b border-white/10">
        <Link href="/" className="text-lg font-black tracking-tight text-white">
          Master<span className="text-emerald-400">Affiliate</span>Engine
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-semibold text-amber-300">
            Admin
          </span>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition hover:bg-white/10"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-black text-white">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-400">Manage affiliate links, users, and pipeline settings.</p>

        {/* Quick stats */}
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">$5,307</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Users</p>
            <p className="mt-2 text-3xl font-black text-cyan-300">142</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflows Running</p>
            <p className="mt-2 text-3xl font-black text-amber-300">3</p>
          </div>
        </div>

        {/* Links management */}
        <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Affiliate Links</h2>
            <button className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-emerald-500/30">
              + Add Link
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Program</th>
                  <th className="pb-3 pr-4">URL</th>
                  <th className="pb-3 pr-4">Clicks</th>
                  <th className="pb-3 pr-4">Commission</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managedLinks.map((link) => (
                  <tr key={link.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">{link.name}</td>
                    <td className="py-3 pr-4 max-w-xs truncate text-slate-400 text-xs">{link.url}</td>
                    <td className="py-3 pr-4 text-slate-300">{link.clicks.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-300">{link.commission}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {link.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="mr-2 text-xs text-cyan-400 hover:underline">Edit</button>
                      <button className="text-xs text-red-400 hover:underline">Disable</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflow controls */}
        <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-bold text-white">Pipeline Workflow Controls</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Automated Workflows", "Smart CRM Sync", "Report Generator"].map((wf) => (
              <div key={wf} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-slate-200">{wf}</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">Running</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
