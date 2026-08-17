import assert from "node:assert/strict";
import {
  addIdea,
  countByState,
  createSeedStore,
  donateDays,
  exportStoreMarkdown,
  filterIdeasByState,
  releaseWalletDays,
  setIdeaState,
  toggleFollow,
  toggleLike,
  totalIdeaDays,
} from "../app/data/greenfield";

{
  const seed = createSeedStore();
  const counts = countByState(seed.ideas);
  assert.equal(counts.FRESH, 1);
  assert.equal(counts.INWORK, 1);
  assert.equal(counts.FINISHED, 1);
  assert.equal(filterIdeasByState(seed.ideas, "FRESH").length, 1);
  assert.ok(seed.wallet.days >= 0);
}

{
  const seed = createSeedStore();
  const empty = addIdea(seed, { description: "   ", ownerId: seed.people[0].personId });
  assert.equal(empty, seed);

  const next = addIdea(seed, {
    description: "Ship greenfield lab",
    ownerId: seed.people[0].personId,
    days: 2.9,
  });
  assert.equal(next.ideas.length, seed.ideas.length + 1);
  assert.equal(next.ideas[0].state, "FRESH");
  assert.equal(next.ideas[0].days, 2);
  assert.equal(next.ideas[0].description, "Ship greenfield lab");
}

{
  const seed = createSeedStore();
  const target = seed.ideas[0];
  const moved = setIdeaState(seed, target.ideaId, "FINISHED");
  assert.equal(
    moved.ideas.find((idea) => idea.ideaId === target.ideaId)?.state,
    "FINISHED",
  );
}

{
  const seed = createSeedStore();
  const actor = seed.people[0].personId;
  const ideaId = seed.ideas[0].ideaId;
  const liked = toggleLike(seed, ideaId, actor);
  const likedIdea = liked.ideas.find((idea) => idea.ideaId === ideaId);
  assert.ok(likedIdea?.likedByIds.includes(actor));
  const unliked = toggleLike(liked, ideaId, actor);
  assert.equal(
    unliked.ideas.find((idea) => idea.ideaId === ideaId)?.likedByIds.includes(actor),
    false,
  );

  const followed = toggleFollow(seed, ideaId, actor);
  assert.ok(followed.ideas.find((idea) => idea.ideaId === ideaId)?.followedByIds.includes(actor));
}

{
  const seed = createSeedStore();
  const ideaId = seed.ideas.find((idea) => idea.state === "INWORK")?.ideaId;
  assert.ok(ideaId);

  const beforeWallet = seed.wallet.days;
  const beforeIdeaDays = seed.ideas.find((idea) => idea.ideaId === ideaId)?.days ?? 0;

  const fail = donateDays(seed, ideaId, beforeWallet + 5);
  assert.equal(fail.ok, false);
  assert.equal(fail.store.wallet.days, beforeWallet);

  const ok = donateDays(seed, ideaId, 2);
  assert.equal(ok.ok, true);
  assert.equal(ok.store.wallet.days, beforeWallet - 2);
  assert.equal(
    ok.store.ideas.find((idea) => idea.ideaId === ideaId)?.days,
    beforeIdeaDays + 2,
  );

  const zero = donateDays(seed, ideaId, 0);
  assert.equal(zero.ok, false);
}

{
  const seed = createSeedStore();
  const topped = releaseWalletDays(seed, 3);
  assert.equal(topped.wallet.days, seed.wallet.days + 3);
  assert.ok(totalIdeaDays(seed.ideas) >= 0);
  const md = exportStoreMarkdown(seed);
  assert.match(md, /# Greenfield idea board export/);
  assert.match(md, /## Fresh/);
}

console.log("✅ greenfield-ui-lab domain tests passed.");
