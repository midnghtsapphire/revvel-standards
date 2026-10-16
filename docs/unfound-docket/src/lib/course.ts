export type CreditKind = "general" | "ethics" | "edi" | "none";

export type Block = {
  id: string;
  minutes: number;
  startMin: number;
  endMin: number;
  credit: CreditKind;
  title: string;
  spoken: string[];
  points: string[];
};

export type Check = {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  why: string;
};

export type Hour = {
  id: 1 | 2 | 3;
  kicker: string;
  title: string;
  youtubeTitle: string;
  series: string;
  objectives: string[];
  blocks: Block[];
  checks: Check[];
};

function stamp(
  rows: Omit<Block, "startMin" | "endMin">[],
): Block[] {
  let t = 0;
  return rows.map((b) => {
    const startMin = t;
    t += b.minutes;
    return { ...b, startMin, endMin: t };
  });
}

export const PINNED_AS_OF = "2026-09-27";

export const RULES = {
  creditMinutes: 50,
  complianceHours: 45,
  professionalResponsibility: 7,
  ethicsOrProfessionalism: 5,
  edi: 2,
  authority: "C.R.C.P. 250.1–250.2; CLJE Regulations (credit computation: programs under 50 minutes of instruction, exclusive of Q&A, earn no credit).",
  sources: [
    "Colorado Supreme Court, C.R.C.P. 250 (CLE credit hour = 50 minutes of an accredited program with textual material).",
    "CLJE Regulation on program credit: no credit for a program that, in its entirety, lasts under 50 minutes exclusive of question-and-answer; no credit for introductory remarks, breaks, or business meetings.",
    "Colorado CLE FAQ: one credit hour equals 50 minutes; ethics and EDI credits are entered in addition to general credits, not subtracted from them.",
    "Independent study is capped and, under published Colorado guidance, does not earn professional-responsibility credit. This app is not independent-study credit.",
  ],
} as const;

