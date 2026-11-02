# RemainsRadar Predictive Body and Grave Search

Prepared for Audrey Evans · Research checked September 29, 2026

## Recommendation

Position Audrey's existing code under the provisional public brand **RemainsRadar — AI Body and Grave Search**. The concept continuously re-examines historical and current data with improved methods, reconstructs past landscapes, and ranks areas for qualified search teams to review. Use augmented reality to display the resulting search zones, source layers, and positional uncertainty.

Suggested social identity: **@RemainsRadar**. Suggested tagline: **Every trace deserves another look.** A more literal alternative is **@BodyDetectorAI**. Availability has not been confirmed inside the platforms.

The most promising initial niche is **AI extraction of overlooked historical geospatial information for predictive missing-person searches**. Reprocess archived maps, reports, imagery and LiDAR to produce newly structured, measurable features, then reconstruct landscapes that have changed since a disappearance: abandoned logging access, altered trails, former mine infrastructure, changed waterways, and later development. This is a market hypothesis, not a demonstrated vacant market or a claim of scientific novelty.

Audrey reports having existing code, re-examining outputs with new methods, and DNA- and dog-sniffer-type routines. The code and its test results were not supplied for this review. The modules below are reference points for positioning and evaluation, not an assumption that the engine needs to be rebuilt. During this conversation, no model was run, case processed, grave identified, coordinates generated, software deployed, or account registered.

The public appeal should center on persistence, discovery and the possibility of finding someone who has been missing for years. Present the changes between analysis versions: what became visible, what was corrected and what deserves the next check. A continuing series can follow the same evidence as methods improve.

For the existing DNA and sniffer routines, document each module's actual inputs and outputs before writing product claims. A matching routine can process genetic data when such data is supplied; tracking-inspired code can prioritize traces. Neither description by itself establishes physical sensing of DNA or odor. The public labels should make the actual function understandable.

## How AI creates new usable data from old material

AI can make archival information practical to extract at scale. This is a substantive part of the concept: a scanned map can become a searchable, dated road network; text labels can become linked place records; separate images can become measured change features. These derived datasets can contain useful information that no prior database recorded, even when the original source is decades old.

Research supports this direction. mapKurator extracts historical map text and links it to geospatial knowledge bases. A later study improves searching for multiword place names. USGS also describes a machine-learning competition targeting automatic georeferencing and feature extraction from historical maps. [14,15,16]

Deep-learning road extraction is demonstrated in published research. One 2024 study reports over 94% completeness and over 92% correctness for its most prevalent road class on two Swiss map sheets. Those are results for a specific task and evaluation, not promised accuracy for other archives or missing-person predictions. [17]

The USGS competition also illustrates why measurement matters: automated georeferencing had a median root-mean-square error of 1.1 km, while extraction performance varied by feature type. Such positioning would need substantial correction before use for a small field-search target. High performance on one extraction task does not establish accuracy on another. [16]

| Old input | Extraction method to evaluate | New usable output | Accuracy check |
| --- | --- | --- | --- |
| Scanned logging or mine maps | Symbol segmentation, OCR and georeferencing | Dated routes, structures and place names | Manually annotated map samples and surveyed control points |
| Historical reports and records | OCR or handwriting recognition plus structured extraction | Dates, place references and linked source passages | Human transcription and field-level precision/recall |
| Archived aerial photographs | Image registration and change analysis | Measured appearance or disappearance of features | Independent image interpretation and registration error |
| Existing LiDAR | Terrain derivatives and trained feature detection | Candidate surface features absent from existing inventories | Expert labels, sufficient point density and site checks |
| Several independently acquired datasets | Temporal joins and evidence fusion | New relationships and ranked search hypotheses | Withheld sites and comparison with simpler baselines |

Keep four accuracy questions distinct: Was the feature extracted correctly? Was it placed correctly? Was its date interpreted correctly? Did using it improve search prediction? Track each answer rather than collapsing them into a single confidence number.

A strong technical differentiator would be **confidence attached to every extracted feature**, including its source region, extraction method, alignment error, temporal uncertainty and reviewer status. The predictive model can then account for the quality of the data it receives.

## What the research establishes

The ingredients already have significant prior art. A 2022 research paper proposes progressively narrowing searches through geographic profiling, LiDAR, and near-surface geophysics. It combines examples from cases and an experiment; it does not establish the accuracy of your proposed combined product. [1]

