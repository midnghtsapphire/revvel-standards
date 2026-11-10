export type BomRow = {
  kind: "API" | "MCP" | "CLI" | "App" | "Action" | "Docker" | "Library";
  name: string;
  cost: string;
  verdict: string;
  why: string;
};

export const BOM: BomRow[] = [
  {
    kind: "API",
    name: "None at runtime",
    cost: "Free",
    verdict: "Use",
    why: "The exhibit is a closed-form function. A live statute API would drift under a declaration. Humans verify against official CRS on a pinned date.",
  },
  {
    kind: "API",
    name: "LLM completion API",
    cost: "Paid quota",
    verdict: "Reject for the exhibit",
    why: "A completion is not reproducible. The fleet may draft with a model only by pasting these prompts; the numbers still have to come from meridian-math.",
  },
  {
    kind: "MCP",
    name: "meridian-exhibit (local spec)",
    cost: "Free",
    verdict: "Spec only",
    why: "Tools: pod_random_search, bayes_after_miss, credit_summary, canonical_proof. Same functions as the web exhibit. No network. The browser app is the implementation viewers can run.",
  },
  {
    kind: "MCP",
    name: "Dark-web / Telegram / Discord search servers",
    cost: "Unsafe",
    verdict: "Reject",
    why: "Private chats are not citable authority, are often unlawful to scrape, and are full of theories a lawyer cannot sign.",
  },
  {
    kind: "CLI",
    name: "node --experimental-strip-types --test src/lib/meridian-math.test.ts",
    cost: "Free",
    verdict: "Use",
    why: "Proves the canonical posterior, the random-search identity, and the 50-minute credit ledger. The same proofs render in the Exhibit.",
  },
  {
    kind: "App",
    name: "Brief",
    cost: "Free",
    verdict: "Ship",
    why: "States the niche, both clocks, and the accreditation limit.",
  },
  {
    kind: "App",
    name: "Course",
    cost: "Free",
    verdict: "Ship",
    why: "Three 60-minute hours, 150 minutes of instruction, written materials, checks.",
  },
  {
    kind: "App",
    name: "Exhibit",
    cost: "Free",
    verdict: "Ship",
    why: "Inspectable Bayes update. Beats a nomograph at chaining a miss, beats an LLM ranker at being a distribution, and does not pretend to beat SORAL at multi-asset optimization.",
  },
  {
    kind: "App",
    name: "Fleet",
    cost: "Free",
    verdict: "Ship",
    why: "Ten prompts with output schemas. They call the math. They do not freelance.",
  },
  {
    kind: "App",
    name: "Signal",
    cost: "Free",
    verdict: "Ship",
    why: "SEO and SEM for the query class counsel actually needs, with evasion queries as negatives.",
  },
  {
    kind: "App",
    name: "Open Index",
    cost: "Free",
    verdict: "Ship",
    why: "Pinned public repos and agencies. States what the deep web was asked for and why it was not used.",
  },
  {
    kind: "App",
    name: "Binder",
    cost: "Free",
    verdict: "Ship",
    why: "Provider playbook, production blueprint, YouTube rundown, optional CI YAML.",
  },
  {
    kind: "App",
    name: "Daily Watch",
    cost: "Free",
    verdict: "Ship",
    why: "One official source per day, selected by day-of-year modulo 7. A checkbox is not a finding that the law is unchanged.",
  },
  {
    kind: "Action",
    name: "meridian-proof.yml",
    cost: "Free",
    verdict: "Spec in the binder",
    why: "On push, run the node test. Fail the branch if the posterior or the credit ledger drifts. No secret keys.",
  },
  {
    kind: "Docker",
    name: "Optional wrapper",
    cost: "Free",
    verdict: "Do not deploy",
    why: "A container cannot make 0.30/0.70 truer. This product is the web exhibit. A Dockerfile that only runs the test is in the binder as a reference, not as the preview.",
  },
  {
    kind: "Library",
    name: "SORAL (ctwardy/soral)",
    cost: "Free, C++",
    verdict: "Cite, don’t wrap",
    why: "Better optimizer for effort across regions. Worse CLE exhibit: the courtroom needs the identity, not a binary.",
  },
  {
    kind: "Library",
    name: "SAR_Nomographs (tvrusso)",
    cost: "Free PDFs",
    verdict: "Cite",
    why: "Same random-search law, not interactive, no posterior, no Colorado elements.",
  },
  {
    kind: "Library",
    name: "LandSAR SDK (raytheonbbn/landsar-sdk)",
    cost: "Open SDK",
    verdict: "Cite",
    why: "Motion-model plugins for a larger platform. Not a Rule 250 binder.",
  },
  {
    kind: "Library",
    name: "SAREnv (namurproject/SAREnv)",
    cost: "MIT",
    verdict: "Cite",
    why: "Best open UAV benchmark we found. European scenarios. Do not drop its maps on Colorado terrain and call them local base rates.",
  },
];

