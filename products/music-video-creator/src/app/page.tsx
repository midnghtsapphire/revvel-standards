'use client';
import React, { useState, useCallback } from 'react';
import { UploadCloud, Music, Image as ImageIcon, Video, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import AffiliateModule from '@/components/AffiliateModule';
import NewsletterModule from '@/components/NewsletterModule';
import AccessibilityControls from '@/components/AccessibilityControls';

interface JobStatus {
  provider: string | null;
  provider_job_id: string | null;
  render_status: string;
  video_exists: boolean;
  artifact_storage_url: string | null;
  canonical_video_url: string | null;
  publish_status: string;
  verified_at_utc: string | null;
  failure_reason: string | null;
  message?: string;
}

const TERMINAL_STATUSES = new Set([
  'artifact_created',
  'verified',
  'indexed',
  'failed',
  'backend_wiring_pending',
]);

const SUCCESS_STATUSES = new Set([
  'artifact_created',
  'published',
  'verified',
  'indexed',
]);

const PROCESSING_STATUSES = new Set([
  'execution_requested',
  'processing',
  'stored',
]);

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  requirements_collected: 'Assets Received',
  dependencies_identified: 'Providers Identified',
  backend_wiring_pending: 'Backend Wiring Required',
  backend_wired: 'Backend Connected',
  execution_requested: 'Submitting to Provider…',
  processing: 'Generating Video…',
  artifact_created: 'Video Created',
  stored: 'Video Stored',
  published: 'Published',
  verified: 'Verified & Live',
  indexed: 'Indexed',
  failed: 'Failed',
};