NecroSearch describes combining gridded observations from different disciplines to identify anomalies. Its work includes botany, hydrology, geophysics, and interpretation of animal scavenging. It is based in Colorado and accepts case requests from law enforcement. [2,3]

ICMP describes desktop spatial and temporal analysis, aerial-image interpretation, field assessment, and testing anomalies to confirm or refute human remains. This overlaps with the operational workflow envisioned here. [4]

A Texas State project using 30 donated human bodies studied surface and buried contexts. Its final report, received by OJP in December 2024, describes thermal and vegetation signals whose usefulness depends on conditions and decomposition stage. This supports further testing, not an all-terrain detector. [5]

**Inference:** the defensible opportunity is a focused product and communication layer: historical reconstruction, transparent predictive ranking, explicit alternatives, field feedback, and understandable visual storytelling. Neither sensor fusion nor adding AI or AR establishes uniqueness.

## Competitive position

| Existing approach | Evidence of overlap | Proposed distinction to test |
| --- | --- | --- |
| Specialist forensic search teams | NecroSearch already integrates several disciplines and gridded data. | Faster preparation of dated landscape evidence and a reusable, reviewable record. |
| Institutional missing-person investigations | ICMP already uses spatial analysis and imagery. | A narrow regional workflow and accessible education, developed with practitioners. |
| Research sensor systems | Thermal, vegetation, LiDAR and GPR studies already exist. | Tracking whether an added layer actually improves search ranking. |
| AR geospatial visualization | Trimble documents visualization of GIS and other spatial models. [6] | Display approved search zones, uncertainty and evidence history in the field. |

Do not position this as “the first AI grave detector.” Position it as **a testable way to choose the next search area using the landscape's history**.

The audience and prospective customer are different. Viewers may be interested in true crime, maps and forensic science. Search organizations and research institutions would need demonstrated operational benefit before adopting a tool. A large audience would not establish predictive validity.

## What each layer can contribute

| Layer | Defensible role | Interpretation limit |
| --- | --- | --- |
| Historical maps and aerial imagery | Reconstruct roads, structures and access at relevant dates. | A map's publication date may differ from its survey date; coverage and alignment can be incomplete. |
| LiDAR | Characterize surface form, small depressions and former routes where resolution permits. | It is not a through-soil bone image; terrain anomalies have many causes. [1] |
| Thermal imagery | Measure temperature contrasts under documented conditions. | Sun, moisture, soil and decomposition stage affect signals; old dry bones do not provide persistent decomposition heat. [5] |
| Vegetation and spectral imagery | Flag plant or reflectance changes for investigation. | Research is promising, but vegetation response alone cannot establish human remains. [7] |
| Soil chemistry | Add sampled, georeferenced measurements where a field program provides them. | A vegetation index is not a direct nitrate-plume measurement. Chemistry and hydrology require separate observations. |
| GPR | Characterize subsurface contrasts and disturbed ground. | Site conditions affect performance; reflections alone cannot identify a human body. A published drone system was a prototype. [8] |
| Surface imagery | Suggest visible objects for expert review where image resolution and ground visibility permit. | Rocks, wood and animal bones can be mistaken for human remains; identity requires expert assessment. [2] |
| AR | Place existing map features and review zones into the operator's view. | It is a presentation and navigation interface, not an additional detector. [6] |

Treat nitrate-related decomposition signals as a research component. The plant-research literature explicitly discusses the prospect of detecting decomposition through vegetation; it does not justify labeling ordinary satellite greenery as a human-specific chemical plume. [7,9]

## Two separate predictive problems

**Burial search:** assess potential disturbed ground within a case-relevant landscape. Consider historical land use, terrain change, subsurface observations and alternative causes such as drainage, utilities, cultivation or mine workings.

**Surface-remains search:** assess visibility, search coverage and possible redistribution. Drainage, erosion and scavenging may change where evidence is encountered. Build separate models and validation sets. A surface find does not by itself establish an original deposition point. NecroSearch specifically describes animal activity and water as factors that can alter or transport evidence. [2]

Avoid treating “missing” as synonymous with “deceased.” This proposed specialist module applies only where a remains search is justified within an authorized investigation.

## Proposed predictive workflow

