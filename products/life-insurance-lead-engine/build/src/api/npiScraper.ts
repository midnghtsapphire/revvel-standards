// This simulates the actual NPI scraping logic.
// Due to browser CORS, a real version would run in a Next.js API route or backend process.

export interface ScrapedLead {
  id: string;
  first_name: string;
  last_name: string;
  credential: string;
  specialty: string;
  practice_name: string;
  phone: string;
  address: string;
  zip: string;
  priority_tier: 'A' | 'B' | 'C';
}

const SPECIALTIES = [
  { term: 'Plastic Surgery', tier: 'A' },
  { term: 'Oral and Maxillofacial Surgery', tier: 'A' },
  { term: 'Cardiovascular Disease', tier: 'A' },
  { term: 'Orthopedic Surgery', tier: 'A' },
  { term: 'Anesthesiology', tier: 'A' },
  { term: 'Radiology', tier: 'A' },
  { term: 'Dermatology', tier: 'A' },
  { term: 'Orthodontics', tier: 'B' },
  { term: 'Prosthodontics', tier: 'B' },
  { term: 'Periodontics', tier: 'B' },
  { term: 'Ophthalmology', tier: 'B' },
  { term: 'Otolaryngology', tier: 'B' },
  { term: 'Dentist', tier: 'C' },
  { term: 'Internal Medicine', tier: 'C' },
  { term: 'Family Medicine', tier: 'C' }
];

export async function scrapeNpi(zipCodes: string[]): Promise<ScrapedLead[]> {
  const allLeads: ScrapedLead[] = [];

  for (const zip of zipCodes) {
    for (const spec of SPECIALTIES) {
      try {
        // Build the URL for the NPPES API
        const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&postal_code=${zip}&taxonomy_description=${encodeURIComponent(spec.term)}&limit=50`;
        const response = await fetch(url);
        if (!response.ok) continue;

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          data.results.forEach((result: Record<string, unknown>) => {
            const basicInfo = result.basic as Record<string, string> | undefined;
            const addresses = result.addresses as Array<Record<string, string>> | undefined;
            const address = addresses?.find((a) => a.address_purpose === 'LOCATION');

            if (basicInfo && basicInfo.first_name && basicInfo.last_name && address && address.telephone_number) {
              allLeads.push({
                id: String(result.number),
                first_name: basicInfo.first_name,
                last_name: basicInfo.last_name,
                credential: basicInfo.credential || '',
                specialty: spec.term,
                practice_name: basicInfo.organization_name || '',
                phone: address.telephone_number,
                address: `${address.address_1} ${address.city}, ${address.state}`,
                zip: zip,
                priority_tier: spec.tier as 'A' | 'B' | 'C'
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error scraping ${spec.term} for zip ${zip}:`, error);
      }
    }
  }

  // Basic deduplication on NPI number
  const uniqueLeads = Array.from(new Map(allLeads.map(lead => [lead.id, lead])).values());
  return uniqueLeads;
}
