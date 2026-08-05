# Trigger Extraction Methodology for GrowlingEyes

**Organization:** Freedom Angel Corps — "We believe you."  
**Product:** GrowlingEyes — *Neighborhood Watch From Your Livingroom*  
**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Active Methodology  
**Repository:** `midnghtsapphire/revvel-standards`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Trigger Definition & Classification](#2-trigger-definition--classification)
3. [Extraction Methodologies by Domain](#3-extraction-methodologies-by-domain)
4. [Pattern Recognition Framework](#4-pattern-recognition-framework)
5. [Trigger Scoring & Prioritization](#5-trigger-scoring--prioritization)
6. [Correlation Engine](#6-correlation-engine)
7. [Implementation Architecture](#7-implementation-architecture)
8. [Testing & Validation](#8-testing--validation)

---

## 1. Overview

### 1.1. What is a Trigger

A **trigger** in the context of GrowlingEyes OSINT is a detectable pattern, event, or data point from intelligence sources that indicates a significant change, threat, or event requiring attention. Triggers are the core mechanism for converting raw OSINT data into actionable intelligence.

### 1.2. Purpose

This methodology defines how to systematically extract, classify, score, and correlate triggers from the 90+ intelligence sources monitored by GrowlingEyes across 20 domains.

### 1.3. Core Principles

1. **Automated Detection:** Triggers must be machine-detectable without human intervention
2. **Pattern-Based:** Use regex, keyword matching, statistical anomalies, and ML models
3. **Context-Aware:** Consider temporal, geographic, and cross-domain context
4. **Scored & Prioritized:** Every trigger gets a severity score (0-100)
5. **Correlation-Ready:** Triggers from multiple sources should reinforce each other

---

## 2. Trigger Definition & Classification

### 2.1. Trigger Types

| Type | Description | Example |
|------|-------------|---------|
| **Keyword** | Specific words/phrases in content | "zero-day", "exploit in the wild", "active shooter" |
| **Pattern** | Regex patterns for structured data | CVE-YYYY-NNNNN, IP addresses, crypto wallets |
| **Threshold** | Numeric values exceeding limits | Earthquake > 6.0 magnitude, Temperature > 45°C |
| **Anomaly** | Statistical deviations from baseline | 300% increase in flight cancellations |
| **Geospatial** | Location-based conditions | Event within 50km of critical infrastructure |
| **Temporal** | Time-based patterns | 3+ incidents in 24 hours |
| **Correlation** | Multi-source pattern matching | Same CVE in 3+ threat feeds |

### 2.2. Severity Levels

| Level | Score | Color | Description |
|-------|-------|-------|-------------|
| CRITICAL | 90-100 | Red | Immediate threat to life, security, or operations |
| HIGH | 70-89 | Orange | Significant risk requiring prompt attention |
| MEDIUM | 40-69 | Yellow | Notable event requiring monitoring |
| LOW | 20-39 | Blue | Informational, background intelligence |
| INFO | 0-19 | Gray | Routine data, baseline intelligence |

### 2.3. Domain Classification

Every trigger belongs to one of 20 intelligence domains:

1. Cyber Threats
2. Supply Chain
3. Kinetic Events / Conflict
4. Maritime & Air
5. Nuclear, Chemical & Port Security
6. Biological & Chemical Threats
7. Troop Movements & Military
8. Counter-Intelligence
9. Drone & UAV Events
10. Identity & Entities
11. Public Broadcasts & Alerts
12. Environmental & Natural Disasters
13. Energy & Pipeline
14. Economic & Financial
15. Humanitarian & Refugees
16. Weapons & Arms
17. Space & Satellites
18. Water & Agriculture
19. Rail & Transportation
20. Dark Web & Encrypted Channels

---

## 3. Extraction Methodologies by Domain

### 3.1. Cyber Threats

**Primary Sources:** CISA KEV, NVD CVE, AlienVault OTX, CISA RSS

**Trigger Patterns:**

```python
# Critical CVE patterns
CRITICAL_CVE_PATTERNS = [
    r'CVSS:\s*([89]\.\d|10\.0)',  # CVSS score 8.0+
    r'exploit.*wild',              # Exploit in the wild
    r'zero-day',                   # Zero-day vulnerability
    r'ransomware',                 # Ransomware campaigns
    r'actively exploited',         # Active exploitation
]

# APT group mentions
APT_GROUPS = [
    r'APT\d+', r'Lazarus', r'Sandworm', r'Fancy Bear',
    r'Cozy Bear', r'Volt Typhoon', r'Kimsuky'
]

# Critical keywords
CRITICAL_KEYWORDS = [
    'critical infrastructure', 'supply chain attack',
    'nation-state', 'advanced persistent threat'
]
```

**Extraction Logic:**

```python
def extract_cyber_triggers(feed_data: dict) -> list[Trigger]:
    triggers = []
    
    for item in feed_data.get('items', []):
        score = 0
        reason = []
        
        # Check CVSS score
        if cvss_match := re.search(r'CVSS:\s*(\d+\.\d+)', item['description']):
            cvss = float(cvss_match.group(1))
            if cvss >= 9.0:
                score += 40
                reason.append(f"Critical CVSS: {cvss}")
        
        # Check for exploit keywords
        text = item['title'].lower() + ' ' + item['description'].lower()
        if any(kw in text for kw in ['exploit', 'zero-day', 'actively exploited']):
            score += 30
            reason.append("Active exploitation")
        
        # Check for APT groups
        if any(re.search(pattern, text, re.I) for pattern in APT_GROUPS):
            score += 20
            reason.append("APT group involved")
        
        # Check for critical infrastructure
        if 'critical infrastructure' in text:
            score += 10
            reason.append("Critical infrastructure target")
        
        if score >= 40:  # Threshold for creating trigger
            triggers.append(Trigger(
                domain='cyber_threats',
                source=item['source'],
                title=item['title'],
                score=min(score, 100),
                reason=', '.join(reason),
                timestamp=item['published'],
                raw_data=item
            ))
    
    return triggers
```

### 3.2. Kinetic Events / Conflict

**Primary Sources:** GDELT, ACLED, Crisis Group, ISW, ReliefWeb

**Trigger Patterns:**

```python
KINETIC_PATTERNS = {
    'combat': r'(firefight|battle|combat|engagement|clash)',
    'casualties': r'(\d+)\s*(killed|dead|casualties|wounded|injured)',
    'military_ops': r'(military operation|offensive|invasion|airstrike|bombardment)',
    'escalation': r'(escalat|intensif|expand|widen)',
    'weapons': r'(missile|artillery|drone strike|rocket|mortar)',
}

# Geographic hotspots (require higher attention)
CONFLICT_ZONES = [
    'Ukraine', 'Gaza', 'Israel', 'Syria', 'Yemen', 'Sudan',
    'Myanmar', 'Ethiopia', 'Congo', 'Somalia'
]
```

**Geospatial Trigger Logic:**

```python
def extract_kinetic_triggers(events: list[dict]) -> list[Trigger]:
    triggers = []
    
    for event in events:
        score = 0
        reason = []
        
        # Base score from event type
        if event.get('event_type') in ['Battles', 'Explosions/Remote violence']:
            score += 30
            reason.append(f"Event type: {event['event_type']}")
        
        # Check for casualties
        if fatalities := event.get('fatalities', 0):
            if fatalities >= 50:
                score += 40
                reason.append(f"{fatalities} fatalities")
            elif fatalities >= 10:
                score += 20
                reason.append(f"{fatalities} fatalities")
        
        # Geographic multiplier for conflict zones
        location = event.get('country', '')
        if any(zone in location for zone in CONFLICT_ZONES):
            score = int(score * 1.3)
            reason.append(f"Active conflict zone: {location}")
        
        # Check for escalation keywords
        text = event.get('notes', '').lower()
        if any(kw in text for kw in ['escalat', 'intensif', 'widen']):
            score += 15
            reason.append("Escalation indicators")
        
        if score >= 40:
            triggers.append(Trigger(
                domain='kinetic_events',
                source='ACLED',
                title=event.get('event_description'),
                score=min(score, 100),
                reason=', '.join(reason),
                coordinates=(event.get('latitude'), event.get('longitude')),
                timestamp=event.get('event_date'),
                raw_data=event
            ))
    
    return triggers
```

### 3.3. Environmental & Natural Disasters

**Primary Sources:** USGS Earthquakes, NOAA Weather, NASA FIRMS, GDACS

**Trigger Patterns:**

```python
DISASTER_THRESHOLDS = {
    'earthquake_magnitude': 5.5,
    'hurricane_category': 3,
    'wildfire_acres': 10000,
    'temperature_extreme': 45,  # Celsius
    'flood_stage': 'major',
}
```

**Threshold-Based Extraction:**

```python
def extract_environmental_triggers(data: dict) -> list[Trigger]:
    triggers = []
    
    # Earthquake processing
    for quake in data.get('earthquakes', []):
        mag = quake.get('mag', 0)
        
        if mag >= 7.0:
            score = 95
            reason = f"Major earthquake: {mag} magnitude"
        elif mag >= 6.0:
            score = 75
            reason = f"Strong earthquake: {mag} magnitude"
        elif mag >= 5.5:
            score = 50
            reason = f"Moderate earthquake: {mag} magnitude"
        else:
            continue
        
        # Population exposure multiplier
        if alert_level := quake.get('alert'):
            if alert_level == 'red':
                score = min(score + 20, 100)
                reason += ", red alert (high casualties expected)"
        
        triggers.append(Trigger(
            domain='environmental',
            source='USGS',
            title=f"{mag}M earthquake near {quake.get('place')}",
            score=score,
            reason=reason,
            coordinates=(quake.get('longitude'), quake.get('latitude')),
            timestamp=quake.get('time'),
            raw_data=quake
        ))
    
    # Weather alerts processing
    for alert in data.get('weather_alerts', []):
        severity = alert.get('severity', '').lower()
        event_type = alert.get('event', '').lower()
        
        score_map = {
            'extreme': 90,
            'severe': 70,
            'moderate': 50,
            'minor': 30
        }
        
        score = score_map.get(severity, 20)
        
        # Boost for life-threatening events
        if any(kw in event_type for kw in ['tornado', 'hurricane', 'tsunami', 'flash flood']):
            score += 20
        
        if score >= 40:
            triggers.append(Trigger(
                domain='environmental',
                source='NOAA',
                title=alert.get('headline'),
                score=min(score, 100),
                reason=f"{severity.capitalize()} {event_type}",
                affected_areas=alert.get('areaDesc'),
                timestamp=alert.get('onset'),
                raw_data=alert
            ))
    
    return triggers
```

### 3.4. Dark Web & Encrypted Channels

**Primary Sources:** Telegram channels, Discord servers, Tor forums, I2P feeds

**Trigger Patterns:**

```python
DARKWEB_PATTERNS = {
    'data_breach': r'(database|breach|leak|dump).*(\d+)\s*(million|thousand|records)',
    'exploit_sale': r'(selling|for sale|buy).*exploit',
    'ransomware': r'(ransom|encrypted|decryption key)',
    'credentials': r'(credentials|passwords|login).*leak',
    'darknet_markets': r'(marketplace|vendor|listing)',
    'threat_chatter': r'(planning|target|operation|attack)',
}
```

**Sentiment & Keyword Extraction:**

```python
def extract_darkweb_triggers(messages: list[dict]) -> list[Trigger]:
    triggers = []
    
    for msg in messages:
        score = 0
        reason = []
        text = msg.get('content', '').lower()
        
        # Check for data breach mentions
        if breach_match := re.search(DARKWEB_PATTERNS['data_breach'], text, re.I):
            score += 60
            reason.append(f"Data breach: {breach_match.group()}")
        
        # Check for exploit sales
        if re.search(DARKWEB_PATTERNS['exploit_sale'], text, re.I):
            score += 50
            reason.append("Exploit for sale")
        
        # Check for ransomware activity
        if re.search(DARKWEB_PATTERNS['ransomware'], text, re.I):
            score += 55
            reason.append("Ransomware activity")
        
        # Check for credentials leak
        if re.search(DARKWEB_PATTERNS['credentials'], text, re.I):
            score += 45
            reason.append("Credentials leak")
        
        # Check for threat planning (high severity)
        if re.search(DARKWEB_PATTERNS['threat_chatter'], text, re.I):
            score += 70
            reason.append("Threat planning detected")
        
        # Boost score based on source reputation
        if msg.get('channel_type') == 'verified_threat_actor':
            score = int(score * 1.5)
            reason.append("Known threat actor source")
        
        if score >= 40:
            triggers.append(Trigger(
                domain='dark_web',
                source=msg.get('source'),
                title=msg.get('title', text[:100]),
                score=min(score, 100),
                reason=', '.join(reason),
                timestamp=msg.get('timestamp'),
                raw_data=msg
            ))
    
    return triggers
```

---

## 4. Pattern Recognition Framework

### 4.1. Multi-Pattern Matching Engine

```python
class TriggerPatternEngine:
    """
    Unified pattern matching engine for trigger extraction.
    Supports regex, keyword, threshold, and anomaly detection.
    """
    
    def __init__(self, domain: str):
        self.domain = domain
        self.patterns = self._load_patterns(domain)
        self.baseline = self._load_baseline(domain)
    
    def extract(self, data: dict) -> list[Trigger]:
        """Main extraction method - applies all pattern types"""
        triggers = []
        
        triggers.extend(self._extract_keyword_triggers(data))
        triggers.extend(self._extract_pattern_triggers(data))
        triggers.extend(self._extract_threshold_triggers(data))
        triggers.extend(self._extract_anomaly_triggers(data))
        
        return self._deduplicate(triggers)
    
    def _extract_keyword_triggers(self, data: dict) -> list[Trigger]:
        """Extract triggers based on keyword matching"""
        triggers = []
        keywords = self.patterns.get('keywords', [])
        
        for item in data.get('items', []):
            text = f"{item.get('title', '')} {item.get('description', '')}".lower()
            
            matched_keywords = [kw for kw in keywords if kw.lower() in text]
            
            if matched_keywords:
                score = self._calculate_keyword_score(matched_keywords)
                if score >= 40:
                    triggers.append(Trigger(
                        domain=self.domain,
                        source=item.get('source'),
                        title=item.get('title'),
                        score=score,
                        reason=f"Keywords: {', '.join(matched_keywords)}",
                        timestamp=item.get('published'),
                        raw_data=item
                    ))
        
        return triggers
    
    def _extract_pattern_triggers(self, data: dict) -> list[Trigger]:
        """Extract triggers based on regex patterns"""
        triggers = []
        patterns = self.patterns.get('regex', [])
        
        for item in data.get('items', []):
            text = f"{item.get('title', '')} {item.get('description', '')}"
            
            for pattern_def in patterns:
                if matches := re.findall(pattern_def['pattern'], text, re.I):
                    score = pattern_def.get('score', 50)
                    
                    triggers.append(Trigger(
                        domain=self.domain,
                        source=item.get('source'),
                        title=item.get('title'),
                        score=score,
                        reason=f"Pattern match: {pattern_def['name']} ({matches[0]})",
                        timestamp=item.get('published'),
                        extracted_entities=matches,
                        raw_data=item
                    ))
        
        return triggers
    
    def _extract_threshold_triggers(self, data: dict) -> list[Trigger]:
        """Extract triggers based on numeric thresholds"""
        triggers = []
        thresholds = self.patterns.get('thresholds', [])
        
        for item in data.get('items', []):
            for threshold_def in thresholds:
                field = threshold_def['field']
                value = item.get(field)
                
                if value is not None and value >= threshold_def['threshold']:
                    score = threshold_def.get('score', 50)
                    
                    # Scale score based on how far above threshold
                    if threshold_def.get('scale', False):
                        ratio = value / threshold_def['threshold']
                        score = min(int(score * ratio), 100)
                    
                    triggers.append(Trigger(
                        domain=self.domain,
                        source=item.get('source'),
                        title=item.get('title'),
                        score=score,
                        reason=f"{field} = {value} (threshold: {threshold_def['threshold']})",
                        timestamp=item.get('published'),
                        raw_data=item
                    ))
        
        return triggers
    
    def _extract_anomaly_triggers(self, data: dict) -> list[Trigger]:
        """Extract triggers based on statistical anomalies"""
        triggers = []
        
        if not self.baseline:
            return triggers
        
        # Calculate current metrics
        current_count = len(data.get('items', []))
        baseline_count = self.baseline.get('avg_count', current_count)
        
        # Detect anomalous increase
        if current_count > baseline_count * 2:
            increase_pct = int((current_count / baseline_count - 1) * 100)
            
            triggers.append(Trigger(
                domain=self.domain,
                source='anomaly_detector',
                title=f"Anomalous increase in {self.domain} events",
                score=min(50 + increase_pct // 10, 90),
                reason=f"{increase_pct}% increase over baseline ({current_count} vs {baseline_count})",
                timestamp=datetime.now(timezone.utc),
                raw_data={'current': current_count, 'baseline': baseline_count}
            ))
        
        return triggers
    
    def _calculate_keyword_score(self, keywords: list[str]) -> int:
        """Calculate score based on matched keywords"""
        base_score = len(keywords) * 15
        
        # Boost for critical keywords
        critical = ['zero-day', 'ransomware', 'critical infrastructure', 'nation-state']
        if any(kw in keywords for kw in critical):
            base_score += 30
        
        return min(base_score, 100)
    
    def _deduplicate(self, triggers: list[Trigger]) -> list[Trigger]:
        """Remove duplicate triggers based on title similarity"""
        seen = set()
        unique = []
        
        for trigger in triggers:
            # Create fingerprint from title
            fingerprint = trigger.title.lower()[:50]
            
            if fingerprint not in seen:
                seen.add(fingerprint)
                unique.append(trigger)
        
        return unique
```

### 4.2. Pattern Configuration Schema

```yaml
# Example: cyber_threats_patterns.yml
domain: cyber_threats

keywords:
  - zero-day
  - exploit in the wild
  - ransomware
  - critical vulnerability
  - active exploitation
  - supply chain attack
  - nation-state

regex:
  - name: CVE_ID
    pattern: CVE-\d{4}-\d{4,7}
    score: 40
  
  - name: HIGH_CVSS
    pattern: CVSS:\s*([89]\.\d|10\.0)
    score: 70
  
  - name: APT_GROUP
    pattern: (APT\d+|Lazarus|Sandworm|Fancy Bear|Cozy Bear)
    score: 60

thresholds:
  - field: cvss_score
    threshold: 8.0
    score: 70
    scale: true
  
  - field: exploit_maturity
    threshold: "weaponized"
    score: 80

anomaly_detection:
  enabled: true
  baseline_window: 7  # days
  anomaly_threshold: 2.0  # 2x baseline
```

---

## 5. Trigger Scoring & Prioritization

### 5.1. Scoring Algorithm

```python
class TriggerScorer:
    """
    Multi-factor scoring algorithm for trigger prioritization.
    Combines base score, temporal factors, geographic proximity, and correlation.
    """
    
    SEVERITY_WEIGHTS = {
        'critical_infrastructure': 1.5,
        'active_exploitation': 1.4,
        'casualties': 1.3,
        'escalation': 1.2,
        'geographic_proximity': 1.2,
        'temporal_clustering': 1.15,
    }
    
    def score(self, trigger: Trigger, context: dict = None) -> int:
        """Calculate final trigger score with context"""
        base_score = trigger.score
        
        # Apply temporal boost (recent events get higher scores)
        if trigger.timestamp:
            age_hours = (datetime.now(timezone.utc) - trigger.timestamp).total_seconds() / 3600
            if age_hours < 1:
                base_score *= 1.3
            elif age_hours < 24:
                base_score *= 1.2
            elif age_hours < 72:
                base_score *= 1.1
        
        # Apply geographic proximity boost
        if context and context.get('user_location'):
            if trigger.coordinates:
                distance_km = self._calculate_distance(
                    context['user_location'],
                    trigger.coordinates
                )
                
                if distance_km < 50:
                    base_score *= self.SEVERITY_WEIGHTS['geographic_proximity']
                elif distance_km < 500:
                    base_score *= 1.1
        
        # Apply domain-specific weights
        if trigger.domain in ['cyber_threats', 'kinetic_events']:
            base_score *= 1.1
        
        # Apply correlation boost (triggers confirmed by multiple sources)
        if context and context.get('correlation_count', 0) > 1:
            base_score *= (1 + 0.1 * context['correlation_count'])
        
        return min(int(base_score), 100)
    
    def _calculate_distance(self, loc1: tuple, loc2: tuple) -> float:
        """Calculate distance between two coordinates in km"""
        from math import radians, sin, cos, sqrt, atan2
        
        lat1, lon1 = radians(loc1[0]), radians(loc1[1])
        lat2, lon2 = radians(loc2[0]), radians(loc2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return 6371 * c  # Earth radius in km
```

### 5.2. Priority Queue Implementation

```python
import heapq
from dataclasses import dataclass, field
from typing import Any

@dataclass(order=True)
class PrioritizedTrigger:
    """Trigger with priority for heap queue"""
    priority: int = field(compare=True)
    trigger: Any = field(compare=False)
    
    def __init__(self, trigger: Trigger, priority: int):
        # Negate priority for max-heap behavior (Python has min-heap)
        self.priority = -priority
        self.trigger = trigger

class TriggerQueue:
    """Priority queue for trigger processing"""
    
    def __init__(self, max_size: int = 1000):
        self.heap = []
        self.max_size = max_size
        self.seen = set()
    
    def push(self, trigger: Trigger):
        """Add trigger to queue with priority"""
        fingerprint = self._fingerprint(trigger)
        
        if fingerprint in self.seen:
            return  # Skip duplicates
        
        self.seen.add(fingerprint)
        
        heapq.heappush(
            self.heap,
            PrioritizedTrigger(trigger, trigger.score)
        )
        
        # Trim queue if too large
        if len(self.heap) > self.max_size:
            heapq.heappop(self.heap)
    
    def pop(self) -> Trigger:
        """Get highest priority trigger"""
        if self.heap:
            return heapq.heappop(self.heap).trigger
        return None
    
    def peek(self, n: int = 10) -> list[Trigger]:
        """Get top N triggers without removing"""
        return [pt.trigger for pt in heapq.nsmallest(n, self.heap)]
    
    def _fingerprint(self, trigger: Trigger) -> str:
        """Create unique fingerprint for deduplication"""
        return f"{trigger.domain}:{trigger.source}:{trigger.title[:50]}"
```

---

## 6. Correlation Engine

### 6.1. Cross-Source Correlation

```python
class TriggerCorrelationEngine:
    """
    Correlates triggers from multiple sources to identify:
    - Multi-source confirmation
    - Cross-domain relationships
    - Emerging patterns
    """
    
    def __init__(self, time_window: int = 3600):
        self.time_window = time_window  # seconds
        self.trigger_buffer = []
    
    def correlate(self, new_triggers: list[Trigger]) -> list[CorrelatedTrigger]:
        """Find correlated trigger groups"""
        self.trigger_buffer.extend(new_triggers)
        self._prune_old_triggers()
        
        correlated = []
        
        # Entity-based correlation (same CVE, location, person, etc.)
        entity_groups = self._group_by_entity()
        for entity, triggers in entity_groups.items():
            if len(triggers) >= 2:
                correlated.append(self._create_correlated_trigger(
                    triggers,
                    correlation_type='entity',
                    correlation_value=entity
                ))
        
        # Geographic correlation (events in same area)
        geo_groups = self._group_by_location()
        for location, triggers in geo_groups.items():
            if len(triggers) >= 3:
                correlated.append(self._create_correlated_trigger(
                    triggers,
                    correlation_type='geographic',
                    correlation_value=location
                ))
        
        # Temporal correlation (rapid sequence of related events)
        temporal_groups = self._group_by_temporal_cluster()
        for cluster_id, triggers in temporal_groups.items():
            if len(triggers) >= 2:
                correlated.append(self._create_correlated_trigger(
                    triggers,
                    correlation_type='temporal',
                    correlation_value=cluster_id
                ))
        
        return correlated
    
    def _group_by_entity(self) -> dict[str, list[Trigger]]:
        """Group triggers by mentioned entities (CVE, IP, person, etc.)"""
        groups = {}
        
        for trigger in self.trigger_buffer:
            for entity in trigger.extracted_entities:
                if entity not in groups:
                    groups[entity] = []
                groups[entity].append(trigger)
        
        return {k: v for k, v in groups.items() if len(v) >= 2}
    
    def _group_by_location(self, radius_km: float = 50) -> dict[str, list[Trigger]]:
        """Group triggers by geographic proximity"""
        # Simple grid-based clustering
        groups = {}
        
        for trigger in self.trigger_buffer:
            if not trigger.coordinates:
                continue
            
            # Round to ~50km grid
            lat_grid = round(trigger.coordinates[0] * 2) / 2
            lon_grid = round(trigger.coordinates[1] * 2) / 2
            grid_key = f"{lat_grid},{lon_grid}"
            
            if grid_key not in groups:
                groups[grid_key] = []
            groups[grid_key].append(trigger)
        
        return {k: v for k, v in groups.items() if len(v) >= 3}
    
    def _group_by_temporal_cluster(self) -> dict[str, list[Trigger]]:
        """Group triggers that occur in rapid succession"""
        groups = {}
        
        # Sort by timestamp
        sorted_triggers = sorted(
            [t for t in self.trigger_buffer if t.timestamp],
            key=lambda t: t.timestamp
        )
        
        cluster_id = 0
        current_cluster = []
        last_time = None
        
        for trigger in sorted_triggers:
            if last_time is None or \
               (trigger.timestamp - last_time).total_seconds() < 1800:  # 30 min
                current_cluster.append(trigger)
            else:
                if len(current_cluster) >= 2:
                    groups[f"cluster_{cluster_id}"] = current_cluster
                    cluster_id += 1
                current_cluster = [trigger]
            
            last_time = trigger.timestamp
        
        # Don't forget the last cluster
        if len(current_cluster) >= 2:
            groups[f"cluster_{cluster_id}"] = current_cluster
        
        return groups
    
    def _create_correlated_trigger(
        self,
        triggers: list[Trigger],
        correlation_type: str,
        correlation_value: str
    ) -> CorrelatedTrigger:
        """Create a meta-trigger from correlated triggers"""
        # Boost score based on number of sources
        max_score = max(t.score for t in triggers)
        correlation_boost = min(len(triggers) * 10, 30)
        final_score = min(max_score + correlation_boost, 100)
        
        return CorrelatedTrigger(
            triggers=triggers,
            correlation_type=correlation_type,
            correlation_value=correlation_value,
            score=final_score,
            source_count=len(triggers),
            reason=f"{len(triggers)} sources confirm: {correlation_value}"
        )
    
    def _prune_old_triggers(self):
        """Remove triggers outside time window"""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=self.time_window)
        self.trigger_buffer = [
            t for t in self.trigger_buffer
            if t.timestamp and t.timestamp > cutoff
        ]
```

---

## 7. Implementation Architecture

### 7.1. Integration with Existing GrowlingEyes Tools

```python
# growlingeyes/tools/trigger_extractor.py

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from .news_feed import fetch_news
from .apt_signals import fetch_all_signals
from .stream_listener import StreamListener
from .scraper import scrape_all

@dataclass
class Trigger:
    domain: str
    source: str
    title: str
    score: int
    reason: str
    timestamp: datetime
    coordinates: Optional[tuple] = None
    affected_areas: Optional[str] = None
    extracted_entities: list = None
    raw_data: dict = None
    
    def __post_init__(self):
        if self.extracted_entities is None:
            self.extracted_entities = []

class TriggerExtractor:
    """
    Main trigger extraction orchestrator.
    Pulls from all GrowlingEyes data sources and extracts triggers.
    """
    
    def __init__(self):
        self.cyber_engine = TriggerPatternEngine('cyber_threats')
        self.kinetic_engine = TriggerPatternEngine('kinetic_events')
        self.environmental_engine = TriggerPatternEngine('environmental')
        self.darkweb_engine = TriggerPatternEngine('dark_web')
        
        self.correlation_engine = TriggerCorrelationEngine(time_window=7200)
        self.scorer = TriggerScorer()
        self.queue = TriggerQueue(max_size=5000)
    
    def extract_all_triggers(self, context: dict = None) -> dict:
        """
        Extract triggers from all domains.
        Returns dict with raw triggers, correlated triggers, and top priorities.
        """
        all_triggers = []
        
        # Extract from each domain
        all_triggers.extend(self._extract_cyber_triggers())
        all_triggers.extend(self._extract_kinetic_triggers())
        all_triggers.extend(self._extract_environmental_triggers())
        all_triggers.extend(self._extract_darkweb_triggers())
        
        # Score and prioritize
        for trigger in all_triggers:
            trigger.score = self.scorer.score(trigger, context)
            self.queue.push(trigger)
        
        # Correlate
        correlated = self.correlation_engine.correlate(all_triggers)
        
        return {
            'raw_triggers': all_triggers,
            'correlated_triggers': correlated,
            'top_priorities': self.queue.peek(50),
            'total_count': len(all_triggers),
            'critical_count': len([t for t in all_triggers if t.score >= 90]),
            'high_count': len([t for t in all_triggers if 70 <= t.score < 90]),
        }
    
    def _extract_cyber_triggers(self) -> list[Trigger]:
        """Extract triggers from APT signals"""
        signals = fetch_all_signals(sources=['cisa', 'nvd', 'otx', 'cisa_rss'])
        
        triggers = []
        for signal in signals:
            data = {
                'items': [{
                    'source': signal.source,
                    'title': signal.title,
                    'description': signal.description,
                    'published': signal.published,
                }]
            }
            triggers.extend(self.cyber_engine.extract(data))
        
        return triggers
    
    def _extract_kinetic_triggers(self) -> list[Trigger]:
        """Extract triggers from news feeds"""
        # Would integrate with ACLED, GDELT, etc.
        # Placeholder for now
        return []
    
    def _extract_environmental_triggers(self) -> list[Trigger]:
        """Extract triggers from environmental sources"""
        # Would integrate with USGS, NOAA, etc.
        # Placeholder for now
        return []
    
    def _extract_darkweb_triggers(self) -> list[Trigger]:
        """Extract triggers from dark web monitoring"""
        # Would integrate with Telegram, Discord, Tor monitoring
        # Placeholder for now
        return []


def main():
    """CLI interface for trigger extraction"""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="GrowlingEyes Trigger Extractor")
    parser.add_argument('--output', type=str, help='Output JSON file')
    parser.add_argument('--top', type=int, default=20, help='Show top N triggers')
    args = parser.parse_args()
    
    extractor = TriggerExtractor()
    results = extractor.extract_all_triggers()
    
    print(f"\n🔍 Extracted {results['total_count']} triggers")
    print(f"   Critical: {results['critical_count']}")
    print(f"   High: {results['high_count']}")
    print(f"   Correlated: {len(results['correlated_triggers'])}")
    
    print(f"\n🚨 Top {args.top} Priority Triggers:")
    for i, trigger in enumerate(results['top_priorities'][:args.top], 1):
        print(f"{i}. [{trigger.score}] {trigger.domain}: {trigger.title}")
        print(f"   └─ {trigger.reason}")
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump({
                'triggers': [vars(t) for t in results['raw_triggers']],
                'correlated': [vars(c) for c in results['correlated_triggers']],
            }, f, indent=2, default=str)
        print(f"\n💾 Saved to {args.output}")


if __name__ == '__main__':
    main()
```

### 7.2. Integration Points

1. **Python Tools** (`growlingeyes/tools/`)
   - Add `trigger_extractor.py` as shown above
   - Import into `apt_signals.py`, `news_feed.py`, `scraper.py`, `stream_listener.py`

2. **Database Schema** (add to GrowlingEyes database)

```sql
CREATE TABLE triggers (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    coordinates POINT,
    affected_areas TEXT,
    extracted_entities JSONB,
    raw_data JSONB,
    correlation_id INTEGER REFERENCES correlated_triggers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_triggers_score (score DESC),
    INDEX idx_triggers_timestamp (timestamp DESC),
    INDEX idx_triggers_domain (domain)
);

CREATE TABLE correlated_triggers (
    id SERIAL PRIMARY KEY,
    correlation_type VARCHAR(50) NOT NULL,
    correlation_value TEXT NOT NULL,
    score INTEGER NOT NULL,
    source_count INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 8. Testing & Validation

### 8.1. Unit Tests

```python
# growlingeyes/tests/test_trigger_extractor.py

import pytest
from datetime import datetime, timezone
from growlingeyes.tools.trigger_extractor import (
    TriggerExtractor,
    TriggerPatternEngine,
    TriggerScorer,
    Trigger
)


def test_keyword_extraction():
    """Test basic keyword trigger extraction"""
    engine = TriggerPatternEngine('cyber_threats')
    
    test_data = {
        'items': [{
            'source': 'test',
            'title': 'Critical zero-day vulnerability in Apache',
            'description': 'Actively exploited in the wild',
            'published': datetime.now(timezone.utc),
        }]
    }
    
    triggers = engine._extract_keyword_triggers(test_data)
    
    assert len(triggers) > 0
    assert triggers[0].score >= 40
    assert 'zero-day' in triggers[0].reason.lower()


def test_pattern_extraction():
    """Test regex pattern trigger extraction"""
    engine = TriggerPatternEngine('cyber_threats')
    
    test_data = {
        'items': [{
            'source': 'test',
            'title': 'CVE-2024-12345 discovered',
            'description': 'CVSS: 9.8 - Critical remote code execution',
            'published': datetime.now(timezone.utc),
        }]
    }
    
    triggers = engine._extract_pattern_triggers(test_data)
    
    assert len(triggers) > 0
    assert any('CVE-2024-12345' in str(t.extracted_entities) for t in triggers)


def test_threshold_extraction():
    """Test threshold-based trigger extraction"""
    engine = TriggerPatternEngine('environmental')
    
    test_data = {
        'items': [{
            'source': 'USGS',
            'title': 'Earthquake detected',
            'mag': 7.2,
            'published': datetime.now(timezone.utc),
        }]
    }
    
    # Configure threshold
    engine.patterns['thresholds'] = [{
        'field': 'mag',
        'threshold': 6.0,
        'score': 70,
        'scale': True
    }]
    
    triggers = engine._extract_threshold_triggers(test_data)
    
    assert len(triggers) > 0
    assert triggers[0].score >= 70


def test_trigger_scoring():
    """Test trigger scoring with context"""
    scorer = TriggerScorer()
    
    trigger = Trigger(
        domain='cyber_threats',
        source='test',
        title='Test trigger',
        score=50,
        reason='Test',
        timestamp=datetime.now(timezone.utc),
        coordinates=(37.7749, -122.4194)  # San Francisco
    )
    
    context = {
        'user_location': (37.8, -122.4),  # Near SF
        'correlation_count': 2
    }
    
    scored = scorer.score(trigger, context)
    
    # Should be boosted due to recency, proximity, and correlation
    assert scored > trigger.score


def test_deduplication():
    """Test trigger deduplication"""
    engine = TriggerPatternEngine('cyber_threats')
    
    duplicate_triggers = [
        Trigger(
            domain='cyber_threats',
            source='source1',
            title='Critical vulnerability in Apache',
            score=70,
            reason='Test',
            timestamp=datetime.now(timezone.utc)
        ),
        Trigger(
            domain='cyber_threats',
            source='source2',
            title='Critical vulnerability in Apache',
            score=75,
            reason='Test',
            timestamp=datetime.now(timezone.utc)
        ),
    ]
    
    unique = engine._deduplicate(duplicate_triggers)
    
    assert len(unique) == 1


def test_correlation_engine():
    """Test trigger correlation"""
    from growlingeyes.tools.trigger_extractor import TriggerCorrelationEngine
    
    engine = TriggerCorrelationEngine(time_window=3600)
    
    # Create triggers with same CVE
    triggers = [
        Trigger(
            domain='cyber_threats',
            source='cisa',
            title='CVE-2024-1234 exploited',
            score=70,
            reason='CISA alert',
            timestamp=datetime.now(timezone.utc),
            extracted_entities=['CVE-2024-1234']
        ),
        Trigger(
            domain='cyber_threats',
            source='nvd',
            title='CVE-2024-1234 published',
            score=60,
            reason='NVD entry',
            timestamp=datetime.now(timezone.utc),
            extracted_entities=['CVE-2024-1234']
        ),
    ]
    
    correlated = engine.correlate(triggers)
    
    assert len(correlated) > 0
    assert correlated[0].source_count == 2
    assert 'CVE-2024-1234' in correlated[0].correlation_value


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

### 8.2. Integration Tests

```bash
# Test full extraction pipeline
python growlingeyes/tools/trigger_extractor.py --output /tmp/triggers.json --top 50

# Verify output
jq '.triggers | length' /tmp/triggers.json
jq '.triggers[] | select(.score >= 90)' /tmp/triggers.json
```

### 8.3. Validation Checklist

- [ ] All 20 domains have pattern definitions
- [ ] Pattern files validated against YAML schema
- [ ] Unit tests pass for all extraction methods
- [ ] Integration tests run successfully
- [ ] Trigger deduplication works correctly
- [ ] Correlation engine identifies related triggers
- [ ] Scoring algorithm prioritizes correctly
- [ ] Database schema deployed
- [ ] API endpoints exposed (if applicable)
- [ ] Documentation complete

---

## References

1. **OSINT Frameworks**
   - OSINT Framework: <https://osintframework.com>
   - IntelTechniques: <https://inteltechniques.com>

2. **Threat Intelligence Standards**
   - STIX/TAXII: <https://oasis-open.github.io/cti-documentation/>
   - MITRE ATT&CK: <https://attack.mitre.org>

3. **Pattern Recognition Research**
   - NLP for Threat Intelligence: Various academic papers
   - Anomaly Detection Algorithms: Statistical methods

4. **GrowlingEyes Internal Docs**
   - `/docs/GROWLINGEYES_MASTER_SPEC.md`
   - `/docs/Master_Inventory/OSINT_STANDARD.md`
   - `/growlingeyes/README.md`

---

**END OF DOCUMENT**
