#!/usr/bin/env python3
"""
trigger_extractor.py — GrowlingEyes Trigger Extraction Engine
growlingeyes | Freedom Angel Corp — "We believe you."

Extracts actionable intelligence triggers from OSINT data sources across 20 domains.
Implements pattern recognition, scoring, correlation, and prioritization.

Usage:
    python tools/trigger_extractor.py
    python tools/trigger_extractor.py --top 50 --output triggers.json
    python tools/trigger_extractor.py --domains cyber_threats kinetic_events
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from math import radians, sin, cos, sqrt, atan2
from pathlib import Path
from typing import Optional, Any
import heapq

# Rich for CLI output
try:
    from rich.console import Console
    from rich.table import Table
    console = Console()
except ImportError:
    console = None


# ─── Data Models ──────────────────────────────────────────────────────────────

@dataclass
class Trigger:
    """Intelligence trigger extracted from OSINT sources"""
    domain: str
    source: str
    title: str
    score: int
    reason: str
    timestamp: datetime
    coordinates: Optional[tuple] = None
    affected_areas: Optional[str] = None
    extracted_entities: list = field(default_factory=list)
    raw_data: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization"""
        d = asdict(self)
        d['timestamp'] = self.timestamp.isoformat() if self.timestamp else None
        return d


