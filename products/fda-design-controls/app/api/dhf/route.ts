import { NextRequest, NextResponse } from 'next/server';
import {
  DESIGN_PHASES,
  type ProjectInfo,
  buildDhfMarkdown,
  buildDhfCsv,
  countAllItems,
  countChecked,
} from '../../data/controls';

/**
 * POST /api/dhf
 *
 * Generates a Design History File summary from a JSON payload.
 * NOTE: This is a server-side route. Calling this endpoint transmits the
 * provided project info and checkedItems payload to the serverless function.
 * Use the client-side export in the UI if you need strictly browser-local
 * operation with no server transmission.
 *
 * Accepts a project info object and a map of checked item IDs per phase.
 *
 * Body (JSON):
 * {
 *   project: {
 *     deviceName: string,
 *     deviceVersion: string,
 *     projectLead: string,
 *     intendedUse: string,
 *     deviceClass: "Class I" | "Class II" | "Class III" | "",
 *     startDate: string,   // ISO date, e.g. "2024-01-15"
 *     targetDate: string
 *   },
 *   // Map of phaseId -> array of checked itemIds
 *   checkedItems: {
 *     [phaseId: string]: string[]
 *   }
 * }
 *
 * Response:
 * {
 *   markdown: string,
 *   csv: string,
 *   summary: {
 *     totalItems: number,
 *     checkedItems: number,
 *     overallPct: number,
 *     requiredItems: number,
 *     checkedRequiredItems: number,
 *     requiredPct: number,
 *     phases: Array<{ id, title, cfr, total, checked, pct }>
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate and extract project info
  const rawProject = (body.project ?? {}) as Partial<ProjectInfo>;
  const project: ProjectInfo = {
    deviceName: typeof rawProject.deviceName === 'string' ? rawProject.deviceName : '',
    deviceVersion: typeof rawProject.deviceVersion === 'string' ? rawProject.deviceVersion : '1.0',
    projectLead: typeof rawProject.projectLead === 'string' ? rawProject.projectLead : '',
    intendedUse: typeof rawProject.intendedUse === 'string' ? rawProject.intendedUse : '',
    deviceClass:
      rawProject.deviceClass === 'Class I' ||
      rawProject.deviceClass === 'Class II' ||
      rawProject.deviceClass === 'Class III'
        ? rawProject.deviceClass
        : '',
    startDate: typeof rawProject.startDate === 'string' ? rawProject.startDate : '',
    targetDate: typeof rawProject.targetDate === 'string' ? rawProject.targetDate : '',
  };

  // Build the checked map from the payload
  const rawChecked = (body.checkedItems ?? {}) as Record<string, unknown>;
  const checkedMap = new Map<string, Set<string>>();

  for (const phase of DESIGN_PHASES) {
    const arr = rawChecked[phase.id];
    if (Array.isArray(arr)) {
      // Only accept valid item IDs for this phase
      const validIds = new Set(phase.items.map((i) => i.id));
      const filtered = arr.filter(
        (id): id is string => typeof id === 'string' && validIds.has(id)
      );
      checkedMap.set(phase.id, new Set(filtered));
    }
  }

  // Generate outputs
  const markdown = buildDhfMarkdown(project, checkedMap);
  const csv = buildDhfCsv(project, checkedMap);

  const { total, required } = countAllItems();
  const { checked, checkedRequired } = countChecked(checkedMap);

  const phases = DESIGN_PHASES.map((phase) => {
    const phaseChecked = checkedMap.get(phase.id) ?? new Set<string>();
    return {
      id: phase.id,
      title: phase.title,
      cfr: phase.cfr,
      total: phase.items.length,
      checked: phaseChecked.size,
      pct:
        phase.items.length > 0
          ? Math.round((phaseChecked.size / phase.items.length) * 100)
          : 0,
    };
  });

  return NextResponse.json({
    markdown,
    csv,
    summary: {
      totalItems: total,
      checkedItems: checked,
      overallPct: total > 0 ? Math.round((checked / total) * 100) : 0,
      requiredItems: required,
      checkedRequiredItems: checkedRequired,
      requiredPct:
        required > 0 ? Math.round((checkedRequired / required) * 100) : 0,
      phases,
    },
  });
}

/**
 * GET /api/dhf
 *
 * Returns the full list of design phases and their checklist items.
 * Useful for building custom integrations or QMS imports.
 */
export async function GET() {
  return NextResponse.json({
    phases: DESIGN_PHASES.map((phase) => ({
      id: phase.id,
      cfr: phase.cfr,
      title: phase.title,
      description: phase.description,
      items: phase.items.map((item) => ({
        id: item.id,
        text: item.text,
        required: item.required,
        guidance: item.guidance,
      })),
    })),
  });
}
