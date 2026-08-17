# Project Management Standards

## Role: Project Manager (PM)

### Budget Responsibility

Every project MUST have a PM responsible for:
- **Budget tracking** - Real-time spending vs. allocated
- **Timeline management** - Milestones, deadlines
- **Resource allocation** - Team hours, contractor costs
- **Risk management** - Identify and mitigate blockers
- **Client communication** - Status updates, change orders

---

## Budget Tracking Template

### Project Budget Breakdown

```python
class ProjectBudget:
    def __init__(self, project_name: str, client_type: str):
        self.project_name = project_name
        self.client_type = client_type  # "private" | "government"
        
        # Base rates
        self.rates = {
            "senior_dev": 1200 if client_type == "private" else 1800,
            "mid_dev": 900 if client_type == "private" else 1350,
            "junior_dev": 600 if client_type == "private" else 900,
            "tech_lead": 1500 if client_type == "private" else 2250,
            "pm": 1000 if client_type == "private" else 1500,
            "designer": 900 if client_type == "private" else 1350,
            "qa": 700 if client_type == "private" else 1050,
            "devops": 1100 if client_type == "private" else 1650,
        }
        
        # Your margin
        self.margin = 0.30 if client_type == "private" else 0.35
        
        # Budget tracking
        self.allocated = {}
        self.spent = {}
        self.remaining = {}
        
    def allocate(self, category: str, days: float):
        """Allocate budget for a category."""
        role = self._category_to_role(category)
        rate = self.rates[role]
        cost = days * rate
        self.allocated[category] = cost
        self.remaining[category] = cost
        
    def track_expense(self, category: str, amount: float):
        """Track actual spending."""
        if category not in self.spent:
            self.spent[category] = 0
        self.spent[category] += amount
        self.remaining[category] = self.allocated.get(category, 0) - self.spent[category]
        
    def get_variance(self, category: str) -> float:
        """Positive = under budget, Negative = over budget."""
        return self.remaining.get(category, 0)
        
    def total_cost(self) -> float:
        """Calculate total project cost."""
        return sum(self.allocated.values())
        
    def total_with_margin(self) -> float:
        """Cost including your margin."""
        return self.total_cost() * (1 + self.margin)
```

---

## Weekly Budget Report

```markdown
# Weekly Budget Report - Week 12

## Project: TheAltText MVP
## Client: Government Contract
## PM: [Your Name]

### Budget Overview
| Category | Allocated | Spent | Remaining | Status |
|----------|-----------|-------|-----------|--------|
| Backend Dev | $54,000 | $42,000 | $12,000 | 🟡 On Track |
| Frontend Dev | $45,000 | $48,500 | -$3,500 | 🔴 Over |
| Design | $13,500 | $12,000 | $1,500 | 🟢 Under |
| DevOps | $9,000 | $8,500 | $500 | 🟢 Under |
| QA | $10,500 | $9,000 | $1,500 | 🟢 Under |
| **TOTAL** | **$132,000** | **$120,000** | **$12,000** | 🟡 |

### This Week Activities
- Backend: Completed auth system
- Frontend: Image upload flow (2 days over)
- Next: Payment integration

### Risks
- Frontend running 10% over budget
- Timeline: 1 week delay expected

### Decisions Needed
1. Approve scope reduction OR approve additional budget?
```

---

## Change Order Process

| Change Type | Approval | Timeline |
|-------------|----------|----------|
| Minor (< 4 hrs) | PM | Same day |
| Medium (4-16 hrs) | PM + Client | 24-48 hrs |
| Major (> 16 hrs) | PM + Client + Refined SOW | 1 week |
| Scope Change | Full re-estimate | 1-2 weeks |

### Change Order Template

```markdown
# Change Order #003

**Project:** [Project Name]
**Date:** [Date]
**Requested By:** [Client Name]

## Description
[Detailed description of change]

## Impact
| Item | Impact |
|------|--------|
| Schedule | +3 days |
| Budget | +$2,400 |
| Scope | No impact |

## Approval
- [ ] Client approves
- [ ] PM approves
- [ ] Finance approves

## Signature
Client: _________________ Date: _______
PM: _________________ Date: _______
```

---

## Milestone Tracking

```python
milestones = [
    {
        "name": "Phase 1: MVP Core",
        "budget": 75000,
        "deadline": "2024-03-01",
        "deliverables": ["Auth", "Image Upload", "Alt Text Generation"]
    },
    {
        "name": "Phase 2: Polish",
        "budget": 50000,
        "deadline": "2024-05-01",
        "deliverables": ["Dashboard", "PWA", "Testing"]
    },
    {
        "name": "Phase 3: Launch",
        "budget": 46000,
        "deadline": "2024-06-01",
        "deliverables": ["Deploy", "Docs", "Training"]
    }
]
```

---

## Government Contract Specific

### Reporting Requirements

```python
govt_reporting = {
    "frequency": "monthly",  # or weekly
    "deliverables": [
        "Progress Report (narrative)",
        "Financial Report (SF-425)",
        "Budget vs Actual",
        "Milestone Status",
        "Risk Log",
        "变更请求 (if any)"
    ],
    "approval_needed": [
        "Budget changes > 10%",
        "Timeline changes > 30 days",
        "Key personnel changes"
    ]
}
```

---

## Project Manager Checklist

- [ ] Project brief signed
- [ ] Budget allocated and tracked
- [ ] Timeline with milestones defined
- [ ] Team assigned with roles
- [ ] Weekly status reports scheduled
- [ ] Change order process explained to client
- [ ] Risk register created
- [ ] Budget variance tracked weekly
- [ ] Client approval for scope changes
- [ ] Final deliverable documentation complete
