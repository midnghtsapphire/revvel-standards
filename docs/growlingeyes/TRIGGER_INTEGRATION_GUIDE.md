# GrowlingEyes Trigger Extraction — Integration Guide

This guide shows how to integrate the trigger extraction engine into existing GrowlingEyes tools.

## Integration with apt_signals.py

```python
# At the end of apt_signals.py

from trigger_extractor import TriggerPatternEngine, Trigger

def extract_triggers_from_signals(signals: list[APTSignal]) -> list[Trigger]:
    """Convert APT signals to triggers using pattern engine"""
    engine = TriggerPatternEngine('cyber_threats')
    
    # Convert APTSignals to standard data format
    data = {
        'items': [
            {
                'source': signal.source,
                'title': signal.title,
                'description': signal.description,
                'published': signal.published,
            }
            for signal in signals
        ]
    }
    
    return engine.extract(data)

# In main() function, after fetching signals:
if __name__ == '__main__':
    # ... existing code ...
    
    signals = fetch_all(sources=args.sources, limit=args.limit)
    
    # NEW: Extract triggers
    if args.extract_triggers:
        from trigger_extractor import extract_triggers_from_signals
        triggers = extract_triggers_from_signals(signals)
        
        if triggers:
            console.print("\n[bold cyan]🚨 Extracted Triggers[/]")
            for trigger in triggers:
                score_style = "red" if trigger.score >= 90 else "yellow"
                console.print(f"  [{score_style}][{trigger.score}][/] {trigger.title}")
    
    # ... rest of existing code ...
```

## Integration with news_feed.py

```python
# At the end of news_feed.py

def extract_triggers_from_news(articles: list[NewsArticle]) -> list[Trigger]:
    """Extract triggers from news articles based on topic"""
    from trigger_extractor import TriggerPatternEngine
    
    # Group articles by topic/domain
    domain_map = {
        'cyber': 'cyber_threats',
        'military': 'kinetic_events',
        'disaster': 'environmental',
    }
    
    all_triggers = []
    
    for topic, domain in domain_map.items():
        topic_articles = [a for a in articles if a.topic == topic]
        if not topic_articles:
            continue
        
        engine = TriggerPatternEngine(domain)
        data = {
            'items': [
                {
                    'source': 'google_news',
                    'title': a.title,
                    'description': a.description,
                    'published': a.published_date,
                }
                for a in topic_articles
            ]
        }
        
        triggers = engine.extract(data)
        all_triggers.extend(triggers)
    
    return all_triggers
```

## Integration with scraper.py

```python
# In scraper.py, after scraping

def extract_triggers_from_scraped_items(items: list[ScrapedItem]) -> list[Trigger]:
    """Extract triggers from scraped intelligence data"""
    from trigger_extractor import TriggerPatternEngine
    
    # Map scrapers to domains
    domain_map = {
        'faa_tfr': 'maritime',
        'nifc_fires': 'environmental',
        'ofac_sdn': 'counter_intelligence',
        'un_sanctions': 'counter_intelligence',
    }
    
    all_triggers = []
    
    for scraper_name, domain in domain_map.items():
        scraper_items = [i for i in items if i.source == scraper_name]
        if not scraper_items:
            continue
        
        engine = TriggerPatternEngine(domain)
        data = {
            'items': [
                {
                    'source': item.source,
                    'title': item.title,
                    'description': item.description or '',
                    'published': item.timestamp,
                }
                for item in scraper_items
            ]
        }
        
        triggers = engine.extract(data)
        all_triggers.extend(triggers)
    
    return all_triggers
```

## Full Integration Example

Create a unified trigger extraction service that pulls from all sources:

