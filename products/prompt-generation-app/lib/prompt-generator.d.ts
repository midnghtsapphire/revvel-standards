export interface MarketFact {
  claim: string;
  source: string;
}

export interface CompetitorGap {
  competitor: string;
  gap: string;
}

export interface PromptPacket {
  idea: string;
  audience: string;
  generatedAt: string;
  scores: { blueOcean: number; redOcean: number };
  marketFacts: MarketFact[];
  competitorGaps: CompetitorGap[];
  legalBoundaries: string[];
  implementationPrompts: string[];
  reviewerPrompts: string[];
}

export function clampScore(score: number): number;
export function generatePromptPacket(input: { idea: string; audience?: string }): PromptPacket;
export function packetToMarkdown(packet: PromptPacket): string;
export interface ResearchSource {
  id: string;
  label: string;
  url: string;
  evidence: string;
  use: string;
}

export interface Competitor {
  name: string;
  model: string;
  strength: string;
  gap: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: string;
  detail: string;
}

export interface PromptPacketInput {
  idea: string;
  audience: string;
  constraints: string;
  monetizationGoal: string;
  researchDepth: string;
  channel: string;
  outputType: string;
}

export interface PromptPacketScores {
  blueOcean: number;
  redOcean: number;
  decision: string;
}

export interface PromptPacket {
  input: PromptPacketInput;
  problemSolved: string;
  differentiation: string;
  channels: string[];
  scores: PromptPacketScores;
  checklist: ChecklistItem[];
  sources: ResearchSource[];
  competitors: Competitor[];
  internalAssets: string[];
  prompts: {
    master: string;
    research: string;
    builder: string;
    reviewer: string;
  };
  markdown: string;
}

export const CHANNEL_PLAYBOOK: Record<string, unknown>;
export const COMPETITORS: Competitor[];
export const INTERNAL_PROMPT_ASSETS: string[];
export const RESEARCH_SOURCES: ResearchSource[];
export function buildChecklist(): ChecklistItem[];
export function exportPromptPacketMarkdown(packet: Omit<PromptPacket, 'markdown'>): string;
export function generatePromptPacket(options?: Partial<PromptPacketInput>): PromptPacket;
export function scoreOpportunity(options: {
  idea: string;
  audience: string;
  outputType: string;
  monetizationGoal: string;
}): PromptPacketScores;
