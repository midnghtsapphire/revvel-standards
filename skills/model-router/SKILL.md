# Model Router Skill

## Purpose
Intelligent model selection based on task complexity and cost optimization to maximize efficiency while minimizing token usage costs.

## Core Selection Criteria

### Sonnet Optimization (Cost-Effective)
**Best for:**
- Implementation loops and iterative fixes
- Code corrections and bug fixing
- Test execution and validation cycles
- Repetitive tasks and routine operations
- Documentation and standard responses

**Characteristics:**
- Lower token costs per operation
- Fast response times for iterations
- Excellent for grunt work and fixes
- Reliable for well-defined tasks

### Opus Optimization (Quality-Focused)
**Best for:**
- Complex requirements analysis
- Architectural design decisions
- Feature planning and breakdown
- Creative problem solving
- Strategic thinking and planning

**Characteristics:**
- Higher token costs but superior reasoning
- Better handling of complex, ambiguous problems
- More thorough analysis and consideration
- Superior for novel and challenging tasks

## Decision Framework

### Complexity Scoring (1-10 scale)
- **1-3**: Simple, routine tasks → **Sonnet**
- **4-6**: Moderate complexity, some analysis needed → **Sonnet** (with Opus escalation option)
- **7-8**: Complex analysis, multiple considerations → **Opus**
- **9-10**: Highly complex, strategic, or creative work → **Opus**

### Task Type Classifications
**Sonnet Tasks:**
- Bug fixes and error corrections
- Code refactoring and cleanup  
- Test writing and execution
- Documentation updates
- Routine implementations

**Opus Tasks:**
- Requirements analysis and breakdown
- Architecture and design decisions
- Complex feature planning
- Strategic problem solving
- Creative solution development

## Usage Patterns from Production

### Ralph Loop Integration
- **Initial Planning**: Opus for test suite design
- **Implementation Loop**: Sonnet for code and fixes
- **Complex Debugging**: Escalate to Opus when Sonnet struggles

### Multi-Agent Coordination
- **TODO Breakdown**: Opus for requirements analysis
- **Individual TODO Implementation**: Sonnet for execution
- **Conflict Resolution**: Opus for complex merge decisions

## Cost Optimization Strategies

### Budget-Conscious Routing
- Start with Sonnet for all tasks
- Escalate to Opus only when Sonnet fails or struggles
- Track cost/benefit ratios for routing decisions
- Learn from successful/failed model selections

### Performance Monitoring
- Track success rates by model and task type
- Monitor cost per successful completion
- Identify tasks where model choice matters most
- Refine routing logic based on results

## Automatic Escalation Triggers
- Sonnet fails after 3 attempts → Escalate to Opus
- Task complexity increases during execution → Consider Opus
- User explicitly requests higher-quality analysis → Use Opus
- Strategic decisions required → Always use Opus

## Integration Points
- Works with all skills that require model selection
- Supports ralph-loop test-driven development
- Compatible with parallel development workflows
- Feeds cost optimization data to wrap-up skill

## Success Criteria
- Optimal cost/performance ratio across all tasks
- Reduced token costs without sacrificing quality
- Improved task completion rates through appropriate model selection
- Clear metrics on model effectiveness by task type

## Rule
Default to Sonnet for implementation and fixes. Use Opus for analysis and planning. Always escalate when Sonnet struggles. Track and optimize routing decisions based on results.