```python
#!/usr/bin/env python3
"""
unified_trigger_service.py — Unified Trigger Extraction Service
Pulls from all GrowlingEyes data sources and extracts triggers continuously.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List

from tools.apt_signals import fetch_all_signals
from tools.news_feed import fetch_news
from tools.scraper import scrape_all
from tools.trigger_extractor import TriggerExtractor, Trigger

logger = logging.getLogger(__name__)


class UnifiedTriggerService:
    """Service that pulls from all OSINT sources and extracts triggers"""
    
    def __init__(self):
        self.extractor = TriggerExtractor(
            domains=['cyber_threats', 'kinetic_events', 'environmental']
        )
        self.last_run = None
    
    async def run_extraction_cycle(self) -> dict:
        """Run one complete extraction cycle across all sources"""
        logger.info("Starting extraction cycle...")
        
        all_triggers = []
        
        # 1. Fetch APT signals
        try:
            signals = fetch_all_signals(sources=['cisa', 'nvd', 'otx'])
            logger.info(f"Fetched {len(signals)} APT signals")
            
            # Convert to triggers
            for signal in signals:
                # Use existing signal scoring logic
                if signal.severity == 'critical':
                    score = 90
                elif signal.severity == 'high':
                    score = 70
                else:
                    score = 50
                
                trigger = Trigger(
                    domain='cyber_threats',
                    source=signal.source,
                    title=signal.title,
                    score=score,
                    reason=f"APT signal: {signal.severity}",
                    timestamp=signal.published,
                    raw_data=vars(signal)
                )
                all_triggers.append(trigger)
        
        except Exception as e:
            logger.error(f"Error fetching APT signals: {e}")
        
        # 2. Fetch news
        try:
            # Would integrate with actual news fetching
            pass
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
        
        # 3. Fetch scraped data
        try:
            items = scrape_all(targets=['faa_tfr', 'nifc_fires'], limit=25)
            logger.info(f"Scraped {len(items)} items")
            # Convert to triggers...
        except Exception as e:
            logger.error(f"Error scraping: {e}")
        
        # 4. Score and correlate
        results = self.extractor.correlation_engine.correlate(all_triggers)
        
        self.last_run = datetime.now(timezone.utc)
        
        return {
            'timestamp': self.last_run,
            'triggers': all_triggers,
            'correlated': results,
            'total_count': len(all_triggers),
        }
    
    async def run_continuous(self, interval_seconds: int = 300):
        """Run extraction continuously at specified interval"""
        logger.info(f"Starting continuous trigger extraction (interval: {interval_seconds}s)")
        
        while True:
            try:
                results = await self.run_extraction_cycle()
                logger.info(
                    f"Extraction complete: {results['total_count']} triggers, "
                    f"{len(results['correlated'])} correlated"
                )
                
                # Store in database, send alerts, etc.
                await self._store_triggers(results)
                await self._send_alerts(results)
                
            except Exception as e:
                logger.error(f"Error in extraction cycle: {e}", exc_info=True)
            
            await asyncio.sleep(interval_seconds)
    
    async def _store_triggers(self, results: dict):
        """Store triggers in database"""
        # TODO: Implement database storage
        pass
    
    async def _send_alerts(self, results: dict):
        """Send alerts for high-priority triggers"""
        critical_triggers = [
            t for t in results['triggers'] 
            if t.score >= 90
        ]
        
        if critical_triggers:
            logger.warning(f"⚠️  {len(critical_triggers)} CRITICAL triggers detected!")
            # TODO: Send notifications (email, Slack, etc.)


async def main():
    service = UnifiedTriggerService()
    await service.run_continuous(interval_seconds=300)  # Run every 5 minutes


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())
```

## Database Storage Integration

```python
import psycopg2
import json

def store_triggers_in_db(triggers: List[Trigger], conn):
    """Store extracted triggers in PostgreSQL database"""
    cur = conn.cursor()
    
    for trigger in triggers:
        try:
            cur.execute("""
                INSERT INTO triggers (
                    domain, source, title, score, reason, timestamp,
                    coordinates, affected_areas, extracted_entities, raw_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                trigger.domain,
                trigger.source,
                trigger.title[:200],  # Truncate if needed
                trigger.score,
                trigger.reason,
                trigger.timestamp,
                (
                    f"({trigger.coordinates[0]},{trigger.coordinates[1]})" 
                    if trigger.coordinates else None
                ),
                trigger.affected_areas,
                json.dumps(trigger.extracted_entities),
                json.dumps(trigger.raw_data, default=str)
            ))
            
            trigger_id = cur.fetchone()[0]
            logger.debug(f"Stored trigger {trigger_id}: {trigger.title[:50]}")
        
        except Exception as e:
            logger.error(f"Error storing trigger: {e}")
            conn.rollback()
    
    conn.commit()


# Usage in service
async def _store_triggers(self, results: dict):
    """Store triggers in database"""
    with psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD')
    ) as conn:
        store_triggers_in_db(results['triggers'], conn)
```

## Testing Integration

```python
# tests/test_trigger_integration.py

import pytest
from datetime import datetime, timezone
from tools.apt_signals import APTSignal
from tools.trigger_extractor import TriggerPatternEngine

def test_apt_signal_to_trigger():
    """Test converting APT signals to triggers"""
    signal = APTSignal(
        source='cisa',
        title='CVE-2024-1234 - Critical RCE in Apache',
        description='CVSS 9.8 - Actively exploited zero-day',
        cves=['CVE-2024-1234'],
        severity='critical',
        published=datetime.now(timezone.utc),
    )
    
    engine = TriggerPatternEngine('cyber_threats')
    data = {
        'items': [{
            'source': signal.source,
            'title': signal.title,
            'description': signal.description,
            'published': signal.published,
        }]
    }
    
    triggers = engine.extract(data)
    
    assert len(triggers) > 0
    assert triggers[0].domain == 'cyber_threats'
    assert triggers[0].score >= 70  # Should be high priority
    assert 'CVE-2024-1234' in str(triggers[0].extracted_entities)
```

## Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Run unified service
python tools/unified_trigger_service.py

# Run as systemd service
sudo cp systemd/growlingeyes-triggers.service /etc/systemd/system/
sudo systemctl enable growlingeyes-triggers
sudo systemctl start growlingeyes-triggers
```

## Monitoring

```python
# Monitor trigger extraction metrics
import prometheus_client as prom

trigger_extraction_counter = prom.Counter(
    'growlingeyes_triggers_extracted_total',
    'Total triggers extracted',
    ['domain', 'severity']
)

trigger_extraction_duration = prom.Histogram(
    'growlingeyes_trigger_extraction_duration_seconds',
    'Time spent extracting triggers'
)

# In extraction code:
with trigger_extraction_duration.time():
    results = await service.run_extraction_cycle()

for trigger in results['triggers']:
    severity = 'critical' if trigger.score >= 90 else 'high' if trigger.score >= 70 else 'medium'
    trigger_extraction_counter.labels(
        domain=trigger.domain,
        severity=severity
    ).inc()
```
