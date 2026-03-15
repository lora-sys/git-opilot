# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**git-copilot** is an intelligent CLI code collaboration assistant that integrates deeply with local Git repositories. It performs automated code review using a multi-agent parallel analysis framework and presents Git history, Issue/PR status, and review reports through an intuitive terminal UI.

**Key Characteristics:**
- **Local-first**: All data processing, configuration, and report generation remain on the local machine
- **Multi-LLM support**: Supports 40+ providers (OpenAI, Anthropic Claude, DeepSeek, Ollama, etc.)
- **Multi-agent parallel**: Uses PocketFlow framework to decompose code review into specialized agents running in parallel
- **Claude Skills integration**: Leverages Claude Skills mechanism for domain-specific expertise
- **Beads memory system**: Uses Beads as the core memory engine for cross-agent, cross-session context management
- **Zero-friction**: Installs via npx/pipx/Homebrew, no complex configuration needed

**Tech Stack:**
- **Runtime**: Node.js 20 LTS
- **CLI Framework**: Commander.js + Inquirer.js
- **Terminal UI**: Ink (React) + Blessed
- **Git Operations**: simple-git
- **Multi-agent**: PocketFlow (DAG workflow)
- **Memory System**: Beads (core)
- **LLM Abstraction**: Custom Provider Adapter layer
- **Config Storage**: YAML + keytar (encrypted API keys)
- **Data Storage**: SQLite (better-sqlite3) for review history and long-term memories
- **Report Rendering**: Marked + marked-terminal + Shiki (syntax highlighting)
- **Testing**: Vitest + Playwright

## Development Status

This is a **greenfield project**. The codebase does not yet exist. The PRD (v1.1) defines the complete product specification, architecture, and implementation milestones (M1-M7). Development should follow the staged approach outlined in Section 7.

## Repository Structure (Planned)

```
git-copilot/
├── src/
│   ├── cli/                    # Commander.js command definitions
│   │   ├── commands/
│   │   │   ├── init.js
│   │   │   ├── config.js
│   │   │   ├── review.js
│   │   │   ├── graph.js
│   │   │   ├── dashboard.js
│   │   │   ├── export.js
│   │   │   └── skills.js
│   │   └── index.js           # CLI entry point
│   ├── config/
│   │   ├── manager.js         # Config load/save/validate
│   │   └── schema.yaml        # Config schema
│   ├── git/
│   │   └── collector.js       # Git data collection (simple-git wrapper)
│   ├── llm/
│   │   ├── adapter.js         # Base LLM adapter interface
│   │   ├── providers/         # Provider-specific implementations
│   │   │   ├── openai.js
│   │   │   ├── anthropic.js
│   │   │   ├── ollama.js
│   │   │   └── ...
│   │   └── factory.js         # Provider factory
│   ├── agents/
│   │   ├── base.js            # BaseAgent class
│   │   ├── security.js        # SecurityAgent (OWASP)
│   │   ├── performance.js     # PerformanceAgent
│   │   ├── architecture.js    # ArchitectureAgent
│   │   ├── code-quality.js    # CodeQualityAgent
│   │   ├── dependency.js      # DependencyAgent
│   │   ├── git-history.js     # GitHistoryAgent
│   │   ├── aggregator.js      # AggregatorAgent
│   │   └── report-writer.js   # ReportWriterAgent
│   ├── skills/
│   │   ├── manager.js         # Skill loading and management
│   │   ├── built-in/          # Bundled Claude Skills
│   │   │   ├── code-review/
│   │   │   ├── secure-code-review/
│   │   │   ├── owasp-audit/
│   │   │   ├── web-design-audit/
│   │   │   ├── docx/
│   │   │   ├── pdf/
│   │   │   ├── pptx/
│   │   │   ├── xlsx/
│   │   │   └── ...
│   │   └── custom/            # User-provided skills (from config)
│   ├── beads/
│   │   ├── memory.js          # Beads memory engine core
│   │   ├── bead.js            # Bead class definition
│   │   ├── storage.js         # SQLite persistence layer
│   │   ├── retrieval.js       # Vector + keyword search
│   │   └── embedding.js       # Local embedding model integration
│   ├── pocketflow/
│   │   ├── workflow.js        # Main DAG workflow definition
│   │   ├── nodes/
│   │   │   ├── async-parallel-batch.js  # For parallel agents
│   │   │   └── aggregator.js
│   │   └── shared-store.js    # Shared data store across nodes
│   ├── ui/
│   │   ├── components/        # Ink/React components
│   │   │   ├── ProgressDashboard.js
│   │   │   ├── AgentStatus.js
│   │   │   ├── FileTree.js
│   │   │   ├── ReportViewer.js
│   │   │   └── GitGraph.js
│   │   ├── themes/            # Terminal color themes
│   │   └── renderers/         # Markdown/HTML renderers
│   ├── reports/
│   │   ├── generator.js       # Report generation orchestrator
│   │   ├── templates/         # Report templates (MD/HTML)
│   │   └── exporters/         # Format exporters (docx/pdf/pptx/xlsx)
│   ├── utils/
│   │   ├── logger.js
│   │   ├── errors.js
│   │   └── file-utils.js
│   └── index.js               # Main entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── skills/                    # Default skills bundled with the tool
│   ├── code-review/
│   ├── secure-code-review/
│   ├── owasp-audit/
│   ├── web-design-audit/
│   ├── code-review-report/
│   ├── docx/
│   ├── pdf/
│   ├── pptx/
│   ├── xlsx/
│   ├── frontend-design/
│   ├── web-artifacts-builder/
│   ├── theme-factory/
│   ├── doc-coauthoring/
│   ├── internal-comms/
│   ├── mcp-builder/
│   └── skill-creator/
├── templates/                 # HTML/Office templates
├── .gitignore
├── .npmrc
├── package.json
├── tsconfig.json (or jsconfig.json)
├── README.md
├── CLAUDE.md                  # This file
└── git-copilot-PRD-v1.1.md    # Product requirements
```