export const WORKFLOW_YAML = `name: meridian-proof
on:
  push:
  pull_request:
jobs:
  proof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node --experimental-strip-types --test src/lib/meridian-math.test.ts
`;

export const DOCKERFILE = `# Reference only. Not how this docket is deployed.
# The proof does not need a moving OS.
FROM node:22-alpine
WORKDIR /app
COPY src/lib/meridian-math.ts src/lib/meridian-math.test.ts src/lib/course.ts ./src/lib/
CMD ["node", "--experimental-strip-types", "--test", "src/lib/meridian-math.test.ts"]
`;

export type SourceCard = {
  name: string;
  href: string;
  good: string;
  not: string;
  kind: "Statute" | "Agency" | "Case" | "Repo" | "Noise";
};

export const SOURCES: SourceCard[] = [
  {
    kind: "Statute",
    name: "C.R.S. § 16-2.7-102 — acceptance",
    href: "https://law.justia.com/codes/colorado/title-16/code-of-criminal-procedure/article-2-7/section-16-2-7-102/",
    good: "No waiting period; who may report; geographic predicate.",
    not: "A substitute for the official General Assembly PDF on the day you file.",
  },
  {
    kind: "Statute",
    name: "C.R.S. § 16-2.7-103 — response clocks",
    href: "https://law.justia.com/codes/colorado/title-16/code-of-criminal-procedure/article-2-7/section-16-2-7-103/",
    good: "Eight-hour adult CCIC, two-hour child clock, indigenous notice.",
    not: "Permission to skip the official subsection (5) exceptions you have not read.",
  },
  {
    kind: "Statute",
    name: "C.R.S. § 16-2.7-104 — unidentified remains",
    href: "https://colorado.public.law/statutes/crs_16-2.7-104",
    good: "Notice, identification samples, NCIC, non-disposal before DNA if possible.",
    not: "A field manual for civilians. Cross-read §§ 24-80-1302 and 30-10-606.",
  },
  {
    kind: "Statute",
    name: "C.R.S. § 24-33.5-431 — missing indigenous persons",
    href: "https://colorado.public.law/statutes/crs_24-33.5-431",
    good: "Alert program, CBI duty, cancellation, tribal and local coordination.",
    not: "Amber Alert. That is § 24-33.5-415.7.",
  },
  {
    kind: "Statute",
    name: "C.R.C.P. 250 and CLJE regulations",
    href: "https://www.coloradolegalregulation.com/current-lawyers/cle/",
    good: "45 hours / 7 professional responsibility (5 ethics or professionalism + 2 EDI); 50-minute credit.",
    not: "A statement that this app is already approved.",
  },
  {
    kind: "Agency",
    name: "CBI missing-person FAQ",
    href: "https://cbi.colorado.gov/missing-persons-FAQ",
    good: "CBI does not take the original report; public routing number 303-239-4211.",
    not: "A complete statement of sheriff policy in every county.",
  },
  {
    kind: "Case",
    name: "Caniglia v. Strom, 141 S. Ct. 1596 (2021)",
    href: "https://supreme.justia.com/cases/federal/us/593/194/",
    good: "No freestanding community-caretaking exception for the home.",
    not: "A holding that emergency aid is gone. Shepardize.",
  },
  {
    kind: "Repo",
    name: "ctwardy/soral",
    href: "https://github.com/ctwardy/soral",
    good: "Optimal effort allocation for SAR. The serious free optimizer.",
    not: "A paragraph a judge can audit without the C++. We do not claim to out-optimize it.",
  },
  {
    kind: "Repo",
    name: "tvrusso/SAR_Nomographs",
    href: "https://github.com/tvrusso/SAR_Nomographs",
    good: "Paper POD from the random-search law.",
    not: "A Bayes update after a miss, or a CLE clock.",
  },
  {
    kind: "Repo",
    name: "raytheonbbn/landsar-sdk",
    href: "https://github.com/raytheonbbn/landsar-sdk",
    good: "How a motion-model plugin describes a time-varying probability map.",
    not: "Colorado intake elements.",
  },
  {
    kind: "Repo",
    name: "namurproject/SAREnv",
    href: "https://github.com/namurproject/SAREnv",
    good: "Open benchmark: probability maps, greedy vs. random vs. patterned search.",
    not: "Colorado ecoregions. An outlier worth stealing ideas from, not base rates.",
  },
  {
    kind: "Noise",
    name: "Indexed true-crime forums and old Usenet",
    href: "https://www.websleuths.com/",
    good: "Evidence of demand: people search “missing body” and get speculation. That is the SEO problem.",
    not: "A source of POA, of law, or of a lead you may repeat. We did not join Discord or Telegram and we did not open Tor.",
  },
];

