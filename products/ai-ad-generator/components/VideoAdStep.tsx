'use client';

import { StaticCreative } from '../types';

interface VideoAdStepProps {
  creative: StaticCreative;
  productTitle: string;
  script: string;
  onBack: () => void;
  onSaveCampaign: () => void;
}

export default function VideoAdStep({
  productTitle,
  script,
  onBack,
  onSaveCampaign,
}: VideoAdStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">UGC Video Ad</h2>
          <p className="text-gray-500 text-sm">
            Your video script is ready — connect an avatar API to render the video
          </p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ← Back
        </button>
      </div>

      {/* Script viewer */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-gray-800">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          🎬 30-Second Video Script — {productTitle}
        </p>
        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-xl leading-relaxed">
          {script}
        </pre>
      </div>

      {/* Avatar API integrations */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          🤖 AI Avatar Rendering (connect one to generate your video)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AVATAR_APIS.map((api) => (
            <div
              key={api.name}
              className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-gray-800 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{api.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{api.description}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  api.status === 'ready'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {api.status === 'ready' ? '✓ Ready' : '⚙ Configure'}
                </span>
              </div>
              <ul className="text-xs text-gray-500 space-y-1">
                {api.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span className="text-blue-400">•</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={api.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto text-center py-2 border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-colors"
              >
                View API Docs →
              </a>
            </div>
          ))}
        </div>

        {/* TODO callout */}
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <strong>Developer note:</strong> To enable live video rendering, add your chosen
          API key to <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
            HEYGEN_API_KEY
          </code> or <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
            DID_API_KEY
          </code> in your <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code>,
          then implement the <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
            /api/generate-video
          </code> route using the script above. The script format is already
          structured for direct API submission.
        </div>
      </div>

      {/* Save campaign CTA */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onSaveCampaign}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-lg"
        >
          🚀 Save to Campaign Manager
        </button>
      </div>
    </div>
  );
}

const AVATAR_APIS = [
  {
    name: 'HeyGen',
    description: 'Industry-leading AI avatar video generation',
    status: 'configure',
    docsUrl: 'https://docs.heygen.com/reference/create-an-avatar-video-v2',
    features: [
      '100+ AI avatars, 40+ languages',
      'Talking photo from any image',
      'REST API, webhooks, fast render',
    ],
  },
  {
    name: 'D-ID',
    description: 'Photo-to-video, talking avatars & digital humans',
    status: 'configure',
    docsUrl: 'https://docs.d-id.com',
    features: [
      'Any photo + text → talking video',
      'Custom voice cloning',
      'High-quality lip sync',
    ],
  },
  {
    name: 'Synthesia',
    description: 'Enterprise AI video generation',
    status: 'configure',
    docsUrl: 'https://www.synthesia.io/api',
    features: [
      '160+ AI avatars',
      'Screen recording integration',
      'Batch video generation',
    ],
  },
  {
    name: 'Runway ML',
    description: 'Gen-3 AI video from text/image',
    status: 'configure',
    docsUrl: 'https://runwayml.com/api',
    features: [
      'Gen-3 Alpha Turbo',
      'Image-to-video, text-to-video',
      'Motion brush & director mode',
    ],
  },
];
