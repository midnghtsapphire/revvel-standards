/**
 * controls.ts — FDA Design Controls data model.
 *
 * Implements the checklist items, phase definitions, and report-generation
 * logic based on 21 CFR 820.30 (FDA Quality System Regulation — Design
 * Controls) and the FDA's "Design Controls" training slides.
 *
 * Reference: https://www.fda.gov/media/116762/download
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  /** Unique within its parent phase. */
  id: string;
  /** Display text shown to the user. */
  text: string;
  /** True = required by 21 CFR 820.30; false = strongly recommended. */
  required: boolean;
  /** Short guidance note shown on hover / expand. */
  guidance: string;
}

export interface DesignPhase {
  id: string;
  /** Regulation reference, e.g. "820.30(a)". */
  cfr: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export interface ProjectInfo {
  deviceName: string;
  deviceVersion: string;
  projectLead: string;
  intendedUse: string;
  deviceClass: 'Class I' | 'Class II' | 'Class III' | '';
  startDate: string;
  targetDate: string;
}

export interface PhaseStatus {
  phaseId: string;
  /** Item ids that have been checked off. */
  checked: Set<string>;
}

export interface DhfInput {
  project: ProjectInfo;
  statuses: PhaseStatus[];
}

export interface DhfReport {
  markdown: string;
  csv: string;
  totalItems: number;
  completedItems: number;
  requiredItems: number;
  completedRequiredItems: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase definitions — 21 CFR 820.30
// ─────────────────────────────────────────────────────────────────────────────

export const DESIGN_PHASES: DesignPhase[] = [
  {
    id: 'planning',
    cfr: '820.30(a)',
    title: 'Design & Development Planning',
    description:
      'Establish and maintain plans that describe or reference the design and development activities and define responsibility for implementation.',
    items: [
      {
        id: 'plan-written',
        text: 'Written development plan established and dated',
        required: true,
        guidance:
          'The plan must describe the design and development activities and assign responsibilities. Update the plan as the design evolves.',
      },
      {
        id: 'plan-interfaces',
        text: 'Organizational and technical interfaces between groups documented',
        required: true,
        guidance:
          'Define how R&D, manufacturing, QA, regulatory, and clinical teams interact and hand off work.',
      },
      {
        id: 'plan-responsibilities',
        text: 'Responsible individuals or groups identified for each activity',
        required: true,
        guidance:
          'Name or role assignments must be traceable to specific design tasks.',
      },
      {
        id: 'plan-updated',
        text: 'Plan updated as design matures (living document)',
        required: true,
        guidance:
          'The plan is a controlled document; each update must be reviewed and approved per your document-control procedure.',
      },
      {
        id: 'plan-timeline',
        text: 'Project timeline with milestones defined',
        required: false,
        guidance:
          'A Gantt chart or milestone list tied to design phases facilitates review readiness assessments.',
      },
      {
        id: 'plan-resources',
        text: 'Resource requirements (budget, personnel, equipment) documented',
        required: false,
        guidance:
          'Resource gaps identified early prevent schedule slippage during verification and validation.',
      },
    ],
  },
  {
    id: 'input',
    cfr: '820.30(c)',
    title: 'Design Input',
    description:
      'Establish and maintain procedures to ensure that the design requirements relating to a device are appropriate and address the intended use of the device.',
    items: [
      {
        id: 'input-user-needs',
        text: 'User needs and intended use documented',
        required: true,
        guidance:
          'Capture the clinical problem being solved, target user population, and use environment before writing design inputs.',
      },
      {
        id: 'input-requirements',
        text: 'Design input requirements written (functional, performance, safety)',
        required: true,
        guidance:
          'Requirements must be measurable so they can be verified. Avoid vague language like "easy to use."',
      },
      {
        id: 'input-regulatory',
        text: 'Applicable regulatory and standards requirements identified (FDA, ISO, IEC)',
        required: true,
        guidance:
          'Reference specific standards (e.g., ISO 13485, IEC 60601-1) and 21 CFR requirements applicable to your device class.',
      },
      {
        id: 'input-safety',
        text: 'Safety and risk requirements derived from risk analysis (ISO 14971)',
        required: true,
        guidance:
          'Link each risk control measure from your risk management file to a design input requirement.',
      },
      {
        id: 'input-interface',
        text: 'Interface and compatibility requirements defined',
        required: true,
        guidance:
          'Include software interfaces, accessory compatibility, and sterilization/packaging requirements.',
      },
      {
        id: 'input-review',
        text: 'Design inputs reviewed and approved by authorized personnel',
        required: true,
        guidance:
          'Approval signatures (or electronic records) are required; record reviewer name, title, and date.',
      },
      {
        id: 'input-incomplete',
        text: 'Incomplete, ambiguous, or conflicting requirements resolved before design begins',
        required: true,
        guidance:
          'Document the resolution rationale. Conflicting requirements are a common root cause of design failures.',
      },
      {
        id: 'input-traceability',
        text: 'Requirements traceability matrix (RTM) initiated',
        required: false,
        guidance:
          'An RTM links user needs → design inputs → design outputs → V&V activities. It is the backbone of your DHF.',
      },
    ],
  },
  {
    id: 'output',
    cfr: '820.30(d)',
    title: 'Design Output',
    description:
      'Define and document design outputs in terms that allow an adequate evaluation of conformance to design input requirements.',
    items: [
      {
        id: 'output-documents',
        text: 'Design output documents defined (drawings, specs, software, labeling)',
        required: true,
        guidance:
          'Outputs include engineering drawings, material specifications, software source code, manufacturing procedures, and labeling.',
      },
      {
        id: 'output-acceptance',
        text: 'Acceptance criteria included with each output document',
        required: true,
        guidance:
          'Each output must reference a pass/fail criterion that can be objectively evaluated.',
      },
      {
        id: 'output-critical',
        text: 'Critical-to-function characteristics identified and marked',
        required: true,
        guidance:
          'Identify characteristics whose variation could cause harm (e.g., dimensional tolerances on implants, electrical safety parameters).',
      },
      {
        id: 'output-approved',
        text: 'All output documents reviewed and approved before release',
        required: true,
        guidance:
          'Use your document control system. Include cross-functional review for manufacturing and QA.',
      },
      {
        id: 'output-traceability',
        text: 'Each output traceable to a design input requirement in the RTM',
        required: true,
        guidance:
          'Gaps in the RTM (inputs with no output, outputs with no input) must be justified or resolved.',
      },
      {
        id: 'output-dmr',
        text: 'Device Master Record (DMR) index drafted',
        required: false,
        guidance:
          'The DMR lists all controlled documents needed to manufacture the device. Start the index early so nothing is missed.',
      },
    ],
  },
  {
    id: 'review',
    cfr: '820.30(e)',
    title: 'Design Review',
    description:
      'Establish and maintain procedures to ensure that formal documented reviews of the design results are planned and conducted at appropriate stages of the device\'s design development.',
    items: [
      {
        id: 'review-planned',
        text: 'Design reviews planned and scheduled in the development plan',
        required: true,
        guidance:
          'Minimum: one review at each major phase gate (input, output, verification, validation).',
      },
      {
        id: 'review-independent',
        text: 'Independent reviewer (not directly involved in design) participated',
        required: true,
        guidance:
          '820.30(e) specifically requires an individual who does not have direct responsibility for the design stage being reviewed.',
      },
      {
        id: 'review-documented',
        text: 'Meeting minutes / review records document attendees, findings, and decisions',
        required: true,
        guidance:
          'Records must identify the device, date, attendees (with titles), items reviewed, and action items with owners and due dates.',
      },
      {
        id: 'review-actions',
        text: 'Action items tracked to closure before proceeding to the next phase',
        required: true,
        guidance:
          'Open actions from a design review are a common FDA 483 observation. Use a CAPA or punch-list system to close items.',
      },
      {
        id: 'review-final',
        text: 'Final design review (pre-transfer) completed and approved',
        required: true,
        guidance:
          'The final review confirms design outputs are complete, V&V is done, and the device is ready for transfer to production.',
      },
      {
        id: 'review-dhf',
        text: 'Review records filed in the Design History File (DHF)',
        required: true,
        guidance:
          'All review records must be part of the DHF. Traceability to the DHF index is required.',
      },
    ],
  },
  {
    id: 'verification',
    cfr: '820.30(f)',
    title: 'Design Verification',
    description:
      'Establish and maintain procedures for verifying the device design. Verification shall confirm that the design output meets the design input requirements.',
    items: [
      {
        id: 'ver-plan',
        text: 'Verification plan and protocols documented and approved',
        required: true,
        guidance:
          'The plan must specify which requirements are being verified, the test method, acceptance criteria, and the test sample size.',
      },
      {
        id: 'ver-methods',
        text: 'Verification methods selected (inspection, test, analysis, demonstration)',
        required: true,
        guidance:
          'Choose the most objective method. Similarity analysis is allowed only when scientifically justified.',
      },
      {
        id: 'ver-reports',
        text: 'Verification test reports completed and signed off',
        required: true,
        guidance:
          'Reports must include: test date, test personnel, equipment used (with calibration status), raw data, and pass/fail conclusion.',
      },
      {
        id: 'ver-all-inputs',
        text: 'All design input requirements addressed by at least one verification activity',
        required: true,
        guidance:
          'Cross-reference the RTM to confirm no requirements are unverified. Unverified requirements are a critical FDA finding.',
      },
      {
        id: 'ver-failures',
        text: 'Failures investigated, root cause documented, and dispositioned',
        required: true,
        guidance:
          'Failed tests require a documented root cause analysis and either design change (with re-verification) or documented justification.',
      },
      {
        id: 'ver-software',
        text: 'Software verification (IEC 62304 / FDA software guidance) completed, if applicable',
        required: false,
        guidance:
          'For Software as a Medical Device (SaMD) or device software, follow IEC 62304 safety classifications and FDA\'s software guidance.',
      },
      {
        id: 'ver-dhf',
        text: 'All verification records filed in the DHF',
        required: true,
        guidance:
          'Protocols and reports must be in the DHF. Link them to the RTM entries they satisfy.',
      },
    ],
  },
  {
    id: 'validation',
    cfr: '820.30(g)',
    title: 'Design Validation',
    description:
      'Establish and maintain procedures for validating the device design. Validation shall ensure that devices conform to defined user needs and intended uses.',
    items: [
      {
        id: 'val-plan',
        text: 'Validation plan documented, approved, and tied to user needs',
        required: true,
        guidance:
          'Validation answers: "Does the device meet user needs?" It is distinct from verification (does it meet design inputs?).',
      },
      {
        id: 'val-initial-production',
        text: 'Validation performed on initial production units or equivalents',
        required: true,
        guidance:
          '820.30(g) requires validation to be performed under defined operating conditions on initial production units, lots, or batches.',
      },
      {
        id: 'val-clinical',
        text: 'Clinical evaluation or simulated-use data documented',
        required: true,
        guidance:
          'For Class II/III devices, clinical data or bench-top simulated-use studies demonstrating intended-use performance are required.',
      },
      {
        id: 'val-human-factors',
        text: 'Human factors / usability validation study completed (FDA HF guidance)',
        required: false,
        guidance:
          'FDA recommends human factors validation for devices where use errors could cause harm. Follow FDA\'s 2016 HF guidance.',
      },
      {
        id: 'val-software',
        text: 'Software validation completed (system-level), if applicable',
        required: false,
        guidance:
          'System-level validation confirms integrated device + software performance under real-world conditions.',
      },
      {
        id: 'val-biocompatibility',
        text: 'Biocompatibility assessment (ISO 10993) completed for patient-contacting materials',
        required: false,
        guidance:
          'Required for any device part that contacts the patient directly or indirectly. Document biological risk evaluation.',
      },
      {
        id: 'val-reports',
        text: 'Validation reports completed, signed off, and filed in the DHF',
        required: true,
        guidance:
          'Include: protocol, raw data, statistical analysis, pass/fail determination, and conclusion referencing user needs.',
      },
    ],
  },
  {
    id: 'transfer',
    cfr: '820.30(h)',
    title: 'Design Transfer',
    description:
      'Establish and maintain procedures to ensure that the device design is correctly translated into production specifications.',
    items: [
      {
        id: 'transfer-dmr',
        text: 'Device Master Record (DMR) finalized and approved',
        required: true,
        guidance:
          'The DMR must include: device specifications, production process procedures, quality assurance procedures, packaging/labeling specifications, and installation/maintenance procedures.',
      },
      {
        id: 'transfer-procedures',
        text: 'Manufacturing procedures documented and validated',
        required: true,
        guidance:
          'Any process whose output cannot be fully verified by subsequent inspection must be validated (e.g., sterilization, welding, molding).',
      },
      {
        id: 'transfer-conditions',
        text: 'Device manufactured under defined production conditions verified to match design intent',
        required: true,
        guidance:
          'First-article inspection or pilot-lot build confirms the production process faithfully reproduces the design.',
      },
      {
        id: 'transfer-training',
        text: 'Production and QA staff trained and training documented',
        required: true,
        guidance:
          'Training records are required by 820.25. Tie training to specific procedures in the DMR.',
      },
      {
        id: 'transfer-equipment',
        text: 'Production equipment qualified (IQ/OQ/PQ, as applicable)',
        required: false,
        guidance:
          'Equipment qualification is required when equipment variation could affect device safety or efficacy.',
      },
      {
        id: 'transfer-labeling',
        text: 'Labeling reviewed for regulatory compliance (21 CFR 801)',
        required: true,
        guidance:
          'Label content, format, and application must comply with 21 CFR 801 and any device-specific labeling regulations.',
      },
    ],
  },
  {
    id: 'changes',
    cfr: '820.30(i)',
    title: 'Design Changes',
    description:
      'Establish and maintain procedures for the identification, documentation, validation or verification (as appropriate), review, and approval of design changes before their implementation.',
    items: [
      {
        id: 'changes-procedure',
        text: 'Change control procedure established and part of the QMS',
        required: true,
        guidance:
          'The procedure must address identification, documentation, impact assessment, approval, and implementation of changes.',
      },
      {
        id: 'changes-documented',
        text: 'Each design change identified, described, and formally documented (ECO/ECN)',
        required: true,
        guidance:
          'Use Engineering Change Orders (ECO) or equivalent. Include originator, description, rationale, and affected documents.',
      },
      {
        id: 'changes-impact',
        text: 'Impact assessment completed (safety, performance, regulatory, predicate impact)',
        required: true,
        guidance:
          'For 510(k)-cleared devices, assess whether the change requires a new 510(k) per FDA\'s 2017 change guidance.',
      },
      {
        id: 'changes-vv',
        text: 'Re-verification or re-validation performed as needed based on impact',
        required: true,
        guidance:
          'If a change affects a verified or validated characteristic, the affected tests must be repeated and documented.',
      },
      {
        id: 'changes-approved',
        text: 'Change reviewed and approved by authorized personnel before implementation',
        required: true,
        guidance:
          'Multi-disciplinary approval (engineering, QA, regulatory) is best practice. Record approvals with date and signature.',
      },
      {
        id: 'changes-dhf',
        text: 'Approved changes filed in the DHF',
        required: true,
        guidance:
          'The DHF must reflect the current design. All ECOs must be traceable in the DHF index.',
      },
    ],
  },
  {
    id: 'dhf',
    cfr: '820.30(j)',
    title: 'Design History File (DHF)',
    description:
      'Establish and maintain a DHF for each type of device. The DHF shall contain or reference all records necessary to demonstrate that the design was developed in accordance with the approved design plan and the requirements of 21 CFR 820.30.',
    items: [
      {
        id: 'dhf-index',
        text: 'DHF index document created and controlled',
        required: true,
        guidance:
          'The index must list all records in the DHF with document number, title, revision, and location reference.',
      },
      {
        id: 'dhf-all-phases',
        text: 'Records from all design phases compiled and referenced in the DHF',
        required: true,
        guidance:
          'Planning records, design inputs, design outputs, review minutes, V&V protocols and reports, and transfer records must all be in the DHF.',
      },
      {
        id: 'dhf-version',
        text: 'Version history and design evolution documented',
        required: true,
        guidance:
          'The DHF must demonstrate the design history, including iterations and changes. ECO history must be traceable.',
      },
      {
        id: 'dhf-approvals',
        text: 'All approval signatures (with dates and titles) obtained and recorded',
        required: true,
        guidance:
          '21 CFR 11 electronic signatures are acceptable if the QMS includes appropriate controls.',
      },
      {
        id: 'dhf-archived',
        text: 'DHF archived in a controlled, secure location (physical or electronic)',
        required: true,
        guidance:
          'Records must be retained for the lifetime of the device plus 2 years (820.180). Disaster recovery plans should cover the DHF.',
      },
      {
        id: 'dhf-accessible',
        text: 'DHF accessible for FDA inspection on request',
        required: true,
        guidance:
          'FDA investigators may request the DHF during a facility inspection. Designate a DHF custodian responsible for production on request.',
      },
      {
        id: 'dhf-complete',
        text: 'DHF completeness review performed by QA before device commercialization',
        required: true,
        guidance:
          'A pre-commercialization DHF audit by an independent QA reviewer reduces 483 observation risk.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return total counts for all phases. */
export function countAllItems(): { total: number; required: number } {
  let total = 0;
  let required = 0;
  for (const phase of DESIGN_PHASES) {
    for (const item of phase.items) {
      total++;
      if (item.required) required++;
    }
  }
  return { total, required };
}

/** Count how many items are checked in the given statuses map. */
export function countChecked(
  statuses: Map<string, Set<string>>
): { checked: number; checkedRequired: number } {
  let checked = 0;
  let checkedRequired = 0;
  for (const phase of DESIGN_PHASES) {
    const checkedIds = statuses.get(phase.id) ?? new Set<string>();
    for (const item of phase.items) {
      if (checkedIds.has(item.id)) {
        checked++;
        if (item.required) checkedRequired++;
      }
    }
  }
  return { checked, checkedRequired };
}

/** Calculate per-phase completion percentage (0–100). */
export function phaseCompletionPct(
  phase: DesignPhase,
  checkedIds: Set<string>
): number {
  if (phase.items.length === 0) return 0;
  const done = phase.items.filter((i) => checkedIds.has(i.id)).length;
  return Math.round((done / phase.items.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Report generation
// ─────────────────────────────────────────────────────────────────────────────

/** Build a Markdown-formatted Design History File summary. */
export function buildDhfMarkdown(
  project: ProjectInfo,
  statuses: Map<string, Set<string>>
): string {
  const now = new Date().toISOString().split('T')[0];
  const { total, required } = countAllItems();
  const { checked, checkedRequired } = countChecked(statuses);

  const lines: string[] = [
    `# Design History File Summary — ${project.deviceName || 'Unnamed Device'}`,
    '',
    `**Version:** ${project.deviceVersion || 'TBD'}  `,
    `**Project Lead:** ${project.projectLead || 'TBD'}  `,
    `**Intended Use:** ${project.intendedUse || 'TBD'}  `,
    `**Device Class:** ${project.deviceClass || 'TBD'}  `,
    `**Start Date:** ${project.startDate || 'TBD'}  `,
    `**Target Date:** ${project.targetDate || 'TBD'}  `,
    `**Generated:** ${now}  `,
    '',
    '---',
    '',
    '## Compliance Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Overall completion | ${checked} / ${total} (${Math.round((checked / total) * 100)}%) |`,
    `| Required items complete | ${checkedRequired} / ${required} (${Math.round((checkedRequired / required) * 100)}%) |`,
    '',
    '---',
    '',
    '## Phase-by-Phase Checklist',
    '',
  ];

  for (const phase of DESIGN_PHASES) {
    const checkedIds = statuses.get(phase.id) ?? new Set<string>();
    const pct = phaseCompletionPct(phase, checkedIds);
    lines.push(`### ${phase.title} (${phase.cfr}) — ${pct}% complete`);
    lines.push('');
    lines.push(`*${phase.description}*`);
    lines.push('');

    for (const item of phase.items) {
      const done = checkedIds.has(item.id);
      const tag = item.required ? ' *(required)*' : '';
      lines.push(`- [${done ? 'x' : ' '}] ${item.text}${tag}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('> Generated by [FDA Design Controls Tool](https://github.com/midnghtsapphire/revvel-standards)  ');
  lines.push('> Reference: 21 CFR 820.30 | FDA Design Controls Guidance (https://www.fda.gov/media/116762/download)');
  lines.push('');

  return lines.join('\n');
}

/** Build a CSV export of the full checklist with completion status. */
export function buildDhfCsv(
  project: ProjectInfo,
  statuses: Map<string, Set<string>>
): string {
  const rows: string[] = [
    '"Phase","CFR","Item","Required","Completed","Guidance"',
  ];

  for (const phase of DESIGN_PHASES) {
    const checkedIds = statuses.get(phase.id) ?? new Set<string>();
    for (const item of phase.items) {
      const done = checkedIds.has(item.id) ? 'Yes' : 'No';
      const req = item.required ? 'Yes' : 'No';
      // Escape double-quotes within fields
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      rows.push(
        [
          escape(phase.title),
          escape(phase.cfr),
          escape(item.text),
          escape(req),
          escape(done),
          escape(item.guidance),
        ].join(',')
      );
    }
  }

  // Append project metadata as a footer section
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  rows.push('');
  rows.push('"Device Name","Version","Project Lead","Device Class","Start Date","Target Date"');
  rows.push(
    [
      escape(project.deviceName),
      escape(project.deviceVersion),
      escape(project.projectLead),
      escape(project.deviceClass),
      escape(project.startDate),
      escape(project.targetDate),
    ].join(',')
  );

  return rows.join('\n');
}
