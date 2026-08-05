# Recursion Standard

**Version:** 1.0.0  
**Date:** April 15, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Purpose

This standard defines when and how recursion may be used in Revvel production code. While recursion can provide elegant solutions for certain problems, it carries significant risks including stack overflow, memory exhaustion, and performance degradation. This document establishes clear guidelines based on industry best practices and real-world production experiences.

**Goal:** Enable safe, controlled use of recursion while preventing stack overflow crashes and production incidents.

---

## 2. Core Philosophy

**Recursion is permitted but constrained.** Unlike some embedded systems and safety-critical environments that ban recursion entirely, Revvel allows recursion for specific use cases where it provides clear benefits. However, all recursive functions must include mandatory safety mechanisms.

### 2.1. The Recursion Decision Tree

Use this decision tree to determine if recursion is appropriate:

```text
Is the problem naturally recursive (trees, graphs, nested structures)?
├─ NO → Use iteration
└─ YES → Continue
    │
    Can you guarantee maximum depth < 100?
    ├─ NO → Use iteration with explicit stack
    └─ YES → Continue
        │
        Is tail recursion possible in your language?
        ├─ YES → Use tail recursion with depth tracking
        └─ NO → Use recursion with depth guard (max depth check)
```

---

## 3. Approved Use Cases

Recursion is **approved** for the following scenarios:

### 3.1. Directory and File System Traversal
**Example:** Scanning nested directories for specific file types
```typescript
function findFiles(dir: string, pattern: string, depth = 0, maxDepth = 10): string[] {
  if (depth > maxDepth) {
    throw new Error(`Maximum directory depth ${maxDepth} exceeded at ${dir}`);
  }
  // Implementation...
}
```

### 3.2. Tree Traversal (DOM, AST, Data Structures)
**Example:** React component trees, JSON parsing, expression evaluation
```typescript
interface TreeNode {
  value: string;
  children: TreeNode[];
}

function traverseTree(node: TreeNode, depth = 0, maxDepth = 50): void {
  if (depth > maxDepth) {
    throw new Error(`Tree depth exceeds maximum ${maxDepth}`);
  }
  // Process node...
  node.children.forEach(child => traverseTree(child, depth + 1, maxDepth));
}
```

### 3.3. Parsing and Token Processing
**Example:** SQL fragments, markdown parsing, syntax trees
```typescript
function parseExpression(tokens: Token[], depth = 0): ASTNode {
  const MAX_PARSE_DEPTH = 100;
  if (depth > MAX_PARSE_DEPTH) {
    throw new Error('Expression nesting too deep');
  }
  // Parse tokens recursively...
}
```

### 3.4. Graph Algorithms with Known Bounded Depth
**Example:** Component hierarchies, navigation structures
```typescript
function findPath(node: Node, target: string, visited = new Set<string>(), depth = 0): Node[] | null {
  if (depth > 100) return null; // Prevent infinite recursion
  if (visited.has(node.id)) return null; // Prevent cycles
  visited.add(node.id);
  // Graph traversal logic...
}
```

---

## 4. Mandatory Safety Mechanisms

**Every recursive function MUST implement at least one of these safety mechanisms:**

### 4.1. Depth Tracking (Required for all recursion)

All recursive functions must track and limit recursion depth:

```typescript
// ✅ CORRECT - Includes depth parameter and guard
function processNested(data: any, depth = 0, maxDepth = 50): any {
  if (depth > maxDepth) {
    throw new Error(`Recursion depth limit ${maxDepth} exceeded`);
  }
  if (typeof data === 'object') {
    return Object.entries(data).map(([k, v]) => 
      processNested(v, depth + 1, maxDepth)
    );
  }
  return data;
}

// ❌ WRONG - No depth tracking
function processNested(data: any): any {
  if (typeof data === 'object') {
    return Object.entries(data).map(([k, v]) => processNested(v));
  }
  return data;
}
```

### 4.2. Cycle Detection (Required for graphs and references)

When traversing structures with potential cycles, maintain a visited set:

```typescript
function traverse(node: Node, visited = new Set<string>()): void {
  if (visited.has(node.id)) {
    console.warn(`Cycle detected at node ${node.id}`);
    return;
  }
  visited.add(node.id);
  node.children.forEach(child => traverse(child, visited));
}
```

### 4.3. Tail Recursion Optimization (Preferred when available)