1. **Define the question.** Record the case interval, area of interest, known facts, source restrictions and intended search type.
2. **Reconstruct the relevant landscape.** Align dated maps and imagery. Record uncertainty about when a road existed or a feature changed.
3. **Extract observations.** Measure terrain and image features with deterministic, versioned processing.
4. **Test ordinary explanations.** Check construction, forestry, mining, drainage, seasonal vegetation and sensor artifacts.
5. **Rank areas.** Produce review polygons and evidence summaries. Keep data quality, spatial uncertainty and search priority separate.
6. **Choose the next observation.** Ask whether another archive, a site visit, a different sensor, or expert review would most reduce uncertainty.
7. **Record field outcomes.** Preserve confirmed observations, inconclusive searches and negative results with method and coverage.
8. **Recompute and explain changes.** Show what changed, which evidence caused it, and whether an earlier hypothesis was weakened.

The initial output should be a **relative review priority**, not a percentage probability that a grave exists. If suitable labeled data become available, calibrated probabilities can be investigated and validated on independent sites.

A centroid can help navigation, but the product should retain the full polygon and positional uncertainty. More coordinate digits do not create more measurement accuracy.

## Reference modules for reviewing the existing code

| Proposed module | Responsibility | Output |
| --- | --- | --- |
| Archive | Inventory maps, imagery and records with dates, rights and origin. | Source register |
| Extract | Recover text, symbols, routes and other features from historical material. | Structured derived data with source links and measured extraction quality |
| Align | Check coordinate reference systems, georeferencing and acquisition dates. | Comparable layers plus uncertainty |
| History | Represent dated routes, land use and landscape changes. | Historical feature set |
| Observe | Extract measurements from each available sensor separately. | Versioned observations |
| Alternatives | Record mundane explanations and contradictory evidence. | Hypothesis comparison |
| Rank | Combine features according to a documented, validated method. | Ranked review areas |
| Next observation | Suggest a measurement that could resolve a key uncertainty. | Reviewable acquisition recommendation |
| Field | Display coverage, approved areas and source layers in maps or AR. | Field annotations |
| Audit | Preserve inputs, configuration, outputs and reviewer decisions. | Reproducible evidence packet |

Suggested database entities: **Case, Source, Acquisition, Layer, Observation, Hypothesis, SearchArea, SearchVisit, ModelVersion, Run, Review, Publication**.

Use explicit join tables for many-to-many relationships: one source may support several observations; one hypothesis may use several observations; a search area can have multiple visits. Distinguish acquisition date, historical validity interval, publication date and import date.

Minimum observation fields include source ID, geometry, coordinate system, method, measured value, unit, acquisition time, quality flags and positional uncertainty. Missing is not zero. “Not surveyed” is not “surveyed and absent.”

## Recursive reasoning and self-healing

Translate “prosecution code” into an **evidence challenge module**. For every proposed explanation, require supporting observations, contrary observations, credible alternatives, and a test that could change the conclusion. The model must be able to return “insufficient evidence.”

Use bounded iterations with a stopping rule. Re-reading the same source or obtaining agreement from several language models does not add independent evidence. Several vegetation indices derived from one image must not be counted as unrelated confirmations.

Use language models for retrieval assistance, extraction and summaries linked to evidence. Use deterministic geospatial calculations for distances, alignments and measured features. Human specialists decide how observations should affect a real investigation.

“Self-healing” can mean retrying interrupted downloads, resuming checkpoints, validating schemas, quarantining corrupt inputs and proposing repairs. Preserve original observations. Changes to scoring rules, model versions or data interpretation require review and a new recorded run.

For a future GitHub repository, separate public methods and synthetic demonstrations from restricted case data. CI can validate schemas, coordinate systems, reproducibility and accidental publication of sensitive geometry. Preserve input hashes, software versions, configuration, seeds where relevant and reviewer decisions. Hashes establish byte integrity; they do not establish whether an observation was true or acquired correctly.

No existing GitHub repository was supplied or modified for this brief.

## Data sources for a first demonstrator

| Source | Potential use | Check before analysis |
| --- | --- | --- |
| USGS historical topographic maps and topoView | Historical routes, structures and place names. [10] | Survey date, scale and georeferencing error |
| USGS 3DEP and LidarExplorer | Terrain models and source point clouds. [11] | Acquisition date, point density, vegetation and classification quality |
| USGS National Map imagery, transportation and hydrography | Landscape context and available aerial imagery. [11] | Resolution, temporal relevance and coverage |
| Colorado abandoned mine information services | Mine-related landscape context. [12] | Completeness, original source and positional uncertainty |
| Partner-supplied field surveys | GPR, chemistry and verified observations. | Calibration, coverage, acquisition protocol and access conditions |

Public GIS data can support a demonstrator. Do not assume that public thermal, hyperspectral, nitrate or GPR coverage exists for a selected place. Inspect actual availability before designing a model around it.

