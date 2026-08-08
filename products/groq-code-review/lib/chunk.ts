import { DEFAULT_CHUNK_SIZE, DiffChunk } from "./types";

/**
 * Split a unified diff into reviewable chunks.
 *
 * Strategy:
 * 1. Prefer file-level hunks (`diff --git` / `---` / `+++` boundaries).
 * 2. If a single file still exceeds chunkSize, split by lines with a small overlap
 *    so reviewers keep surrounding context.
 *
 * Why: Groq (and most LLM APIs) have hard context limits. Chunking keeps each
 * request under the model budget while still covering the full PR. Tune
 * chunkSize against the model you pick (smaller for 8k context, larger for 128k).
 */
export function chunkPullRequestDiff(
  diff: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): DiffChunk[] {
  const normalized = (diff ?? "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const safeSize = Math.max(500, Math.floor(chunkSize || DEFAULT_CHUNK_SIZE));
  const fileBlocks = splitIntoFileBlocks(normalized);

  const chunks: DiffChunk[] = [];
  let buffer = "";
  let bufferFiles: string[] = [];
  let index = 0;

  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({
      index,
      label: bufferFiles.length
        ? bufferFiles.slice(0, 3).join(", ") + (bufferFiles.length > 3 ? ` (+${bufferFiles.length - 3})` : "")
        : `chunk-${index + 1}`,
      content: buffer.trimEnd(),
      charCount: buffer.length,
      files: [...bufferFiles],
    });
    index += 1;
    buffer = "";
    bufferFiles = [];
  };

  for (const block of fileBlocks) {
    if (block.content.length > safeSize) {
      flush();
      for (const piece of splitOversizedBlock(block.content, safeSize, block.file)) {
        chunks.push({
          index,
          label: piece.label,
          content: piece.content,
          charCount: piece.content.length,
          files: block.file ? [block.file] : [],
        });
        index += 1;
      }
      continue;
    }

    // Pack small files together until we approach the budget.
    if (buffer.length > 0 && buffer.length + block.content.length + 2 > safeSize) {
      flush();
    }
    buffer += (buffer ? "\n\n" : "") + block.content;
    if (block.file && !bufferFiles.includes(block.file)) {
      bufferFiles.push(block.file);
    }
  }

  flush();
  return chunks;
}

interface FileBlock {
  file?: string;
  content: string;
}

function splitIntoFileBlocks(diff: string): FileBlock[] {
  const lines = diff.split("\n");
  const blocks: FileBlock[] = [];
  let current: string[] = [];
  let currentFile: string | undefined;

  const pushCurrent = () => {
    if (!current.length) return;
    blocks.push({ file: currentFile, content: current.join("\n") });
    current = [];
    currentFile = undefined;
  };

  for (const line of lines) {
    const isGitHeader = line.startsWith("diff --git ");
    const isUnifiedHeader = line.startsWith("--- ") && current.length > 0 && !current.some((l) => l.startsWith("@@"));

    if (isGitHeader || (isUnifiedHeader && current.length > 40)) {
      pushCurrent();
    }

    if (isGitHeader) {
      currentFile = extractFileFromGitHeader(line);
    } else if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim() || currentFile;
    } else if (line.startsWith("+++ ") && !line.startsWith("+++ /dev/null")) {
      currentFile = line.replace(/^\+\+\+\s+(b\/)?/, "").trim() || currentFile;
    }

    current.push(line);
  }

  pushCurrent();
  return blocks.length ? blocks : [{ content: diff }];
}

function extractFileFromGitHeader(line: string): string | undefined {
  // diff --git a/path b/path
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return undefined;
  return match[2] || match[1];
}

function splitOversizedBlock(
  content: string,
  chunkSize: number,
  file?: string,
): Array<{ label: string; content: string }> {
  const lines = content.split("\n");
  const overlap = Math.min(12, Math.max(2, Math.floor(chunkSize / 400)));
  const pieces: Array<{ label: string; content: string }> = [];
  let start = 0;
  let part = 1;

  while (start < lines.length) {
    let end = start;
    let size = 0;
    while (end < lines.length) {
      const next = lines[end].length + 1;
      if (size + next > chunkSize && end > start) break;
      size += next;
      end += 1;
    }
    const slice = lines.slice(start, end).join("\n");
    pieces.push({
      label: file ? `${file} (part ${part})` : `oversized-part-${part}`,
      content: slice,
    });
    if (end >= lines.length) break;
    start = Math.max(start + 1, end - overlap);
    part += 1;
  }

  return pieces;
}

/** Rough char estimate for UI progress meters. */
export function estimateReviewUnits(diff: string, chunkSize = DEFAULT_CHUNK_SIZE): number {
  return Math.max(1, chunkPullRequestDiff(diff, chunkSize).length);
}
