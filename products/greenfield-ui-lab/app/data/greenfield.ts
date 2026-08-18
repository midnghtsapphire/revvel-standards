/**
 * Domain model modernized from rgn/greenfield-ui (Hyperledger Composer demo).
 * Source patterns: IdeaState, Idea, PersonalWallet, like/follow/donate transactions.
 * Pure functions only — no network, no Composer runtime.
 */

export type IdeaState = "FRESH" | "INWORK" | "FINISHED";

export const IDEA_STATES: readonly IdeaState[] = ["FRESH", "INWORK", "FINISHED"] as const;

export const STATE_LABELS: Record<IdeaState, string> = {
  FRESH: "Fresh",
  INWORK: "In work",
  FINISHED: "Finished",
};

export interface Person {
  personId: string;
  firstName: string;
  lastName: string;
}

export interface Idea {
  ideaId: string;
  description: string;
  days: number;
  state: IdeaState;
  ownerId: string;
  adapterIds: string[];
  likedByIds: string[];
  followedByIds: string[];
  createdAt: string;
}

export interface PersonalWallet {
  walletId: string;
  ownerId: string;
  days: number;
}

export interface GreenfieldStore {
  people: Person[];
  ideas: Idea[];
  wallet: PersonalWallet;
}

export interface CreateIdeaInput {
  description: string;
  ownerId: string;
  adapterIds?: string[];
  days?: number;
}

export interface DonateResult {
  ok: boolean;
  store: GreenfieldStore;
  error?: string;
}

