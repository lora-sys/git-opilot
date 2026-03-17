# Agents Overview

git-copilot uses a multi-agent system where each agent specializes in a particular aspect of code review. All agents run in parallel (configurable concurrency) and their findings are aggregated into a unified report.

## Agent List

### SecurityAgent

**Focus:** OWASP Top 10, common vulnerabilities

**Checks:**
- Injection flaws (SQL, NoSQL, OS command, LDAP, XSS, XXE)
- Broken authentication and session management
- Sensitive data exposure
- XML External Entity (XXE) attacks
- Broken access control
- Security misconfigurations
- Cross-Site Request Forgery (CSRF)
- Using components with known vulnerabilities

**Output:** Critical/High severity findings with remediation steps

**Typical runtime:** 30-60 seconds

### PerformanceAgent

**Focus:** Performance bottlenecks and resource inefficiencies

**Checks:**
- Algorithmic complexity (big-O) for loops and recursion
- N+1 query problems in database access
- Inefficient data structures or algorithms
- Memory leaks (unclosed resources, event listeners)
- Unnecessary re-renders or computations
- Blocking I/O operations
- Caching opportunities

**Output:** Medium/Low severity findings with optimization suggestions

**Typical runtime:** 20-40 seconds

### ArchitectureAgent

**Focus:** High-level design, patterns, and code organization

**Checks:**
- Violations of SOLID principles
- High coupling, low cohesion
- God classes and feature envy
- Appropriate use of design patterns
- Separation of concerns (layering)
- Dependency direction (dependency inversion)
- Modularity and reusability

**Output:** Architectural recommendations (info/medium severity)

**Typical runtime:** 25-50 seconds

### CodeQualityAgent

**Focus:** Code readability, maintainability, and best practices

**Checks:**
- Cyclomatic complexity thresholds
- Code duplication (copy-paste detection)
- Naming conventions (self-documenting)
- Function/method length
- Comment quality and documentation
- Magic numbers and strings
- Error handling adequacy
- Unused code and dead branches

**Output:** Low/Info severity findings with refactoring tips

**Typical runtime:** 15-30 seconds

### DependencyAgent

**Focus:** Third-party dependencies and supply chain security

**Checks:**
- Known CVEs in dependencies (via vulnerability databases)
- Outdated packages (latest version available)
- License compatibility issues
- Dependency bloat (unnecessary dependencies)
- Security advisories
- Unmaintained packages

**Output:** Critical/High severity findings for CVEs, Medium for outdated

**Typical runtime:** 10-20 seconds

### GitHistoryAgent

**Focus:** Commit hygiene and historical issues

**Checks:**
- Secrets accidentally committed (API keys, passwords, tokens)
- Sensitive file changes (certificates, keys)
- Large binary files in repository
- Merge commits without proper messages
- Commit message format adherence
- Too many files changed in a single commit

**Output:** Critical findings for secrets, suggestions for improvement

**Typical runtime:** 5-15 seconds

## Agent Execution

### Parallel Execution

Agents are executed in batches respecting `maxConcurrent` (default 4). Each agent receives:
- The full file content list
- Shared store with memory and Beads context

Agents run independently and write their results to `store.results[agentName]`.

### Context Injection

Before running, each agent can query the memory system (`store.memoryManager.searchFindings`) to retrieve related historical findings. This provides cross-session context (e.g., SecurityAgent findings from previous reviews are available to PerformanceAgent).

### Beads Task Coordination

When Beads is enabled, each agent creates a sub-task under the main review epic, claims it, and links findings via `relatedTaskId`.

## Custom Agents

You can extend git-copilot by creating custom agents:

1. Extend `BaseAgent`
2. Implement `getType()`, `analyze()`, and optionally `buildPrompt()`
3. Register in the workflow (or via config)

See the source code in `src/agents/` for examples.

## Tuning

- Adjust `maxConcurrent` to control parallelism (higher = faster but more LLM API load)
- Disable specific agents via config `skipAgents: ['security', 'performance']`
- Per-agent LLM model selection (future)