## Common Development Commands

### Setup & Installation
```bash
# Install dependencies
bun install

# Link for local development
bun link

# Build (if TypeScript)
bun run build

# Watch mode (if TypeScript)
bun run dev
```

### Testing
```bash
# Run all tests
bun test

# Run unit tests only
bun run test:unit

# Run integration tests
bun run test:integration

# Run with coverage
bun run test:coverage

# Run a single test file
bun x vitest path/to/testfile.test.js

# Run E2E tests (Playwright)
bun run test:e2e
```

### Code Quality
```bash
# Lint code
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Format code
bun run format

# Type check (TypeScript)
bun run typecheck
```

### Development Workflow
```bash
# Build and link for local testing
bun run build && bun link

# Test the CLI directly
git-copilot --help
git-copilot init
git-copilot review

# Run a specific command from source
node src/cli/index.js review
```

### Release & Publishing
```bash
# Create release build
bun run build
bun pack

# Bump version
bun version patch|minor|major

# Publish to npm
bun publish
```

*(Note: Actual commands may vary based on final package.json configuration)*

## Architecture Deep Dive

### 1. Multi-Agent System (PocketFlow)

The code review workflow consists of three stages:

```
Stage 1: Parallel Analysis
├── SecurityAgent      (OWASP, XSS, injection)
├── PerformanceAgent   (complexity, N+1, memory leaks)
├── ArchitectureAgent  (design patterns, coupling)
├── CodeQualityAgent   (complexity, duplication)
├── DependencyAgent    (CVE, outdated deps)
└── GitHistoryAgent    (commit hygiene, secrets)

        ↓ Aggregator Agent (deduplication, severity scoring)

Stage 2: Aggregation
└── AggregatorAgent → produces unified findings

        ↓ ReportWriter Agent

Stage 3: Report Generation
└── ReportWriterAgent → renders in configured format(s)
```

All agents run concurrently using `AsyncParallelBatchNode` (default: 4 concurrent agents). Each agent writes to `shared_store.results[agent_name]`.

### 2. Beads Memory System (Core Differentiator)

**Bead** = structured memory unit with metadata:
```javascript
{
  id: "uuid",
  content: "string | object",
  type: "code_snippet" | "issue_finding" | "agent_conclusion" | "repo_context" | "skill_knowledge" | "user_preference",
  priority: 0-10,
  ttl: seconds | "permanent",
  tags: ["array"],
  embedding?: float[],  // computed on retrieval
  createdAt: Date,
  agentSource?: "agent-name"
}
```

