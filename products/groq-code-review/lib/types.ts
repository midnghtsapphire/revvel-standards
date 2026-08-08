export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface ReviewFinding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  file?: string;
  lineHint?: string;
  ruleId: string;
  chunkIndex: number;
}

export interface DiffChunk {
  index: number;
  label: string;
  content: string;
  charCount: number;
  files: string[];
}

export interface ReviewOptions {
  /** Target max characters per chunk (proxy for token budget). Default 4000. */
  chunkSize?: number;
  model?: string;
  temperature?: number;
  maxNewTokens?: number;
  topP?: number;
  /** Force local heuristic reviewer even when GROQ_API_KEY is set. */
  forceLocal?: boolean;
  apiKey?: string;
}

export interface ChunkReview {
  chunkIndex: number;
  label: string;
  findings: ReviewFinding[];
  summary: string;
  provider: "groq" | "local";
}

export interface ReviewResult {
  findings: ReviewFinding[];
  chunkReviews: ChunkReview[];
  summary: string;
  markdown: string;
  stats: {
    chunkCount: number;
    findingCount: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    provider: "groq" | "local" | "mixed";
    model: string;
  };
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const DEFAULT_CHUNK_SIZE = 4000;
export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_NEW_TOKENS = 512;
export const DEFAULT_TOP_P = 0.95;
