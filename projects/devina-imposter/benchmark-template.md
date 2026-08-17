# Benchmark Task Template

Use this template when creating a new benchmark task for evaluating AI coding agents.

## Task ID

[Unique identifier, e.g., BM-001]

## Task Name

[Short, descriptive name]

## Difficulty Level

[Beginner/Intermediate/Advanced/Expert]

## Category

[Feature Addition/Bug Fix/Refactoring/Integration/Full Feature/Security/Performance]

## Time Estimate

**Expected**: [X minutes/hours]
**Actual range from evaluations**: [Y-Z minutes/hours]

## Task Description

[Detailed description of what needs to be done. Be specific and unambiguous.]

## Starting Context

### Repository State

- [Initial state of codebase]
- [Existing files and their purposes]
- [Current functionality]

### Files to Modify/Create

- `path/to/file1.ext` — [Purpose]
- `path/to/file2.ext` — [Purpose]

### Technologies Used

- [Language]
- [Framework]
- [Libraries/packages]
- [Tools]

## Requirements

### Functional Requirements

1. [Requirement 1]
2. [Requirement 2]
3. [Requirement 3]

### Non-Functional Requirements

1. [Performance requirement]
2. [Security requirement]
3. [Code quality requirement]

### Edge Cases to Handle

- [Edge case 1]
- [Edge case 2]
- [Edge case 3]

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Code passes linting
- [ ] Tests are passing
- [ ] Documentation is updated

## Test Cases

### Test Case 1: [Name]

**Input**: [Input data]
**Expected Output**: [Expected result]
**Actual Output**: [To be filled by evaluator]

### Test Case 2: [Name]

**Input**: [Input data]
**Expected Output**: [Expected result]
**Actual Output**: [To be filled by evaluator]

## Setup Instructions

### Prerequisites

```bash
# Commands to set up the test environment
```

### Initial Codebase

```bash
# How to clone/initialize the starting point
git clone [repo]
cd [directory]
git checkout [specific commit/tag]
```

## Evaluation Criteria

### Code Quality (0-5)

- Follows language/framework conventions
- Properly structured
- Readable and maintainable

### Correctness (0-5)

- Passes all test cases
- Handles edge cases
- No bugs introduced

### Completeness (0-5)

- All requirements met
- Tests included
- Documentation updated

### Efficiency (0-5)

- Optimal algorithm choice
- Resource usage
- Performance considerations

### Security (0-5)

- No security vulnerabilities
- Input validation
- Error handling

## Common Pitfalls

- [Pitfall 1 that agents commonly encounter]
- [Pitfall 2 that agents commonly encounter]
- [Pitfall 3 that agents commonly encounter]

## Example Solution

<details>
<summary>Click to reveal example solution (for reference only)</summary>

```language
// Example implementation
// This should be a working solution that demonstrates
// the expected outcome
```

</details>

## Evaluation Results

### Agent 1: [Name]

**Date**: [YYYY-MM-DD]
**Result**: [Pass/Partial/Fail]
**Time Taken**: [X minutes]
**Scores**:
- Code Quality: X/5
- Correctness: X/5
- Completeness: X/5
- Efficiency: X/5
- Security: X/5

**Notes**: [Observations, what worked, what didn't]

### Agent 2: [Name]

[Same format as above]

## Leaderboard

| Rank | Agent | Total Score | Time | Notes |
|------|-------|-------------|------|-------|
| 1    | [Agent]| X/25       | Xm   | [Note]|
| 2    | [Agent]| X/25       | Xm   | [Note]|

## Related Tasks

- [BM-XXX] — [Related benchmark name]
- [BM-YYY] — [Related benchmark name]

## Updates & Changelog

### Version 1.1 - [Date]

- [Change description]
- [Reason for change]

### Version 1.0 - [Date]

- Initial release

## Discussion & Feedback

[Link to GitHub discussion thread for this benchmark]

## References

- [Link to relevant documentation]
- [Link to similar real-world scenario]
- [Link to related standards or best practices]

---

*This benchmark is part of the devina-imposter evaluation framework. Contributions and improvements welcome.*
