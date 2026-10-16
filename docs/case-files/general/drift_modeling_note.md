# Method Note: Drift Envelope Estimation (and how NOT to do it)

## The trap

Naive math: `velocity = discharge / cross-section`, then `distance = velocity x time`.
Run on the Okanogan/Similkameen case (~5,200 cfs, ~25 hr) this produces
"search 45-250 miles downstream." **That output is wrong and dangerous.** An app that
emits it would send searchers chasing a body that is, in reality, almost certainly within
a short distance of the entry point.

## Why the naive number is wrong

1. **Discharge != local velocity at the incident point.** The 5,200 cfs is the Similkameen
   upstream; below the confluence the channel widens and slows. Using a small cross-section
   inflates velocity.
2. **Bodies are not floats.** A drowned body is usually negatively buoyant initially and
   travels along/near the bed, where drag is high. It moves at a *fraction* (~30-70%, often
   far less) of surface velocity — and only intermittently.
3. **Snagging dominates.** In flood-stage, debris-choked water the most likely outcome is
   EARLY ENTRAPMENT on the first strainer, undercut bank, bridge piling, or bend — not a
   clean multi-mile glide.
4. **The anchor argues local.** A firearm recovered at the last-seen point implies a
   reasonably contained entry, not a long pre-submersion drift.

## The honest model: probability-weighted envelope, not a distance

Output a **decaying probability curve from the Last Known Point (LKP)**, with discrete
spikes at snag features:

```
P(location)
  ^
  |#
  |##
  |###            spike        spike
  |####          (bend)      (logjam)
  |#####          ||           ||
  |######_____    ||___________||______________
  +-------------------------------------------------> downstream distance from LKP
   0      few hundred yds        ~1-3 mi            tail
```

- **Highest probability: first few hundred yards to ~1 mile below LKP.** Start here.
- **Discrete high-probability spikes** at each mapped snag feature within the reach
  (identify from satellite/aerial imagery + NHD).
- **Long tail** downstream that you only extend if the near field is cleared.
- **Refloat overlay:** warm water (this case ~18-22 C / 64-72 F) -> shorter time to refloat
  -> add surface-search emphasis after the bracket window; cold water -> stays subsurface
  longer -> sonar/dive emphasis.

## Procedure

1. Fix LKP from the highest-scored physical anchor (A-tier evidence).
2. Map every snag feature downstream within a conservative near-field (start ~2-3 mi).
3. Rank cells: `P = near_field_decay(distance) x snag_factor(feature) x accessibility`.
4. Search highest-P cells first; extend downstream only after clearing.
5. Overlay refloat window (from water temp) to choose surface vs. subsurface method.
6. Re-rank as cells are cleared or new A/B-tier evidence arrives.

## What to store in the case record

- `drift_envelope`: describe as a probability curve + named snag spikes, NEVER a single mileage.
- Always note the velocity-overestimation caveat so the next user doesn't repeat the trap.
