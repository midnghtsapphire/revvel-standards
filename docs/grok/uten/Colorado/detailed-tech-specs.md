# BNAT-UTEN Detailed Technical Specifications

**Version 1.1 | June 2026**

This document provides granular technical specifications for the core components of the BNAT-UTEN system, with emphasis on the emerging technologies (next-gen HTHPs and TCES) that enable the 88% effective efficiency target.

## 1. System-Level Performance Targets

- **Overall Effective Efficiency**: ≥ 88% (captured waste heat → useful heat delivered to buildings)
- **Water Usage Effectiveness (WUE) Improvement**: 40–70% reduction vs. baseline evaporative cooling
- **Availability**: ≥ 99.5% (with redundant paths)
- **Response Time**: Heat delivery within 15–30 minutes of demand signal
- **Operating Range**: Ambient -20°C to +40°C (Colorado climate)

## 2. Heat Capture Subsystem

**Component**: Plate Heat Exchangers (PHE)
- Type: Gasketed or brazed titanium/stainless steel plates
- Thermal duty: Sized for 90–95%+ recovery of available waste heat from liquid cooling loop
- Approach temperature: ≤ 2–3°C
- Pressure drop: < 50 kPa (low pumping power)
- Materials: Titanium plates for corrosion resistance in closed-loop systems
- Standards: ASME, PED, AHRI

**Integration**:
- Installed on the facility-side liquid cooling return loop (before cooling towers/dry coolers)
- Redundant parallel units for maintenance without downtime

## 3. Heat Upgrade Subsystem — Next-Gen High-Temperature Heat Pumps (HTHP)

**Target Performance (Emerging Tech, 2026–2028 maturity)**:
- Input temperature: 40–70°C (typical DC liquid cooling return)
- Output temperature: 80–130°C (suitable for modern district heating or building heating)
- Coefficient of Performance (COP): 3.4 – 5.0+ (depending on lift and configuration)
- Temperature lift capability: ≥ 40–60°C in single or cascade configuration
- Capacity per module: 500 kW – 5 MW thermal (modular for scalability)

**Key Technology Features**:
- Cycle configurations: Two-stage cascade or single-stage with economizer + internal heat exchanger (IHX)
- Compressors: Advanced centrifugal or screw with variable speed drive (VSD); emerging TurboClaw-style or magnetic bearing designs for higher efficiency
- Refrigerants: Low-GWP natural (CO₂ transcritical, ammonia) or next-gen HFOs (e.g., R1233zd(E), R1234ze(Z))
- Heat source: Closed-loop waste heat from data center (no direct contact with IT equipment)
- Heat sink: Thermal storage or direct to network

**Efficiency Curves (Typical)**:
- At 50°C source / 90°C sink: COP ≈ 4.2–4.8
- At 45°C source / 120°C sink: COP ≈ 3.4–3.8 (still highly efficient for the lift)

**Safety & Standards**:
- Pressure equipment: PED 2014/68/EU or ASME Section VIII
- Refrigerant handling: EPA Section 608 equivalent (or local)
- Redundancy: N+1 modules with automatic failover

## 4. Thermal Storage Subsystem

### 4.1 Thermochemical Energy Storage (TCES) — Seasonal

**Technology**: Reversible sorption or chemical reaction systems (e.g., salt hydrates, zeolites, or advanced composites)

**Key Specs (Target for 2027–2028 deployments)**:
- Storage density: 150–300+ kWh/m³ (significantly higher than water)
- Standby losses: < 1–2% per month (near-zero in well-insulated systems)
- Charge/discharge temperature: Matched to HTHP output (65–110°C)
- Cycle life: > 5,000–10,000 cycles with < 10% degradation
- Response: Full discharge in hours to days; seasonal hold capability

**Materials**:
- Working pairs: e.g., SrBr₂/H₂O, MgSO₄/H₂O, or advanced metal-organic frameworks (MOFs) in R&D
- Containment: Modular tanks or packed-bed reactors with corrosion-resistant liners

**Integration**:
- Charged during low-demand periods (summer) or excess heat availability
- Discharged during winter peaks via heat exchangers to the thermal network

### 4.2 PCM Thermal Batteries — Daily/Weekly Buffer

**Technology**: Phase Change Materials with tailored melting points (50–90°C range)

**Key Specs**:
- Energy density: 150–250 kWh/m³
- Charge/discharge rate: High (hours)
- Cycle stability: > 10,000 cycles
- Form: Encapsulated or macro-encapsulated modules in containerized skids

**Hybrid Configuration**:
- TCES for long-duration seasonal shifting
- PCM for daily peak shaving and rapid response
- Optional sensible water buffer tanks for very short-term smoothing

## 5. Distribution & End-Use

**Thermal Energy Network**:
- Pipe material: Pre-insulated steel or PEX with high-performance insulation (PUR or better)
- Supply/return temperatures: 70–90°C supply / 40–50°C return (4th/5th gen)
- Pressure: Low-pressure hot water system
- Losses: < 5–8% over typical urban distances with modern insulation

