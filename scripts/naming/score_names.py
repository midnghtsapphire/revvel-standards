#!/usr/bin/env python3
"""Name scoring for a multi-project roster.

Two generators scored candidates for this roster and both ranked a fatal option
first -- one put WILT at 88/100 (a 323K-listener LA alt-rock band on KROQ), the
other put GLITCH at 96 with "Unique: 98" (Glitch is a music genre; The Glitch
Mob has 899K listeners). Both failed the same way: they *simulated* availability
instead of checking it, then formatted the guess to look like a measurement.

So this module keeps the two kinds of input strictly apart:

    MEASURED  -- namesake listener counts, lane, genre-word collision, structure.
                 Gathered by actually looking. Sourced in NOTES.
    JUDGED    -- `fit`, one number, openly an opinion, capped at 30% of weight.

Any column you cannot cite a source for belongs in JUDGED. If that makes the
ranking feel less authoritative, good -- that is the honest amount of authority
it has.

    python scripts/naming/score_names.py            # ranked table
    python scripts/naming/score_names.py --json     # machine-readable
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import math

# Bands the composite falls into, and what a name in each band is good for.
# A roster needs roles, not a single winner.
ROLES = (
    (75, "lead artist", "carries a catalog; survives search on its own"),
    (55, "side project", "viable with deliberate promotion behind it"),
    (35, "album / track title", "evocative but not findable -- never needs to be"),
    (0, "do not use", "a namesake or a genre owns this term"),
)


@dataclasses.dataclass(frozen=True)
class Candidate:
    name: str
    # --- MEASURED ---
    # Monthly listeners of the biggest exact-name artist.
    # None means NOT YET CHECKED -- which is not the same as clean, and is
    # exactly the conflation that made both generators rank a fatal name #1.
    namesake_listeners: int | None
    lane_conflict: bool              # is that namesake in roots / americana / folk?
    is_genre_word: bool              # is the name itself a genre tag?
    homophone: bool                  # collides with a common word when heard aloud
    # --- JUDGED ---
    fit: int                         # 0-100, suitability for raw roots-rock. Opinion.
    note: str = ""

    @property
    def tokens(self) -> int:
        return len(self.name.split())

    # ---------------- measured half ----------------

    @property
    def discoverability(self) -> float:
        """How findable the name is, from the namesake's size. 0-100.

        Log-scaled: the gap between 0 and 80 listeners barely matters, the gap
        between 80 and 800,000 decides everything.
        """
        if self.namesake_listeners is None:
            # Unverified. Score it as merely plausible, never as a winner, so an
            # unchecked name cannot outrank a checked one.
            return 50.0 + (10.0 if self.tokens >= 2 else 0.0)

        base = 100.0 - 12.0 * math.log10(1 + max(0, self.namesake_listeners))

        # Multiplicative, not additive. A large namesake *in your own genre* is
        # not a deduction, it is disqualifying -- pinning a Spotify URI fixes
        # metadata routing but cannot make you visible next to Rend Collective.
        if self.lane_conflict and (self.namesake_listeners or 0) > 10_000:
            base *= 0.25

        # Naming yourself after a genre tag means competing with a category.
        if self.is_genre_word:
            base *= 0.20

        # Heard before it is seen, a homophone sends people to the wrong search.
        if self.homophone:
            base *= 0.75

        # Two tokens are structurally near-unique. This is why every bare
        # mononym tested here died and every compound survived.
        if self.tokens >= 2:
            base += 10.0

        return max(0.0, min(100.0, base))

    # ---------------- composite ----------------

    @property
    def composite(self) -> float:
        """70% measured, 30% judged. Weighting is stated so it can be argued with."""
        return round(0.70 * self.discoverability + 0.30 * self.fit, 1)

    @property
    def role(self) -> str:
        if self.namesake_listeners is None:
            return "UNVERIFIED - check"
        for floor, role, _ in ROLES:
            if self.composite >= floor:
                return role
        return "do not use"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "composite": self.composite,
            "role": self.role,
            "measured": {
                "discoverability": round(self.discoverability, 1),
                "namesake_listeners": self.namesake_listeners,
                "lane_conflict": self.lane_conflict,
                "is_genre_word": self.is_genre_word,
                "homophone": self.homophone,
                "tokens": self.tokens,
            },
            "judged": {"fit": self.fit},
            "note": self.note,
        }


# Listener counts checked 2026-08. Re-check before committing to any name:
# a 20-listener namesake today can be a 200K namesake next year.
CANDIDATES = [
    # --- compounds: no namesake found in music ---
    Candidate("Audrey Rust",   0, False, False, False, 92, "decay/weather; matches the original brief"),
    Candidate("Audrey Flint",  0, False, False, False, 90, "spark, frontier; Flint MI is a mild association"),
    Candidate("Audrey Briar",  0, False, False, False, 80, "thorns; leans folk rather than rock"),
    Candidate("Audrey Wren",   0, False, False, False, 78, "earthy but gentle; may undersell a loud record"),
    Candidate("Audrey Grist",  0, False, False, False, 70, "hold back -- better as the label name"),
    Candidate("Revvel Hail",   0, False, False, False, 82, "keeps the Hailey/Hail thread, searchable"),
    Candidate("Audrey Vice",   0, False, False, False, 45, "vice squad / Miami Vice; needs explaining"),
    Candidate("Audrey Noir",   0, False, False, False, 35, "signals gothic pop, not roots-rock"),
    Candidate("Audrey Vesper", 0, False, False, False, 30, "signals dark pop; wrong genre cue"),

    # --- mononyms that survived checking ---
    Candidate("Husk",      0, False, False, False, 82, "namesake profile dormant at 0 listeners"),
    Candidate("Knell",     0, False, False, True,  88, "best meaning; silent K sends people to 'Nell'"),
    Candidate("Mire",     20, False, False, False, 85, "stuck, sinking; clean spelling"),
    Candidate("Sleet",    80, False, False, False, 90, "keeps the weather lineage from Hail"),

    # --- mononyms that failed ---
    Candidate("Siren",      1_700, False, False, False, 55, "survivable but generic"),
    Candidate("Scree",        274, True,  False, False, 65, "namesake is Brooklyn jazz/folk -- adjacent lane"),
    Candidate("Grist",      1_200, True,  False, False, 70, "Hilary Grist is folk; surname noise floods search"),
    Candidate("Gloam",     15_300, False, False, False, 72, "Perth shoegaze band too large to displace"),
    Candidate("Rill",      43_700, True,  False, False, 70, "Markus Rill is Americana -- direct lane hit"),
    Candidate("Rime",       5_000, False, False, True,  85, "game + VTuber, different lanes; 'rhyme' homophone"),
    Candidate("Rivel",      3_000, True,  False, False, 60, "three active music presences; ambiguous to say"),
    Candidate("Rifel",          0, False, False, True,  55, "clean search but reads as misspelled 'rifle'"),
    Candidate("Rift",     500_000, False, False, False, 80, "Oculus + Riot; unwinnable even out of lane"),
    Candidate("Onyx",     743_000, False, False, False, 50, "hip-hop group; heavily occupied"),
    Candidate("Wilt",     323_300, True,  False, False, 88, "LA alt-rock, KROQ/KCRW -- a generator ranked this #1"),
    Candidate("Glitch",   898_900, False, True,  False, 75, "also a genre tag; another generator ranked this #1"),
    Candidate("Rend",   1_400_000, True,  False, False, 90, "Rend Collective, folk rock -- same lane"),
    Candidate("Fray",  19_400_000, True,  False, False, 75, "The Fray"),
    Candidate("Rife",      10_000, False, False, False, 70, "'Rife machine' cancer-fraud search environment"),
    Candidate("Hail",     200_000, False, False, False, 85, "buried under weather, Hail Mary, Hail Caesar"),

    # --- second generator run: compounds on the real surname ---
    Candidate("Rogue Evans",   0, False, False, False, 84, "rebellious but grounded; reads as a person"),
    Candidate("Sable Evans",   0, False, False, False, 72, "dark elegance; leans glam over roots"),
    Candidate("Vesper Evans",  0, False, False, False, 45, "wrong genre cue for roots-rock"),
    Candidate("Ava Sterling",  0, False, False, False, 55, "polished; reads pop rather than raw"),
    Candidate("Adria Vance",   0, False, False, False, 50, "invented-sounding; loses the personal tie"),
    Candidate("Adeline Vex",   0, False, False, False, 40, "'Vex' signals punk/electro, not roots"),
    Candidate("Audra Vex",     0, False, False, False, 38, "same, and 'Audra' loses your actual name"),
    Candidate("Eva Lux",       0, False, False, False, 32, "luxe/glam cue; wrong record"),

    # --- second-run mononyms ---
    Candidate("Cipher",       46, False, False, False, 45, "clean search but signals electronic/hip-hop"),
    Candidate("Forge",       131, False, False, False, 70, "raw creation; fits rock, slightly generic"),
    Candidate("Sable",     2_200, False, False, False, 62, "occupied; also Sable Valley at 30.2K"),
    Candidate("Volt",       None, False, False, False, 65, "not checked -- verify before use"),
    Candidate("Apex",       None, False, False, False, 40, "not checked; reads sports/gaming"),
    Candidate("Vesper",     None, False, False, False, 45, "not checked; Bond association, wrong genre"),
    Candidate("Rogue",      None, False, False, False, 60, "not checked; likely heavily occupied"),
]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    ap.add_argument("--min", type=float, default=0.0, help="only show at or above this composite")
    args = ap.parse_args()

    ranked = sorted(CANDIDATES, key=lambda c: c.composite, reverse=True)
    ranked = [c for c in ranked if c.composite >= args.min]

    if args.json:
        print(json.dumps([c.to_dict() for c in ranked], indent=2))
        return 0

    print(f"{'NAME':<16}{'SCORE':>6}  {'DISC':>5} {'NAMESAKE':>10} {'LANE':>5} "
          f"{'FIT*':>5}  {'ROLE':<20} NOTE")
    print("-" * 118)
    for c in ranked:
        namesake = "?" if c.namesake_listeners is None else f"{c.namesake_listeners:,}"
        lane = "HIT" if c.lane_conflict else "-"
        if c.is_genre_word:
            lane = "GENRE"
        print(
            f"{c.name:<16}{c.composite:>6.1f}  {c.discoverability:>5.0f} "
            f"{namesake:>10} {lane:>5} {c.fit:>5}  {c.role:<20} {c.note}"
        )

    print("\n* FIT is a judgement, not a measurement. Everything left of it was checked.")
    print("  Listener counts current as of 2026-08 -- re-check before registering.")
    print("\nRoles:")
    for floor, role, meaning in ROLES:
        print(f"  {floor:>3}+  {role:<20} {meaning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
