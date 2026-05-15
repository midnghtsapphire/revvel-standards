'use client';
import React, { useState } from 'react';
import { UploadCloud, Music, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import AffiliateModule from '@/components/AffiliateModule';
import NewsletterModule from '@/components/NewsletterModule';
import AccessibilityControls from '@/components/AccessibilityControls';

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    run_id: string;
    render_status: string;
    provider_selected: string;
    provider_job_id: string | null;
    canonical_video_url: string | null;
    publish_status: string;
    models_used: string[];
    swarm_query_count: number;
    total_token_cost_usd: string;
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !avatarFile) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('avatar', avatarFile);

      const response = await fetch('/api/video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate video.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-all dark:bg-gray-900 dark:text-gray-100 font-sans">
      <AccessibilityControls />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Music Video <span className="text-indigo-600 dark:text-indigo-400">Creator</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transform your .wav files and avatar images into stunning music videos powered by the best AI video APIs.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Main App Section */}
          <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Video className="w-6 h-6 text-indigo-500" />
              Create Video
            </h2>

            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Upload Audio (.wav)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {audioFile ? audioFile.name : <span className="font-semibold">Click to upload</span>}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".wav"
                      className="hidden"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Upload Avatar Image
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {avatarFile ? avatarFile.name : <span className="font-semibold">Click to upload</span>}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={!audioFile || !avatarFile || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  'Generate Music Video'
                )}
              </button>
            </form>

            {result && (
              <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h3 className="text-green-800 dark:text-green-300 font-medium mb-2">Orchestration Complete</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mb-2">{result.message}</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <div><strong>Run ID:</strong> {result.run_id}</div>
                  <div><strong>Status:</strong> {result.render_status}</div>
                  <div><strong>Provider selected:</strong> {result.provider_selected || '—'}</div>
                  <div><strong>Job ID:</strong> {result.provider_job_id ?? 'pending'}</div>
                  <div><strong>Publish status:</strong> {result.publish_status}</div>
                  <div><strong>Models used:</strong> {result.models_used?.join(', ') || '—'}</div>
                  <div><strong>Swarm queries:</strong> {result.swarm_query_count}</div>
                  <div><strong>Token cost:</strong> ${result.total_token_cost_usd}</div>
                </div>
                {result.canonical_video_url && (
                  <div className="mt-4">
                    <a href={result.canonical_video_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
                      View Published Video &rarr;
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sidebar Section */}
          <aside className="space-y-8">
            <NewsletterModule />
            <AffiliateModule />
          </aside>
        </div>
      </div>
    </main>
  );
}