**Building Interface**:
- Plate heat exchangers or direct connection (with proper hydraulics)
- Integration with existing building heating systems (radiators, underfloor, air handling)
- Potential for hybrid with heat pumps in buildings for further temperature boosting if needed

## 6. Controls & Digital Layer

**Architecture**:
- Edge controllers at DC and storage sites
- Central SCADA / cloud platform with AI/ML optimization
- Key functions:
  - Predictive storage management (weather + demand forecasting)
  - Real-time efficiency optimization (HTHP setpoints, flow rates)
  - Anomaly detection and predictive maintenance
  - Grid interaction signals (demand response, flexibility)

**Data Points** (typical per site):
- Temperatures, flows, pressures at multiple points
- Power consumption of HTHPs and pumps
- Storage state of charge
- Building-side demand signals

**Cybersecurity**: IEC 62443 compliant, segmented networks

## 7. Colorado-Specific Considerations

- **Climate Data Integration**: Use TMY (Typical Meteorological Year) data for Denver/Front Range in system modeling and controls
- **Water Quality**: Closed-loop design minimizes new water intake; any blowdown treated to local standards
- **Seismic & Frost Protection**: Appropriate design for Colorado conditions
- **Altitude Effects**: Minor derating for HTHP performance at ~5,000+ ft elevation (accounted in design)

## 8. Safety, Standards & Compliance

- Mechanical: ASME, local building/mechanical codes
- Electrical: NEC / NFPA 70
- Environmental: EPA, state water/air permits
- Data center integration: Follows Uptime Institute / TIA-942 guidelines where applicable
- Emerging tech: Follow manufacturer guidelines + third-party validation for HTHP and TCES

## 9. Performance Monitoring & Verification

- Continuous metering of:
  - Heat input from DC
  - Electricity to HTHPs
  - Heat output to network
  - Water consumption (baseline vs. with system)
- Annual third-party verification of efficiency claims
- Public dashboard integration for transparency (see dashboard.html)

---

These specifications are based on current 2026 emerging technology performance (pilots and prototypes) and are expected to improve as the technologies mature. Detailed engineering will refine numbers for specific sites.

For P&ID diagrams, 3D layouts, or vendor-specific datasheets, contact the project team or refer to linked European demonstration projects (THUNDER, etc.).

**Next**: Integration with the full BNAT-UTEN roadmap and cost model.

## 10. Detailed Refrigerant Cycle Configurations for HTHPs

This section provides in-depth technical detail on the refrigerant cycle configurations used in the next-gen HTHPs for BNAT-UTEN. These advanced cycles are essential to achieve high COP and large temperature lifts when recovering low-grade waste heat (typically 40–70°C from data center liquid cooling loops) and delivering it at useful temperatures for thermal storage or district heating (80–130°C+).

### Why Advanced Cycles Are Needed
Standard single-stage vapor-compression cycles struggle with large temperature lifts from low source temperatures because of high compression ratios, leading to lower COP, higher discharge temperatures, and reduced efficiency. Advanced configurations improve efficiency through multi-staging, internal heat recovery, and optimized refrigerant properties.

All cycles described below use **closed-loop** designs (no direct mixing with DC cooling fluid).

### 10.1 Enhanced Single-Stage Cycle with Internal Heat Exchanger (IHX) + Economizer

**Description**:
- Basic vapor-compression cycle enhanced with an internal heat exchanger (IHX) between the liquid line and suction line, plus an economizer (or flash gas removal) stage.
- The IHX sub-cools the liquid refrigerant entering the expansion valve while superheating the suction gas, improving volumetric efficiency and reducing compression work.
- The economizer injects intermediate-pressure flash gas or liquid into the compressor (or uses a separate economizer heat exchanger), reducing the enthalpy of the main liquid stream and lowering the average compression work.

**P-h Diagram Key Points** (text representation):
- Evaporation at low pressure (source heat absorption).
- Compression in one stage with intermediate cooling/economizing.
- Condensation or gas cooling at high pressure (heat rejection to storage/network).
- Sub-cooling via IHX and economizer paths.

**Typical Performance for DC Waste Heat**:
- Source: 45–60°C
- Sink: 90–110°C
- COP: 4.0 – 4.8
- Temperature lift: Up to ~50–60°C
- Suitable refrigerants: R1234ze(Z), R1233zd(E), or ammonia (R717) for larger capacities

**Advantages for BNAT-UTEN**:
- Simpler and lower cost than multi-stage for moderate lifts.
- Good efficiency for many Colorado data center cooling return temperatures.
- Easier integration with modular skid designs.

**Limitations**:
- Compression ratio limits for very high lifts (>60°C); discharge temperature can become excessive without additional cooling.

### 10.2 Two-Stage Cascade Cycle