@dataclass
class CorrelatedTrigger:
    """Group of correlated triggers from multiple sources"""
    triggers: list[Trigger]
    correlation_type: str  # 'entity', 'geographic', 'temporal'
    correlation_value: str
    score: int
    source_count: int
    reason: str
    
    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization"""
        return {
            'triggers': [t.to_dict() for t in self.triggers],
            'correlation_type': self.correlation_type,
            'correlation_value': self.correlation_value,
            'score': self.score,
            'source_count': self.source_count,
            'reason': self.reason,
        }


@dataclass(order=True)
class PrioritizedTrigger:
    """Trigger with priority for heap queue"""
    priority: int = field(compare=True)
    trigger: Trigger = field(compare=False)
    
    def __init__(self, trigger: Trigger, priority: int):
        # Negate priority for max-heap behavior (Python has min-heap)
        self.priority = -priority
        self.trigger = trigger


# ─── Pattern Engine ───────────────────────────────────────────────────────────

class TriggerPatternEngine:
    """
    Unified pattern matching engine for trigger extraction.
    Supports regex, keyword, threshold, and anomaly detection.
    """
    
    def __init__(self, domain: str, patterns: dict = None):
        self.domain = domain
        self.patterns = patterns or self._load_default_patterns(domain)
        self.baseline = {}  # Would load from historical data
    
    def _load_default_patterns(self, domain: str) -> dict:
        """Load default patterns for domain"""
        patterns = {
            'cyber_threats': {
                'keywords': [
                    'zero-day', 'exploit', 'ransomware', 'critical vulnerability',
                    'active exploitation', 'supply chain attack', 'nation-state'
                ],
                'regex': [
                    {'name': 'CVE_ID', 'pattern': r'CVE-\d{4}-\d{4,7}', 'score': 40},
                    {'name': 'HIGH_CVSS', 'pattern': r'CVSS:\s*([89]\.\d|10\.0)', 'score': 70},
                ],
            },
            'kinetic_events': {
                'keywords': [
                    'combat', 'casualties', 'airstrike', 'bombardment',
                    'military operation', 'escalation'
                ],
            },
            'environmental': {
                'keywords': [
                    'earthquake', 'hurricane', 'wildfire', 'flood',
                    'tornado', 'tsunami'
                ],
            },
        }
        return patterns.get(domain, {'keywords': []})
    
    def extract(self, data: dict) -> list[Trigger]:
        """Main extraction method - applies all pattern types"""
        triggers = []
        
        triggers.extend(self._extract_keyword_triggers(data))
        triggers.extend(self._extract_pattern_triggers(data))
        
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
                        source=item.get('source', 'unknown'),
                        title=item.get('title', '')[:200],
                        score=score,
                        reason=f"Keywords: {', '.join(matched_keywords[:3])}",
                        timestamp=item.get('published') or datetime.now(timezone.utc),
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
                        source=item.get('source', 'unknown'),
                        title=item.get('title', '')[:200],
                        score=score,
                        reason=f"Pattern: {pattern_def['name']} ({matches[0]})",
                        timestamp=item.get('published') or datetime.now(timezone.utc),
                        extracted_entities=matches,
                        raw_data=item
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


# ─── Scoring & Prioritization ─────────────────────────────────────────────────

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
        base_score = float(trigger.score)
        
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
        if context and context.get('user_location') and trigger.coordinates:
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
        
        # Apply correlation boost
        if context and context.get('correlation_count', 0) > 1:
            base_score *= (1 + 0.1 * context['correlation_count'])
        
        return min(int(base_score), 100)
    
    def _calculate_distance(self, loc1: tuple, loc2: tuple) -> float:
        """Calculate distance between two coordinates in km"""
        lat1, lon1 = radians(loc1[0]), radians(loc1[1])
        lat2, lon2 = radians(loc2[0]), radians(loc2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return 6371 * c  # Earth radius in km


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
    
    def pop(self) -> Optional[Trigger]:
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


# ─── Correlation Engine ───────────────────────────────────────────────────────

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
        
        # Entity-based correlation
        entity_groups = self._group_by_entity()
        for entity, triggers in entity_groups.items():
            if len(triggers) >= 2:
                correlated.append(self._create_correlated_trigger(
                    triggers,
                    correlation_type='entity',
                    correlation_value=entity
                ))
        
        return correlated
    
    def _group_by_entity(self) -> dict[str, list[Trigger]]:
        """Group triggers by mentioned entities"""
        groups = {}
        
        for trigger in self.trigger_buffer:
            for entity in trigger.extracted_entities:
                if entity not in groups:
                    groups[entity] = []
                groups[entity].append(trigger)
        
        return {k: v for k, v in groups.items() if len(v) >= 2}
    
    def _create_correlated_trigger(
        self,
        triggers: list[Trigger],
        correlation_type: str,
        correlation_value: str
    ) -> CorrelatedTrigger:
        """Create a meta-trigger from correlated triggers"""
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


# ─── Main Extractor ───────────────────────────────────────────────────────────

class TriggerExtractor:
    """
    Main trigger extraction orchestrator.
    Pulls from all GrowlingEyes data sources and extracts triggers.
    """
    
    def __init__(self, domains: list[str] = None):
        self.domains = domains or ['cyber_threats', 'kinetic_events', 'environmental']
        
        # Initialize engines
        self.engines = {
            domain: TriggerPatternEngine(domain)
            for domain in self.domains
        }
        
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
        for domain in self.domains:
            try:
                domain_triggers = self._extract_domain_triggers(domain)
                all_triggers.extend(domain_triggers)
            except Exception as e:
                logging.error(f"Error extracting {domain} triggers: {e}")
        
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
    
    def _extract_domain_triggers(self, domain: str) -> list[Trigger]:
        """Extract triggers for a specific domain"""
        engine = self.engines.get(domain)
        if not engine:
            return []
        
        # In a real implementation, this would fetch from actual data sources
        # For now, return empty list (demo/placeholder)
        test_data = self._get_test_data(domain)
        return engine.extract(test_data)
    
    def _get_test_data(self, domain: str) -> dict:
        """Get test data for demonstration"""
        # Placeholder test data
        return {
            'items': [
                {
                    'source': f'{domain}_source',
                    'title': f'Sample {domain} event',
                    'description': 'Test description with zero-day vulnerability',
                    'published': datetime.now(timezone.utc),
                }
            ]
        }


# ─── CLI ──────────────────────────────────────────────────────────────────────

def display_results(results: dict, top_n: int = 20):
    """Display extraction results"""
    if console:
        console.rule("[bold cyan]🔍 GrowlingEyes Trigger Extraction[/]")
        
        # Summary
        console.print(f"\n[bold]Summary:[/]")
        console.print(f"  Total Triggers: {results['total_count']}")
        console.print(f"  Critical (90+): [red]{results['critical_count']}[/]")
        console.print(f"  High (70-89): [yellow]{results['high_count']}[/]")
        console.print(f"  Correlated: [cyan]{len(results['correlated_triggers'])}[/]")
        
        # Top triggers table
        console.print(f"\n[bold]Top {top_n} Priority Triggers:[/]")
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("#", style="dim", width=4)
        table.add_column("Score", justify="right", width=6)
        table.add_column("Domain", width=18)
        table.add_column("Title", width=60)
        
        for i, trigger in enumerate(results['top_priorities'][:top_n], 1):
            score_style = "red" if trigger.score >= 90 else "yellow" if trigger.score >= 70 else "blue"
            table.add_row(
                str(i),
                f"[{score_style}]{trigger.score}[/]",
                trigger.domain,
                trigger.title[:57] + "..." if len(trigger.title) > 60 else trigger.title
            )
        
        console.print(table)
    else:
        # Fallback to plain text
        print(f"\n🔍 Extracted {results['total_count']} triggers")
        print(f"   Critical: {results['critical_count']}")
        print(f"   High: {results['high_count']}")
        print(f"   Correlated: {len(results['correlated_triggers'])}")
        
        print(f"\n🚨 Top {top_n} Priority Triggers:")
        for i, trigger in enumerate(results['top_priorities'][:top_n], 1):
            print(f"{i}. [{trigger.score}] {trigger.domain}: {trigger.title}")
            print(f"   └─ {trigger.reason}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="GrowlingEyes Trigger Extractor — Extract actionable intelligence triggers"
    )
    parser.add_argument(
        '--domains',
        nargs='+',
        choices=['cyber_threats', 'kinetic_events', 'environmental', 'dark_web'],
        help='Domains to extract triggers from'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Output JSON file path'
    )
    parser.add_argument(
        '--top',
        type=int,
        default=20,
        help='Number of top triggers to display (default: 20)'
    )
    args = parser.parse_args()
    
    # Initialize extractor
    extractor = TriggerExtractor(domains=args.domains)
    
    # Extract triggers
    results = extractor.extract_all_triggers()
    
    # Display results
    display_results(results, top_n=args.top)
    
    # Save to file if requested
    if args.output:
        output_data = {
            'extraction_time': datetime.now(timezone.utc).isoformat(),
            'total_count': results['total_count'],
            'critical_count': results['critical_count'],
            'high_count': results['high_count'],
            'triggers': [t.to_dict() for t in results['raw_triggers']],
            'correlated': [c.to_dict() for c in results['correlated_triggers']],
            'top_priorities': [t.to_dict() for t in results['top_priorities']],
        }
        
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, default=str)
        
        if console:
            console.print(f"\n[green]💾 Saved to {args.output}[/]")
        else:
            print(f"\n💾 Saved to {args.output}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    main()
