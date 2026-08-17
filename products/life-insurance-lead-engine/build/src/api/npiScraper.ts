// NPPES NPI Registry API client
// Docs: https://npiregistry.cms.hhs.gov/api-page

export interface NPIProvider {
  npi: string;
  firstName: string;
  lastName: string;
  credential: string;
  specialty: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tier: 'A' | 'B' | 'C';
  pitchAngle: string;
}

interface NPIBasic {
  first_name?: string;
  last_name?: string;
  credential?: string;
}

interface NPIAddress {
  address_purpose?: string;
  telephone_number?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

interface NPITaxonomy {
  primary?: boolean;
  desc?: string;
}

interface NPIResult {
  number?: number | string;
  basic?: NPIBasic;
  addresses?: NPIAddress[];
  taxonomies?: NPITaxonomy[];
}

interface NPIResponse {
  results?: NPIResult[];
}

const HIGH_VALUE_SPECIALTIES: Record<string, { tier: 'A' | 'B' | 'C'; angle: string }> = {
  Surgery: { tier: 'A', angle: 'disability income protection + IUL for tax-advantaged growth' },
  'Orthopaedic Surgery': { tier: 'A', angle: 'high disability risk — own-occupation DI + whole life' },
  'Plastic Surgery': { tier: 'A', angle: 'business succession + estate planning life insurance' },
  Anesthesiology: { tier: 'A', angle: 'disability income + IUL retirement supplement' },
  Cardiology: { tier: 'A', angle: 'estate planning + permanent life insurance' },
  Radiology: { tier: 'A', angle: 'asset protection + IUL' },
  Dermatology: { tier: 'A', angle: 'practice continuation + buy-sell life insurance' },
  Dentist: { tier: 'B', angle: 'practice owner buy-sell + key-person life insurance' },
  'Internal Medicine': { tier: 'B', angle: 'term + DI bundle' },
  'Family Medicine': { tier: 'C', angle: 'mortgage protection + term life' },
  Pediatrics: { tier: 'C', angle: 'family income protection + term life' },
};

function scoreProvider(taxonomyDesc: string): { tier: 'A' | 'B' | 'C'; angle: string } {
  for (const key of Object.keys(HIGH_VALUE_SPECIALTIES)) {
    if (taxonomyDesc.toLowerCase().includes(key.toLowerCase())) {
      return HIGH_VALUE_SPECIALTIES[key];
    }
  }
  return { tier: 'C', angle: 'general term life + disability income' };
}

export async function fetchNPIByZip(zip: string, limit = 50): Promise<NPIProvider[]> {
  const url = new URL('https://npiregistry.cms.hhs.gov/api/');
  url.searchParams.set('version', '2.1');
  url.searchParams.set('postal_code', zip);
  url.searchParams.set('enumeration_type', 'NPI-1');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NPI API error: ${res.status}`);
  const data = (await res.json()) as NPIResponse;

  const results: NPIProvider[] = (data.results ?? []).map((r) => {
    const basic = r.basic || {};
    const addr = (r.addresses ?? []).find((a) => a.address_purpose === 'LOCATION') || (r.addresses ?? [])[0] || {};
    const taxonomy = (r.taxonomies ?? []).find((t) => t.primary) || (r.taxonomies ?? [])[0] || {};
    const specialty = taxonomy.desc ?? 'Unknown';
    const score = scoreProvider(specialty);

    return {
      npi: String(r.number ?? ''),
      firstName: basic.first_name ?? '',
      lastName: basic.last_name ?? '',
      credential: basic.credential ?? '',
      specialty,
      phone: addr.telephone_number ?? '',
      address: [addr.address_1, addr.address_2].filter(Boolean).join(' '),
      city: addr.city ?? '',
      state: addr.state ?? '',
      zip: addr.postal_code ?? zip,
      tier: score.tier,
      pitchAngle: score.angle,
    };
  });

  return results;
}

export function generatePitchScript(p: NPIProvider): string {
  return `Hi Dr. ${p.lastName}, this is [AGENT NAME] from [AGENCY]. ` +
    `I work specifically with ${p.specialty} professionals on ${p.pitchAngle}. ` +
    `Most ${p.specialty.toLowerCase()} specialists I speak with are surprised to learn ` +
    `they're either over-paying for inadequate coverage or missing out on tax-advantaged ` +
    `wealth strategies their group plan doesn't offer. ` +
    `I'd love to share a 15-minute case study from a colleague in your specialty. ` +
    `When's a good time this week — Tuesday at 4 or Thursday at noon?`;
}

export function leadsToCSV(leads: NPIProvider[]): string {
  const headers = ['NPI', 'First Name', 'Last Name', 'Credential', 'Specialty', 'Phone', 'Address', 'City', 'State', 'Zip', 'Tier', 'Pitch Angle', 'Script'];
  const rows = leads.map(l => [
    l.npi, l.firstName, l.lastName, l.credential, l.specialty,
    l.phone, l.address, l.city, l.state, l.zip, l.tier, l.pitchAngle,
    generatePitchScript(l),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}
