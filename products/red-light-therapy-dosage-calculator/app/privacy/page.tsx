import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Red Light Therapy Dosage Calculator",
  description:
    "Privacy policy and FTC Health Breach Notification Rule timelines for the Red Light Therapy Dosage Calculator.",
};

const sections: { id: string; title: string; paragraphs: string[] }[] = [
  {
    id: "who",
    title: "Who we are",
    paragraphs: [
      "Revvel / MIDNGHTSAPPHIRE operates this general-wellness dosage calculator. It is not a medical device and does not diagnose, treat, cure, or prevent any condition.",
      "We are not a HIPAA covered entity or business associate at launch. Consumer health privacy rules, including the FTC Health Breach Notification Rule, may still apply.",
      "We do not claim HIPAA compliance: we do not claim that this Service is HIPAA-compliant, HIPAA-certified, or governed by HIPAA at launch. This is a direct-to-consumer wellness tool, and calculator inputs are processed in your browser.",
    ],
  },
  {
    id: "collect",
    title: "Information we may collect",
    paragraphs: [
      "Calculator inputs such as irradiance, target dose, duty cycle, and treatment area are used to compute session timing.",
      "If accounts or health logs are enabled in a future release, we may process email or authentication identifiers, session history, symptom notes, or progress photos. Those elements are treated as sensitive consumer health data.",
      "We practice data minimization and do not sell personal health information.",
    ],
  },
  {
    id: "use",
    title: "How we use information",
    paragraphs: [
      "We use information to provide calculator results, secure the service, comply with law, and communicate about product, security, and privacy matters.",
      "We do not use health inputs for cross-context behavioral advertising without a separate explicit opt-in where required.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing",
    paragraphs: [
      "We share information only with processors who help us host or operate the app under a data processing agreement, with authorities when required by law, or with successors in a corporate transaction when legally required to notify you.",
      "We do not share PHR-identifiable health information with third parties for their own independent marketing.",
    ],
  },
  {
    id: "retention",
    title: "Retention and deletion",
    paragraphs: [
      "Calculator inputs kept only on your device remain under your control until you clear site data.",
      "Server-side account or health logs, if enabled, are retained only as long as needed for the feature, security, and legal obligations.",
      "Request access or deletion at privacy@revvel.io. Verified deletion requests are completed within 30 days unless a narrower legal retention duty applies.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use industry-standard safeguards appropriate to a consumer wellness app, including encryption in transit (TLS), access control for production systems, and least-privilege operations access. No method of transmission or storage is 100% secure.",
    ],
  },
  {
    id: "breach",
    title: "Health information breach notification (FTC HBNR)",
    paragraphs: [
      "If we experience a breach of security involving your unsecured personal health record (PHR) identifiable health information, and the FTC Health Breach Notification Rule (16 CFR Part 318) applies, we will notify you without unreasonable delay and no later than 60 calendar days after we discover the breach.",
      "We will also notify the Federal Trade Commission. If a breach affects more than 500 residents of any state or jurisdiction, we will notify the FTC within 10 business days of discovery and notify prominent media in each such state or jurisdiction.",
      "Notices will describe what happened, the types of information involved, the steps we are taking, the steps you can take, and how to contact us at privacy@revvel.io.",
      "Regulatory reference: 16 CFR Part 318. More information: https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule",
    ],
  },
  {
    id: "rights",
    title: "Your choices and rights",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or export personal data, and to appeal a denial. Email privacy@revvel.io.",
      "California residents may have additional rights under CCPA/CPRA for sensitive personal information. Washington residents may have rights under the My Health My Data Act. EU/UK users: health data is special-category data under GDPR Article 9.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Privacy: privacy@revvel.io",
      "Security: security@revvel.io",
      "Effective date: 2026-08-08",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-grid text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-cyan-900/20 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
          <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-900">
            Privacy
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
            Red Light Therapy Dosage Calculator — how we handle information and how we
            notify you under the FTC Health Breach Notification Rule when it applies.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/" className="font-semibold text-cyan-800 underline-offset-2 hover:underline">
              ← Back to calculator
            </Link>
          </p>
        </header>

        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
          >
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <footer className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          This policy is provided for product transparency. It is not legal advice.
          Healthcare privacy counsel must review before production collection of
          identifiable health data (PIA issue #16110).
        </footer>
      </main>
    </div>
  );
}