**Memory Flow:**
1. During review: short-term beads stored in-memory, shared via `shared_store`
2. Post-review: critical findings → long-term beads → SQLite persistence
3. Next review: beads engine loads relevant historical beads (by tags/similarity)
4. Cross-agent: SecurityAgent finding → auto-injected into PerformanceAgent context

**Configuration:**
- `beads.max_context_tokens`: 4096 (max beads injected per LLM call)
- `beads.long_term_retention_days`: 90
- `beads.embedding_model`: nomic-embed-text (via Ollama for local embedding)
- `beads.cross_agent_sharing`: true
- `beads.semantic_search_threshold`: 0.75

### 3. LLM Provider Abstraction

All providers implement the `LLMAdapter` interface:
```javascript
class BaseAdapter {
  async chat(messages, options) { }
  async stream(messages, options) { }
  async countTokens(text) { }
}

// Concrete implementations:
// - OpenAIAdapter
// - AnthropicAdapter (Claude-specific: handles system prompts, Tools)
// - OllamaAdapter
// - LiteLLMProxyAdapter
// - ... (40+ providers)
```

The adapter normalizes API differences (streaming, token counting, rate limits). Provider selection is configured in `config.yaml`, with hot-swapping support.

### 4. Claude Skills Integration

When using Anthropic Claude, agents dynamically load relevant Skills (markdown knowledge bases) at initialization. Skills are loaded in priority order:
1. User custom skills (highest priority, override built-in)
2. Built-in domain skills (security, architecture, etc.)
3. General output formatting skills (docx, pdf, theme-factory, etc.)

Each Skill defines:
- Context injection prompts
- Domain-specific examples
- Output formatting rules
- Reasoning patterns

Skills support hot-reload via `git-copilot update`.

### 5. Terminal UI (Ink + Blessed)

- **Component-based UI** using Ink (React for terminal)
- **Blessed** for low-level terminal control (graphs, key handling)
- **Color scheme**: Red=high-risk, Yellow=medium, Green=pass, Blue=info, Gray=skipped
- **Responsive**: Adapts to terminal width (min 80 cols), switches to compact mode on small screens
- **Accessibility**: `--no-color` flag for monochrome terminals
- **Progressive disclosure**: Default shows summary, `e` expands details

### 6. Git Visualization (`git-copilot graph`)

- Renders DAG commit history using ASCII/Unicode box-drawing characters
- Supports navigation (j/k arrows), search (/), and detail expansion (Enter)
- Color-coded by author/time/commit type
- Branch/tag hover indicators
- Time-range filtering

### 7. Report System

**Output Formats:**
- **Terminal**: colored Markdown rendering (default)
- **Markdown**: `.md` file (paste into PR comments)
- **HTML**: standalone with 10 themes (via `frontend-design`, `theme-factory`)
- **DOCX**: Word format with TOC, page numbers, styled code blocks
- **PDF**: protected/watermarked for compliance
- **PPTX**: architecture review slides (module graphs, tech debt heatmaps)
- **XLSX**: dependency matrix, CVE lists, quality metrics
- **JSON**: structured data for CI integration

Report structure (Section 2.5.1):
1. Executive Summary
2. Security Review
3. Code Quality
4. Performance Optimization
5. Architecture Recommendations
6. Dependency Health
7. Git Health
8. Fix Examples

## Code Style & Engineering Practices

From Section 3.5 of the PRD:

### Naming Conventions
- Variables/functions/methods: `camelCase`
- Classes/components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files/folders: `kebab-case`
- CLI commands: `kebab-case` (e.g., `git-copilot`)

### Formatting & Quality
- Use Prettier (auto-format on save/commit)
- ESLint with Airbnb or Standard ruleset
- TypeScript strictly enforced (`strict: true`)
- Max line length: 120 characters
- 2-4 space indentation (consistent per file)

### Modularity Principles
- Single Responsibility Principle (SRP)
- High cohesion, low coupling
- Prefer function components and pure functions
- Extract reusable utility functions
- UI components should be composable via Props