function StatusBadge({ status }: { status: string }) {
  const isError = status === 'failed' || status === 'backend_wiring_pending';
  const isSuccess = SUCCESS_STATUSES.has(status);
  const isProcessing = PROCESSING_STATUSES.has(status);

  const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium';
  const cls = isError
    ? `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
    : isSuccess
    ? `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
    : isProcessing
    ? `${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`
    : `${base} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`;

  return (
    <span className={cls}>
      {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {isSuccess && <CheckCircle2 className="w-3.5 h-3.5" />}
      {isError && <AlertCircle className="w-3.5 h-3.5" />}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const THEMES = [
  {
    id: 'none',
    label: 'None (Default)',
    prompt: '',
  },
  {
    id: 'gen-z',
    label: 'Gen Z (Cyber-Grunge / Phonk)',
    prompt: 'A fast-paced, kinetic cinematic music video shot with an edgy fish-eye lens. A group of stylish Gen Z individuals in oversized tactical streetwear, metallic chains, and tinted futuristic sunglasses are dancing rhythmically in an underground concrete bunker. The space is illuminated by flashing, strobing neon purple and toxic green laser lights. The camera moves with chaotic, high-energy handheld whip-pans and sudden zooms, synchronized perfectly to a heavy, distorted bass beat. Thick, atmospheric smoke and digital glitch overlays distort the frame occasionally. Hyper-realistic, 4k resolution, industrial rave aesthetic, dramatic neon lighting, chaotic camera movement, viral music video style.',
  },
  {
    id: 'gen-x',
    label: 'Gen X (80s Synthwave / Cyberpunk)',
    prompt: 'A cinematic, moody music video shot with the warm texture and faint scanlines of 35mm retro film. A sleek, retro-futuristic sports car drives down a lonely, rain-slicked highway at midnight, reflecting a massive, glowing pink neon sun on the horizon. The camera slowly glides alongside the car in a smooth, sweeping tracking shot, capturing the driver silhouetted against a futuristic, sprawling cyberpunk cityscape in the background. Hues of deep magenta, electric blue, and warm amber bleed across the lens. Atmospheric low fog rolls across the asphalt. Photorealistic, 8k resolution, retro-wave aesthetic, cinematic lighting, nostalgic synthwave atmosphere, slow and smooth motion.',
  },
  {
    id: 'glassmorphic',
    label: 'Glassmorphic Tech-Core (Sleek & Modern)',
    prompt: 'A medium cinematic shot of a solo artist performing inside an abstract, floating glassmorphic cube structure suspended in a dark, infinite void. The walls of the cube are made of thick, semi-transparent frosted glass that subtly blurs and refracts giant, glowing holographic equalizer bars pulsing in the background. The artist’s slow-vibe, fluid movements are tracked by a smooth, orbiting camera that glides seamlessly around the structure. Sharp caustics and light leaks ripple across the glossy surfaces, catching faint beams of cool cyan and warm violet ambient light. Cinematic lighting, photorealistic, 8k resolution, ultra-detailed 3D realism, smooth and hypnotic rhythm.',
  },

  {
    id: 'ice-press',
    label: 'Ice-Press Amygdala Freeze',
    prompt: 'A single, sharp ice cube being pressed directly against the center of the palm. The frame completely freezes for a split second right at the moment of contact (utilizing Instagram’s viral "stuck frame" or glitch mechanic). Text Overlay: "Force-quit the background noise." Highly stylized, high-contrast lighting. The ice cube should look hyper-sharp, catching a direct LED beam against dark, matte-textured wood.',
  },
  {
    id: 'hard-stop',
    label: 'Hard Stop Pencil Break',
    prompt: 'A heavy graphite pencil drawing a dense, thick black line across coarse paper—until the tip deliberately snaps with a sharp, resonant crack. Text Overlay: "Draw the boundary line." Extreme macro shot focused entirely on the pencil tip meeting the rough fibers of the paper grain.',
  },
  {
    id: 'un-linked',
    label: 'Un-Linked Wrist Tap',
    prompt: 'A heavy metallic ring or watch clasp striking a glass surface or a bare wrist with a rhythmic, clock-like precision. Text Overlay: "You are the anchor, not the notification." A deep, layered depth-of-field shot utilizing frosted glass elements to obscure the background, highlighting only the physical interaction.',
  },
];

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>(THEMES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear polling interval on unmount to prevent memory leaks and stale state updates
  React.useEffect(() => {
    return () => {
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const pollStatus = useCallback(async (provider: string, providerJobId: string): Promise<string | null> => {
    try {
      const url = `/api/video?provider=${encodeURIComponent(provider)}&provider_job_id=${encodeURIComponent(providerJobId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('Poll returned non-2xx status:', res.status);
        return null;
      }
      const data = await res.json() as JobStatus;
      setJob(data);
      return data.render_status;
    } catch (err) {
      console.error('Poll error:', err);
      return null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !avatarFile) return;

    setIsGenerating(true);
    setJob(null);
    stopPolling();

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('avatar', avatarFile);
      const theme = THEMES.find(t => t.id === selectedTheme);
      if (theme && theme.prompt) {
        formData.append('theme_prompt', theme.prompt);
      }

      const response = await fetch('/api/video', { method: 'POST', body: formData });

      if (!response.ok) {
        // Build a normalized error job status so the UI always shows a consistent shape
        let failureReason = `Server error (${response.status})`;
        let renderStatus = 'failed';
        try {
          const errBody = await response.json() as { failure_reason?: string; render_status?: string; error?: string };
          failureReason = errBody.failure_reason ?? errBody.error ?? failureReason;
          renderStatus = errBody.render_status ?? renderStatus;
        } catch { /* body not JSON */ }

        setJob({
          provider: null,
          provider_job_id: null,
          render_status: renderStatus,
          video_exists: false,
          artifact_storage_url: null,
          canonical_video_url: null,
          publish_status: 'unpublished',
          verified_at_utc: null,
          failure_reason: failureReason,
          message: failureReason,
        });
        return;
      }

      const data = await response.json() as JobStatus;
      setJob(data);

      // Poll for any non-terminal status as long as we have provider credentials to poll with
      const shouldPoll = Boolean(data.provider) && Boolean(data.provider_job_id) && !TERMINAL_STATUSES.has(data.render_status);

      if (shouldPoll) {
        setIsPolling(true);
        pollIntervalRef.current = setInterval(async () => {
          const status = await pollStatus(data.provider!, data.provider_job_id!);
          if (status === null) {
            // Poll error — stop polling and let user retry manually
            console.error('Polling returned null; stopping poll');
            stopPolling();
            return;
          }
          if (TERMINAL_STATUSES.has(status)) {
            stopPolling();
          }
        }, 10_000);
      }
    } catch (error) {
      console.error('Error:', error);
      setJob({
        provider: null,
        provider_job_id: null,
        render_status: 'failed',
        video_exists: false,
        artifact_storage_url: null,
        canonical_video_url: null,
        publish_status: 'unpublished',
        verified_at_utc: null,
        failure_reason: 'Network error — could not reach the server.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    if (!job?.provider || !job.provider_job_id) return;
    setIsPolling(true);
    await pollStatus(job.provider, job.provider_job_id);
    setIsPolling(false);
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
            Transform your .wav files and avatar images into AI-generated music videos.
            Powered by OpenRouter orchestration and real video generation APIs.
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
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {audioFile ? audioFile.name : <span className="font-semibold">Click to upload</span>}
                      </p>
                    </div>
                    <input type="file" accept=".wav" className="hidden"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)} required />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Upload Avatar Image
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-3 text-gray-500 dark:text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {avatarFile ? avatarFile.name : <span className="font-semibold">Click to upload</span>}
                      </p>
                    </div>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} required />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Theme Style
                </label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2.5 px-3 mb-4"
                >
                  {THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  Organic Ambient Audio
                </label>
                <select
                  name="audio_track"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-2.5 px-3"
                >
                  <option value="none">None (Use Uploaded Audio)</option>
                  <option value="pxle">&quot;it&apos;s all my fault&quot; by pxle (Stripped-back ambient)</option>
                  <option value="rta">&quot;RTA — Stillness at 3AM&quot; (ElevenLabs Trend - 139 BPM ambient-electronic)</option>
                  <option value="vinyl">&quot;Vinyl Crackle &amp; Low Hum&quot; (Pure Foley)</option>
                </select>
              </div>

              <button type="submit" disabled={!audioFile || !avatarFile || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg">
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Orchestrating…</>
                ) : (
                  'Generate Music Video'
                )}
              </button>
            </form>

            {/* Job Status Panel */}
            {job && (
              <div className={`mt-8 p-4 rounded-lg border ${
                job.render_status === 'failed' || job.render_status === 'backend_wiring_pending'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : SUCCESS_STATUSES.has(job.render_status)
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={job.render_status} />
                  {job.provider && job.provider_job_id && (
                    <button onClick={handleRefresh} disabled={isPolling}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-1">
                      <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  {job.provider && (
                    <div><span className="font-medium">Provider:</span> {job.provider}</div>
                  )}
                  {job.provider_job_id && (
                    <div><span className="font-medium">Provider Job:</span> {job.provider_job_id}</div>
                  )}
                  {job.video_exists && job.canonical_video_url && (
                    <div className="mt-3">
                      <a href={job.canonical_video_url} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                        View Published Video →
                      </a>
                    </div>
                  )}
                  {job.failure_reason && (
                    <div className="mt-2 text-red-700 dark:text-red-400">
                      <span className="font-medium">Reason:</span> {job.failure_reason}
                    </div>
                  )}
                  {job.message && (
                    <div className="mt-2 text-gray-600 dark:text-gray-400 italic text-xs">{job.message}</div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Sidebar Section */}
          <aside className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-xl font-bold mb-4">Practitioner Registry</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Join the high-status community of Architects building the &quot;Sub-Zero Cognitive Freeze.&quot;
              </p>
              <button className="w-full py-2 px-4 border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors font-medium">
                Join the Registry
              </button>
            </div>
            <NewsletterModule />
            <AffiliateModule />
          </aside>
        </div>
      </div>
    </main>
  );
}