A practical local start is a Colorado data-integration demonstration using a non-sensitive landscape. Predictive validation should use a research partner's approved test data rather than public speculation about a particular property.

## Brand shortlist and name checks

| Name | Suggested handle | Strength | Tradeoff |
| --- | --- | --- | --- |
| **RemainsRadar** | **@RemainsRadar** | Memorable alliteration; immediately suggests locating remains. | Explain that the project combines data analysis and any available sensor evidence. |
| **BodyDetectorAI** | **@BodyDetectorAI** | Direct connection to the subject; clear AI emphasis. | Generic and a stronger performance implication; describe it as a predictive-search research project until validated. |
| ClueStrata | @ClueStrata | Distinctive combination of clues and layers; suited to technical material. | Less immediate emotional connection than the two leading options. |

Checks on September 29, 2026 included exact-name web searches with two search engines and spaced variants where relevant. Searches restricted to major social domains were also attempted for selected names, including BodyDetectorAI and ClueStrata. No exact indexed brand/account match was found for RemainsRadar, BodyDetectorAI or ClueStrata in the returned results. This is a search observation, not proof of availability. Some searches returned unrelated or loosely matched pages; the spaced phrase “remains radar” also appears in descriptions of historic radar installations and music listings.

**Availability remains unverified.** TikTok blocked automated access, and social indexing does not cover every account. Neither account creation, registrar availability nor trademark clearance was completed. The phrase “Clue Strata” also produces unrelated crossword results. Keep the brand as one word.

ColdContour was rejected because an existing commercial use appeared in results. [13] GraveSignal is an existing app name, and GraveSniffer is an existing gaming username. [18,19] BodyTrace also has existing commercial uses. Cadaver Compass appears as a feature name in a Minecraft project. These are reasons to prefer the cleaner provisional shortlist rather than claim the alternatives are unused.

Before committing to a name, check the handle in each platform's actual username field, check the desired domain with a registrar, and complete an appropriate name-conflict review. Do not advertise a handle as secured until it is reserved.

## Editorial concept

Display name: **RemainsRadar | AI Body and Grave Search**

Tagline: **Every trace deserves another look.**

Short bio draft: **True crime meets predictive AI. Re-examining old maps, terrain and overlooked traces in the search for missing people and hidden graves.**

Campaign line: **Old evidence. New methods. Another chance to find the missing.**

Optional episode-series title: **The Body Detector Files**. This title is a creative proposal; its availability was not checked.

The repeatable editorial question is: **What did this place look like then, what changed, and what should be checked next?**

Proposed recurring formats:

- **The Road That Disappeared:** a historical route changes interpretation of present-day access.
- **Anomaly or Ordinary?:** compare a striking feature with plausible natural and industrial explanations.
- **Where Next?:** explain a research model's ranking and the evidence that would overturn it.
- **The Negative Result:** show why an unsuccessful or inconclusive survey still improves the next decision.
- **Layers in the Field:** illustrate AR overlays using synthetic or approved, redacted examples.

For public material, label simulations and reconstructions clearly. Use approved or synthetic examples and withhold sensitive search locations. Make people's lives and the quality of the work central to the storytelling.

Possible business paths, subject to validation: educational media, GIS training, and later partner-facing analysis or software. Start by testing demand with practitioners. Do not build the business around promises of recovery or selling unverified location leads to families.

## Glassmorphic realism direction

Use a realistic terrain backdrop with restrained frosted panels, navy and slate surfaces, cyan historical layers, and amber review zones. Keep interface text large and high contrast. Use solid text backplates so transparency does not impair legibility.

A contour-and-radar mark can suggest tracking and search. AR concepts should show areas for review, coverage and uncertainty rather than a glowing skeleton beneath the ground.

Any generated visual is a **concept using simulated data**, not a scan, working interface or evidentiary image.

## First implementation and validation

**Phase 1 — clarify demand and prove integration.** Interview approximately five potential practitioners or research collaborators. Build one synthetic or non-sensitive demonstration combining a historical map, terrain and modern imagery. Ask which decision the tool improves and what evidence would make its output usable.

**Phase 2 — test predictive contribution.** With an appropriate research partner, preregister the evaluation, assemble ground-truthed positives and realistic non-grave controls, and freeze the data available to the model before revealing outcomes. Keep sites and time periods separate between development and testing.

**Phase 3 — assess field usefulness.** Compare a baseline map review, a history-enriched review and the proposed combined ranking at the same search-area or time budget. Add AR only when there is a clear field task and validated positioning.

