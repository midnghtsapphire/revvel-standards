'use client';

import { useState, useMemo } from 'react';
import {
  buildCsvExport,
  buildMarkdownReport,
  estimatePlatforms,
  formatUsd,
  getTopRecommendations,
  normalizeMetrics,
} from './data/calculator';
import { PLATFORMS, PLATFORM_CATEGORIES, Platform } from './data/platforms';

type SortKey = 'name' | 'rpmMax' | 'subPayoutPer5' | 'platformCutPct';
type SortDir = 'asc' | 'desc';
type CategoryFilter = 'all' | Platform['category'];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold">🥇 #{rank}</span>;
  if (rank === 2) return <span className="text-gray-300 font-bold">🥈 #{rank}</span>;
  if (rank === 3) return <span className="text-amber-600 font-bold">🥉 #{rank}</span>;
  return <span className="text-gray-500 font-semibold">#{rank}</span>;
}

function PayoutBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-gray-500 text-sm">—</span>;
  const creator = 100 - pct;
  const color = creator >= 90 ? 'bg-emerald-900 text-emerald-300' :
    creator >= 80 ? 'bg-blue-900 text-blue-300' :
    creator >= 70 ? 'bg-yellow-900 text-yellow-300' :
    'bg-red-900 text-red-300';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {creator}% to creator
    </span>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rpmMax');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeTab, setActiveTab] = useState<'rpm' | 'subscription'>('rpm');

  // Calculator state
  const [monthlyViews, setMonthlyViews] = useState(100000);
  const [monthlySubscribers, setMonthlySubscribers] = useState(100);
  const [subPrice, setSubPrice] = useState(5);
  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    'mailto:audrey@midnghtsapphire.com?subject=Creator%20Payout%20Tracker%20Pro';

  const metrics = useMemo(
    () =>
      normalizeMetrics({
        monthlyViews,
        monthlySubscribers,
        subscriptionPrice: subPrice,
      }),
    [monthlyViews, monthlySubscribers, subPrice]
  );

  const estimates = useMemo(() => estimatePlatforms(PLATFORMS, metrics), [metrics]);
  const topRecommendations = useMemo(
    () => getTopRecommendations(estimates, 3),
    [estimates]
  );
  const estimateByPlatform = useMemo(
    () => new Map(estimates.map((estimate) => [estimate.platform.id, estimate])),
    [estimates]
  );
  const markdownReport = useMemo(
    () => buildMarkdownReport(metrics, estimates),
    [metrics, estimates]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let list = category === 'all' ? PLATFORMS : PLATFORMS.filter(p => p.category === category);
    if (activeTab === 'rpm') list = list.filter(p => p.rpmMin !== null || p.rpmMax !== null);
    if (activeTab === 'subscription') list = list.filter(p => p.subPayoutPer5 !== null);
    return [...list].sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === 'name') {
        return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortKey === 'rpmMax') {
        av = a.rpmMax ?? 0;
        bv = b.rpmMax ?? 0;
      } else if (sortKey === 'subPayoutPer5') {
        av = a.subPayoutPer5 ?? 0;
        bv = b.subPayoutPer5 ?? 0;
      } else {
        av = a.platformCutPct ?? 100;
        bv = b.platformCutPct ?? 100;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [category, sortKey, sortDir, activeTab]);

  function calcMonthlyEarnings(p: Platform): string {
    const estimate = estimateByPlatform.get(p.id);
    if (activeTab === 'rpm') {
      return formatUsd(estimate?.monthlyAdRevenue ?? null);
    }
    if (activeTab === 'subscription') {
      return formatUsd(estimate?.monthlySubscriptionRevenue ?? null);
    }
    return '-';
  }

  function downloadReport(format: 'markdown' | 'csv') {
    const content =
      format === 'markdown' ? markdownReport : buildCsvExport(estimates);
    const blob = new Blob([content], {
      type: format === 'markdown' ? 'text/markdown' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      format === 'markdown'
        ? 'creator-payout-strategy-brief.md'
        : 'creator-payout-estimates.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`text-xs font-semibold uppercase tracking-wider ${sortKey === k ? 'text-violet-400' : 'text-gray-400'} hover:text-violet-300 transition-colors`}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  );

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="font-bold text-white text-lg">Creator Payout Tracker</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#rankings" className="hover:text-white transition-colors">Rankings</a>
            <a href="#calculator" className="hover:text-white transition-colors">Calculator</a>
            <a href="#strategy-brief" className="hover:text-white transition-colors">Brief</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-block bg-violet-900/30 border border-violet-700/40 text-violet-300 text-xs px-3 py-1 rounded-full mb-4 font-medium">
          Creator economy market: $104B+ (2025) — 207M active creators worldwide
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 text-balance">
          Which Platform Pays Creators the Most?
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto text-balance">
          Real 2025 payout rates for YouTube, TikTok, Patreon, Substack, Kick, Twitch, OnlyFans, Spotify & more.
          Calculate your estimated monthly earnings across every platform.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-6 text-xs text-gray-500">
          <span className="bg-gray-800 px-3 py-1 rounded-full">✅ Last updated Q2 2025</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">12 platforms tracked</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">Free earnings calculator</span>
          <span className="bg-gray-800 px-3 py-1 rounded-full">⚠️ Data are estimates — see disclaimer below</span>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <a
            href="#calculator"
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 transition-colors"
          >
            Calculate my payout mix
          </a>
          <a
            href={checkoutUrl}
            className="inline-flex items-center justify-center rounded-lg border border-violet-700 px-5 py-3 text-sm font-bold text-violet-200 hover:bg-violet-950 transition-colors"
          >
            Upgrade for payout alerts
          </a>
        </div>
      </section>

      {/* Rankings Section */}
      <section id="rankings" className="max-w-6xl mx-auto px-4 pb-12">
        {/* Tab toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('rpm')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'rpm' ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            📺 Ad Revenue / RPM
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'subscription' ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            🔔 Subscription Payouts
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PLATFORM_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value as CategoryFilter)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${category === cat.value ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 w-8 text-gray-500 text-xs">Rank</th>
                <th className="text-left px-4 py-3">
                  <SortBtn k="name" label="Platform" />
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell text-gray-400 text-xs font-semibold uppercase tracking-wider">Category</th>
                {activeTab === 'rpm' ? (
                  <>
                    <th className="text-left px-4 py-3">
                      <SortBtn k="rpmMax" label="RPM Range (per 1K)" />
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Est. Monthly*</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-3">
                      <SortBtn k="subPayoutPer5" label="Net per $5 Sub" />
                    </th>
                    <th className="text-left px-4 py-3">
                      <SortBtn k="platformCutPct" label="Platform Cut" />
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 text-xs font-semibold uppercase tracking-wider">Est. Monthly*</th>
                  </>
                )}
                <th className="text-left px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-semibold uppercase tracking-wider">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map((platform, idx) => (
                <tr key={platform.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden>{platform.emoji}</span>
                      <div>
                        <div className="font-semibold text-white">{platform.name}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">{platform.bestFor.slice(0, 2).join(', ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-gray-400 capitalize">{platform.category}</span>
                  </td>
                  {activeTab === 'rpm' ? (
                    <>
                      <td className="px-4 py-3">
                        {platform.rpmMin !== null && platform.rpmMax !== null ? (
                          <span className="font-semibold text-emerald-400">
                            ${platform.rpmMin}–${platform.rpmMax}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {calcMonthlyEarnings(platform)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        {platform.subPayoutPer5 !== null ? (
                          <span className="font-semibold text-emerald-400">${platform.subPayoutPer5.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PayoutBadge pct={platform.platformCutPct} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {calcMonthlyEarnings(platform)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-400">{platform.paymentCadence}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No platforms match this filter + tab combination. Try &quot;All Platforms&quot; or switch tabs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-2">
          * Estimated monthly earnings based on your inputs in the calculator below. RPM and payout figures are community-sourced estimates (Q2 2025). Actual earnings vary by niche, audience geography, and content type.
        </p>
      </section>

      {/* Calculator */}
      <section id="calculator" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">💸 Earnings Calculator</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter your metrics below. The table above will update with estimated monthly earnings for each platform.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Monthly views */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Monthly Views / Streams
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={monthlyViews}
                onChange={e => setMonthlyViews(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <p className="text-xs text-gray-600 mt-1">Used for RPM tab estimates</p>
            </div>

            {/* Subscribers */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Paying Subscribers / Patrons
              </label>
              <input
                type="number"
                min={0}
                step={10}
                value={monthlySubscribers}
                onChange={e => setMonthlySubscribers(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <p className="text-xs text-gray-600 mt-1">Used for subscription tab estimates</p>
            </div>

            {/* Sub price */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Subscription Price ($/mo)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={subPrice}
                onChange={e => setSubPrice(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <p className="text-xs text-gray-600 mt-1">Your subscription price per subscriber</p>
            </div>
          </div>

          {/* Quick scenarios */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Scenarios</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Micro-creator (10K views, 20 subs)', views: 10000, subs: 20, price: 5 },
                { label: 'Growing (100K views, 100 subs)', views: 100000, subs: 100, price: 5 },
                { label: 'Mid-tier (500K views, 500 subs)', views: 500000, subs: 500, price: 9 },
                { label: 'Pro creator (2M views, 2K subs)', views: 2000000, subs: 2000, price: 10 },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => { setMonthlyViews(s.views); setMonthlySubscribers(s.subs); setSubPrice(s.price); }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Strategy Brief */}
      <section id="strategy-brief" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <div className="bg-violet-950/40 border border-violet-800 rounded-2xl p-6">
            <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider mb-2">
              Productized recommendation engine
            </p>
            <h2 className="text-2xl font-bold text-white mb-3">
              Your top payout moves
            </h2>
            <p className="text-sm text-violet-100/80 mb-5">
              The app turns the deep-research payout dataset into a ranked,
              downloadable strategy brief for the creator metrics entered above.
            </p>
            <div className="space-y-3">
              {topRecommendations.map((estimate, index) => (
                <div
                  key={estimate.platform.id}
                  className="rounded-xl bg-black/30 border border-violet-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-violet-300 font-semibold">
                        #{index + 1} recommendation
                      </p>
                      <h3 className="font-bold text-white">
                        {estimate.platform.emoji} {estimate.platform.name}
                      </h3>
                    </div>
                    <span className="text-lg font-black text-emerald-300">
                      {formatUsd(estimate.blendedMonthlyRevenue)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Fits {estimate.platform.bestFor.slice(0, 3).join(', ')}.
                    Pays {estimate.platform.paymentCadence.toLowerCase()}.
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => downloadReport('markdown')}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                Download Markdown brief
              </button>
              <button
                type="button"
                onClick={() => downloadReport('csv')}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-gray-100 hover:bg-gray-700 transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold text-white">
                Strategy brief preview
              </h2>
              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
                API-ready report
              </span>
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl bg-black/50 p-4 text-xs leading-relaxed text-emerald-200 whitespace-pre-wrap">
              {markdownReport}
            </pre>
          </div>
        </div>
      </section>

      {/* Platform Deep Dives */}
      <section id="platforms" className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-white mb-6">Platform Deep Dives</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PLATFORMS.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.emoji}</span>
                <div>
                  <h3 className="font-bold text-white text-sm">{p.name}</h3>
                  <span className="text-xs text-gray-500 capitalize">{p.category} · {p.paymentCadence} payouts</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {p.rpmMin !== null && p.rpmMax !== null && (
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded">
                    ${p.rpmMin}–${p.rpmMax} RPM
                  </span>
                )}
                {p.subPayoutPer5 !== null && (
                  <span className="bg-blue-950 text-blue-400 border border-blue-900 px-2 py-0.5 rounded">
                    ${p.subPayoutPer5.toFixed(2)} / $5 sub
                  </span>
                )}
                {p.platformCutPct !== null && (
                  <span className={`px-2 py-0.5 rounded border ${p.platformCutPct <= 10 ? 'bg-emerald-950 text-emerald-400 border-emerald-900' : p.platformCutPct <= 20 ? 'bg-yellow-950 text-yellow-400 border-yellow-900' : 'bg-red-950 text-red-400 border-red-900'}`}>
                    {p.platformCutPct}% platform cut
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Best For</p>
                <p className="text-xs text-gray-300">{p.bestFor.join(' · ')}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Eligibility</p>
                <p className="text-xs text-gray-400">{p.minEligibility}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                <div>
                  <p className="text-emerald-500 font-semibold mb-1">✅ Pros</p>
                  <ul className="space-y-0.5 text-gray-400">
                    {p.pros.slice(0, 3).map((pro, i) => <li key={i}>{pro}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-red-400 font-semibold mb-1">❌ Cons</p>
                  <ul className="space-y-0.5 text-gray-400">
                    {p.cons.slice(0, 3).map((con, i) => <li key={i}>{con}</li>)}
                  </ul>
                </div>
              </div>

              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Visit {p.name.split(' ')[0]} →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
                Shippable revenue surface
              </p>
              <h2 className="text-2xl font-bold text-white mb-3">
                Turn payout research into a paid creator utility
              </h2>
              <p className="text-sm text-emerald-100/80">
                Free visitors get rankings, estimates, and exports. Creator Pro
                buyers get quarterly payout-change alerts, niche-specific RPM
                briefings, and agency-ready report exports.
              </p>
            </div>
            <div className="rounded-xl bg-black/30 border border-emerald-900 p-4">
              <p className="text-sm font-bold text-white">Creator Pro</p>
              <p className="text-3xl font-black text-emerald-300 mt-1">
                $9<span className="text-sm font-medium text-emerald-200">/mo</span>
              </p>
              <ul className="mt-3 space-y-2 text-xs text-gray-300">
                <li>Quarterly payout alert emails</li>
                <li>Niche RPM briefings for finance, tech, gaming, art</li>
                <li>Agency-ready Markdown and CSV exports</li>
              </ul>
              <a
                href={checkoutUrl}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                Start Creator Pro
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About / Disclaimer */}
      <section id="about" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-3">About This Tool</h2>
          <div className="text-sm text-gray-400 space-y-3">
            <p>
              <strong className="text-gray-200">Creator Payout Tracker</strong> is a free, creator-first reference tool that aggregates publicly available and community-reported payout rates across major creator platforms. It is not affiliated with any platform listed.
            </p>
            <p>
              <strong className="text-gray-200">Data sources:</strong> Payout figures are derived from platform documentation, creator community reports (Reddit r/NewTubers, r/Twitch, r/CreatorEconomy), industry publications (Influencer Marketing Hub, MilX, LiveWire Weekly, Fundmates), and aggregated creator surveys. Data is estimated and reflects Q2 2025 conditions.
            </p>
            <p>
              <strong className="text-gray-200">Disclaimer:</strong> Earnings estimates are illustrative only. Actual payout rates vary significantly by content niche, audience geography, engagement rate, and individual platform tier. This tool does not guarantee any specific level of earnings. Always verify current rates directly with each platform before making business decisions.
            </p>
            <p>
              <strong className="text-gray-200">Data refresh:</strong> Platform payout data is reviewed quarterly. Last updated: Q2 2025.
            </p>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            Built by <a href="https://github.com/midnghtsapphire/revvel-standards" className="text-violet-500 hover:underline">Revvel Standards</a> · Issue #13641 · {new Date().getFullYear()}
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-800 text-center py-6 text-xs text-gray-600">
        Creator Payout Tracker · Data estimates for informational purposes only · Not financial advice
      </footer>
    </main>
  );
}
