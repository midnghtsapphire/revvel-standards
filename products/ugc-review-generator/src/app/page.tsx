"use client";

import React, { useState } from "react";
import { Copy, Accessibility, Mail, ShoppingBag } from "lucide-react";

export default function Home() {
  const [productName, setProductName] = useState("");
  const [problem, setProblem] = useState("");
  const [hookType, setHookType] = useState("unboxing");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [highContrast, setHighContrast] = useState(false);

  const getVisualPrompt = () => {
    if (hookType === "unboxing") {
      return `A vertical 9:16 cinematic shot mimicking a high-end smartphone camera style for a TikTok product review. A charismatic reviewer is sitting at a clean, modern wooden desk illuminated by soft, natural window light. In the center, a sleek, premium ${productName || "Amazon tech gadget or lifestyle product"} is being unboxed. The camera glides closer in a smooth, handheld tracking motion, capturing crisp, close-up details of the product's texture and glossy surfaces. As the reviewer interacts with the product, subtle atmospheric haze catches faint light leaks in the background, creating depth. The vibe is casual, authentic, and highly engaging, perfectly tailored for a viral UGC review. Photorealistic, 4k resolution, natural lighting, lifelike skin textures, seamless handheld movement.`;
    }
    return `A close-up, dynamic vertical 9:16 tracking shot of an Amazon viral product being used in a real-world scenario, like a moody, modern kitchen or a sleek home office. The camera follows a person's hands demonstrating a clever, satisfying product feature (e.g., using the ${productName || "product"}). Brilliant rim lighting catches the crisp edges of the product, while a soft-focus background keeps total emphasis on the demonstration. The lighting shifts dynamically to emphasize the "before and after" effect of using the item. Hyper-realistic, 8k resolution, ray-traced reflections, high-energy pacing, premium commercial aesthetic.`;
  };

  const getScript = () => {
    return `
🚀 Script for HeyGen (Viral TikTok Review Formula):

1. The 2-Second Anti-Ad Hook:
"I almost threw this Amazon find in the trash until I realized I was using it completely wrong..."

2. The Agitation:
"If you’re tired of ${problem || "messy cables destroying your desk setup"}, you need to see this."

3. The Payoff (The Product):
"This viral ${productName || "magnetic hub"} completely solves it. It literally took me 5 seconds to set up."

4. The Call to Action (CTA):
"I dropped the exact link in my bio if you want to grab it before it sells out again."
${affiliateLink ? `\n(Link to use: ${affiliateLink})` : ""}
    `.trim();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className={`min-h-screen p-8 font-[family-name:var(--font-geist-sans)] ${highContrast ? "bg-black text-white" : "bg-gray-50 text-gray-900"}`}>
      <main className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            UGC Review Generator
          </h1>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            aria-label="Toggle High Contrast"
          >
            <Accessibility className="w-6 h-6" />
          </button>
        </header>

        <section className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Inputs</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., magnetic cable hub"
                className="w-full p-2 border rounded text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">The Annoying Problem</label>
              <input
                type="text"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="e.g., messy cables destroying your desk"
                className="w-full p-2 border rounded text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hook Type</label>
              <select
                value={hookType}
                onChange={(e) => setHookType(e.target.value)}
                className="w-full p-2 border rounded text-black"
              >
                <option value="unboxing">Unboxing & First Impression</option>
                <option value="problem">Problem-Solving Demo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Affiliate Link (Optional)</label>
              <input
                type="url"
                value={affiliateLink}
                onChange={(e) => setAffiliateLink(e.target.value)}
                placeholder="https://amzn.to/..."
                className="w-full p-2 border rounded text-black"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Visual Prompt</h2>
                <button onClick={() => copyToClipboard(getVisualPrompt())} className="text-blue-600 hover:text-blue-800">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm leading-relaxed">{getVisualPrompt()}</p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">HeyGen Script</h2>
                <button onClick={() => copyToClipboard(getScript())} className="text-blue-600 hover:text-blue-800">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans">{getScript()}</pre>
            </div>
          </div>
        </section>

        {/* Mandatory Modules per EXRUP methodology */}
        <section className="grid md:grid-cols-2 gap-8 pt-8 border-t border-gray-200">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <Mail className="w-5 h-5" />
              Subscribe for More Prompts
            </h3>
            <p className="text-sm mb-4">Join our newsletter to get weekly viral video hooks.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Enter your email" className="flex-1 p-2 border rounded text-black" />
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Subscribe</button>
            </div>
          </div>

          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <ShoppingBag className="w-5 h-5" />
              Recommended Gear
            </h3>
            <p className="text-sm mb-4">Get the best lighting and mics for UGC videos.</p>
            <a href="https://amazon.com" target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-400 font-medium hover:underline">
              Shop our affiliate store →
            </a>
          </div>
        </section>

      </main>
    </div>
  );
}
