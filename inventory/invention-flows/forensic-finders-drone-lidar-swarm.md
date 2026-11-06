# Forensic Finders: Drone and LiDAR Swarm Invention Flow

**Status:** exploratory; no physical aircraft test reported  
**Last reviewed:** 2026-10-21  
**Work request:** [#18172](https://github.com/midnghtsapphire/revvel-standards/issues/18172)  
**Evidence labels:** **Documented** = source says this; **Inference** = reasoned implication; **Hypothesis** = idea to test; **Physical test** = tested on aircraft in the real environment. No claim below is marked Physical test.

## 1. Invention summary

- **Name:** Forensic Finders (working name)
- **One-line concept:** **Hypothesis:** use one or more aerial robots with mapping sensors, potentially LiDAR, to help locate, map, or revisit areas of interest for a human-led forensic or investigative workflow.
- **Category:** hardware-adjacent software, sensing, mapping, and team coordination.
- **Why it matters:** Aerial mapping may help teams cover difficult or hazardous areas and create spatial records. Whether this is useful for the intended case is unvalidated.
- **Nature:** mixed software, workflow, and hardware integration.

**Boundary:** The precise target, user, site, and desired “finding” are not defined in the available notes. This assessment therefore evaluates a general mapping and search-assistance concept, not forensic evidence collection, identification, chain of custody, or admissibility.

## 2. Problem framing

- **Who has the problem?** Unknown. Candidate users could include field investigators, search teams, surveyors, or emergency-response organizations; these are leads to validate, not confirmed customers.
- **Pain and current workflow:** Not yet documented.
- **Current alternatives and failure modes:** Not yet researched for the target workflow.
- **Consequence of no solution:** Unknown. Do not assume that drone coverage improves outcomes without a measured baseline.

## 3. User / buyer

- **Primary user / buyer:** Unknown.
- **Possible buyers:** public agencies, commercial investigation or survey firms, or a service provider; none is validated.
- **Commercial shape:** Could be a field service, licensed workflow, or software integration. No pricing or willingness-to-pay evidence yet.

## 4. Novelty / differentiation scan

There is real adjacent work in multi-UAV state estimation and LiDAR-inertial mapping. A differentiator would need to be specific to the end-to-end workflow: for example, task allocation, evidence review, repeatable coverage, or preserving provenance. **Inference:** combining existing drone APIs with a LiDAR SLAM package is likely an integration project unless a distinct, measurable workflow advantage is found.

No novelty, patentability, freedom-to-operate, or prior-art conclusion is made here. Have qualified counsel review any patent question before public disclosure or filing decisions.

## 5. Prior-art-adjacent notes

- **Documented:** HKU-MARS publishes Swarm-LIO2, a research implementation described as decentralized LiDAR-inertial odometry for aerial swarms. Its existence is evidence that this subproblem has been studied; it does not establish a turnkey product or field-ready system for this concept.
- **Documented:** FAST-LIO2 is an open-source LiDAR-inertial odometry package. It is a possible component to evaluate, subject to sensor, compute, calibration, license, and integration checks.
- **Documented:** PX4 documents multi-vehicle simulation with ROS 2 and Gazebo. That supports simulation work, not physical fleet readiness.
- **Documented:** DJI Cloud API and FlightHub 2 OpenAPI, and Skydio Cloud API, expose vendor-specific cloud integration capabilities. Their public descriptions include device/fleet, mission, telemetry, or media workflows. **Unknown:** whether a given model, payload, account tier, jurisdiction, or API grants the specific control, LiDAR data, or multi-aircraft coordination this idea would require.
- **Documented:** PIX4Dengine Cloud REST API processes data in its cloud service and requires a license. Its cited API material is not evidence of LiDAR capture or swarm control.

Potential collision areas include existing fleet-management products, survey/mapping platforms, autonomous inspection workflows, search-and-rescue systems, and swarm localization research. A proper prior-art scan remains open.

## 6. Commercial viability (provisional)

The repository’s viability gate uses six 1–5 scores. These are conservative working estimates from the limited idea description, not market research.

| Criterion | Score | Reason |
|---|---:|---|
| Problem pain | 3 | A plausible field need, but the exact user and costly pain are not established. |
| Market value | 3 | Multiple possible sectors; no buyer, budget, or procurement evidence. |
| Differentiation | 2 | Adjacent platforms and research exist; unique workflow is not defined. |
| Build leverage | 4 | Existing APIs and FOSS create candidate building blocks, with significant integration and hardware constraints. |
| Monetization fit | 2 | No validated product, service, buyer, or pricing path. |
| Strategic fit | 3 | Fits exploratory robotics/software work, but no strategic advantage is established. |
| **Total** | **17 / 30** | **HOLD** under the repository gate. |

**Decision: HOLD.** Continue evidence gathering and user/problem definition. Do not start flight code or buy hardware until a specific mission, measurable outcome, and viable test environment are identified.

## 7. Protection and disclosure

- **Current recommendation:** keep the concept private while the target workflow and novelty are clarified.
- **Public disclosure risk:** uncertain. This document is in a private repository; a later public release or patent filing decision needs separate review.
- **Do not claim:** a proven invention, successful drone swarm, validated forensic capability, or real-world performance.
- **Do not publish sensitive operational details or any information that could compromise a live investigation.**

## 8. Prototype path

**First prototype:** research brief and data-flow mockup, followed by simulation/replay using recorded or synthetic data. No aircraft is required for this first gate.

Staged validation:
1. Define one bounded user problem, site type, sensor output, and success metric.
2. Compare existing workflows and interview potential users; document consent and privacy needs.
3. Verify compatible aircraft, payload, compute, SDK/API permissions, data export, and licensing from primary vendor documentation.
4. Build a non-flight integration mockup and test it against sample logs or datasets.
5. Test autonomy and coordination in simulation; record simulator, versions, assumptions, and failure cases.
6. If justified, run bench or stationary sensor tests, then controlled flights with qualified operators, appropriate permissions, and a written safety plan.
7. Compare outputs against ground truth and the existing workflow. Require repeatable results before considering operational use.

**Environment fit (initial inference):**

| Environment | Initial fit | Key unknowns / gates |
|---|---|---|
| Open outdoor site with clear permissions and GNSS | Most plausible first field evaluation | Airspace/site approval, weather, visual line of sight, comms, endurance, payload, privacy, ground truth |
| GNSS-degraded or cluttered outdoor site | Research candidate | Localization drift, map alignment, lighting/surface geometry, network loss, safe return behavior |
| Indoor, underground, or GPS-denied site | High uncertainty | Indoor flight permission and safety, confined-space hazards, dust, lighting, localization, collision avoidance, communications |
| Active incident, evidence scene, or occupied public area | Not an initial test environment | Scene control, privacy, evidence handling, human oversight, legal authority, aviation approval, chain of custody |

These are screening categories, not operational approval.

## 9. Commercialization path

**Most plausible paths to investigate:** integration service or a specialized mapping workflow; a later software product is possible only if repeated users need the same workflow and can use it with supported aircraft. Licensing and API access terms may constrain distribution. No product path is selected.

## 10. Go / no-go recommendation

- **Next step:** define the user, target “find,” operating scenario, and success metric, then complete a source-backed vendor/FOSS compatibility matrix.
- **Continue if:** a real user confirms the problem; the sensor and aircraft combination can produce the needed data; API and licensing terms permit the workflow; a controlled evaluation can be conducted legally and safely; and results beat an existing baseline.
- **Stop or re-scope if:** no user has a costly unmet need; existing tools already solve it; multi-aircraft operation adds no measurable benefit; data access is blocked; payload/endurance/compute constraints are incompatible; or the intended environment cannot be tested safely and with permission.
- **Evidence still missing:** target user and buyer, exact objective, sensor modality, supported aircraft, payload mass/power, API access and pricing, jurisdiction, privacy and evidence-handling requirements, acceptance criteria, and physical test data.

## 11. Source notes

Checked 2026-10-21. Sources support only the capabilities stated beside them; prices, account entitlements, model compatibility, and availability may vary.

1. [DJI Cloud API](https://developer.dji.com/cloud-api/) — DJI describes cloud integration using MQTT, HTTPS, and WebSocket and lists supported products. This is not proof of an arbitrary third-party LiDAR payload API.
2. [DJI FlightHub 2 Public Cloud OpenAPI](https://fh.dji.com/user-manual/en/custom-development/open-api/public-cloud-v2.html) — vendor documentation for cloud interoperability; confirm exact endpoints and entitlements for any proposed workflow.
3. [Skydio Developer Tools](https://www.skydio.com/developer-tools) and [Skydio Cloud API docs](https://apidocs.skydio.com/docs/exploring-the-skydio-cloud-api) — vendor describes mission, telemetry, media, and fleet integrations for listed products/services; access and model support must be confirmed.
4. [PIX4Dengine Cloud API](https://developer.pix4d.com/cloud-api/index.html) — authenticated cloud-processing REST API; documentation says a PIX4Dengine Cloud license is required.
5. [PX4 multi-vehicle simulation with ROS 2](https://docs.px4.io/main/en/ros2/multi_vehicle.html) and [Gazebo multi-vehicle simulation](https://docs.px4.io/main/en/sim_gazebo_gz/multi_vehicle_simulation.html) — supports a simulation research path, not a claim of real-world swarm validation.
6. [HKU-MARS Swarm-LIO2 repository](https://github.com/hku-mars/Swarm-LIO2) and [2024 paper](https://arxiv.org/abs/2409.17798) — research implementation and paper on decentralized LiDAR-inertial odometry for aerial swarms; verify requirements, license, supported sensors, and reproducibility before reuse.
7. [HKU-MARS FAST-LIO repository](https://github.com/hku-mars/FAST_LIO) and [FAST-LIO2 paper](https://arxiv.org/abs/2107.06829) — open-source LiDAR-inertial odometry; not a full drone, payload, mission, or forensic system.
8. [ArduPilot swarming documentation](https://ardupilot.org/planner/docs/swarming.html) — describes a Mission Planner workflow that sends guided-mode waypoints to multiple vehicles; this is not a vendor-neutral cloud swarm API.

## 12. Evidence register

| Claim | Status |
|---|---|
| Vendor cloud APIs exist for some supported aircraft/fleet workflows | Documented |
| Research code exists for LiDAR-inertial odometry and aerial swarm estimation | Documented |
| These components could be combined into a useful Forensic Finders workflow | Hypothesis |
| A drone swarm improves coverage, accuracy, cost, or safety for the intended user | Unverified hypothesis |
| This concept has run outside a sandbox or flown on a physical drone | **Not tested / no evidence supplied** |
