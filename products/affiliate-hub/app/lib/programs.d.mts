export interface AffiliateProgram {
  name: string;
  commission: string;
  ltv: string;
  ltvValue: number;
  cookieWindow: string;
  audience: string[];
  type: 'recurring' | 'one-time' | 'hybrid';
  highlights: string[];
  url: string;
  minPayout?: string;
  maxPayout?: string;
}

export interface ProgramQuery {
  searchTerm?: string;
  filterType?: 'all' | 'recurring' | 'one-time' | 'hybrid';
  sortBy?: 'name' | 'ltv';
}

export const affiliatePrograms: AffiliateProgram[];
export function filterAndSortPrograms(query?: ProgramQuery): AffiliateProgram[];
