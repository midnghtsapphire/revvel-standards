import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Red Light Therapy Dosage Calculator",
  description:
    "Honest privacy notice for the Red Light Therapy Dosage Calculator. Direct-to-consumer wellness tool. We do not claim HIPAA compliance.",
};

const UPDATED = "2026-08-08";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-grid text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="text-sm text-slate-600">
          <Link href="/" className="font-medium text-cyan-800 underline-offset-2 hover:underline">
            ← Back to calculator
          </Link>
        </nav>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl sm:p-8">
          <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700">
            Privacy Policy
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">
            Red Light Therapy Dosage Calculator
          </h1>
          <p className="mt-2 text-sm text-slate-600">Last updated: {UPDATED}</p>

          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-800 sm:text-base">
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <h2 className="text-base font-semibold">Plain-language summary</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  This is a <strong>direct-to-consumer wellness / educational</strong> calculator.
                </li>
                <li>
                  Dosage inputs stay in your browser for the session. The app does{" "}
                  <strong>not</strong> create an account or upload your numbers to our API.
                </li>
                <li>
                  We <strong>do not claim HIPAA compliance</strong>, HIPAA certification, or that
                  architecture choices give you HIPAA regulatory protection.
                </li>
                <li>
                  We are <strong>not</strong> your health care provider. This tool does not
                  diagnose, treat, cure, or prevent any condition.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">1. Who we are</h2>
              <p className="mt-2">
                This privacy policy describes the Red Light Therapy Dosage Calculator published
                under the MIDNGHTSAPPHIRE / Revvel consumer wellness properties (the
                &quot;Service&quot;). Contact for privacy requests related to this Service should
                be opened via the repository or product owner channel listed in the project
                README.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">2. What the Service does</h2>
              <p className="mt-2">
                The Service estimates session timing for photobiomodulation / red light devices
                using the formula{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">
                  time = (dose × 1000) / irradiance
                </code>
                , with optional duty-cycle and compensation adjustments. It is offered for general
                wellness and informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">3. Data we process</h2>
              <h3 className="mt-3 font-semibold">3.1 Calculator inputs (on-device / in-browser)</h3>
              <p className="mt-2">
                When you use the calculator you may enter: irradiance (mW/cm²), target dose
                (J/cm²), treatment area (cm²), sessions per week, duty cycle (%), and a
                compensation profile. These values are used only to compute results in your
                browser. The application source does not implement an API that stores these inputs
                on operator-controlled servers, and it does not create a user account.
              </p>
              <h3 className="mt-3 font-semibold">3.2 What we do not collect in the shipped calculator</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Name, email, password, or profile</li>
                <li>Photos, symptom journals, or postpartum / pregnancy status</li>
                <li>Insurance, payment, or government identifiers</li>
                <li>Precise geolocation</li>
                <li>Phone contacts or biometrics</li>
              </ul>
              <h3 className="mt-3 font-semibold">3.3 Hosting and security logs</h3>
              <p className="mt-2">
                If the Service is deployed on a web host or CDN, that provider may automatically
                process standard request metadata (such as IP address, user agent, timestamps, and
                requested URLs) for delivery, security, and abuse prevention. Those logs are
                controlled by the host&apos;s terms and retention settings. They are not linked by
                this application to your calculator inputs.
              </p>
              <h3 className="mt-3 font-semibold">3.4 Analytics and advertising</h3>
              <p className="mt-2">
                The shipped calculator does not include third-party advertising pixels or analytics
                SDKs that read dosage inputs. If that ever changes, this policy will be updated
                before such tooling is enabled, and health-related inputs will not be sold.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">4. Purpose and legal bases (high level)</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong>Provide the calculator</strong> — process inputs you voluntarily type to
                  show session estimates.
                </li>
                <li>
                  <strong>Operate and secure the site</strong> — hosting logs as needed for
                  availability and abuse prevention.
                </li>
                <li>
                  <strong>Legal compliance</strong> — respond to lawful requests and maintain
                  required notices.
                </li>
              </ul>
              <p className="mt-2">
                We do not sell personal information. We do not use calculator inputs for
                cross-context behavioral advertising.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">5. HIPAA posture (important)</h2>
              <p className="mt-2">
                The Service is positioned as a <strong>direct-to-consumer wellness</strong> tool.
                Under our current documented business model we do not bill insurance, do not act as
                your health care provider, and do not perform HIPAA standard transactions.
              </p>
              <p className="mt-2">
                <strong>We do not claim that this Service is HIPAA-compliant, HIPAA-certified,
                or HIPAA-safe.</strong>{" "}
                Client-side calculation and encryption (where used by hosting) are engineering
                choices. They are <em>not</em> a substitute for a HIPAA compliance program and do
                not by themselves determine whether HIPAA applies.
              </p>
              <p className="mt-2">
                Our internal entity-classification package lives at{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs sm:text-sm">
                  compliance/red-light-therapy/
                </code>{" "}
                in the source repository. A provisional internal view is that the operator is not a
                HIPAA Covered Entity or Business Associate under the current facts; that view is{" "}
                <strong>not legal advice</strong> and remains subject to written confirmation by
                qualified healthcare counsel. If our business model adds clinic partnerships,
                telehealth, HSA/FSA clinical workflows, insurance billing, or receipt of protected
                health information from a Covered Entity, we will re-evaluate before shipping those
                changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">6. Other privacy laws</h2>
              <p className="mt-2">
                Even when HIPAA does not apply, other rules may — including the FTC Health Breach
                Notification Rule, state consumer health privacy laws (for example Washington My
                Health My Data Act), CCPA/CPRA sensitive personal information provisions, and GDPR
                special-category rules if we target or monitor EU users. Because the shipped
                calculator avoids accounts and health journals, our collection footprint is
                intentionally minimal. If we expand collection, we will update this policy and
                complete the required assessments first.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">7. Retention</h2>
              <p className="mt-2">
                Calculator inputs last only for your browser session (until you leave or refresh
                the page), unless your browser independently caches page state. Hosting logs follow
                the host provider&apos;s retention schedule.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">8. Your choices and requests</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  You can stop using the calculator at any time; session inputs go away when you
                  close or refresh the page.
                </li>
                <li>
                  Because we do not keep a calculator account or server-side input history, there
                  is typically no server-side dosage profile to export or delete.
                </li>
                <li>
                  For privacy questions, hosting-log deletion requests, or future account features,
                  contact the product owner via the project README. We will respond within a
                  reasonable period and as required by applicable law.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">9. Children</h2>
              <p className="mt-2">
                The Service is not directed to children under 13 (or under 16 where that is the
                relevant standard). We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">10. Medical disclaimer</h2>
              <p className="mt-2">
                This app is for general wellness and informational purposes only. It is not a
                medical device and does not diagnose, treat, cure, or prevent any condition.
                Session parameters vary by device design, wavelength, distance, and individual
                response. Consult a qualified clinician for medical decisions. Wellness disclaimers
                address product framing; they do not create or remove privacy-law obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">11. Changes</h2>
              <p className="mt-2">
                We may update this policy as the Service or laws change. The &quot;Last
                updated&quot; date at the top will change when we do. Material expansions of data
                collection (accounts, photos, cloud health journals, clinic features) will not ship
                silently — they require an updated policy and compliance review.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900">12. Source of truth for compliance status</h2>
              <p className="mt-2">
                Engineering status for HIPAA entity scope (including whether counsel has signed) is
                tracked in repository file{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs sm:text-sm">
                  compliance/red-light-therapy/status.json
                </code>
                . Public marketing must not say &quot;HIPAA-compliant&quot; based on that file
                alone.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}