const hour1 = stamp([
  {
    id: "h1-open",
    minutes: 2,
    credit: "none",
    title: "Open — not for credit",
    spoken: [
      "This is Unfound Hour, for the emmyliette channel. The series name is Affidavit-Grade Search. I am not going to show you a body, a crime-scene reconstruction, or a private chat. The subject is Colorado law: when a person is missing, when remains are unidentified, and what a lawyer may honestly say about either.",
      "Housekeeping does not earn Colorado CLE credit. Introductory remarks are excluded. The next fifty minutes are the instruction. The last eight minutes are an application lab this binder does not count.",
    ],
    points: [
      "Host channel: emmyliette. Do not substitute a synthetic face.",
      "This recording is not accredited until the CLJE Office says it is.",
    ],
  },
  {
    id: "h1-accept",
    minutes: 12,
    credit: "general",
    title: "Acceptance — there is no waiting period",
    spoken: [
      "Article 2.7 of Title 16 is the spine. Section 16-2.7-102 is about taking the report. Any person with relevant, credible information suggesting that a person is missing may make a report. A Colorado agency shall accept, without delay, an in-person report when the missing person resides or was last known to reside in Colorado, or when credible information says they were last believed to be in Colorado. Telephone and electronic reports are accepted when that same geographic predicate is met and the agency’s own policy allows that medium.",
      "Subsection (4) is the sentence the internet keeps getting wrong. A law enforcement agency shall not refuse a missing person report because the person has not yet been missing for any length of time. There is no lawful 24-hour waiting period in this statute. If your client was told to “call back tomorrow,” that is a fact about what happened. It is not the rule.",
      "There are narrow exceptions in subsection (5), including when another Colorado agency already has the report or has said it will take it. Read the official subsection before you allege a violation. Do not paraphrase from memory in a demand letter.",
    ],
    points: [
      "C.R.S. § 16-2.7-102(4): no minimum time missing.",
      "Geographic predicate: resides in Colorado, last resided in Colorado, or last believed to be in Colorado.",
      "Confirm the current official PDF before quoting subsection (5)’s exceptions.",
    ],
  },
  {
    id: "h1-clocks",
    minutes: 12,
    credit: "general",
    title: "Two clocks — eight hours and two hours",
    spoken: [
      "Section 16-2.7-103 is the response statute. The agency assesses the information and determines the best course of action. That discretion is real. It is not discretion to skip the database duties.",
      "If the missing person is eighteen or older, the agency shall, within eight hours after receiving the report, enter relevant information into the Colorado crime information center database and, as appropriate, contact other agencies that may assist.",
      "If the missing person is under eighteen, the clock is two hours: notify the Colorado Bureau of Investigation under section 24-33.5-415.1(3), and enter the information into CCIC. The same two-hour CBI notice and CCIC entry applies when the child is in the legal custody of the state department of human services or a county department and the agency learns of it under section 19-1-115.3.",
      "CBI’s own public FAQ states that CBI is not where you file the report. Under section 24-33.5-412, CBI describes itself as a request-only agency for this purpose. The report goes to the law enforcement agency where the person was last seen. If you do not know who has the case, CBI publishes a public line, 303-239-4211, and the mailbox cdps_cbi_missing@state.co.us, for routing — not as a substitute report.",
    ],
    points: [
      "Adult: 8 hours to CCIC. Child: 2 hours to CBI and CCIC.",
      "CBI does not take the original missing-person report.",
      "Cite § 16-2.7-103, not a blog recap, in the letter.",
    ],
  },
  {
    id: "h1-indigenous",
    minutes: 8,
    credit: "general",
    title: "Indigenous missing persons — an extra notice",
    spoken: [
      "Section 16-2.7-103(3) adds a duty when the missing person is an indigenous person. The best course of action includes appropriate communication with other agencies that may assist. And the agency shall notify CBI — within eight hours for a missing adult, within two hours for a missing child.",
      "That notice is what feeds section 24-33.5-431. The Bureau operates a missing indigenous person alert, coordinated with local agencies, federally recognized tribes, other government agencies involved in the search, and Colorado broadcasters. On notice, CBI confirms the information and issues an alert to designated media. The alert includes the instruction that anyone with information contact local law enforcement. CBI cancels the alert when the person is found or the notification period ends. A local agency that locates the person notifies the Bureau as soon as possible.",
      "Hour 3 treats why this is also an equity issue. Here, learn it as an element. It is not a courtesy and it is not optional once the statutory predicate is met.",
    ],
    points: [
      "§ 16-2.7-103(3): CBI notice, 8 hours adult / 2 hours child.",
      "§ 24-33.5-431: Missing Indigenous Person Alert.",
      "The Bureau also has a statutory cooperation duty with the office of liaison for missing and murdered indigenous relatives, § 24-33.5-2603, cross-referenced from § 24-33.5-431.",
    ],
  },
  {
    id: "h1-remains",
    minutes: 10,
    credit: "general",
    title: "Unidentified remains — report, identify, do not dispose",
    spoken: [
      "Section 16-2.7-104 is the remains statute, and it is easy to vulgarize. This course will not teach anyone how to find, move, or conceal remains. It teaches the duties of people who already have custody of them.",
      "A person who has custody of unidentified human remains shall immediately notify the coroner or medical examiner of the county where the remains are located, and the sheriff, police chief, or land-managing official, consistent with section 24-80-1302. There is an express exception pointer for anthropological investigations under section 24-80-1303. Read those sections before you advise a museum, a land agency, or a construction project.",
      "If the coroner or medical examiner takes legal custody under section 24-80-1302(2) or section 30-10-606(1.2), they shall make reasonable attempts to identify the remains. The statute requires collection, as applicable, of items that support identification: photographs, dental records or charts, fingerprints, tissue suitable for DNA, and whole bone or hair suitable for DNA. Information on physical appearance and structure, including DNA typing information, goes into the National Crime Information Center database, either by the coroner or medical examiner or by law enforcement working with them.",
      "Subsection (4) is a stop sign. The coroner or medical examiner shall neither dispose of the remains nor take actions that will materially affect them before obtaining samples suitable for DNA identification and archiving, if possible. “If possible” is a fact question. It is not a vibe, and it is not permission to skip the attempt.",
    ],
    points: [
      "Immediate notice — not after a documentary is edited.",
      "NCIC entry of description and DNA typing information.",
      "No disposal or material alteration before DNA samples, if possible.",
    ],
  },
  {
    id: "h1-alerts",
    minutes: 8,
    credit: "general",
    title: "Amber is a different statute",
    spoken: [
      "Do not collapse every Colorado alert into one word. Section 24-33.5-415.7 creates the Amber Alert program for an abducted child. The General Assembly’s finding in that section is that the first hours matter. Amber has its own definition of abducted child, its own verification step by local law enforcement, and issuance by the Bureau through the state emergency alert system. An abducted newborn can be the subject of an alert even when identification is incomplete.",
      "The Missing Indigenous Person Alert under section 24-33.5-431 is not Amber. It has its own trigger: notice of a missing indigenous person. Using the wrong program name in a press statement or a complaint is a competence problem, not a style problem.",
      "This hour does not brief every Colorado alert. If a senior-specific or hit-and-run alert matters to your facts, pull that section yourself and Shepardize it. Inventing a citation because a national slide deck had one is how lawyers get sanctioned.",
    ],
    points: [
      "Amber: § 24-33.5-415.7, abducted child.",
      "Missing Indigenous Person Alert: § 24-33.5-431.",
      "Unverified alert names stay out of the brief.",
    ],
  },
  {
    id: "h1-lab",
    minutes: 8,
    credit: "none",
    title: "Application lab — not counted in this binder",
    spoken: [
      "Work the hypo in writing. A Denver adult with dementia is last seen at 4:10 p.m. on a trailhead road in Jefferson County. At 4:40 p.m. their spouse calls the sheriff and is told to wait until morning. The spouse is Navajo. The spouse also does not speak English as a first language; the deputy did not use an interpreter.",
      "List the statutory duties you can already name, the clock that would have applied, and the facts you still do not have. Do not draft a complaint you have not researched. Do not rank likely locations. Location ranking is Hour 3’s math, and it is not probable cause.",
    ],
    points: [
      "Separate what § 16-2.7-102(4) already answers from what you still must investigate.",
      "Flag interpreter access as a fact for Hour 3, not as a slogan.",
    ],
  },
]);