**Description**:
- Two separate refrigerant circuits (high-temperature and low-temperature) thermally coupled by a cascade heat exchanger (evaporator of high-temp cycle = condenser of low-temp cycle).
- Low-temp cycle absorbs heat from the data center waste heat source.
- High-temp cycle rejects heat at the desired high temperature to storage or the network.
- Each cycle operates at its optimal pressure ratio and with the best refrigerant for its temperature range.

**P-h Diagram Key Points**:
- Low-temp cycle: Evaporation from DC source, compression, condensation in cascade HX.
- High-temp cycle: Evaporation in cascade HX, compression, condensation/gas cooling to storage.

**Typical Performance**:
- Source: 40–60°C
- Sink: 100–130°C+
- COP: 3.4 – 4.2 (excellent for large lifts)
- Temperature lift: 60°C+ easily achievable
- Common refrigerant pairs: Low-temp (R1234yf or R290) + High-temp (R1233zd(E) or CO₂ transcritical)

**Advantages for BNAT-UTEN**:
- Excellent for large temperature lifts required to reach high-quality heat for seasonal storage or high-temp networks.
- Allows use of optimal (often natural) refrigerants in each stage.
- High reliability through separation of circuits.
- Strong match for Colorado’s need to deliver heat effectively in cold winters.

**Limitations**:
- Slightly higher complexity and capital cost (two compressors, cascade HX).
- Small efficiency penalty from the temperature approach in the cascade heat exchanger (mitigated by good design, approach < 5°C).

### 10.3 Two-Stage Cycle with Flash Tank Economizer (or Parallel Compression)

**Description**:
- Single refrigerant circuit with two compression stages.
- Flash tank (or economizer vessel) at intermediate pressure separates liquid and vapor.
- Liquid is sub-cooled before the main expansion valve; flash vapor is injected into the intermediate pressure stage (or handled by a parallel compressor).
- This reduces the work of the main compressor and improves overall COP.

**P-h Diagram Key Points**:
- Evaporation at low pressure.
- First-stage compression to intermediate pressure.
- Flash separation in economizer vessel.
- Second-stage compression of main flow + injection of flash gas.
- Condensation at high pressure.

**Typical Performance**:
- Source: 45–65°C
- Sink: 85–120°C
- COP: 4.2 – 5.0+ (best-in-class for moderate-to-large lifts)
- Temperature lift: 40–70°C
- Refrigerants: R1233zd(E), R1234ze(Z), or ammonia

**Advantages for BNAT-UTEN**:
- Highest COP among vapor-compression options for the target temperature ranges.
- Good balance of efficiency, complexity, and cost.
- Excellent scalability with VSD compressors.
- Very suitable for pairing with TCES (stable high-temperature output for charging storage).

**Limitations**:
- Requires careful control of intermediate pressure and flash gas management.
- Higher discharge temperatures in some conditions (addressed with liquid injection or oil cooling).

### 10.4 Transcritical CO₂ Cycle (Bonus for Highest Temperature Lifts)

**Description**:
- Uses CO₂ (R744) in transcritical mode: evaporation at subcritical pressure, compression into supercritical region, gas cooling (instead of condensation) at high pressure.
- Gas cooler rejects heat at gliding temperature, ideal for producing high-temperature hot water or charging high-temp storage.
- Often includes internal heat exchangers and sometimes ejectors for efficiency recovery.

**Typical Performance**:
- Source: 40–60°C (with good evaporators)
- Gas cooler outlet: Up to 120–140°C+
- COP: 3.0 – 4.0 (competitive at high lifts due to gliding temperature match)
- Excellent for producing steam or very high-temp water when needed.

**Advantages**:
- Natural refrigerant (GWP=1), future-proof.
- Gliding temperature in gas cooler provides excellent match for charging sensible or TCES storage.
- Compact and robust.

**Limitations**:
- Higher operating pressures (requires robust components).
- Efficiency drops more sharply at very high ambient temperatures (less relevant for indoor/conditioned DC applications).

### Integration with BNAT-UTEN Storage and Overall System

All configurations feed upgraded heat directly into the TCES or PCM storage modules. The choice of cycle depends on the specific temperature lift required:
- Moderate lifts (to ~90–100°C): Enhanced single-stage or flash-tank two-stage (highest COP).
- Large lifts (to 110–130°C+ for high-quality storage charging): Cascade or transcritical CO₂.

**System-Level Synergies**:
- High COP reduces electricity consumption for upgrading → improves net 88% efficiency.
- Stable high-temperature output from advanced cycles enables efficient charging of TCES without excessive auxiliary energy.
- Redundancy: Multiple parallel HTHP skids using different cycle types can be mixed for optimization.

These configurations are drawn from current prototype and demonstration performance (EPRI, European HTHP projects, THUNDER-related work). As compressor and heat exchanger technology advances, COP values are expected to improve further by 10–20% in the 2028–2032 timeframe.

For P-h diagrams, detailed thermodynamic modeling, or vendor datasheets for specific configurations, refer to the project engineering team.
