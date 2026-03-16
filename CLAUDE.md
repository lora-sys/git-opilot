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
- **Memory System**: Beads (external task coordination + custom findings storage)
- **LLM Abstraction**: Custom Provider Adapter layer
- **Config Storage**: YAML + keytar (encrypted API keys)
- **Data Storage**: SQLite (better-sqlite3) for custom findings store; steveyegge/beads uses Dolt
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

### 2. Beads: Memory & Coordination System (External + Custom)

git-copilot 使用**双系统**实现记忆与任务协调:

```
┌─────────────────────────────────────────────────────┐
│          PocketFlow Multi-Agent Workflow            │
├─────────────────────────────────────────────────────┤
│  Coordination Layer: steveyegge/beads (Task Graph) │
│  • Create/claim tasks (bd CLI)                     │
│  • Dependency tracking & blocking detection        │
│  • Distributed issue tracking (Dolt)               │
├─────────────────────────────────────────────────────┤
│  Memory Layer: Custom Findings Store (SQLite)      │
│  • Store review findings with metadata            │
│  • Keyword-based search (tags/content)            │
│  • Fast retrieval (<100ms)                         │
│  • Cross-task linking via relatedTaskId           │
└─────────────────────────────────────────────────────┘
```

#### 2.1 External Beads (steveyegge/beads)

**Role**: Task coordination & agent orchestration

**Installation** (user must have `bd` available):
```bash
npm install -g @beads/bd    # 或 brew/Homebrew, 或 go install
```

**Key Commands** (used internally):
- `bd create "Title" -p 0` - 创建 Epic/Sub-task
- `bd update <id> --claim` - 原子认领任务
- `bd dep add <child> <parent>` - 设置依赖关系
- `bd ready --json` - 获取可执行任务 (无阻塞)
- `bd close <id> "reason"` - 关闭任务

**Integration Points**:
- Workflow init: 创建 Epic Task (`git-copilot review` 时)
- Agent execution: 每个 Agent 创建 sub-task 并 claim
- Dependency graph: 可表达 Agent 间的串行/并行约束
- Status tracking: 用户可随时 `bd show <id>` 查看进度

#### 2.2 Custom Memory: Findings Storage

**Role**: Fast retrieval of code review findings (semantic search v1.1)

**Data Model** (FindingBead):
```typescript
interface FindingBead {
  id: string;                    // UUID
  type: 'security' | 'performance' | 'quality' | 'architecture';
  content: string;               // 描述 + 代码片段 (max 2000 chars)
  filePath?: string;
  lineRange?: { start: number; end: number };
  priority: number;              // 1-10
  agentSource: string;
  createdAt: Date;
  tags: string[];                // ['xss', 'sql-injection', ...]
  relatedTaskId?: string;        // 关联 beads Task ID (双向链接)
}
```

**Storage**: SQLite (`~/.git-copilot/data/findings.db`)
**Retrieval**: Keyword search on `tags` and `content` (LIKE queries)
**Retention**: 90 days (auto-cleanup)

**API** (MemoryManager):
- `storeFinding(finding): Promise<string>` - 存储发现,返回 ID
- `searchFindings(query, limit?): Promise<FindingBead[]>` - 关键词搜索
- `getFindingsByTask(taskId): Promise<FindingBead[]>` - 获取任务关联的发现
- `clearFindings(filter?): Promise<void>` - 清理 (TTL)

**Context Injection**: Agent 执行前,调用 `memory.searchFindings(agentQuery)` 获取相关历史发现,注入到 LLM prompt 中(最多 4096 tokens)。

#### 2.3 Cross-Agent Context Sharing

**Pattern**:
1. SecurityAgent 发现 XSS 问题 → 存储 finding with `relatedTaskId = taskId`
2. PerformanceAgent 检索 → `memory.getFindingsByTask(taskId)` 或 `searchFindings("security")`
3. 不同 Agent 的 findings 通过 `relatedTaskId` 自动关联

**shared_store 用法**:
```javascript
// Workflow init
shared_store.beadsEpicId = await beadsClient.createTask("Code review: PR#123");
shared_store.memoryManager = await memoryManager.init();

// Per agent
const taskId = await beadsClient.createSubTask(shared_store.beadsEpicId, this.name);
await beadsClient.claimTask(taskId);
const context = await shared_store.memoryManager.searchFindings(this.getQuery());
```

#### 2.4 Configuration

```yaml
beads:
  external:
    enabled: true              # 使用 steveyegge/beads
    autoInstall: false        # 自动安装提示 (默认 false)
    cliPath: "bd"             # bd 命令路径
    dataDir: ".beads"         # beads 存储目录

  custom:
    enabled: true
    maxFindingsPerTask: 100
    retentionDays: 90
    maxContextTokens: 4096
```

**Env vars**:
- `BEADS_DIR` - beads 数据目录覆盖
- `GIT_COPILOT_BEADS_AUTO_INSTALL` - 自动安装 (true/false)

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

### Beads System (External + Custom)

**External Beads (steveyegge/beads) - Task Coordination:**
- Uses Dolt (SQL) database in `.beads/` directory
- Task lifecycle: `create` → `claim` → `close`
- Automatic blocking detection (`bd ready`)
- No semantic search - pure task tracking

**Custom Findings Store - Memory Layer:**
- SQLite storage in `~/.git-copilot/data/findings.db`
- Keyword search on `tags` and `content` fields
- Fast retrieval (<100ms), token-aware truncation
- Cross-task linking via `relatedTaskId`

**Agent Integration:**
- Workflow init: create epic task, inject `shared_store.beadsEpicId`
- Per-agent: create sub-task, claim it, store findings with `relatedTaskId`
- Context injection: `memory.searchFindings(query, maxTokens)`
- Failure fallback: `beads.external.enabled=false` 时仅使用 Custom Memory

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
2. **M2** (Weeks 3-4): LLM Adapter layer + Basic agent framework (3 providers) + **Beads integration (task coordination + custom memory)**
3. **M3** (Weeks 5-6): PocketFlow parallel execution + all 7 agents + beads cross-agent integration
4. **M4** (Week 7): ReportWriter + Terminal/MD/HTML + built-in skills
5. **M5** (Week 8): Git graph + dashboard + web-artifacts-builder
6. **M6** (Week 9): All export formats (docx/PDF/PPT/XLSX) + doc-coauthoring
7. **M7** (Week 10): Release pipeline + npm/pipx/Homebrew publishing

**Note on Beads**: M2 delivers core beads integration (external library + custom memory). Semantic search (embeddings) is deferred to v1.1 to simplify MVP.

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
- **Beads (external)**: https://github.com/steveyegge/beads - Task coordination system (Dolt-powered)
- **Beads npm**: `@beads/bd` (CLI binary, also library if available)
