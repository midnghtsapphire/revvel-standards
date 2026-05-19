import AccessibilityControls from "@/components/AccessibilityControls";
import Newsletter from "@/components/Newsletter";
import AffiliateMarketing from "@/components/AffiliateMarketing";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <AccessibilityControls />
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Revvel Skill Runner</h1>
        <p className="text-xl opacity-80">
          Production skill execution engine. Ship faster. Earn sooner.
        </p>
        <a
          href="https://polar.sh"
          className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-lg dark:bg-white dark:text-black"
        >
          Fund on Polar.sh
        </a>
      </section>
      <Newsletter />
      <AffiliateMarketing />
    </main>
  );
}
