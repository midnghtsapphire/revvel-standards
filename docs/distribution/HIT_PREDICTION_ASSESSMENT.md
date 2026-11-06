# Hit prediction — assessment and decision

**Decision: not building it. Permanently out of scope.**

This is a negative decision record. It exists so the idea gets re-argued against
evidence rather than re-proposed every time someone finds one of these papers.

The research is genuinely interesting and one of its findings changed how we
plan to validate music. The prediction claim is what fails.

---

## What we assessed

Merritt, Gaffuri & Zak (2023), *Accurately predicting hit songs using
neurophysiology and machine learning*, Front. Artif. Intell. 6:1154663
(CC BY). Headline claim: 97% classification accuracy for hits vs. flops.

Also reviewed: Arora & Rani (2024), *Soundtrack Success*, SN Comput. Sci. 5:278,
which applies regression and ensemble models to Spotify audio features.

## What is solid, and what we are adopting

**Self-report does not predict performance.** For songs participants were
unfamiliar with, self-reported liking was statistically identical between hits
and flops — M_hit = 4.49, M_flop = 4.48, *p* = 0.963, *d* = −0.02. "Would
recommend" likewise (*p* = 0.829). No self-report measure correlated with
streams.

**Liking is contaminated by familiarity.** Liking correlated with streams at
*r* = 0.54 for *familiar* songs and vanished for unfamiliar ones (*p* = 0.387).
The paper is right to call this endogeneity: "do you like this" substantially
measures "have you heard this."

This is a clean, well-executed negative result and we treat it as the paper's
real contribution. **Operational consequence: we do not validate releases by
asking people whether they like them.** Playing tracks for friends, running
polls, and soliciting reactions measure familiarity, not prospects.

**What we use instead:** behavioral signals we already have free access to —
skip rate, save rate, and completion rate in Spotify for Artists. Behavioral,
per-track, on our own catalog, and available without a research budget. This is
the accessible form of the paper's own argument that behavior beats stated
preference.

## Why the 97% does not survive

**The test set is synthetic and derived from the training data.** 10,000 rows
were generated with `synthpop` from the same 24 songs; one half trained the
model, the other half tested it. Both halves are draws from a single joint
distribution estimated on those 24 songs, so this measures how faithfully
synthpop reproduced itself, not out-of-sample prediction. The paper states:
"All participant data were used to train the models and to generate
predictions."

**The overfitting check cannot detect the problem it checks for.** The 10-fold
cross-validation runs on the synthetic data. Cross-validating inside a
distribution cannot reveal that the distribution was fit to the test songs.

**The authors concede it.** From Limitations: "we did not have access to an
outside sample of songs to validate the model further. This means our model
might have overfitted the data."

**The predictor does not track the outcome we would care about.** Immersion was
not correlated with streams (*r* = 0.03, *p* = 0.870). It separates a binary
hit/flop label but carries no information about actual performance.

**n = 24 songs.** Songs are the unit of analysis; 33 participants does not
change that.

**Declared conflict of interest is inconsistent with the masthead.** An author
is affiliated with Immersion Neuroscience, Henderson NV — the vendor of the
commercial platform used as the measurement instrument — while the paper
declares "no commercial or financial relationships that could be construed as a
potential conflict of interest." Noted as visible on the face of the document.

**The honest figure in the paper is 69%**, from logistic regression on 24 songs
with no holdout.

## Why the audio-feature literature also fails

Spotify deprecated the `audio_features` and `audio_analysis` endpoints on
2024-11-27 — the 13-field vector (danceability, energy, valence, acousticness,
tempo, key, loudness, speechiness, liveness, instrumentalness) that this entire
body of work depends on. No replacement as of 2026, and new applications cannot
obtain access. The methodology is not reproducible by us regardless of merit.

The broader field's standing position remains Pachet & Roy, *Hit Song Science Is
Not Yet a Science*.

## Why this matters commercially, not just scientifically

Our distribution position is "the operator that handles AI music correctly" —
disclosed, provenance-tracked, quality-gated. Shipping a popularity score built
on a leaked model and a dead API would directly undercut that. The cost of
being wrong here is not a bad feature; it is the credibility the rest of the
business depends on.

## What we keep instead

| Kept | Source | Where it applies |
| --- | --- | --- |
| Behavioral validation over stated preference | Merritt et al. (2023), negative result | Release review; Spotify for Artists metrics |
| Repetition → processing fluency → market success | Nunes, Ordanini & Valsesia (2015), *J. Consum. Psychol.* | Generation prompt standard — repeat the hook |
| Familiarity drives music choice | Ward, Goodman & Irwin (2014), *Mark. Lett.* | Same; explains the mechanism behind the above |
| Local feature extraction (Essentia) for **QA, not prediction** | — | Verifying a repaint did not shift key, tempo, or loudness |

The first three describe one mechanism from three directions: repetition
manufactures familiarity, and familiarity is largely what listeners report as
liking. That is actionable in songwriting and prompting today, and it is the
only part of this literature that is not downstream of a dead API or a leaky
model.

## Reversal conditions

Revisit only if **all** of the following hold:

1. A model is validated on a **held-out set of real songs** never used in
   training or in generating any synthetic data.
2. The predictor correlates with a **continuous outcome** (streams, saves), not
   only a binary hit/flop label.
3. A feature source exists that we can lawfully access at scale.
4. The result replicates independently of the instrument vendor.

Absent all four, this stays closed.
