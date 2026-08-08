export const LINEAR_GRAPHQL_URL: string;
export const ISSUE_ID_RE: RegExp;

export function extractLinearIssueIds(text: string): string[];

export interface ParsedCommit {
  issueIds: string[];
  commitMessage: string;
  author: string;
  url: string;
  sha: string;
  primaryIssueId: string | null;
}

export function parseGithubPushPayload(payload: unknown): ParsedCommit[];
export function filterCommitsWithIssues(items: ParsedCommit[]): ParsedCommit[];

export interface LinearMutation {
  query: string;
  variables: Record<string, string>;
  mode: 'comment-only' | 'state-and-comment';
}

export function buildLinearSyncMutation(opts: {
  issueId: string;
  commentText: string;
  doneStateId?: string | null;
}): LinearMutation;

export function buildSyncCommentText(item: {
  commitMessage: string;
  author: string;
  url: string;
  sha?: string;
}): string;

export interface LinearPlan {
  issueId: string;
  commitMessage: string;
  author: string;
  url: string;
  sha: string;
  commentText: string;
  mutation: LinearMutation;
}

export function planLinearUpdates(
  payload: unknown,
  opts?: { doneStateId?: string | null },
): LinearPlan[];

export function executeLinearGraphql(args: {
  apiKey: string;
  query: string;
  variables: Record<string, string>;
  fetchImpl?: typeof fetch;
  endpoint?: string;
}): Promise<unknown>;

export function syncGithubPayloadToLinear(
  payload: unknown,
  opts?: {
    apiKey?: string | null;
    doneStateId?: string | null;
    dryRun?: boolean;
    fetchImpl?: typeof fetch;
  },
): Promise<{
  dryRun: boolean;
  planned: number;
  results: Array<Record<string, unknown> & { status: string; issueId?: string }>;
}>;

export function safeEqualString(a: string, b: string): boolean;
export function verifyWebhookSecret(args: {
  configuredSecret?: string | null;
  providedSecret?: string | null;
}): { ok: boolean; reason: string };

export function getPublicConfig(env?: NodeJS.ProcessEnv): {
  hasLinearApiKey: boolean;
  hasDoneStateId: boolean;
  hasWebhookSecret: boolean;
  linearEndpoint: string;
  defaultDryRun: boolean;
};
