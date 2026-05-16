// Life-event-based lead profile builder for individual and family life insurance prospects.
// Priority tiers are based on the urgency and coverage needs each life event implies.

export interface ScrapedLead {
  id: string;
  first_name: string;
  last_name: string;
  age_range: string;
  life_event: string;
  family_status: string;
  phone: string;
  address: string;
  zip: string;
  priority_tier: 'A' | 'B' | 'C';
}

export const LIFE_EVENTS: { term: string; tier: 'A' | 'B' | 'C'; family_status: string }[] = [
  { term: 'New Homeowner',              tier: 'A', family_status: 'Homeowner' },
  { term: 'New Parent',                 tier: 'A', family_status: 'Family with infant' },
  { term: 'Recently Married',           tier: 'A', family_status: 'Married couple' },
  { term: 'Single Parent',              tier: 'A', family_status: 'Single parent household' },
  { term: 'Growing Family (2+ kids)',   tier: 'A', family_status: 'Family with children' },
  { term: 'New Job / Income Increase',  tier: 'B', family_status: 'Dual-income household' },
  { term: 'College Graduate',           tier: 'B', family_status: 'Young adult, single' },
  { term: 'Divorce / Life Transition',  tier: 'B', family_status: 'Transitioning household' },
  { term: 'Empty Nester',               tier: 'B', family_status: 'Couple, children grown' },
  { term: 'Self-Employed / Freelancer', tier: 'B', family_status: 'Small business / gig worker' },
  { term: 'Pre-Retirement (55–64)',      tier: 'C', family_status: 'Established household' },
  { term: 'Young Adult (18–25)',         tier: 'C', family_status: 'Single, no dependents' },
];

const AGE_RANGES: Record<string, string> = {
  'New Homeowner':              '28–45',
  'New Parent':                 '25–40',
  'Recently Married':           '24–38',
  'Single Parent':              '25–45',
  'Growing Family (2+ kids)':   '28–42',
  'New Job / Income Increase':  '22–35',
  'College Graduate':           '21–26',
  'Divorce / Life Transition':  '30–55',
  'Empty Nester':               '48–62',
  'Self-Employed / Freelancer': '27–50',
  'Pre-Retirement (55–64)':     '55–64',
  'Young Adult (18–25)':        '18–25',
};

// Generates structured prospect profile templates for the selected life event categories
// and the given zip codes.  Agents use these as outreach worksheets and fill in real
// contact details from their own referral / public-records sources.
export async function scrapeNpi(
  zipCodes: string[],
  selectedEvents?: string[]
): Promise<ScrapedLead[]> {
  const events = selectedEvents && selectedEvents.length > 0
    ? LIFE_EVENTS.filter(e => selectedEvents.includes(e.term))
    : LIFE_EVENTS;

  const profiles: ScrapedLead[] = [];
  let counter = 1;

  for (const zip of zipCodes) {
    for (const event of events) {
      profiles.push({
        id: `prospect-${zip}-${counter++}`,
        first_name: '[First Name]',
        last_name: '[Last Name]',
        age_range: AGE_RANGES[event.term] ?? '25–55',
        life_event: event.term,
        family_status: event.family_status,
        phone: '[Phone]',
        address: `[Street], [City], [State]`,
        zip,
        priority_tier: event.tier,
      });
    }
  }

  return profiles;
}
