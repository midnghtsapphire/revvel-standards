/**
 * Client-side structural Markdown healer (MD003 / MD025 / MD056).
 * Mirrors scripts/heal-markdown.js so the SaaS console can demo repairs
 * without a server round-trip. Keep behavior aligned with the Node script.
 */

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

export function mapFences(text: string): { lines: string[]; inFence: boolean[] } {
  const lines = text.split("\n");
  const inFence = new Array(lines.length).fill(false);
  let open: { char: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_RE);
    if (m) {
      inFence[i] = true;
      const char = m[1][0];
      const len = m[1].length;
      if (!open) {
        open = { char, len };
      } else if (char === open.char && len >= open.len && m[2].trim() === "") {
        open = null;
      }
    } else {
      inFence[i] = open != null;
    }
  }
  return { lines, inFence };
}

function isSetextCandidateText(line: string): boolean {
  if (!line || !line.trim()) return false;
  const t = line.trimStart();
  if (t.startsWith("#")) return false;
  if (/^([-*+]\s|\d{1,9}[.)]\s)/.test(t)) return false;
  if (t.startsWith(">")) return false;
  if (line.includes("|")) return false;
  if (/^\[[^\]]+\]:/.test(t)) return false;
  return true;
}

export function convertSetextToAtx(text: string): string {
  const { lines, inFence } = mapFences(text);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const prev = i > 0 ? lines[i - 1] : "";
    const prevBlank = i === 0 || !prev.trim() || inFence[i - 1];
    if (
      !inFence[i] &&
      next !== undefined &&
      !inFence[i + 1] &&
      prevBlank &&
      isSetextCandidateText(line)
    ) {
      if (/^ {0,3}=+\s*$/.test(next)) {
        out.push(`# ${line.trim()}`);
        i++;
        continue;
      }
      if (/^ {0,3}-{2,}\s*$/.test(next)) {
        out.push(`## ${line.trim()}`);
        i++;
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

export function demoteExtraH1s(text: string): string {
  const { lines, inFence } = mapFences(text);
  let seenH1 = false;
  return lines
    .map((line, i) => {
      if (inFence[i]) return line;
      if (/^ {0,3}#(?!#)/.test(line)) {
        if (!seenH1) {
          seenH1 = true;
          return line;
        }
        return line.replace(/^( {0,3})#/, "$1##");
      }
      return line;
    })
    .join("\n");
}

function splitTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  const hasOuterPipes = trimmed.startsWith("|") && trimmed.endsWith("|");
  let body = trimmed;
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && body.length > 0) body = body.slice(0, -1);
  const cells = body.split("|").map((c) => c.trim());
  if (hasOuterPipes) return cells.length >= 1 ? cells : [""];
  if (cells.length < 2) return null;
  return cells;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{1,}:?$/.test(c.replace(/\s+/g, "")));
}

function formatTableRow(cells: string[], width: number): string {
  const next = cells.slice(0, width);
  while (next.length < width) next.push("");
  return `| ${next.join(" | ")} |`;
}

export function balanceTableColumns(text: string): string {
  const { lines, inFence } = mapFences(text);
  const out = lines.slice();
  let i = 0;
  while (i < out.length) {
    if (inFence[i]) {
      i += 1;
      continue;
    }
    const cells = splitTableRow(out[i]);
    if (!cells) {
      i += 1;
      continue;
    }
    const start = i;
    const rows: string[][] = [];
    while (i < out.length && !inFence[i]) {
      const c = splitTableRow(out[i]);
      if (!c) break;
      rows.push(c);
      i += 1;
    }
    if (rows.length < 2) continue;
    const sepIdx = rows.findIndex(isSeparatorRow);
    const width = sepIdx >= 0 ? rows[sepIdx].length : rows[0].length;
    if (width < 1) continue;
    for (let r = 0; r < rows.length; r++) {
      out[start + r] = formatTableRow(rows[r], width);
    }
  }
  return out.join("\n");
}

export function healMarkdown(text: string): { text: string; changed: boolean } {
  const healed = balanceTableColumns(demoteExtraH1s(convertSetextToAtx(text)));
  return { text: healed, changed: healed !== text };
}
