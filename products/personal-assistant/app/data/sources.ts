/**
 * Supported personal-data connectors for the Revvel Personal Assistant.
 * Connectors are intentionally transport-agnostic: paste/export today,
 * OAuth MCP bridges later. Classification rules live in pipeline.ts.
 */

export type SourceKind =
  | "gmail"
  | "outlook"
  | "yahoo"
  | "keep"
  | "drive"
  | "sms"
  | "notes"
  | "other";

export interface SourceDefinition {
  id: SourceKind;
  label: string;
  description: string;
  categoryHint: ContentCategory;
  /** Keywords that bias classification toward this source's native category. */
  signalWords: string[];
}

export type ContentCategory =
  | "action-item"
  | "documentation"
  | "research"
  | "code-change"
  | "meeting"
  | "personal"
  | "finance"
  | "unclassified";

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    id: "gmail",
    label: "Gmail",
    description: "Google Workspace / consumer Gmail threads and labels",
    categoryHint: "action-item",
    signalWords: ["inbox", "unsubscribe", "fwd:", "re:", "gmail"],
  },
  {
    id: "outlook",
    label: "Outlook",
    description: "Microsoft 365 / Outlook.com mail and calendar invites",
    categoryHint: "meeting",
    signalWords: ["outlook", "teams meeting", "accepted:", "microsoft"],
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    description: "Yahoo Mail folders and bulk mail exports",
    categoryHint: "personal",
    signalWords: ["yahoo", "ymail", "rocketmail"],
  },
  {
    id: "keep",
    label: "Google Keep",
    description: "Keep notes, checklists, and voice memos",
    categoryHint: "documentation",
    signalWords: ["keep", "checklist", "reminder", "note:"],
  },
  {
    id: "drive",
    label: "Google Drive",
    description: "Drive file names, folder dumps, and shared docs",
    categoryHint: "documentation",
    signalWords: ["drive.google", "shared with you", "document", "spreadsheet"],
  },
  {
    id: "sms",
    label: "Text Messages",
    description: "iMessage / Android SMS / RCS exports",
    categoryHint: "action-item",
    signalWords: ["texted", "sms", "imessage", "msg:"],
  },
  {
    id: "notes",
    label: "Notes / Notepad",
    description: "Apple Notes, OneNote, or plain notepad dumps",
    categoryHint: "documentation",
    signalWords: ["todo", "notes", "brain dump", "scratch"],
  },
  {
    id: "other",
    label: "Other / Paste",
    description: "Any free-form paste when the source is unknown",
    categoryHint: "unclassified",
    signalWords: [],
  },
];

export const CATEGORY_DIRECTORY: Record<ContentCategory, string> = {
  "action-item": "inbox/action-items",
  documentation: "docs/notes",
  research: "research/raw",
  "code-change": "src/proposed",
  meeting: "docs/meetings",
  personal: "personal/notes",
  finance: "finance/receipts",
  unclassified: "inbox/unsorted",
};

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  "action-item": "Action items",
  documentation: "Documentation",
  research: "Research",
  "code-change": "Code changes",
  meeting: "Meetings",
  personal: "Personal",
  finance: "Finance",
  unclassified: "Unsorted",
};

export function getSourceDefinition(id: string): SourceDefinition {
  return (
    SOURCE_DEFINITIONS.find((source) => source.id === id) ??
    SOURCE_DEFINITIONS.find((source) => source.id === "other")!
  );
}