const hour2 = stamp([
  {
    id: "h2-open",
    minutes: 2,
    credit: "none",
    title: "Open — not for credit",
    spoken: [
      "Hour 2 is authority. A missing person does not, by that fact alone, dissolve the Fourth Amendment or article II, section 7 of the Colorado Constitution. Families are frightened. Fear is not a warrant.",
    ],
    points: ["Introductory minute is excluded from the Colorado credit clock."],
  },
  {
    id: "h2-caniglia",
    minutes: 14,
    credit: "general",
    title: "The house — Caniglia, not a mood",
    spoken: [
      "Caniglia v. Strom, 141 S. Ct. 1596 (2021), rejected a freestanding “community caretaking” exception that would let police enter a home without a warrant. The Court did not abolish emergency aid. It refused to treat caretaking as a password.",
      "Colorado Constitution article II, section 7 is an independent search-and-seizure guarantee. Do not assume a federal case is the last word in a Colorado suppression hearing. Do assume that “we were worried” is not an element.",
      "If your client is law enforcement, your job is to build the actual doctrine: warrant, consent, or a recognized exception, each with facts. If your client is the family, your job is to stop them from inviting a civil-rights violation or a suppressed search by demanding an entry the law does not allow. If your client is the person whose home would be entered, confidentiality and conflict rules in Hour 3 come first.",
    ],
    points: [
      "Caniglia v. Strom, 141 S. Ct. 1596 (2021) — Shepardize before you quote.",
      "Colo. Const. art. II, § 7.",
      "No freestanding community-caretaking home entry.",
    ],
  },
  {
    id: "h2-aid",
    minutes: 12,
    credit: "general",
    title: "Emergency aid is narrower than the slogan",
    spoken: [
      "Brigham City v. Stuart, 547 U.S. 398 (2006), and Michigan v. Fisher, 558 U.S. 45 (2009), are the cases lawyers usually reach for when they mean emergency aid: an objectively reasonable basis to believe someone inside needs immediate assistance. Read them. Do not upgrade them into “any missing person, any door.”",
      "Mincey v. Arizona, 437 U.S. 385 (1978), still matters on the other side of a tragedy. A homicide scene is not itself a general exception to the warrant requirement. Once the emergency is over, the search needs a warrant or another ground.",
      "For unidentified remains, the statutory duties in section 16-2.7-104 sit on top of these limits. They tell coroners and people already in custody of remains what to do. They are not a warrant to enter a private home because a forum thread guessed the address.",
    ],
    points: [
      "Emergency aid: objective, immediate need — Brigham City; Fisher.",
      "Mincey: the scene of a death is not a roaming warrant.",
      "Shepardize Colorado appellate applications before you tell a client the door comes open.",
    ],
  },
  {
    id: "h2-model",
    minutes: 14,
    credit: "general",
    title: "A probability map is not probable cause",
    spoken: [
      "Search theory has a real pedigree. Bernard Koopman’s work on search and screening gives the identity every honest planner uses: probability of success equals probability of area times probability of detection. POS = POA × POD. For a random search, POD = 1 − e to the minus coverage, and coverage is sweep width times track length divided by area.",
      "That math answers a different question than the Fourth Amendment. POA is the probability the subject is in a segment if your inputs are true. It is not the probability that a crime occurred. It is not consent. It does not describe a particular home’s curtilage. Putting a heat map in a warrant affidavit without saying what the numbers are is a candor problem, which Hour 3 covers. Putting it in and pretending it is a witness is worse.",
      "The Exhibit in this docket runs one miss-update in the open. After an unsuccessful search of segment i, the posterior on i is POA-i times one minus POD, divided by one minus POA-i times POD. Every other segment is divided by that same failure probability. The masses sum to one. A spreadsheet that only shrinks the searched cell does not.",
      "Lost Person Behavior categories — hiker, dementia, child, despondent — come from Robert Koester’s research and the ISRID incident database. The distance tables are copyrighted. This course does not copy them. Hypothetical weights in the Exhibit are labeled hypothetical. If you use real base rates, buy the data, cite the edition, and say so in the declaration.",
    ],
    points: [
      "POS = POA × POD. Random-search POD = 1 − exp(−W·L/A).",
      "Bayes miss update renormalizes. Naive shrink does not.",
      "Do not paste copyrighted LPB tables into a handout or a brief.",
    ],
  },
  {
    id: "h2-records",
    minutes: 10,
    credit: "general",
    title: "Records, remains, and what you cannot promise",
    spoken: [
      "The Colorado Open Records Act, article 72 of title 24, part 2, is not a skeleton key to an active investigative file. Criminal justice records have their own part of that article. Families will ask you to “just CORA it.” You will often have to say no, or say “we can request, and we may be refused, and the refusal may be lawful.”",
      "Do not advise anyone to move remains to “get a better photo,” to post graphic images for engagement, or to search a suspect’s accounts by pretext. Section 16-2.7-104(4) is aimed at officials who already have custody: do not dispose of remains or materially affect them before DNA samples, if possible. The dignity rule for everyone else is simpler. You are not the coroner.",
      "Chain of custody is a trial skill. If a civilian client has already picked something up, preserve their account of when, where, and what they did, and get the item to the agency. Do not coach them to improve the story.",
    ],
    points: [
      "CORA is not a promise of the investigative file.",
      "Civilians do not get a remains-handling privilege.",
      "Candor about what you cannot force the government to disclose.",
    ],
  },
  {
    id: "h2-lab",
    minutes: 8,
    credit: "none",
    title: "Application lab — not counted",
    spoken: [
      "A search-and-rescue lieutenant wants a one-page warrant insert that says “our model is 86 percent sure the person is in the house on lot 12.” The only inputs were a hiker profile and a pin dropped by a volunteer who watched a video.",
      "Write the three sentences you would refuse to sign, and the three sentences you could sign: identity of the method, the inputs, the update rule, and an express statement that the number is not probable cause. Use the Exhibit if you want the arithmetic. Do not invent a percentage you did not compute.",
    ],
    points: ["Refusal is part of competence.", "Unsigned heat is not an exhibit."],
  },
]);

