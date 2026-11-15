// affiliate-hub program catalogue and the filter/sort logic behind the page.
//
// Moved verbatim out of app/page.tsx (WR #18342) so the same code can be
// imported by the page AND by products/halo-demo-stream (the AG-UI demo
// kit), with no copy to drift. Plain ESM so node can run it without a
// TypeScript step. Types live in programs.d.mts.

export const affiliatePrograms = [
  {
    name: 'Scale Rankings',
    commission: '40% first order + 10% recurring',
    ltv: 'Highest',
    ltvValue: 60000,
    cookieWindow: '30 days',
    audience: ['SEO bloggers', 'Marketing consultants'],
    type: 'hybrid',
    highlights: [
      'Highest lifetime value in the industry',
      'Perfect for SEO and marketing niches',
      'Excellent recurring commission structure'
    ],
    url: '#',
    minPayout: '$200',
    maxPayout: '$5,000+'
  },
  {
    name: 'HubSpot',
    commission: '30% recurring for 12 months',
    ltv: '$1,800 - $5,400',
    ltvValue: 5400,
    cookieWindow: '90 days',
    audience: ['B2B marketers', 'Sales professionals'],
    type: 'recurring',
    highlights: [
      'Perfect for B2B audiences',
      'High-value enterprise customers',
      'Strong brand recognition'
    ],
    url: '#',
    minPayout: '$1,800',
    maxPayout: '$5,400'
  },
  {
    name: 'Kajabi Partner Program',
    commission: '30% recurring lifetime',
    ltv: 'Very High',
    ltvValue: 10000,
    cookieWindow: '60 days',
    audience: ['Course creators', 'Educators', 'Coaches'],
    type: 'recurring',
    highlights: [
      'Lifetime recurring commission',
      'Target online course creators',
      'High customer retention rates'
    ],
    url: '#',
    minPayout: '$500',
    maxPayout: '$10,000+'
  },
  {
    name: 'ClickFunnels',
    commission: '30-40% recurring',
    ltv: 'High',
    ltvValue: 3000,
    cookieWindow: '45 days',
    audience: ['Marketers', 'Entrepreneurs', 'Agency owners'],
    type: 'recurring',
    highlights: [
      'Dream Car bonus at 100+ subscribers',
      'High commission rates',
      'Strong affiliate support'
    ],
    url: '#',
    minPayout: '$97',
    maxPayout: '$3,000+'
  },
  {
    name: 'Shopify Plus',
    commission: '$2,000 per enterprise referral',
    ltv: '$2,000',
    ltvValue: 2000,
    cookieWindow: '30 days',
    audience: ['E-commerce consultants', 'Agency owners'],
    type: 'one-time',
    highlights: [
      'Massive one-time payout',
      'Enterprise-focused program',
      'Qualified leads only'
    ],
    url: '#',
    minPayout: '$2,000',
    maxPayout: '$2,000'
  },
  {
    name: 'Liquid Web',
    commission: '150% of first month',
    ltv: '$150 - $7,000+',
    ltvValue: 7000,
    cookieWindow: '90 days',
    audience: ['Tech professionals', 'Developers', 'IT consultants'],
    type: 'one-time',
    highlights: [
      'Highest per-sale commission',
      'Enterprise contracts = huge payouts',
      'Technical audience required'
    ],
    url: '#',
    minPayout: '$150',
    maxPayout: '$7,000+'
  },
  {
    name: 'Semrush',
    commission: '$200 + recurring',
    ltv: '$200+',
    ltvValue: 1000,
    cookieWindow: '120 days',
    audience: ['SEO professionals', 'Digital marketers'],
    type: 'hybrid',
    highlights: [
      'Generous 120-day cookie window',
      'One-time + recurring structure',
      'Strong brand in SEO space'
    ],
    url: '#',
    minPayout: '$200',
    maxPayout: '$1,000+'
  },
  {
    name: 'Salesforce AppExchange',
    commission: '25-50% of revenue',
    ltv: '$5,000 - $50,000+',
    ltvValue: 50000,
    cookieWindow: 'Custom',
    audience: ['Consultants', 'Enterprise partners'],
    type: 'recurring',
    highlights: [
      'Highest potential payout',
      'Requires partner status',
      'Enterprise consulting expertise needed'
    ],
    url: '#',
    minPayout: '$5,000',
    maxPayout: '$50,000+'
  },
  {
    name: 'Authority Hacker',
    commission: '60%',
    ltv: '$600 - $1,200',
    ltvValue: 1200,
    cookieWindow: '45 days',
    audience: ['Marketing educators', 'Bloggers'],
    type: 'one-time',
    highlights: [
      'Highest commission percentage',
      'Marketing education niche',
      'High-ticket courses'
    ],
    url: '#',
    minPayout: '$600',
    maxPayout: '$1,200'
  },
  {
    name: 'Coursera for Business',
    commission: 'Up to $200 per referral',
    ltv: '$200',
    ltvValue: 200,
    cookieWindow: '30 days',
    audience: ['HR professionals', 'Corporate trainers'],
    type: 'one-time',
    highlights: [
      'Corporate learning platform',
      'B2B enterprise focus',
      'Simple referral structure'
    ],
    url: '#',
    minPayout: '$100',
    maxPayout: '$200'
  }
];

/**
 * Same predicate and ordering the page used inline before the move.
 * Pure: never mutates the catalogue.
 * @param {{searchTerm?: string, filterType?: string, sortBy?: string}} query
 */
export function filterAndSortPrograms(query = {}) {
  const searchTerm = query.searchTerm ?? '';
  const filterType = query.filterType ?? 'all';
  const sortBy = query.sortBy ?? 'ltv';
  const filtered = affiliatePrograms.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.audience.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || program.type === filterType;
    return matchesSearch && matchesType;
  });

  if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.sort((a, b) => b.ltvValue - a.ltvValue);
  }

  return filtered;
}
