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

export function generatePromptPacket(input: { idea: string; audience?: string }): PromptPacket;
export function packetToMarkdown(packet: PromptPacket): string;
