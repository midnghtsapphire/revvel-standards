import Fuse from 'fuse.js';
import { Lead } from './parser';

export interface DedupeResult {
  clean: Lead[];
  duplicates: Lead[];
  stats: {
    originalCount: number;
    cleanCount: number;
    removedCount: number;
    emailMatches: number;
    phoneMatches: number;
    fuzzyNameMatches: number;
  };
}

export const dedupeLeads = (leads: Lead[]): DedupeResult => {
  const clean: Lead[] = [];
  const duplicates: Lead[] = [];

  const stats = {
    originalCount: leads.length,
    cleanCount: 0,
    removedCount: 0,
    emailMatches: 0,
    phoneMatches: 0,
    fuzzyNameMatches: 0,
  };

  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();

  // Setup Fuse for fuzzy name matching among leads already in clean list
  const fuseOptions = {
    includeScore: true,
    threshold: 0.15, // Lower threshold means stricter match
    keys: ['name']
  };

  for (const lead of leads) {
    let isDuplicate = false;

    // Check exact email match
    if (lead.email && emailSet.has(lead.email)) {
      isDuplicate = true;
      stats.emailMatches++;
    }

    // Check exact phone match
    if (!isDuplicate && lead.phone && phoneSet.has(lead.phone)) {
      isDuplicate = true;
      stats.phoneMatches++;
    }

    // Check fuzzy name match if email and phone aren't present or didn't match
    if (!isDuplicate && lead.name && clean.length > 0) {
      const fuse = new Fuse(clean, fuseOptions);
      const results = fuse.search(lead.name);

      if (results.length > 0) {
        // We found a fuzzy match
        isDuplicate = true;
        stats.fuzzyNameMatches++;
      }
    }

    if (isDuplicate) {
      duplicates.push(lead);
      stats.removedCount++;
    } else {
      clean.push(lead);
      if (lead.email) emailSet.add(lead.email);
      if (lead.phone) phoneSet.add(lead.phone);
    }
  }

  stats.cleanCount = clean.length;

  return {
    clean,
    duplicates,
    stats
  };
};