### Performance
- Lazy load large components (`React.lazy` + `Suspense`)
- Memoization: `React.memo`, `useMemo`, `useCallback`
- Virtual lists for large datasets
- Avoid blocking main thread (use Workers for heavy compute)
- Debounce/throttle UI event handlers

### Error Handling
- Error boundaries for UI components
- Try-catch for all async operations
- Clear, user-friendly error messages (no stack traces in production)
- Log errors with context (use structured logging)

### Security
- Never hardcode secrets (use `process.env` or config with keytar)
- Validate and sanitize all user input
- Escape output when rendering (XSS prevention)
- Encrypt sensitive data at rest (API keys)

## Critical Patterns

### Configuration Management
- Config file: `~/.git-copilot/config.yaml`
- Use the Config Manager (`src/config/manager.js`) to read/write
- API keys encrypted via `keytar` system keychain
- Config validation on load and before save

### Git Operations
- Always use `simple-git` wrapper, never `child_process` for git
- Batch git queries where possible (performance)
- Respect `.gitignore` when scanning files
- Use `git ls-files` for tracked files, `git diff` for changes

### LLM API Usage
- Respect rate limits (exponential backoff, max 3 retries)
- Implement token counting, respect context window
- Streaming responses for long operations
- Timeout handling (configurable per provider)
- Graceful degradation: if one provider fails, optionally fallback to another

### Beads Memory
- Short-term: in-memory only, cleared after session
- Long-term: SQLite, auto-expire after `retention_days`
- Semantic search: use embedding model, cache embeddings
- Cross-agent sharing: write beads to `shared_store.beads` array

### Testing Strategy
- Unit tests: individual agents, adapters, utils (Vitest)
- Integration tests: full review workflow (Vitest + fixtures)
- E2E tests: CLI commands end-to-end (Playwright + terminal mock)
- Snapshot tests: report output, terminal UI renders
- Mock LLM responses to avoid API calls in tests

## Important Files & Sections

Key sections of the PRD to reference:
- **Section 1**: Project overview and value proposition
- **Section 2.4**: Multi-agent architecture and agent specifications
- **Section 2.4.3**: Claude Skills integration details
- **Section 3.1**: Layered architecture diagram
- **Section 3.4**: Beads memory system (core innovation)
- **Section 3.5**: Code style and engineering practices
- **Section 4**: UX design principles (color semantics, accessibility)
- **Section 6**: Non-functional requirements (performance, compatibility)

## Implementation Order (Milestones)

Follow the PRD's staged approach:

1. **M1** (Weeks 1-2): CLI skeleton, config system, Git data collection
2. **M2** (Weeks 3-4): LLM Adapter layer + basic agent framework (3 providers)
3. **M3** (Weeks 5-6): PocketFlow parallel execution + all 7 agents
4. **M4** (Week 7): ReportWriter + Terminal/MD/HTML + built-in skills
5. **M5** (Week 8): Git graph + dashboard + web-artifacts-builder
6. **M6** (Week 9): Beads memory + all export formats + doc-coauthoring
7. **M7** (Week 10): Release pipeline + npm/pipx/Homebrew publishing

## Notes

- **No existing codebase**: This is a planning-only repository. Implementation begins from scratch following PRD.
- **Data privacy**: All processing local by default. Never implement telemetry.
- **Offline mode**: Ollama integration must work without any network access.
- **40+ providers**: LLMAdapter should make adding new providers trivial (config-only ideally).
- **Skills hot-reload**: `git-copilot update` should fetch latest Skills without tool reinstall.
- **Accessibility**: Always provide `--no-color` and `--plain` alternatives for CI/visually impaired.
- **Performance target**: 1000-file repo < 3 minutes (4 concurrent agents on GPT-4o).
- **Zero secrets in code**: API keys only via config + keytar. No hardcoded credentials.

## Resources

- **PRD**: `git-copilot-PRD-v1.1.md` (single source of truth)
- **Anthropic Claude API**: https://docs.anthropic.com/claude/docs
- **PocketFlow**: https://github.com/The-Pocket/PocketFlow
- **Ink**: https://ink.js.org/
- **Beads**: TBD (likely custom implementation per PRD specs)
