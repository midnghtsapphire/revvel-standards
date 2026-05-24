"use client";

import Link from "next/link";

const stats = [
  { label: "Total Clicks", value: "9,723", delta: "+12% this week", color: "text-emerald-300" },
  { label: "Total Commission", value: "$5,307", delta: "+8% this week", color: "text-cyan-300" },
  { label: "Active Links", value: "5", delta: "All healthy", color: "text-amber-300" },
  { label: "Conversion Rate", value: "3.2%", delta: "+0.4% this week", color: "text-fuchsia-300" },
];

const recentActivity = [
  { time: "2 min ago", event: "New click on OpenRouter AI link", amount: "+$0.70" },
  { time: "11 min ago", event: "Commission confirmed — Polar.sh", amount: "+$35.00" },
  { time: "1 hr ago", event: "Weekly report sent to Slack", amount: "—" },
  { time: "3 hr ago", event: "UTM tag rotated for Vercel Pro link", amount: "—" },
  { time: "Yesterday", event: "New lead synced to CRM (HubSpot)", amount: "—" },
];

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950 text-slate-100">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 border-b border-white/10">
        <Link href="/" className="text-lg font-black tracking-tight text-white">
          Master<span className="text-emerald-400">Affiliate</span>Engine
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">agent@revvel.io</span>
          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition hover:bg-white/10"
          >
            Admin Panel
          </Link>
        </div>
      </nav>

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-black text-white">Pipeline Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Live metrics from your automated affiliate engine.</p>

        {/* Stats grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.delta}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-7 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Activity</h2>
          <ul className="divide-y divide-white/5">
            {recentActivity.map((item, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-200">{item.event}</p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
                <span className={`text-sm font-semibold ${item.amount.startsWith("+") ? "text-emerald-300" : "text-slate-500"}`}>
                  {item.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Add Link CTA */}
        <div className="mt-6 flex justify-end">
          <Link
            href="/checkout"
            className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-emerald-500/30"
          >
            + Add New Affiliate Link
          </Link>
        </div>
      </div>
    </main>
  );
}