Validation criteria:

- Recall at a fixed searched-area budget and false leads per unit area.
- Precision and precision-recall performance in a realistic low-prevalence setting.
- Time spent preparing and reviewing a search plan.
- Improvement from each extra layer through ablation tests.
- Robustness across seasons, soil types and acquisition conditions.
- Calibration and uncertainty coverage if probabilities are eventually offered.
- Reviewer agreement, reproducibility and documented handling of negative or inconclusive surveys.

Do not infer success from a visually convincing heat map, a single recovered case or a high overall “accuracy” dominated by empty land. Test on withheld sites and report failures as well as successes.

## Decision and remaining unknowns

Proceed with **RemainsRadar** as the strongest provisional public brand, **BodyDetectorAI** as the literal alternative, and **repeated AI reanalysis of historical evidence for predictive body and grave search** as the niche to validate. Review the existing code against the evaluation plan; preserve working routines and focus changes on demonstrated gaps.

Confidence is high that the proposed data-management and visualization workflow is technically assemblable. Confidence is moderate that this focus offers useful differentiation. Predictive performance, willingness to adopt or pay, sufficient training data, and live name availability remain unproven.

The critical dependencies are expert collaboration, ground truth, suitable spatial resolution, temporal coverage and disciplined evaluation. The next deliverable should be a bounded demonstration and evaluation protocol.

## Sources

1. Berezowski et al. (2022), “A multidisciplinary approach to locating clandestine gravesites in cold cases.” https://pmc.ncbi.nlm.nih.gov/articles/PMC9372742/
2. NecroSearch International, Methods. https://necrosearch.org/methods
3. NecroSearch International, organization and case-request scope. https://necrosearch.org/
4. ICMP, Forensic Archaeology and Anthropology. https://icmp.int/what-we-do/science-and-technology/forensic-archaeology-and-anthropology/
5. Wescott, final research report, “Detecting and Processing Clandestine Human Remains with Unmanned Aerial Systems and Multispectral Remote Sensing,” received December 2024. https://www.ojp.gov/pdffiles1/nij/grants/309829.pdf
6. Trimble SiteVision, Getting started. https://help.fieldsystems.trimble.com/sitevision-core/en/getting-started.htm
7. University of Tennessee Forensic Anthropology Center, research overview, January 2021. https://anthropology.utk.edu/fac-news/
8. Lijcklama à Nijeholt et al. (2023), “Utilizing Drone-Based Ground-Penetrating Radar for Crime Scene Investigations.” https://pmc.ncbi.nlm.nih.gov/articles/PMC10459563/
9. Brabazon et al. (2020), “Plants to Remotely Detect Human Decomposition?” https://pubmed.ncbi.nlm.nih.gov/32893124/
10. USGS, National Map download guidance. https://www.usgs.gov/faqs/how-do-i-download-national-map-data-products
11. USGS, GIS Data Download. https://www.usgs.gov/the-national-map-data-delivery/gis-data-download
12. Colorado Abandoned Mine Lands information service. https://cgsarcimage.mines.edu/arcgis/rest/services/AML/CGS_USFS_AML/MapServer
13. Existing Coldcontour commercial listing returned during name checks. https://www.bol.com/nl/nl/p/coldcontour-skin-ice-roller-gezicht-facial-icing-roze-aftersun-cadeautip-anti-rimpel-ice-globes-ijs-gezicht-gezichtsmassage-roller-huidverjongingsapparaat-anti-aging-cadeau/9300000105040949/
14. Li et al., An Automatic Approach for Generating Rich, Linked Geo-Metadata from Historical Map Images. https://arxiv.org/abs/2112.01671
15. Olson et al. (2024), Automatic Search of Multiword Place Names on Historical Maps. https://arxiv.org/abs/2410.15586
16. USGS, Extracting data from maps: Lessons learned from the artificial intelligence for critical mineral assessment competition. https://www.usgs.gov/publications/extracting-data-maps-lessons-learned-artificial-intelligence-critical-mineral
17. Probabilistic road classification in historical maps using synthetic data and deep learning (2024). https://arxiv.org/abs/2410.02250
18. Grave Signal, existing app listing. https://play.google.com/store/apps/details?id=com.bigbeard.noisescanner
19. GraveSniffer, existing username. https://www.planetminecraft.com/member/gravesniffer/

Source descriptions above are paraphrases. Proposed architecture, brand language, niche assessment and evaluation design are recommendations rather than results reported by those sources.
