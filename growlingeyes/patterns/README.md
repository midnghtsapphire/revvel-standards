# GrowlingEyes Trigger Extraction — Pattern Configurations

This directory contains pattern definitions for trigger extraction across all intelligence domains.

## Structure

```text
patterns/
├── cyber_threats.yml      # CVE, exploits, APT groups, malware
├── kinetic_events.yml     # Combat, casualties, military operations
├── environmental.yml      # Natural disasters, weather, earthquakes
└── README.md             # This file
```

## Pattern Types

### Keywords
Simple string matching for trigger detection.

```yaml
keywords:
  - zero-day
  - ransomware
  - critical vulnerability
```

### Regex Patterns
Advanced pattern matching with scoring.

```yaml
regex:
  - name: CVE_ID
    pattern: CVE-\d{4}-\d{4,7}
    score: 40
```

### Thresholds
Numeric value-based triggers.

```yaml
thresholds:
  - field: magnitude
    threshold: 6.0
    score: 70
    scale: true
```

## Usage

Patterns are loaded by the `TriggerPatternEngine`.

```python
from growlingeyes.tools.trigger_extractor import TriggerPatternEngine

engine = TriggerPatternEngine('cyber_threats')
triggers = engine.extract(data)
```