function clampDays(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function displayName(person: Person | undefined): string {
  if (!person) return "Unknown";
  return `${person.firstName} ${person.lastName}`.trim() || person.personId;
}

export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function createSeedStore(): GreenfieldStore {
  const alice: Person = {
    personId: "person_alice",
    firstName: "Ada",
    lastName: "Lovelace",
  };
  const bob: Person = {
    personId: "person_bob",
    firstName: "Grace",
    lastName: "Hopper",
  };

  const ideas: Idea[] = [
    {
      ideaId: "idea_board_tokens",
      description: "Tokenize design system primitives for monorepo products",
      days: 2,
      state: "FRESH",
      ownerId: alice.personId,
      adapterIds: [bob.personId],
      likedByIds: [bob.personId],
      followedByIds: [],
      createdAt: new Date("2026-08-01T12:00:00.000Z").toISOString(),
    },
    {
      ideaId: "idea_wr_kanban",
      description: "Map WR lifecycle labels onto a three-column idea board",
      days: 5,
      state: "INWORK",
      ownerId: bob.personId,
      adapterIds: [alice.personId],
      likedByIds: [alice.personId, bob.personId],
      followedByIds: [alice.personId],
      createdAt: new Date("2026-08-02T12:00:00.000Z").toISOString(),
    },
    {
      ideaId: "idea_composer_exit",
      description: "Document Hyperledger Composer exit path for legacy UIs",
      days: 3,
      state: "FINISHED",
      ownerId: alice.personId,
      adapterIds: [],
      likedByIds: [],
      followedByIds: [bob.personId],
      createdAt: new Date("2026-07-20T12:00:00.000Z").toISOString(),
    },
  ];

  return {
    people: [alice, bob],
    ideas,
    wallet: {
      walletId: "wallet_default",
      ownerId: alice.personId,
      days: 10,
    },
  };
}

/** Mirrors greenfield ideaStateFilter pipe. */
export function filterIdeasByState(ideas: Idea[], state: IdeaState): Idea[] {
  return ideas.filter((idea) => idea.state === state);
}

export function countByState(ideas: Idea[]): Record<IdeaState, number> {
  return {
    FRESH: filterIdeasByState(ideas, "FRESH").length,
    INWORK: filterIdeasByState(ideas, "INWORK").length,
    FINISHED: filterIdeasByState(ideas, "FINISHED").length,
  };
}

export function addIdea(store: GreenfieldStore, input: CreateIdeaInput): GreenfieldStore {
  const description = input.description.trim();
  if (!description) {
    return store;
  }

  const ownerExists = store.people.some((p) => p.personId === input.ownerId);
  const ownerId = ownerExists ? input.ownerId : store.people[0]?.personId ?? "person_unknown";

  const idea: Idea = {
    ideaId: createId("idea"),
    description,
    days: clampDays(input.days ?? 0),
    state: "FRESH",
    ownerId,
    adapterIds: [...new Set(input.adapterIds ?? [])],
    likedByIds: [],
    followedByIds: [],
    createdAt: new Date().toISOString(),
  };

  return {
    ...store,
    ideas: [idea, ...store.ideas],
  };
}

export function setIdeaState(
  store: GreenfieldStore,
  ideaId: string,
  state: IdeaState,
): GreenfieldStore {
  return {
    ...store,
    ideas: store.ideas.map((idea) =>
      idea.ideaId === ideaId ? { ...idea, state } : idea,
    ),
  };
}

/** IdeaLike transaction — toggle membership for idempotent UI. */
export function toggleLike(
  store: GreenfieldStore,
  ideaId: string,
  personId: string,
): GreenfieldStore {
  return {
    ...store,
    ideas: store.ideas.map((idea) => {
      if (idea.ideaId !== ideaId) return idea;
      const has = idea.likedByIds.includes(personId);
      return {
        ...idea,
        likedByIds: has
          ? idea.likedByIds.filter((id) => id !== personId)
          : [...idea.likedByIds, personId],
      };
    }),
  };
}

/** IdeaFollow transaction — toggle membership. */
export function toggleFollow(
  store: GreenfieldStore,
  ideaId: string,
  personId: string,
): GreenfieldStore {
  return {
    ...store,
    ideas: store.ideas.map((idea) => {
      if (idea.ideaId !== ideaId) return idea;
      const has = idea.followedByIds.includes(personId);
      return {
        ...idea,
        followedByIds: has
          ? idea.followedByIds.filter((id) => id !== personId)
          : [...idea.followedByIds, personId],
      };
    }),
  };
}

/**
 * IdeaDonateDays — move days from wallet onto an idea.
 * Fails closed when wallet lacks balance (DonationFailedEvent semantics).
 */
export function donateDays(
  store: GreenfieldStore,
  ideaId: string,
  days: number,
): DonateResult {
  const amount = clampDays(days);
  if (amount <= 0) {
    return { ok: false, store, error: "Donation must be at least 1 day." };
  }
  if (store.wallet.days < amount) {
    return {
      ok: false,
      store,
      error: `Not enough days in wallet (have ${store.wallet.days}, need ${amount}).`,
    };
  }
  const target = store.ideas.find((idea) => idea.ideaId === ideaId);
  if (!target) {
    return { ok: false, store, error: "Idea not found." };
  }

  return {
    ok: true,
    store: {
      ...store,
      wallet: {
        ...store.wallet,
        days: store.wallet.days - amount,
      },
      ideas: store.ideas.map((idea) =>
        idea.ideaId === ideaId ? { ...idea, days: idea.days + amount } : idea,
      ),
    },
  };
}

export function releaseWalletDays(store: GreenfieldStore, days: number): GreenfieldStore {
  const amount = clampDays(days);
  return {
    ...store,
    wallet: {
      ...store.wallet,
      days: store.wallet.days + amount,
    },
  };
}

export function totalIdeaDays(ideas: Idea[]): number {
  return ideas.reduce((sum, idea) => sum + idea.days, 0);
}

export function exportStoreJson(store: GreenfieldStore): string {
  return `${JSON.stringify(store, null, 2)}\n`;
}

export function exportStoreMarkdown(store: GreenfieldStore): string {
  const lines: string[] = [
    "# Greenfield idea board export",
    "",
    `Wallet: **${store.wallet.days}** days (owner \`${store.wallet.ownerId}\`)`,
    "",
  ];

  for (const state of IDEA_STATES) {
    lines.push(`## ${STATE_LABELS[state]}`);
    lines.push("");
    const column = filterIdeasByState(store.ideas, state);
    if (column.length === 0) {
      lines.push("_No ideas_");
      lines.push("");
      continue;
    }
    for (const idea of column) {
      const owner = store.people.find((p) => p.personId === idea.ownerId);
      lines.push(
        `- **${idea.description}** — ${idea.days}d · owner ${displayName(owner)} · ⭐ ${idea.likedByIds.length} · 👁 ${idea.followedByIds.length}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}