export const THEMES = [
  {
    theme: "“Adults must be missing 24 hours.”",
    where: "Repeated in public explainers and at some front counters. Contradicted by CBI-facing statute § 16-2.7-102(4).",
    seo: "Own the query “colorado missing person waiting period” with the statute, not with a story.",
  },
  {
    theme: "“Community caretaking lets us in.”",
    where: "Pre-2021 training shorthand. Caniglia is the correction; emergency aid is a different test.",
    seo: "Own “caniglia missing person warrant colorado” before true-crime channels do.",
  },
  {
    theme: "Story rank versus posterior rank.",
    where: "Comment sections rank the most cinematic place. The Exhibit’s canonical case ranks the road after a miss on the lot.",
    seo: "Own “probability of detection affidavit” with a calculator that shows the fraction.",
  },
  {
    theme: "Indigenous cases treated as ordinary delay.",
    where: "Public MMIP reporting and § 24-33.5-431. National SEO still collapses this into generic true crime.",
    seo: "Own “colorado missing indigenous person alert CLE.” It is a blue-ocean professional query.",
  },
];

export type Post = {
  net: string;
  title: string;
  body: string;
};

export const POSTS: Post[] = [
  {
    net: "YouTube · emmyliette",
    title: "Colorado’s no-waiting-period rule for missing person reports",
    body: "Unfound Hour 1 of 3. Affidavit-Grade Search. C.R.S. § 16-2.7-102(4) says an agency shall not refuse a missing person report because of how little time has passed. We also cover the 8-hour and 2-hour clocks, indigenous notice under § 16-2.7-103(3), unidentified remains under § 16-2.7-104, and why Amber is a different statute. Not accredited CLE until the Colorado CLJE Office approves a specific program. Not legal advice. No crime-scene imagery.",
  },
  {
    net: "YouTube · emmyliette",
    title: "Caniglia v. Strom and the missing-person house search",
    body: "Unfound Hour 2 of 3. A missing person is not a warrant. Caniglia, 141 S. Ct. 1596 (2021). Emergency aid still exists and is narrower than the slogan. POS = POA × POD is not probable cause. Not accredited CLE until CLJE approves it. Not legal advice.",
  },
  {
    net: "YouTube · emmyliette",
    title: "Probability of area for lawyers, after a negative search",
    body: "Unfound Hour 3 of 3. Half ethics, half EDI, under the 50-minute Colorado credit. Priors 0.50 / 0.30 / 0.20, miss the first at POD 0.60, and the top segment moves. Also: Rule 1.6 is not a workshop on concealment, and the waiting-period myth is a bias problem. Not accredited until CLJE says so. Not legal advice.",
  },
  {
    net: "Short post",
    title: "The fraction, not the feeling",
    body: "After a negative search, “it still feels like the lot” is a prior. 0.50×0.40/0.70 is about 0.29. The road, 0.30/0.70, is about 0.43. Affidavit-Grade Search — a Colorado CLE manuscript for emmyliette. Not yet accredited. Not legal advice.",
  },
  {
    net: "Professional caption",
    title: "Who gets told to wait",
    body: "Colorado law does not have a 24-hour waiting period for a missing person report. § 16-2.7-102(4). The people most often told otherwise are the point of the EDI half-hour in Unfound Hour 3. Host channel: emmyliette. Record the human. Do not publish a synthetic face.",
  },
];

export const SEM = {
  campaign: "Affidavit-Grade Search — Colorado counsel",
  landing: "The Brief in this docket, not a true-crime video.",
  groups: [
    {
      name: "Statute",
      keywords: [
        "[colorado missing person waiting period]",
        "[crs 16-2.7-102]",
        "\"missing person report\" colorado lawyer",
      ],
    },
    {
      name: "Warrant",
      keywords: [
        "[caniglia missing person]",
        "\"probability of detection\" affidavit",
        "\"probability of area\" lawyer",
      ],
    },
    {
      name: "Ethics and EDI",
      keywords: [
        "[colorado cle missing indigenous person]",
        "\"missing indigenous person alert\" colorado",
        "[colorado cle ethics unidentified remains]",
      ],
    },
  ],
  negatives: [
    "hide",
    "dispose",
    "evade",
    "how to disappear",
    "psychic",
    "gore",
    "crime scene photos",
    "body found",
    "free cle guaranteed",
  ],
  copy: "Colorado missing-person law, taught as a 3-hour manuscript. 50-minute credits. Math you can recompute. Not accredited until CLJE approves it.",
};

