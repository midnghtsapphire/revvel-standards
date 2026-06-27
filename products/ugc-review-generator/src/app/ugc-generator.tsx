"use client";

import { useMemo, useState } from "react";
import creativeSystem from "../lib/creative-system";

const MODES = [
  { id: "default", label: "Default" },
  { id: "aaa", label: "Enhanced contrast" },
  { id: "dyslexia", label: "Dyslexia-friendly" },
  { id: "focus", label: "Focus mode" },
  { id: "contrast", label: "High contrast" },
  { id: "large", label: "Large text" },
  { id: "mono", label: "Monospace" },
] as const;

type ModeId = (typeof MODES)[number]["id"];
type UseCase = "local-leads" | "amazon-ugc";

const { buildAmazonReviewPacket, buildLocalLeadPacket, packetToMarkdown } = creativeSystem;

export default function UgcGenerator() {
  const [mode, setMode] = useState<ModeId>("default");
  const [useCase, setUseCase] = useState<UseCase>("local-leads");
  const [productName, setProductName] = useState("");
  const [problem, setProblem] = useState("");
  const [hookType, setHookType] = useState("unboxing");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [brandName, setBrandName] = useState("Lead Hook System");
  const [businessType, setBusinessType] = useState("real estate");
  const [audience, setAudience] = useState("Real estate agents");
  const [painPoint, setPainPoint] = useState("what to post on social media");
  const [proofMetric, setProofMetric] = useState("120 organic buyer leads");
  const [offer, setOffer] = useState("Unlimited AI ad generation");
  const [freeTrialDays, setFreeTrialDays] = useState("7");
  const [urgencyHours, setUrgencyHours] = useState("3");
  const [copyState, setCopyState] = useState("Copy packet");

  const packet = useMemo(() => {
    if (useCase === "amazon-ugc") {
      return buildAmazonReviewPacket({
        productName,
        problem,
        hookType,
        affiliateLink,
      });
    }

    return buildLocalLeadPacket({
      brandName,
      businessType,
      audience,
      painPoint,
      proofMetric,
      offer,
      freeTrialDays,
      urgencyHours,
    });
  }, [
    affiliateLink,
    audience,
    brandName,
    businessType,
    freeTrialDays,
    hookType,
    offer,
    painPoint,
    problem,
    productName,
    proofMetric,
    urgencyHours,
    useCase,
  ]);

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(packetToMarkdown(packet));
      setCopyState("Copied");
      window.setTimeout(() => setCopyState("Copy packet"), 1600);
    } catch (error) {
      console.error("Clipboard write failed:", error);
      setCopyState("Copy unavailable");
      window.setTimeout(() => setCopyState("Copy packet"), 1600);
    }
  }

  const isFormEmpty = useCase === 'amazon-ugc'
    ? !productName?.trim() || !problem?.trim()
    : !brandName?.trim() || !audience?.trim();

  return (
    <div className={`mode-${mode} min-h-screen bg-slate-950 text-slate-100`}>
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-300">
            UGC Review Generator
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Reverse-engineer Zeely-style lead ads and UGC scripts in one workspace.
              </h1>
              <p className="max-w-2xl text-base text-slate-300">
                Use the new Local Lead mode to turn one offer into overlay copy, a proof-led
                script, landing-page messaging, and a 30-day content plan inspired by the
                screenshot workflow. Keep the original Amazon/HeyGen UGC flow for product demos.
              </p>
            </div>
            <button
              type="button"
              disabled={isFormEmpty}
              onClick={copyPacket}
              className="rounded-full bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFormEmpty ? 'Complete form to copy' : copyState}
            </button>
          </div>
        </header>
        <section className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">Generator mode</span>
            <select
              value={useCase}
              onChange={(event) => setUseCase(event.target.value as UseCase)}
              className="rounded-xl border border-white/15 bg-slate-900 p-3"
            >
              <option value="local-leads">Zeely-style local lead ads</option>
              <option value="amazon-ugc">Amazon UGC / HeyGen</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              Accessibility modes
            </span>
            <div className="flex flex-wrap gap-2">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  onClick={() => setMode(item.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    mode === item.id
                      ? "border-cyan-300 bg-cyan-300 text-slate-950"
                      : "border-white/15 bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.35fr]">
          <aside className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6">
            {useCase === "amazon-ugc" ? (
              <>
                <div>
                  <h2 className="text-xl font-bold">Amazon UGC inputs</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Keep the original product-review flow for avatar tools like HeyGen.
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Product name</span>
                  <input
                    type="text"
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder="e.g. magnetic cable hub"
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Problem</span>
                  <input
                    type="text"
                    value={problem}
                    onChange={(event) => setProblem(event.target.value)}
                    placeholder="e.g. messy cables destroying your desk"
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Hook type</span>
                  <select
                    value={hookType}
                    onChange={(event) => setHookType(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  >
                    <option value="unboxing">Unboxing &amp; first impression</option>
                    <option value="problem">Problem-solving demo</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Affiliate link</span>
                  <input
                    type="url"
                    value={affiliateLink}
                    onChange={(event) => setAffiliateLink(event.target.value)}
                    placeholder="https://amzn.to/..."
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold">Local lead inputs</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Rebuild the proof + urgency + CTA system shown in the Zeely screenshot.
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Brand name</span>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Business type</span>
                  <input
                    type="text"
                    value={businessType}
                    onChange={(event) => setBusinessType(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Audience</span>
                  <input
                    type="text"
                    value={audience}
                    onChange={(event) => setAudience(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Pain point</span>
                  <input
                    type="text"
                    value={painPoint}
                    onChange={(event) => setPainPoint(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Proof metric</span>
                  <input
                    type="text"
                    value={proofMetric}
                    onChange={(event) => setProofMetric(event.target.value)}
                    placeholder="e.g. 120 organic buyer leads"
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Offer</span>
                    <input
                      type="text"
                      value={offer}
                      onChange={(event) => setOffer(event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">Free-trial days</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={freeTrialDays}
                      onChange={(event) => setFreeTrialDays(event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Urgency window (hours)</span>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={urgencyHours}
                    onChange={(event) => setUrgencyHours(event.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
                  />
                </label>
              </>
            )}
          </aside>

          <section className="space-y-5">
            {packet.useCase === "amazon-ugc" ? (
              <>
                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">Visual prompt</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{packet.visualPrompt}</p>
                </article>
                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">HeyGen script</h2>
                  <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">
                    {packet.script}
                  </pre>
                </article>
                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">Publish checklist</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
                    {packet.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </>
            ) : (
              <>
                <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Overlay copy</h2>
                      <p className="text-sm text-slate-300">
                        Short stacked captions modeled on the screenshot structure.
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                      Zeely-style
                    </span>
                  </div>
                  <div className="space-y-3">
                    {packet.overlayLines.map((line) => (
                      <p
                        key={line}
                        className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-lg font-semibold text-white shadow-lg shadow-black/20"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">3-part short script</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-200">{packet.shortScript}</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {packet.hooks.map((hook) => (
                      <div key={hook} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <p className="text-sm leading-6 text-slate-200">{hook}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">Landing-page hero</h2>
                  <h3 className="mt-4 text-2xl font-black">{packet.landingPage.hero}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{packet.landingPage.subhead}</p>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-200">
                    {packet.landingPage.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <p className="mt-4 inline-flex rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
                    {packet.landingPage.cta}
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-bold">30-day content plan</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-200">
                      <thead className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2">Format</th>
                          <th className="px-3 py-2">Angle</th>
                          <th className="px-3 py-2">Hook</th>
                          <th className="px-3 py-2">CTA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packet.contentCalendar.map((entry) => (
                          <tr key={entry.day} className="border-b border-white/5 align-top">
                            <td className="px-3 py-3 font-semibold">{entry.day}</td>
                            <td className="px-3 py-3">{entry.format}</td>
                            <td className="px-3 py-3">{entry.angle}</td>
                            <td className="px-3 py-3">{entry.hook}</td>
                            <td className="px-3 py-3">{entry.cta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-3xl border border-amber-300/20 bg-amber-500/5 p-6">
                  <h2 className="text-xl font-bold text-amber-100">Compliance checks</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-50">
                    {packet.complianceNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </article>
              </>
            )}
          </section>
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-2">
          <article className="rounded-2xl bg-slate-950/50 p-5">
            <h2 className="text-lg font-bold">Newsletter capture</h2>
            <p className="mt-2 text-sm text-slate-300">
              Offer weekly hooks, proof templates, and CTA experiments for local-service ads.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full rounded-xl border border-white/15 bg-slate-900 p-3"
              />
              <button
                type="button"
                className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-950"
              >
                Subscribe
              </button>
            </div>
          </article>
          <article className="rounded-2xl bg-slate-950/50 p-5">
            <h2 className="text-lg font-bold">Affiliate module</h2>
            <p className="mt-2 text-sm text-slate-300">
              Pair these scripts with creator gear, lighting kits, or CRM recommendations.
            </p>
            <a
              href="https://www.amazon.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-xl border border-cyan-300/40 px-4 py-3 text-sm font-semibold text-cyan-200"
            >
              Open gear list
            </a>
          </article>
        </section>
      </main>
    </div>
  );
}