const hour3 = stamp([
  {
    id: "h3-open",
    minutes: 2,
    credit: "none",
    title: "Open — not for credit",
    spoken: [
      "Hour 3 is split on purpose. Twenty-five minutes of legal ethics, then twenty-five minutes of equity, diversity, and inclusivity. At fifty minutes per Colorado credit, that is half a credit of each, inside three general credits for the whole course. Professional-responsibility credit is not subtracted from general credit on the Colorado affidavit. It is reported as well.",
    ],
    points: ["25 + 25 = 50 instructional minutes. Labs and the open are excluded."],
  },
  {
    id: "h3-conf",
    minutes: 13,
    credit: "ethics",
    title: "Confidentiality when the client knows something",
    spoken: [
      "Colorado Rule of Professional Conduct 1.6 governs lawyers. The Colorado Supreme Court has amended the Rules of Professional Conduct through Rule Change 2026(03). Open the official attorney rule before you rely on a subsection number. A parallel LLP rule published by the Colorado Bar Association uses this structure: a lawyer or LLP shall not reveal information relating to the representation unless the client gives informed consent, the disclosure is impliedly authorized, or paragraph (b) permits it. Paragraph (b) is permissive in the published LLP text: the professional may reveal information to the extent reasonably believed necessary.",
      "The published (b)(1) is to prevent reasonably certain death or substantial bodily harm. The published (b)(2) is to reveal the client’s intention to commit a crime and the information necessary to prevent the crime. A living missing person who will die without help can fit (b)(1) on the right facts. The location of remains from a completed crime does not automatically fit (b)(2), because (b)(2) is about a crime the client intends to commit, not a crime that already happened. Fraud exceptions in that published text are about the client’s use of the professional’s services. Do not launder “I want to be helpful” into a disclosure the rule does not allow. Do not launder the rule into a gag that leaves someone to die.",
      "Rule 1.2 still forbids you from assisting a crime. A client who asks you how to hide a person or destroy remains is asking you to leave the practice of law. You refuse. You do not workshop the method. This fleet will not either.",
    ],
    points: [
      "1.6(b) as published in the parallel rule is “may,” not a homemade duty.",
      "(b)(1) death or substantial bodily harm; (b)(2) future crime.",
      "Confirm the attorney text. Do not cite the LLP rule as if it were Rule 1.6.",
    ],
  },
  {
    id: "h3-candor",
    minutes: 12,
    credit: "ethics",
    title: "Competence and candor — show the arithmetic",
    spoken: [
      "Rule 1.1 is competence. If you advise a sheriff’s office, a search-and-rescue corporation, or a family, and you attach a probability, you must understand the difference between a prior and a posterior. Rule 3.3 is candor to the tribunal. A declaration that reports a model score as a fact, hides that the weights were hypothetical, or copies a prior after a negative search as if the search did not happen, is a candor problem.",
      "Here is the canonical exhibit, small enough to do by hand. Priors: lot 0.50, road 0.30, remainder 0.20. You search the lot with POD 0.60 and do not find the person. Probability of success on that search was 0.30. Probability of a miss was 0.70. Posterior on the lot is 0.50 times 0.40 divided by 0.70, which is about 0.286. Posterior on the road is 0.30 divided by 0.70, about 0.429. The road is now the highest segment. A story that still says “start at the lot, it feels hottest” is ranking the prior. That is the subterfuge. The math is not a hunch with extra steps. It is a renormalization you can audit.",
      "Rule 4.1 still bars false statements of material fact to third persons. Do not tell a family the model “found” someone. Do not tell a reporter an agency broke a clock you have not read.",
      "Conflicts under Rule 1.7 are ordinary and brutal here. The family, a volunteer team you also represent, and a person who may be a suspect cannot share one lawyer because the search is emotional. Written conflict analysis is the work.",
    ],
    points: [
      "Canonical miss moves the top segment from A (0.50) to B (about 0.429).",
      "Hypothetical weights must be labeled. Copyrighted LPB tables are not yours to paste.",
      "Rules 1.1, 1.7, 3.3, 4.1 — confirm 2026 text.",
    ],
  },
  {
    id: "h3-edi-clock",
    minutes: 13,
    credit: "edi",
    title: "Who is told to wait",
    spoken: [
      "CLJE Regulation 103.1 defines equity, diversity, and inclusivity credit as an activity that addresses equal access to the legal system, competent representation of diverse populations, or the recognition, mitigation, or elimination of bias in the profession or the system. This block is that, tied to a statute.",
      "The waiting-period myth does not land evenly. Adults whom a desk deputy reads as “voluntary” — indigenous adults, people with mental illness, unhoused people, immigrants, people who do sex work — are the ones told to come back tomorrow. Section 16-2.7-102(4) is the equal-access rule. It does not ask whether the deputy finds the absence suspicious.",
      "Section 16-2.7-103(3) and the alert in section 24-33.5-431 exist because indigenous people have been left out of the ordinary machinery. Treat the CBI notice as an element of competent representation when the missing person is indigenous, whether your client is the family or the agency. The office of liaison for missing and murdered indigenous relatives is part of that statutory design, not a press optional.",
      "Language access is the same issue in the hypo. A report “without delay” that the reporting person cannot actually make, because nobody will speak with them, is a bias fact. Write it down as a fact. Do not skip past it to a map.",
    ],
    points: [
      "EDI definition: CLJE Reg. 103.1.",
      "§ 16-2.7-102(4) is the anti-wait rule that bias most often violates.",
      "Indigenous notice and alert are statutory equal-access devices.",
    ],
  },
  {
    id: "h3-edi-model",
    minutes: 12,
    credit: "edi",
    title: "The wrong behavioral model is a bias error",
    spoken: [
      "Koester’s published categories exist because people do not move the same way. A toddler, a person with dementia, an autistic child, a despondent adult, and a hiker are not one prior. Using a hiker ring for an elder who walks to a familiar drainage, or for a child, is not “good enough for government work.” It is a bad model. In a declaration it becomes a false premise. In the field it sends teams away from the people those categories were built to describe.",
      "Disability is not a character note. Dementia, autism, and intellectual disability change both the legal response — you do not “wait to see if they come home” in the face of section 16-2.7-102(4) — and the statistical prior, which you must source or label as hypothetical. This course will not pretend a three-number hypothetical is that research.",
      "Dignity is part of this credit. Unidentified remains are a person. Training material that uses a corpse as a thumbnail is not EDI and it is not this channel. The emmyliette episodes in this binder are statute, doctrine, and arithmetic. Record them that way.",
    ],
    points: [
      "Category error is both a math error and a representation error.",
      "Do not copy ISRID distance numbers into the slide.",
      "No graphic remains imagery in the cutdowns.",
    ],
  },
  {
    id: "h3-lab",
    minutes: 8,
    credit: "none",
    title: "Application lab — not counted",
    spoken: [
      "Return to the Jefferson County hypo. In eight minutes, write four lines: the acceptance rule, the indigenous-notice clock, whether a home entry is justified on the facts you actually have (it is not, on these facts), and the confidentiality answer if the spouse later tells you, in an interview, that a relative “knows something” but asks you not to repeat it. The last line should say which rule you must open before you speak, not a guess about what you will do.",
    ],
    points: ["Four lines. No location ranking. No disclosure you have not grounded."],
  },
]);

