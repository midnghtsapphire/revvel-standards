import Link from "next/link";
import {
  HEALTH_DATA_CATEGORIES,
  MHMDA_POLICY_VERSION,
  PRIVACY_POLICY_SECTIONS,
  STATE_LAW_ASSESSMENTS,
  THIRD_PARTY_RECIPIENTS,
} from "../data/mhmda-consent";

export const metadata = {
  title: "Privacy Policy — Red Light Therapy Dosage Calculator",
  description:
    "MHMDA-aligned privacy disclosures for consumer health data, rights requests, and sister-state assessment.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Privacy · MHMDA · policy {MHMDA_POLICY_VERSION}
        </p>
        <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          This policy covers the Red Light Therapy Dosage Calculator and optional stretch-mark /
          recovery progress features. It includes Washington My Health My Data Act (RCW 19.373)
          disclosures. It is not legal advice.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/" className="font-semibold text-cyan-800 underline">
            ← Back to calculator
          </Link>
        </p>

        <div className="mt-8 space-y-6">
          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Health data category inventory</h2>
          <ul className="mt-3 space-y-3">
            {HEALTH_DATA_CATEGORIES.map((category) => (
              <li key={category.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{category.label}</p>
                <p className="mt-1 text-slate-700">{category.description}</p>
                <p className="mt-1 text-xs text-slate-600">
                  <strong>Purpose:</strong> {category.purpose}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <strong>Retention:</strong> {category.retention}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Third-party recipients</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {THIRD_PARTY_RECIPIENTS.map((recipient) => (
              <li key={recipient.id} className="rounded-xl bg-slate-50 p-3">
                <strong>{recipient.name}</strong> — {recipient.purpose}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Sister-state assessment</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3">Law</th>
                  <th className="py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {STATE_LAW_ASSESSMENTS.map((row) => (
                  <tr key={row.state} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 font-semibold">{row.state}</td>
                    <td className="py-2 pr-3">{row.lawName}</td>
                    <td className="py-2 text-slate-700">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-10 text-xs text-slate-500">
          Last updated {MHMDA_POLICY_VERSION}. For rights requests use the in-app Health Data
          Rights panel or email privacy@revvel.example.
        </p>
      </main>
    </div>
  );
}
