"use client";

import { useState } from 'react';
import { Download, Play, Sun, Moon, Link as LinkIcon, CheckCircle2, MessageSquare, Calendar } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [theme, setTheme] = useState<'morning' | 'night'>('night');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      // In a real app, this would call the API to send the lead magnet
      // and redirect to the affiliate offer page
    }
  };

  return (
    <main className={`min-h-screen transition-colors duration-500 ${theme === 'night' ? 'bg-[#0f172a] text-slate-50' : 'bg-orange-50 text-slate-900'}`}>
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-xl">
          <LinkIcon className={theme === 'night' ? 'text-blue-400' : 'text-orange-500'} />
          <span>CopyMySystem</span>
        </div>
        <button
          onClick={() => setTheme(theme === 'night' ? 'morning' : 'night')}
          className={`p-2 rounded-full border ${theme === 'night' ? 'border-slate-700 bg-slate-800 text-yellow-300' : 'border-orange-200 bg-white text-orange-500'} transition-all`}
        >
          {theme === 'night' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-12 md:py-20 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-black/10 dark:bg-white/10 backdrop-blur-sm border border-black/5 dark:border-white/5">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Free Download
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            I stopped trading <br className="hidden md:block"/>
            <span className={theme === 'night' ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500'}>
              time for dollars.
            </span>
          </h1>

          <p className="text-lg md:text-xl opacity-90 max-w-xl">
            This exact system handles my text follow-ups, calendars, and sales on autopilot while I sleep. Clone my setup instantly.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <input
                type="email"
                required
                placeholder="Where should I send the blueprint?"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`flex-1 px-4 py-4 rounded-xl outline-none focus:ring-2 border ${theme === 'night' ? 'bg-slate-800 border-slate-700 focus:ring-blue-500 text-white placeholder:text-slate-400' : 'bg-white border-orange-200 focus:ring-orange-500 text-slate-900 placeholder:text-slate-500'}`}
              />
              <button
                type="submit"
                className={`px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme === 'night' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'}`}
              >
                <Download size={20} />
                Get It Free
              </button>
            </form>
          ) : (
            <div className={`p-6 rounded-2xl border ${theme === 'night' ? 'bg-slate-800 border-green-500/30' : 'bg-white border-green-500/30'}`}>
              <div className="flex items-center gap-3 text-green-500 font-bold mb-2">
                <CheckCircle2 />
                <span>Blueprint Sent to {email}!</span>
              </div>
              <p className="mb-4 opacity-80">Check your inbox. Now, click below to see the exact software stack I use to run this.</p>
              <a
                href="#clone-system"
                className={`block text-center w-full px-6 py-4 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme === 'night' ? 'bg-indigo-500 text-white' : 'bg-orange-600 text-white'}`}
              >
                Clone the System Now →
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 w-full max-w-sm relative">
          {/* Mockup of a phone showing a TikTok video */}
          <div className="relative mx-auto border-8 border-slate-900 rounded-[2.5rem] h-[600px] w-full max-w-[300px] overflow-hidden bg-black shadow-2xl">
            {/* Camera notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20"></div>

            {/* Video content simulation */}
            <div className={`absolute inset-0 z-0 ${theme === 'night' ? 'bg-gradient-to-b from-slate-900 to-indigo-950' : 'bg-gradient-to-b from-orange-100 to-amber-200'}`}>
              <div className="absolute inset-0 opacity-40 mix-blend-overlay flex items-center justify-center">
                 {theme === 'night' ? (
                   <div className="w-64 h-64 bg-blue-500 rounded-full blur-[80px]"></div>
                 ) : (
                   <div className="w-64 h-64 bg-orange-400 rounded-full blur-[80px]"></div>
                 )}
              </div>
            </div>

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent text-white">
              <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1">@creator</h3>
                    <p className="text-sm line-clamp-2">I stopped trading time for dollars. Tap the link in my bio to clone this setup instantly. 🔗👇</p>
                  </div>
                  <div className="flex flex-col gap-4 items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">❤️</div>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">💬</div>
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">↗️</div>
                  </div>
                </div>

                {/* Mock CTA Link */}
                <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 flex items-center gap-3">
                  <LinkIcon size={16} />
                  <span className="text-sm font-medium">Clone My System (Free)</span>
                </div>
              </div>
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center">
               <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
                 <Play className="ml-1" fill="currentColor" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="clone-system" className={`py-20 border-t ${theme === 'night' ? 'border-slate-800 bg-slate-900/50' : 'border-orange-100 bg-white/50'}`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything happens on autopilot</h2>
            <p className="text-lg opacity-80 max-w-2xl mx-auto">The exact three tools you need to build this machine.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-2xl border ${theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100 shadow-xl shadow-orange-500/5'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'night' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-100 text-orange-600'}`}>
                <MessageSquare />
              </div>
              <h3 className="text-xl font-bold mb-3">Auto SMS Follow-ups</h3>
              <p className="opacity-80 mb-6">Never lose a lead. The system texts them automatically the second they show interest.</p>
              {/* This is the actual affiliate link */}
              <a href="#" className={`font-semibold inline-flex items-center gap-2 ${theme === 'night' ? 'text-blue-400' : 'text-orange-600'}`}>
                Get Twilio Setup →
              </a>
            </div>

            <div className={`p-8 rounded-2xl border ${theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100 shadow-xl shadow-orange-500/5'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'night' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-600'}`}>
                <Calendar />
              </div>
              <h3 className="text-xl font-bold mb-3">Calendar Booking</h3>
              <p className="opacity-80 mb-6">They book straight into your calendar without any back-and-forth emails.</p>
              <a href="#" className={`font-semibold inline-flex items-center gap-2 ${theme === 'night' ? 'text-indigo-400' : 'text-amber-600'}`}>
                Get Cal.com →
              </a>
            </div>

            <div className={`p-8 rounded-2xl border ${theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-white border-orange-100 shadow-xl shadow-orange-500/5'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${theme === 'night' ? 'bg-purple-500/20 text-purple-400' : 'bg-red-100 text-red-600'}`}>
                <LinkIcon />
              </div>
              <h3 className="text-xl font-bold mb-3">The Hub</h3>
              <p className="opacity-80 mb-6">The landing page builder that connects everything together seamlessly.</p>
              <a href="#" className={`font-semibold inline-flex items-center gap-2 ${theme === 'night' ? 'text-purple-400' : 'text-red-600'}`}>
                Get The Builder →
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 opacity-60 text-sm">
        <p>© 2026 CopyMySystem. All rights reserved.</p>
        <p className="mt-2">Disclosure: Some links above are affiliate links.</p>
      </footer>
    </main>
  );
}
