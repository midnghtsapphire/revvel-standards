# BLUEPRINT: Music Video Creator

## Architecture Overview
- **Frontend**: Next.js App Router (React), Tailwind CSS
- **Backend API**: Next.js Serverless API Routes
- **Video Generation API Abstraction**: Support for Luma, Runway, HeyGen or equivalent
- **Media Storage**: Vercel Blob or equivalent cloud storage
- **Mandatory Modules**: Affiliate Marketing, Newsletter Collection, Accessibility Modes

## Data Flow
1. User uploads .wav audio file and avatar image(s).
2. App router validates input.
3. Serverless API orchestrates video generation APIs.
4. Finished video returned to the client and presented for download/share.
