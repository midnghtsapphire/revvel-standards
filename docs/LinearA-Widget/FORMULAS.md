# Formula check

The source function is

```text
S = B + 0.35P + wJ·J + wM·M + wS·S + wA·A
shown = clamp(round(S), 1, 99)
```

Weights, copied and not refit:

| Version | B | P | J | M | S | A | Essay |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 50 | 0.35 | 0.05 | 0.25 | 0.05 | −0.15 | 87 |
| B | 30 | 0.15 | −0.45 | 0.15 | 0.60 | 0.20 | 64 |
| C | 35 | 0.05 | 0.55 | 0.40 | −0.20 | 0.05 | 78 |

Authored sliders: P 85, J 90, M 78, S 65, A 40.

| Version | Raw S | As written | Essay | Match |
| --- | ---: | ---: | ---: | --- |
| A | 101.00 | 99 | 87 | no |
| B | 60.95 | 61 | 64 | no |
| C | 108.95 | 99 | 78 | no |

A and C both sit on the ceiling, so the clamp reports a tie. The raw order is C, then A, then B. The essay order was A, then C, then B. The formula does not derive the printed solutions.

The second widget keeps the same weights and reports a posterior that can be compared:

```text
share = 100 · max(0, S) / Σ max(0, S)
```

At the authored sliders that is C 40.22%, A 37.28%, B 22.50%. Those shares sum to 100. They are not a translation.

Version B’s raw score goes negative when concealment is high and seismic dampening is low (raw −13.9 at P1 J100 M1 S1 A1). The source clamp hides that as 1%. The audit gives it a zero share.

## What the strings are

`A-TA-I-*301-WA-JA`, `JA-SA-SA-RA-ME`, and `A-DI-KI-TE-TE` are pieces of one libation formula on stone offering tables, usually with a variable name between the first and `JA-SA-SA-RA-ME`. Splitting them into a legal text and a separate earthquake prayer does not follow the inscriptions. Proposed meanings of `JA-SA-SA-RA-ME` disagree with each other. None is used here as a score.

The Linear A totalling word on administrative tablets is `KU-RO`, not `KA-RO`.

`TE-KI-TO-NE` is not Linear A. Linear B has `te-ko-to-ne`, Greek τέκτονες, “carpenters,” and the vowel is `-ko-`.

Masons’ marks (double axe, star, trident, cross, and the rest) are a separate signary. Hood and Bendall, *The Masons’ Marks of Minoan Knossos* (British School at Athens Supplementary Volume 49, 2020), catalogue them; the Bryn Mawr review of that book reports the authors’ conclusion as religious or magical, including signs that are not on display. A quarry-code reading is an alternative, not a result of this sum.

The Vat Room Deposit is real: Marina Panagiotaki, *Annual of the British School at Athens* 93 (1998) 167–184, with the deposit dated there to MM IB after a longer argument that began with Evans’s MM IA. The 30.36 cm “Minoan foot” is J. W. Graham’s 1960 proposal. A 1983 quantum analysis of his measurements found a stronger peak near 46.8 cm.

The sentence “the data proves…” does not follow from the arithmetic.
