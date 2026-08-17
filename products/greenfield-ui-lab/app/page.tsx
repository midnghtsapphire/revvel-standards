"use client";

import { useMemo, useState } from "react";
import {
  IDEA_STATES,
  STATE_LABELS,
  type GreenfieldStore,
  type Idea,
  type IdeaState,
  addIdea,
  countByState,
  createSeedStore,
  displayName,
  donateDays,
  exportStoreJson,
  exportStoreMarkdown,
  filterIdeasByState,
  releaseWalletDays,
  setIdeaState,
  toggleFollow,
  toggleLike,
  totalIdeaDays,
} from "./data/greenfield";

function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function IdeaCard({
  idea,
  store,
  actorId,
  onChange,
  onMessage,
}: {
  idea: Idea;
  store: GreenfieldStore;
  actorId: string;
  onChange: (next: GreenfieldStore) => void;
  onMessage: (message: string) => void;
}) {
  const owner = store.people.find((person) => person.personId === idea.ownerId);
  const liked = idea.likedByIds.includes(actorId);
  const followed = idea.followedByIds.includes(actorId);

  const moveOptions = IDEA_STATES.filter((state) => state !== idea.state);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold leading-snug text-slate-900">{idea.description}</p>
      <p className="mt-1 text-xs text-slate-500">Owner: {displayName(owner)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip>⏱ {idea.days}d</Chip>
        <Chip>👥 {idea.adapterIds.length} adapters</Chip>
        <Chip>⭐ {idea.likedByIds.length}</Chip>
        <Chip>👁 {idea.followedByIds.length}</Chip>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {moveOptions.map((state) => (
          <button
            key={state}
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
            onClick={() => onChange(setIdeaState(store, idea.ideaId, state))}
          >
            → {STATE_LABELS[state]}
          </button>
        ))}
        <button
          type="button"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            liked ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => onChange(toggleLike(store, idea.ideaId, actorId))}
        >
          {liked ? "Unlike" : "Like"}
        </button>
        <button
          type="button"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            followed ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-700"
          }`}
          onClick={() => onChange(toggleFollow(store, idea.ideaId, actorId))}
        >
          {followed ? "Unfollow" : "Follow"}
        </button>
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          onClick={() => {
            const result = donateDays(store, idea.ideaId, 1);
            if (!result.ok) {
              onMessage(result.error ?? "Donation failed");
              return;
            }
            onChange(result.store);
            onMessage(`Donated 1 day to “${idea.description}”.`);
          }}
        >
          Donate 1d
        </button>
      </div>
    </article>
  );
}

function BoardColumn({
  state,
  store,
  actorId,
  onChange,
  onMessage,
}: {
  state: IdeaState;
  store: GreenfieldStore;
  actorId: string;
  onChange: (next: GreenfieldStore) => void;
  onMessage: (message: string) => void;
}) {
  const ideas = filterIdeasByState(store.ideas, state);
  const accent =
    state === "FRESH" ? "border-sky-300" : state === "INWORK" ? "border-amber-300" : "border-emerald-300";

  return (
    <section className={`flex min-h-[22rem] flex-col rounded-3xl border-t-4 bg-white/90 shadow-md ${accent}`}>
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {STATE_LABELS[state]}
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {ideas.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {ideas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            No ideas in this column
          </p>
        ) : (
          ideas.map((idea) => (
            <IdeaCard
              key={idea.ideaId}
              idea={idea}
              store={store}
              actorId={actorId}
              onChange={onChange}
              onMessage={onMessage}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const [store, setStore] = useState<GreenfieldStore>(() => createSeedStore());
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("Ready — patterns modernized from rgn/greenfield-ui.");
  const actorId = store.people[0]?.personId ?? "person_unknown";
  const counts = useMemo(() => countByState(store.ideas), [store.ideas]);
  const allocated = useMemo(() => totalIdeaDays(store.ideas), [store.ideas]);

  const handleAdd = () => {
    const next = addIdea(store, { description, ownerId: actorId });
    if (next === store) {
      setMessage("Enter a non-empty idea description.");
      return;
    }
    setStore(next);
    setDescription("");
    setMessage("Idea added to Fresh.");
  };

  return (
    <div className="bg-lab min-h-screen text-slate-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
          <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-900">
            Greenfield UI Lab · port 3012
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Idea board + day wallet for revvel-standards
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            Interactive incorporation of patterns from{" "}
            <a
              className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
              href="https://github.com/rgn/greenfield-ui"
              target="_blank"
              rel="noreferrer"
            >
              rgn/greenfield-ui
            </a>{" "}
            (Angular 5 / Hyperledger Composer, 0★, 2018). Domain logic is pure TypeScript; UI is
            Next.js + Tailwind — no Composer runtime.
          </p>
          <p className="mt-2 text-xs text-slate-500" role="status">
            {message}
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
            <h2 className="text-lg font-semibold">Add idea</h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAdd();
                }}
                placeholder="Describe a product or research idea"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none ring-indigo-200 focus:ring-2"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Add idea
              </button>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
            <h2 className="text-lg font-semibold">Personal wallet</h2>
            <p className="mt-2 text-3xl font-bold text-indigo-700">{store.wallet.days} days</p>
            <p className="mt-1 text-xs text-slate-500">
              Allocated across ideas: <strong>{allocated}d</strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Columns: Fresh {counts.FRESH} · In work {counts.INWORK} · Finished {counts.FINISHED}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                onClick={() => {
                  setStore(releaseWalletDays(store, 5));
                  setMessage("Released +5 days into wallet.");
                }}
              >
                Release +5d
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => downloadText("greenfield-board.json", exportStoreJson(store), "application/json")}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() =>
                  downloadText("greenfield-board.md", exportStoreMarkdown(store), "text/markdown")
                }
              >
                Export Markdown
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setStore(createSeedStore());
                  setMessage("Reset to seed board.");
                }}
              >
                Reset seed
              </button>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {IDEA_STATES.map((state) => (
            <BoardColumn
              key={state}
              state={state}
              store={store}
              actorId={actorId}
              onChange={setStore}
              onMessage={setMessage}
            />
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-sm leading-relaxed text-slate-700 shadow-md sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Integration notes</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              Full research report:{" "}
              <code className="rounded bg-slate-100 px-1">wr/greenfield-ui-research.md</code>
            </li>
            <li>
              Do not depend on Hyperledger Composer or Angular 5 — both are end-of-life for this
              monorepo.
            </li>
            <li>
              Prefer owned Tailwind/shadcn-style primitives when promoting board chrome into a shared
              UI package.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