Use tail recursion in languages that optimize it (F#, Elixir, some functional languages):

```fsharp
// F# example - tail recursive
let rec factorial n acc =
    if n <= 1 then acc
    else factorial (n - 1) (n * acc)

let result = factorial 1000 1  // Safe for large inputs
```

### 4.4. Convert to Iteration for Production-Critical Paths

For high-volume or production-critical code, convert recursion to iteration:

```typescript
// ❌ AVOID in hot paths - Recursive version
function sumArray(arr: number[], index = 0): number {
  if (index >= arr.length) return 0;
  return arr[index] + sumArray(arr, index + 1);
}

// ✅ PREFERRED in hot paths - Iterative version
function sumArray(arr: number[]): number {
  let sum = 0;
  for (const num of arr) {
    sum += num;
  }
  return sum;
}
```

---

## 5. Forbidden Use Cases

Recursion is **prohibited** in the following scenarios:

### 5.1. Unknown or Unbounded Input Sizes
**❌ NEVER** use recursion when processing user-uploaded data, API responses, or any data where depth is unknown:

```typescript
// ❌ DANGEROUS - User data could be deeply nested
async function processUserData(data: unknown): Promise<any> {
  // Don't recurse on untrusted data without strict limits
}
```

### 5.2. High-Frequency Operations
**❌ AVOID** recursion in functions called thousands of times per second:

- Event handlers (scroll, mousemove, resize)
- Animation frames (requestAnimationFrame callbacks)
- Real-time data processing
- WebSocket message handlers

### 5.3. Large Dataset Processing
**❌ FORBIDDEN** for operations on arrays/lists with >1000 elements:

```typescript
// ❌ WRONG - Will crash on large datasets
function processLargeDataset(items: Item[]): Result[] {
  if (items.length === 0) return [];
  return [transform(items[0]), ...processLargeDataset(items.slice(1))];
}

// ✅ CORRECT - Use iteration or array methods
function processLargeDataset(items: Item[]): Result[] {
  return items.map(transform);
}
```

### 5.4. Embedded Systems and Resource-Constrained Environments
Following industry best practices (as noted in the research), recursion is **banned** in:

- IoT device code
- Mobile app background services
- Low-memory environments
- Systems with limited stack size

---

## 6. Default Depth Limits

Use these maximum depth values unless you have specific justification:

| Use Case | Maximum Depth | Rationale |
|----------|---------------|-----------|
| File system traversal | 20 | Typical directory structures |
| DOM tree traversal | 50 | Deeply nested HTML is rare |
| JSON parsing | 100 | Prevent malicious payloads |
| Expression evaluation | 100 | Reasonable nesting for math/logic |
| Generic recursion | 50 | Conservative safe default |

**Exceeding these limits requires:**
1. Comment explaining why higher depth is needed
2. Code review approval
3. Load testing to verify no stack overflow risk

---

## 7. Testing Requirements

All recursive functions must include these tests:

### 7.1. Maximum Depth Test
```typescript
describe('processNested', () => {
  it('should reject excessively deep nesting', () => {
    const deeplyNested = createNestedObject(100); // Helper creates 100-level nesting
    expect(() => processNested(deeplyNested)).toThrow(/depth limit/i);
  });
});
```

### 7.2. Cycle Detection Test
```typescript
describe('traverseGraph', () => {
  it('should detect and handle cycles', () => {
    const nodeA = { id: 'A', children: [] };
    const nodeB = { id: 'B', children: [nodeA] };
    nodeA.children.push(nodeB); // Create cycle
    
    expect(() => traverseGraph(nodeA)).not.toThrow();
  });
});
```

### 7.3. Large Input Stress Test
```typescript
describe('recursiveFunction', () => {
  it('should handle maximum safe depth without crashing', () => {
    const maxDepth = 1000;
    const deepStructure = createDeepStructure(maxDepth);
    
    // Should either succeed or throw controlled error
    expect(() => recursiveFunction(deepStructure)).not.toThrow(/stack overflow/i);
  });
});
```

---

## 8. Code Review Checklist

Reviewers must verify:

- [ ] Recursion is justified (appears in approved use cases)
- [ ] Depth tracking is implemented with explicit max depth check
- [ ] Maximum depth is appropriate for the use case
- [ ] Cycle detection is present for graph-like structures
- [ ] Error message clearly indicates depth limit exceeded
- [ ] Tests cover maximum depth boundary
- [ ] Tests cover cycle scenarios (if applicable)
- [ ] Comment explains why recursion is preferred over iteration
- [ ] Function is not in a high-frequency code path

---

## 9. Migration Path: Converting Recursion to Iteration

When recursion must be converted to iteration, use an explicit stack:

```typescript
// BEFORE - Recursive
function processTree(node: TreeNode): void {
  console.log(node.value);
  node.children.forEach(child => processTree(child));
}

// AFTER - Iterative with explicit stack
function processTree(root: TreeNode): void {
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop()!;
    console.log(node.value);
    
    // Add children in reverse order to maintain same traversal order
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }
}
```

**Benefits:**
- No stack overflow risk
- Explicit memory management
- Easier to debug
- Better performance for large datasets

---

## 10. Language-Specific Guidance

### 10.1. TypeScript/JavaScript
- No tail call optimization (TCO) in most engines
- Default max stack ~10,000 calls (varies by engine)
- **Recommendation:** Use iteration or explicit stack for depth >100

### 10.2. Python
- Default recursion limit: 1000 (can be increased with `sys.setrecursionlimit()`)
- **Recommendation:** Never increase limit beyond 2000; use iteration instead

### 10.3. Functional Languages (F#, Elixir, Haskell)
- TCO is available and reliable
- Tail recursion is preferred for loops
- **Recommendation:** Use tail-recursive patterns; still track depth for safety

### 10.4. Go
- Goroutines have small initial stack (2KB) that grows dynamically
- **Recommendation:** Safe for moderate recursion; still enforce depth limits

---

## 11. Real-World Examples from the Research

Based on production use cases shared by developers:

### ✅ Good: Directory Search
```typescript
// Used for searching project files with unknown subdirectories
function searchFiles(dir: string, extension: string, depth = 0): string[] {
  if (depth > 20) return []; // Safety limit
  // Recursively search subdirectories
}
```

### ✅ Good: Navbar Visibility
```typescript
// Setting visibility of parent nav items based on children
function updateNavVisibility(item: NavItem, depth = 0): boolean {
  if (depth > 10) return false; // Max menu depth
  const childrenVisible = item.children.some(child => 
    updateNavVisibility(child, depth + 1)
  );
  item.visible = childrenVisible || item.isAccessible;
  return item.visible;
}
```

### ✅ Good: SQL Fragment Parsing
```typescript
// Parsing user-defined filter criteria into AST
function parseSQL(fragment: string, depth = 0): ASTNode {
  if (depth > 100) throw new Error('SQL too complex');
  // Parse recursively with depth guard
}
```

### ❌ Avoid: Pagination with Unknown Pages
```typescript
// Don't use recursion when page count is unknown
// Use a while loop instead
async function fetchAllPages(url: string): Promise<Data[]> {
  const results = [];
  let nextUrl: string | null = url;
  
  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();
    results.push(...data.items);
    nextUrl = data.nextPage;
  }
  
  return results;
}
```

---

## 12. Enforcement

### 12.1. RecurseML Rules
The following patterns are checked automatically on every PR (see `recurse-rules.md`):

- Recursive functions without depth tracking parameter
- Recursive functions without maximum depth check
- Recursion in hot path code (event handlers, loops)

### 12.2. ESLint Rules
Add to `.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    'max-depth': ['error', 4], // Nested code depth
    'complexity': ['warn', 10], // Cyclomatic complexity
    'no-implicit-recursion': 'warn', // Custom rule (if available)
  },
};
```

---

## 13. Reference and Further Reading

### Industry Standards
- **MISRA C** (automotive/embedded): Recursion forbidden
- **JPL Coding Standard** (NASA): Recursion forbidden in flight software
- **Google Style Guides**: Recursion allowed with depth limits
- **OWASP**: Warns against recursion on untrusted input (DoS risk)

### Academic Sources
- "Structure and Interpretation of Computer Programs" (MIT) - Recursive thinking
- "Introduction to Algorithms" (CLRS) - Recursion analysis
- "The Art of Computer Programming" (Knuth) - Recursive algorithms

### Community Discussion
Research source: Reddit r/csharp thread on recursion in production (2024)

**Key takeaways:**
- Most developers avoid recursion for large datasets
- Common use: directory traversal, tree structures, parsing
- Depth tracking is universally recommended
- Iterative solutions preferred for safety-critical systems

---

## 14. Summary

**DO:**
- ✅ Use recursion for trees, graphs, and nested structures with known depth
- ✅ Always track recursion depth with a parameter
- ✅ Set explicit maximum depth limits
- ✅ Implement cycle detection for graphs
- ✅ Test at maximum depth boundaries
- ✅ Document why recursion is chosen over iteration

**DON'T:**
- ❌ Use recursion on untrusted/unknown input sizes
- ❌ Recurse in high-frequency code paths
- ❌ Exceed 100 depth without explicit justification
- ❌ Skip depth tracking to "keep code simple"
- ❌ Use recursion when native iteration is clearer

---

**Version History:**
- 1.0.0 (2026-04-15): Initial release based on industry research and community best practices
