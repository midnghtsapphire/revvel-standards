import React from 'react';
import { AffiliateModule } from '@/components/AffiliateModule';
import { NewsletterModule } from '@/components/NewsletterModule';

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="py-8 border-b border-gray-200">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Evaluate Codebase Graphing Tools</h2>
        <p className="text-xl text-gray-600 max-w-3xl">
          Visualizing large codebases is critical for understanding dependencies, resolving technical debt, and onboarding new engineers. In this report, we evaluate <strong>Graphify</strong> against manual documentation approaches.
        </p>
      </section>

      <section id="analysis" className="grid md:grid-cols-2 gap-8 py-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold mb-4 text-indigo-700">Graphify Overview</h3>
          <p className="text-gray-700 mb-4">
            <a href="https://github.com/safishamsi/graphify" className="text-blue-600 hover:underline">Graphify</a> is an LLM-powered codebase relationship graph extractor. It uses models like Ollama, Claude, or Bedrock to semantically parse the AST and infer relationships that traditional lexical parsers miss.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li><strong>Pros:</strong> Understands dynamic dependencies, local inference support (Ollama), visualizes semantic communities.</li>
            <li><strong>Cons:</strong> Token limits on extremely large repos without subsetting.</li>
            <li><strong>Cost:</strong> Free (open source), requires local GPU or API budget.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-2xl font-bold mb-4 text-emerald-700">Manual Approaches</h3>
          <p className="text-gray-700 mb-4">
            Traditional approaches rely on manual architecture diagramming (e.g., Draw.io, Lucidchart) or strict lexical parsers (e.g., dependency-cruiser).
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li><strong>Pros:</strong> Manual diagrams are human-curated and omit noise. Lexical parsers are exact and fast.</li>
            <li><strong>Cons:</strong> Manual diagrams get stale immediately. Lexical parsers miss implicit dependencies (e.g., event buses, dynamic imports).</li>
            <li><strong>Cost:</strong> High manual labor cost.</li>
          </ul>
        </div>
      </section>

      <section className="py-6">
        <h3 className="text-2xl font-bold mb-4">Conclusion & Recommendation</h3>
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-md text-gray-800">
          <p className="mb-4">
            Graphify represents a significant step forward by bridging the gap between strict lexical parsers and manual curation. By utilizing LLM-based semantic analysis, it can group code by domain and uncover hidden architectural dependencies.
          </p>
          <p className="font-semibold">
            We recommend adopting Graphify in CI/CD pipelines to generate auto-updating dependency graphs.
          </p>
        </div>
      </section>

      <AffiliateModule />
      <NewsletterModule />
    </div>
  );
}