export const HOURS: Hour[] = [
  {
    id: 1,
    kicker: "Hour 1 · general",
    title: "The report and the remains",
    youtubeTitle: "Colorado’s no-waiting-period rule for missing person reports",
    series: "Unfound Hour 1 of 3",
    objectives: [
      "Apply C.R.S. § 16-2.7-102, including the prohibition on a waiting period.",
      "Distinguish the eight-hour adult CCIC clock from the two-hour child clock in § 16-2.7-103.",
      "State the additional CBI notice when the missing person is indigenous.",
      "List the identification and non-disposal duties in § 16-2.7-104.",
      "Separate Amber Alert, § 24-33.5-415.7, from the Missing Indigenous Person Alert, § 24-33.5-431.",
    ],
    blocks: hour1,
    checks: [
      {
        id: "q1a",
        prompt: "An adult has been missing for 30 minutes. May the agency refuse the report because “it hasn’t been 24 hours”?",
        choices: [
          "Yes, if the person is an adult.",
          "No. Section 16-2.7-102(4) forbids refusal based on time missing.",
          "Yes, unless the person is indigenous.",
          "Only the Colorado Bureau of Investigation may accept it.",
        ],
        answer: 1,
        why: "§ 16-2.7-102(4) says the agency shall not refuse a report because the person has not been missing for any length of time. CBI does not take the original report.",
      },
      {
        id: "q1b",
        prompt: "A 12-year-old is reported missing. What is the statutory clock to notify CBI and enter CCIC?",
        choices: ["Eight hours", "Two hours", "Twenty-four hours", "There is no clock"],
        answer: 1,
        why: "§ 16-2.7-103(2)(b): under eighteen, within two hours, notify CBI under § 24-33.5-415.1(3) and enter CCIC.",
      },
      {
        id: "q1c",
        prompt: "An indigenous adult is reported missing. Which statement matches § 16-2.7-103(3)?",
        choices: [
          "No special notice; Amber Alert covers it.",
          "Notify CBI within eight hours, in addition to the ordinary adult duties.",
          "Wait for tribal enrollment documents before any entry.",
          "The family must email CBI instead of the local agency.",
        ],
        answer: 1,
        why: "Indigenous missing persons: CBI notice within eight hours for an adult and two hours for a child, plus appropriate interagency communication. The local agency still takes the report.",
      },
      {
        id: "q1d",
        prompt: "A coroner has legal custody of unidentified remains. What does § 16-2.7-104(4) forbid, if samples are possible?",
        choices: [
          "Entering a description into NCIC.",
          "Notifying the sheriff.",
          "Disposal or material alteration before DNA samples suitable for identification and archiving.",
          "Any photography.",
        ],
        answer: 2,
        why: "The coroner or medical examiner shall neither dispose of the remains nor materially affect them before obtaining DNA samples, if possible.",
      },
      {
        id: "q1e",
        prompt: "Amber Alert and the Missing Indigenous Person Alert are:",
        choices: [
          "Two names for § 24-33.5-415.7.",
          "Different programs: § 24-33.5-415.7 and § 24-33.5-431.",
          "Both available only for children under twelve.",
          "Federal programs with no Colorado statute.",
        ],
        answer: 1,
        why: "Amber is the abducted-child program in § 24-33.5-415.7. The missing indigenous person alert is § 24-33.5-431.",
      },
    ],
  },
  {
    id: 2,
    kicker: "Hour 2 · general",
    title: "Authority to look",
    youtubeTitle: "Caniglia v. Strom and the missing-person house search",
    series: "Unfound Hour 2 of 3",
    objectives: [
      "Explain why a missing person does not by itself authorize a home entry after Caniglia.",
      "Distinguish emergency aid (Brigham City, Fisher) from a homicide-scene search (Mincey).",
      "State POS = POA × POD and the random-search POD formula without calling it probable cause.",
      "Describe the Bayes update after one unsuccessful search.",
      "Avoid promising a CORA production of an active investigative file.",
    ],
    blocks: hour2,
    checks: [
      {
        id: "q2a",
        prompt: "After Caniglia v. Strom, community caretaking is:",
        choices: [
          "A freestanding warrant exception for any home welfare check.",
          "Not a freestanding exception that authorizes a warrantless home entry.",
          "The same thing as consent.",
          "A Colorado-only doctrine unaffected by the Supreme Court.",
        ],
        answer: 1,
        why: "Caniglia, 141 S. Ct. 1596 (2021), rejected community caretaking as a standalone home-entry exception. Shepardize before you rely on it.",
      },
      {
        id: "q2b",
        prompt: "Emergency aid, as taught from Brigham City and Fisher, requires:",
        choices: [
          "A missing-person report of any vintage.",
          "An objectively reasonable basis to believe a person needs immediate aid.",
          "A heat map above 70 percent.",
          "Family consent posted on social media.",
        ],
        answer: 1,
        why: "The exception is fact-specific and objective. A report alone is not the element.",
      },
      {
        id: "q2c",
        prompt: "POS equals:",
        choices: [
          "POA plus POD.",
          "POA times POD.",
          "POD divided by the number of volunteers.",
          "Whatever the highest narrative score is.",
        ],
        answer: 1,
        why: "Koopman’s identity used throughout ground SAR: probability of success = probability of area × probability of detection.",
      },
      {
        id: "q2d",
        prompt: "Priors 0.50, 0.30, 0.20. You miss on the 0.50 segment at POD 0.60. Which segment is now highest?",
        choices: [
          "The 0.50 segment, still about 0.50.",
          "The former 0.30 segment, now about 0.429.",
          "The remainder, now about 0.50.",
          "They are equal.",
        ],
        answer: 1,
        why: "Posterior on the searched segment is 0.20/0.70 ≈ 0.286. Posterior on the 0.30 segment is 0.30/0.70 ≈ 0.429.",
      },
      {
        id: "q2e",
        prompt: "A client asks you to promise that CORA will produce the active investigative file. You should:",
        choices: [
          "Promise it; CORA is absolute.",
          "Explain that investigative and criminal-justice records are often lawfully withheld.",
          "Tell them to post the demand on a websleuth forum.",
          "Enter the home to collect the file yourself.",
        ],
        answer: 1,
        why: "CORA is not a skeleton key. Do not promise a production you cannot force.",
      },
    ],
  },
  {
    id: 3,
    kicker: "Hour 3 · 0.5 ethics + 0.5 EDI",
    title: "The posterior, the secret, and the bias",
    youtubeTitle: "Probability of area for lawyers, after a negative search",
    series: "Unfound Hour 3 of 3",
    objectives: [
      "Apply the permissive structure of Rule 1.6 to a client who knows where a living person or remains may be — after opening the official rule.",
      "Refuse requests to help conceal a person or destroy remains.",
      "Treat an unlabeled model score in a declaration as a candor problem under Rule 3.3.",
      "Connect § 16-2.7-102(4) and § 24-33.5-431 to equal access and bias.",
      "Explain why the wrong behavioral category is both a math error and a representation error.",
    ],
    blocks: hour3,
    checks: [
      {
        id: "q3a",
        prompt: "In the published parallel rule text this course quotes, Rule-style 1.6(b) disclosures are:",
        choices: [
          "Mandatory in every missing-person matter.",
          "Permissive: the professional may reveal information to the extent reasonably believed necessary for a listed purpose.",
          "Forbidden even to prevent certain death.",
          "Required to be posted on YouTube.",
        ],
        answer: 1,
        why: "The CBA-published LLP text says “may reveal.” Confirm the attorney rule. Do not invent a duty or a gag.",
      },
      {
        id: "q3b",
        prompt: "A client asks how to keep officials from finding remains. Competent conduct is:",
        choices: [
          "Sketch three concealment options and label them hypothetical.",
          "Refuse. Do not assist a crime. Do not workshop a method.",
          "File the tips under seal in a websleuth thread.",
          "Run a dark-web search for techniques.",
        ],
        answer: 1,
        why: "Rule 1.2 and the criminal law end the conversation. This curriculum does not teach evasion.",
      },
      {
        id: "q3c",
        prompt: "Which declaration sentence is fit to sign, assuming the arithmetic was actually run?",
        choices: [
          "“The model found the person in the house.”",
          "“Using labeled hypothetical priors 0.50/0.30/0.20 and a stated POD of 0.60, one miss moves the highest segment from the lot to the road. This is not probable cause.”",
          "“ISRID says 86 percent, trust me.”",
          "“Community caretaking covers the entry.”",
        ],
        answer: 1,
        why: "Candor means showing inputs, the update, and the limit of the number. Copyrighted tables and legal conclusions do not get smuggled in.",
      },
      {
        id: "q3d",
        prompt: "The waiting-period myth is an EDI issue in this course because:",
        choices: [
          "It is only a paperwork inconvenience.",
          "Stereotypes about who is “voluntarily” missing predict who gets told to wait, against § 16-2.7-102(4).",
          "EDI credit can be earned by watching any documentary.",
          "Indigenous alerts replaced the Fourth Amendment.",
        ],
        answer: 1,
        why: "Equal access is the point of the no-wait rule and of the indigenous-notice statute. CLJE’s EDI definition covers bias in the system.",
      },
      {
        id: "q3e",
        prompt: "Using a hiker distance model for a person with dementia, without saying so, is:",
        choices: [
          "Harmless if the map looks precise.",
          "A category error that can mislead both the search and the tribunal.",
          "Required by Caniglia.",
          "A substitute for the eight-hour CCIC duty.",
        ],
        answer: 1,
        why: "Behavioral categories differ. An unlabeled mismatch is bad math and bad representation. It does not satisfy the database clock.",
      },
    ],
  },
];

export function creditSummary() {
  const hours = HOURS.map((h) => {
    const mins = { general: 0, ethics: 0, edi: 0, none: 0 };
    for (const b of h.blocks) mins[b.credit] += b.minutes;
    const clock = h.blocks.reduce((a, b) => a + b.minutes, 0);
    return { id: h.id, clock, ...mins };
  });
  const substantiveMinutes = hours.reduce((a, h) => a + h.general + h.ethics + h.edi, 0);
  const ethicsMinutes = hours.reduce((a, h) => a + h.ethics, 0);
  const ediMinutes = hours.reduce((a, h) => a + h.edi, 0);
  const nonCreditMinutes = hours.reduce((a, h) => a + h.none, 0);
  const clockMinutes = hours.reduce((a, h) => a + h.clock, 0);
  const toCredits = (m: number) => m / RULES.creditMinutes;
  return {
    hours,
    clockMinutes,
    substantiveMinutes,
    ethicsMinutes,
    ediMinutes,
    nonCreditMinutes,
    generalCredits: toCredits(substantiveMinutes),
    ethicsCredits: toCredits(ethicsMinutes),
    ediCredits: toCredits(ediMinutes),
  };
}

export function formatClock(min: number): string {
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