export const WATCH_QUEUE = [
  {
    id: "crcp-250",
    title: "C.R.C.P. 250.2 and the 50-minute hour",
    look: "Still 45 credits, 7 professional responsibility, of which 5 ethics or professionalism and 2 EDI? Still 50 minutes = 1 credit?",
    href: "https://www.coloradolegalregulation.com/current-lawyers/cle/",
  },
  {
    id: "accept",
    title: "§ 16-2.7-102 acceptance",
    look: "Does subsection (4) still forbid refusal based on time missing?",
    href: "https://law.justia.com/codes/colorado/title-16/code-of-criminal-procedure/article-2-7/section-16-2-7-102/",
  },
  {
    id: "clocks",
    title: "§ 16-2.7-103 clocks",
    look: "Eight hours, two hours, and indigenous CBI notice unchanged?",
    href: "https://law.justia.com/codes/colorado/title-16/code-of-criminal-procedure/article-2-7/section-16-2-7-103/",
  },
  {
    id: "remains",
    title: "§ 16-2.7-104 remains",
    look: "Notice, DNA samples, NCIC, and the non-disposal rule still in the section?",
    href: "https://colorado.public.law/statutes/crs_16-2.7-104",
  },
  {
    id: "alert",
    title: "§ 24-33.5-431 alert",
    look: "Is the missing indigenous person alert still a Bureau duty on notice?",
    href: "https://colorado.public.law/statutes/crs_24-33.5-431",
  },
  {
    id: "caniglia",
    title: "Caniglia v. Strom",
    look: "Any later Supreme Court case you must read before you say community caretaking is not a home-entry exception?",
    href: "https://supreme.justia.com/cases/federal/us/593/194/",
  },
  {
    id: "rpc",
    title: "Colo. RPC 1.6 attorney text",
    look: "Open the official attorney rule through the latest rule change. Do not rely on the LLP parallel text forever.",
    href: "https://www.cobar.org/rulesofprofessionalconduct",
  },
];

export function watchIndex(date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return ((day % WATCH_QUEUE.length) + WATCH_QUEUE.length) % WATCH_QUEUE.length;
}

export const PLAYBOOK = [
  {
    phase: "1 · Pin",
    steps: [
      "Keep the pinned date on the Brief visible. Today’s research date is 27 September 2026.",
      "Download official PDFs of C.R.C.P. 250, the CLJE regulations, and Article 2.7 before any live teaching.",
      "Shepardize Caniglia, Brigham City, Fisher, and Mincey, plus Colorado article II, section 7 cases.",
    ],
  },
  {
    phase: "2 · File",
    steps: [
      "Apply to the Colorado CLJE Office as a provider for a specific program, with these written materials attached.",
      "Ask for 3.0 general credits, of which 0.5 are legal ethics and 0.5 are EDI. Show the minute ledger.",
      "Do not count the 2-minute opens or the 8-minute labs unless CLJE says the labs are instruction. This binder does not.",
      "Keep a roster and the completion checks. Home study, if you seek it, needs whatever verification method CLJE currently requires. Independent study is the wrong box, and it does not earn professional-responsibility credit.",
    ],
  },
  {
    phase: "3 · Record",
    steps: [
      "Three hours on emmyliette. Series title: Unfound Hour. Niche title: Affidavit-Grade Search.",
      "The host is the person who runs the channel. No synthetic face, no voice clone, no remains thumbnails.",
      "On-screen math is the canonical fraction, computed in frame, matching the Exhibit.",
      "Chapters follow the syllabus blocks. Descriptions include the not-accredited line.",
    ],
  },
  {
    phase: "4 · Prove",
    steps: [
      "Before each recording day, open the Exhibit and confirm every canonical proof reads PASS.",
      "If a proof fails, do not publish. The identity moved or the implementation did.",
      "Re-run Daily Watch’s single item. A checkbox means you looked, not that the law is frozen.",
    ],
  },
];

export const BLUEPRINT = [
  "One web docket. Eight instruments share one minute ledger and one math module so the course cannot drift from the exhibit.",
  "Auth and a database stay off. Completion marks live on this browser only. Do not store client secrets or case facts here.",
  "No runtime model call. Fleet prompts are copied by a human or a local agent. Numbers come from meridian-math.",
  "Deployment is this app, not a container and not a dark-web listener.",
  "Daily maintenance is a seven-item rotation, one primary source a day, plus the proof strip. It expires as a habit only if you stop opening it.",
  "Blue ocean we took: professional queries (waiting period, Caniglia, indigenous alert, affidavit POD), not “missing body” gore. SAREnv is the outlier repo worth learning from. SORAL remains the better optimizer, and we say so.",
  "Blue ocean we refused: evasion technique, private-chat infiltration, face cloning, self-awarded CLE credit.",
];
