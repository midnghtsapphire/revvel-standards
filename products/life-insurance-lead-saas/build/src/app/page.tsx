import React from 'react';
import { AffiliateModule } from '@/components/AffiliateModule';
import { NewsletterModule } from '@/components/NewsletterModule';

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="bg-gray-900 text-white py-20 md:py-32 text-center shadow-lg rounded-xl mt-4">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            High-Quality Insurance Leads
          </h2>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
            <strong>Live Transfers & Exclusive Outbound</strong> for ACA, Life & Health Insurance Agents.
          </p>
          <a href="#contact-us" className="inline-block bg-white text-gray-900 font-bold py-4 px-8 rounded-full shadow-lg hover:bg-gray-200 transition duration-300 ease-in-out transform hover:scale-105">
            Get Your Hot Leads Today!
          </a>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gray-100 text-center rounded-xl">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Ready to Boost Your Sales?</h3>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Connect with Life Wizard today to get access to high-quality, pre-qualified insurance leads.
          </p>
          <div className="inline-block bg-gradient-to-r from-gray-800 to-gray-900 text-white font-extrabold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition duration-300 ease-in-out border-2 border-gray-700">
            <span className="text-3xl mr-3">&#9742;</span>
            <a href="tel:7867403445" className="text-3xl tracking-wide">CALL NOW: (786) 740-3445</a>
          </div>
        </div>
      </section>

      <section id="what-we-offer" className="py-16 md:py-24 bg-gray-50 rounded-xl">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">What We Offer</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105 hover:shadow-xl border border-gray-200">
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                Inbound Prequalified Live Transfers (Indexed Universal Life, Term & ROP) <span className="text-gray-600 text-lg">(Hot Leads)</span>
              </h4>
              <p className="text-gray-700 mb-6">
                Real-time transfers of leads who have called in, been screened, and are ready to speak with your agents <strong>LIVE</strong>.
              </p>
              <ul className="space-y-3 text-gray-700 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">Real-Time Transfers:</span> Leads call in, get screened, and are transferred live to your agents.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">100% Exclusive:</span> No shared leads; only <strong className="text-gray-900">YOUR agency</strong> gets the contact.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">Prequalified for:</span>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>ACA (Affordable Care Act)</li>
                      <li>Final Expense / Life Insurance</li>
                      <li>Medicare Supplements</li>
                    </ul>
                  </div>
                </li>
              </ul>
              <h5 className="text-xl font-semibold text-gray-900 mb-3">Price List</h5>
              <p className="text-gray-700 mb-2">
                <span className="font-bold">Base Price:</span> <span className="text-gray-900 text-lg font-bold">$38-$40 per transfer</span>
              </p>
              <p className="text-gray-700 mb-4">
                <span className="font-bold">2-minute minimum call duration:</span> Only pay if the call exceeds 2 minutes!
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-105 hover:shadow-xl border border-gray-200">
              <h4 className="text-2xl font-semibold text-gray-900 mb-4">
                Exclusive Outbound Leads <span className="text-gray-600 text-lg">(Budget-Friendly & High-Intent)</span>
              </h4>
              <p className="text-gray-700 mb-6">
                These leads are pre-called and expecting your call, offering a lower-cost alternative with the same high quality.
              </p>
              <ul className="space-y-3 text-gray-700 mb-6">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">Price:</span> <span className="text-gray-900 text-lg font-bold">$14-$16 per lead</span>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">100% Exclusive:</span> Only <strong className="text-gray-900">YOUR agency</strong> gets the contact.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">Pre-called & Verified:</span> They are expecting <strong className="text-gray-900">YOUR call</strong> within <strong className="text-gray-900">24 hours</strong>.
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                  <div>
                    <span className="font-semibold">Proof of Call:</span> Receive a <strong className="text-gray-900">Google Drive recording</strong> of the conversation.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 transform transition duration-300 hover:scale-102 hover:shadow-xl mt-10 border border-gray-200">
            <h4 className="text-2xl font-semibold text-gray-900 mb-4">
              🔥 High-Quality Aged Leads – Priced to Move!
            </h4>
            <p className="text-gray-700 mb-6">
              Unlock incredible value with our aged leads, perfect for expanding your reach and boosting sales on a budget.
            </p>
            <ul className="space-y-3 text-gray-700 mb-6">
              <li className="flex items-start">
                <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                <div>
                  <span className="font-semibold">Aged Leads:</span> <strong className="text-gray-900 text-lg font-bold">$1-$5</strong>
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                <div>
                  <span className="font-semibold">Verified & Ready-to-Call Prospects:</span> Still high-intent, just a little older.
                </div>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 text-xl">&#10003;</span>
                <div>
                  <span className="font-semibold">Perfect For:</span> Life, Health, Final Expense, Medicare & More.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-24 bg-white rounded-xl">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-lg shadow-md bg-gray-50 border border-gray-100">
              <div className="text-4xl font-bold text-gray-900 mb-4">1.</div>
              <p className="text-lg text-gray-700 font-semibold mb-2">Lead Calls In</p>
              <p className="text-gray-600">Prospect sees your ad/campaign and initiates contact.</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md bg-gray-50 border border-gray-100">
              <div className="text-4xl font-bold text-gray-900 mb-4">2.</div>
              <p className="text-lg text-gray-700 font-semibold mb-2">Needs Verified</p>
              <p className="text-gray-600">Our team screens and verifies their needs, budget, and eligibility.</p>
            </div>
            <div className="text-center p-6 rounded-lg shadow-md bg-gray-50 border border-gray-100">
              <div className="text-4xl font-bold text-gray-900 mb-4">3.</div>
              <p className="text-lg text-gray-700 font-semibold mb-2">Warm Transfer</p>
              <p className="text-gray-600">The pre-qualified lead is warmly transferred directly to your agent – no cold calling!</p>
            </div>
          </div>
        </div>
      </section>

      <AffiliateModule />
      <NewsletterModule />
    </div>
  );
}
