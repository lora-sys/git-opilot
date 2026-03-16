# Implementation Plan: git-copilot

## 1. Requirements Restatement

Build a **local-first CLI code review assistant** that:
- Integrates with Git repositories to analyze code changes and history
- Uses multiple AI agents running in parallel (PocketFlow DAG)
- Supports 40+ LLM providers through a unified abstraction layer
- Maintains memory across sessions using Beads (external task coordination + custom SQLite findings store)
- Integrates Claude Skills for domain-specific expertise
- Renders beautiful terminal UI with Ink + Blessed
- Generates reports in multiple formats (Terminal, Markdown, HTML, DOCX, PDF, PPTX, XLSX)
- Provides Git visualization (commit graph) and health dashboards
- Zero telemetry, data stays local, API keys encrypted

**Target Users:** Independent developers, small teams, security researchers, architects

**Tech Stack:** Node.js 20, TypeScript (strict), Commander.js, Inquirer.js, Ink, Blessed, simple-git, PocketFlow, better-sqlite3, keytar, Marked, Shiki

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────┐
│  CLI Layer (Commander.js + Inquirer.js)    │
├─────────────────────────────────────────────┤
│  Config Manager (YAML + keytar)            │
├─────────────────────────────────────────────┤
│  Git Collector (simple-git)                │
├─────────────────────────────────────────────┤
│  LLM Provider Factory (40+ adapters)      │
├─────────────────────────────────────────────┤
│  PocketFlow DAG Workflow                   │
│  ├─ Stage 1: AsyncParallelBatchNode      │
│  │   ├─ SecurityAgent                     │
│  │   ├─ PerformanceAgent                  │
│  │   ├─ ArchitectureAgent                 │
│  │   ├─ CodeQualityAgent                  │
│  │   ├─ DependencyAgent                   │
│  │   ├─ GitHistoryAgent                   │
│  │   └─ (4 concurrent max)               │
│  ├─ Stage 2: AggregatorAgent              │
│  └─ Stage 3: ReportWriterAgent            │
├─────────────────────────────────────────────┤
│  Beads Integration                         │
│  ├─ External: steveyegge/beads (bd CLI)  │
│  └─ Custom: SQLite findings store         │
├─────────────────────────────────────────────┤
│  Claude Skills Manager (15+ built-in)     │
├─────────────────────────────────────────────┤
│  Terminal UI (Ink + Blessed)              │
│  ├─ ProgressDashboard                     │
│  ├─ AgentStatus                           │
│  ├─ ReportViewer                          │
│  └─ GitGraph                              │
├─────────────────────────────────────────────┤
│  Report Exporters                         │
│  ├─ Marked (MD/HTML)                     │
│  ├─ docx (Word)                          │
│  ├─ pdf-lib (PDF)                        │
│  ├─ pptxgenjs (PPTX)                     │
│  └─ exceljs (XLSX)                       │
└─────────────────────────────────────────────┘
```

---

## 3. Implementation Phases

### Phase 1: M1 - Foundation (Weeks 1-2)

#### 3.1.1 Project Setup (Day 1-2)

**Files to create:**

- `package.json`
  - name: `git-copilot`
  - version: `0.1.0`
  - type: `module`
  - bin: `git-copilot = ./dist/cli/index.js`
  - dependencies (see section 4)
  - scripts:
    - `build`: `tsc`
    - `dev`: `tsc --watch`
    - `lint`: `eslint src --ext .ts`
    - `lint:fix`: `eslint src --ext .ts --fix`
    - `format`: `prettier --write src`
    - `typecheck`: `tsc --noEmit`
    - `test`: `vitest`
    - `test:unit`: `vitest tests/unit`
    - `test:integration`: `vitest tests/integration`
    - `test:e2e`: `playwright test`
    - `test:coverage`: `vitest --coverage`

- `tsconfig.json`
  - target: ES2022
  - module: NodeNext
  - moduleResolution: NodeNext
  - strict: true
  - esModuleInterop: true
  - skipLibCheck: true
  - outDir: `dist`
  - rootDir: `src`
  - declaration: true

- `.eslintrc.json`
  - extends: `eslint:recommended`, `@typescript-eslint/recommended`, `prettier`
  - rules: from CLAUDE.md (camelCase, PascalCase, etc.)
  - env: node, es2022

- `.prettierrc`
  - semi: false
  - singleQuote: true
  - tabWidth: 2
  - trailingComma: es5
  - printWidth: 120

- `.gitignore`
  - Standard Node.js ignores plus:
  - `dist/`
  - `.beads/`
  - `~/.git-copilot/`
  - `coverage/`
  - `*.db`

- `README.md` (basic initial version)
- `CLAUDE.md` (copy from existing, may update later)
- `git-copilot-PRD-v1.1.md` (reference document)

**Actions:**
- [x] Initialize project with `npm init -y`
- [x] Install all dependencies (see section 4)
- [x] Configure TypeScript
- [x] Setup ESLint + Prettier
- [x] Create basic README

---

#### 3.1.2 Configuration System (Day 3-5)

**Files to create:**

- `src/config/schema.yaml`
  - Define YAML schema for validation
  - Sections: providers, active_provider, review, output, ui, skills, beads

- `src/config/types.ts`
  ```typescript
  interface Config {
    providers: ProviderConfig[];
    active_provider: string;
    review: ReviewConfig;
    output: OutputConfig;
    ui: UIConfig;
    skills: SkillsConfig;
    beads: BeadsConfig;
  }

  interface ProviderConfig {
    name: string;
    baseUrl: string;
    apiKey?: string; // Encrypted, use getter/setter
    model: string;
    maxTokens: number;
  }

  // ... other interfaces
  ```

- `src/config/manager.ts`
  - `loadConfig(): Promise<Config>` - Load from `~/.git-copilot/config.yaml`
  - `saveConfig(config: Config): Promise<void>`
  - `validateConfig(config: any): Config` - Validate against schema
  - `encryptApiKey(key: string): Promise<string>` - Use `keytar`
  - `decryptApiKey(encrypted: string): Promise<string>`
  - `getActiveProvider(): ProviderConfig`
  - `setActiveProvider(name: string): void`
  - `getProviderList(): string[]`

- `src/config/index.ts` - Export all

**CLI commands to implement:**

- `src/cli/commands/init.ts`
  - Interactive wizard using Inquirer.js
  - Questions:
    1. Select default LLM provider (list: OpenAI, Anthropic, Ollama initially)
    2. Enter API key (password input, hide characters)
    3. Configure proxy? (y/N)
    4. Language preference (中文 / English)
    5. Report format (markdown/html/terminal)
    6. Enable Beads? (y/N)
  - Creates `~/.git-copilot/` directory
  - Saves initial `config.yaml` with encrypted API key
  - Runs Beads detection if enabled

- `src/cli/commands/config.ts`
  - `git-copilot config` - Show current config (mask API key)
  - `git-copilot config set <key> <value>` - Update specific field
  - `git-copilot config providers` - List all providers
  - `git-copilot config add-provider` - Add new provider

- `src/cli/index.ts` (main entry)
  - Commander.js program setup
  - Register all commands
  - Global flags: `--verbose`, `--no-color`, `--config <path>`

**Testing:**
- Unit tests for ConfigManager (load/save/validate)
- Mock file system for tests
- Test encryption/decryption with keytar mock

---

#### 3.1.3 Git Data Collection (Day 6-7)

**Files to create:**

- `src/git/types.ts`
  ```typescript
  interface GitRepository {
    root: string;
    currentBranch: string;
    remoteBranches: string[];
    commits: GitCommit[];
    tags: GitTag[];
    status: GitStatus;
  }

  interface GitCommit {
    hash: string;
    author: string;
    email: string;
    date: Date;
    message: string;
    parentHashes: string[];
    files: FileChange[];
  }

  interface GitStatus {
    staged: FileChange[];
    unstaged: FileChange[];
    untracked: string[];
  }
  ```

- `src/git/collector.ts`
  - Wrap `simple-git` with clean API
  - Methods:
    - `async getRepositoryInfo(): Promise<GitRepository>`
    - `async getCommitHistory(since?: string, until?: string): Promise<GitCommit[]>`
    - `async getDiff(commitRange: string): Promise<FileChange[]>`
    - `async getBranchInfo(): Promise<{ current: string; remotes: string[] }>`
    - `async getTags(): Promise<GitTag[]>`
    - `async getStatus(): Promise<GitStatus>`
    - `async getFileContent(filePath: string, commitHash?: string): Promise<string>`
    - `async getAllTrackedFiles(): Promise<string[]>`

- `src/git/utils.ts`
  - Helper functions (parse diff output, calculate file statistics)
  - `.gitignore` parsing and respect

**CLI commands to implement:**

- `src/cli/commands/graph.ts` (basic stub for M1)
  - Simple ASCII graph of recent commits (no interactive features yet)
  - Use `simple-git` to get commit history
  - Render basic DAG with box-drawing characters
  - Command: `git-copilot graph [--limit N]`

**Testing:**
- Unit tests for GitCollector with mocked simple-git
- Integration tests in a real git repo fixture
- Test diff parsing, commit history, status detection

---

#### 3.1.4 Basic CLI Commands (Day 8-10)

**Files to create:**

- `src/cli/commands/version.ts` - Show version
- `src/cli/commands/help.ts` - Custom help (Commander default + extras)
- `src/cli/commands/review.ts` (stub)
  - For M1, just print "Review not yet implemented"
  - Accept flags: `--since`, `--pr`, `--interactive`
  - Will implement fully in M3

**Testing:**
- CLI integration tests using `execa` or `@cliffy/command` test utils
- Test command parsing, flag handling, error messages

---

**M1 Deliverables:**
- [x] `npm install` works with all dependencies
- [x] `git-copilot --help` shows all commands
- [x] `git-copilot init` completes wizard and creates config
- [x] `git-copilot config` displays settings
- [x] `git-copilot graph --limit 20` renders ASCII commit graph
- [x] All TypeScript compiles without errors
- [x] ESLint passes (0 errors, 0 warnings)
- [x] Unit tests for config manager and git collector (>80% coverage)

---

### Phase 2: M2 - LLM & Beads Integration (Weeks 3-4)

#### 3.2.1 LLM Provider Abstraction Layer (Day 11-15)

**Files to create:**

- `src/llm/types.ts`
  ```typescript
  interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    timeout?: number;
  }

  interface LLMResponse {
    content: string;
    tokensUsed: number;
    model?: string;
  }

  interface LLMAdapter {
    name: string;
    chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
    stream(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string>;
    countTokens(text: string): number;
  }

  class BaseAdapter implements LLMAdapter {
    name: string;
    baseUrl: string;
    apiKey?: string;
    model: string;
    maxTokens: number;

    constructor(config: ProviderConfig);
    protected async request(payload: any): Promise<any>;
    protected handleRateLimit(error: any): Promise<void>;
  }
  ```

- `src/llm/openai.ts`
  - Extend `BaseAdapter`
  - Support GPT-4o, GPT-4.1, o3-mini
  - Handle OpenAI-specific API (chat.completions.create)
  - Streaming support (SSE)
  - Token counting (approximate via `tiktoken` or simple estimation)

- `src/llm/anthropic.ts`
  - Extend `BaseAdapter`
  - Support Claude Sonnet 4.6, Opus 4.6
  - Handle Anthropic-specific: system prompt separate, max token handling
  - Streaming support (eventsource)
  - Token counting via `@anthropic-ai/tokenizer`

- `src/llm/ollama.ts`
  - Extend `BaseAdapter`
  - Local inference support (no API key needed)
  - Default baseUrl: `http://localhost:11434`
  - Pull models on demand? (optional)
  - Streaming support

- `src/llm/lite llm.ts` (stretch if time)
  - For OpenRouter compatibility
  - Pass-through to any provider

- `src/llm/factory.ts`
  ```typescript
  class LLMFactory {
    static create(config: ProviderConfig): LLMAdapter {
      switch (config.name.toLowerCase()) {
        case 'openai':
          return new OpenAIAdapter(config);
        case 'anthropic':
          return new AnthropicAdapter(config);
        case 'ollama':
          return new OllamaAdapter(config);
        default:
          throw new Error(`Unsupported provider: ${config.name}`);
      }
    }
  }
  ```

**Testing:**
- Unit tests for each adapter with mocked HTTP responses (nock)
- Test streaming, error handling, rate limit retry
- Test token counting accuracy
- Mock real API calls (don't hit live APIs)

---

#### 3.2.2 External Beads Integration (Day 16-18)

**Prerequisite:** User must have `bd` CLI installed (or we can prompt install)

**Files to create:**

- `src/beads/external-client.ts`
  ```typescript
  class BeadsExternalClient {
    private cliPath: string;
    private dataDir: string;

    constructor(config: BeadsExternalConfig);

    async isInstalled(): Promise<boolean>;
    async init(): Promise<void>; // runs `bd init` if needed
    async createTask(title: string, priority?: number): Promise<string>; // returns task ID
    async createSubTask(parentId: string, title: string): Promise<string>;
    async claimTask(taskId: string): Promise<boolean>;
    async closeTask(taskId: string, reason: string): Promise<void>;
    async getTask(taskId: string): Promise<BeadsTask>;
    async getReadyTasks(): Promise<BeadsTask[]>;
    async addDependency(childId: string, parentId: string): Promise<void>;
    async exec(args: string[]): Promise<{ stdout: string; stderr: string; code: number }>;
  }

  interface BeadsTask {
    id: string;
    title: string;
    status: 'open' | 'claimed' | 'done' | 'closed';
    priority: number;
    createdAt: Date;
    assignee?: string;
    dependsOn?: string[];
  }
  ```

- `src/beads/manager.ts`
  - High-level wrapper coordinating external beads
  - Methods used by workflow:
    - `async createEpic(title: string): Promise<string>`
    - `async createAndClaimAgentTask(epicId: string, agentName: string): Promise<string>`
    - `async closeAgentTask(taskId: string, summary: string): Promise<void>`
    - `async checkDependencies(taskId: string): Promise<boolean>` // is task ready?

**Configuration:**
- Add to `src/config/schema.yaml`:
  ```yaml
  beads:
    external:
      enabled: boolean = true
      autoInstall: boolean = false
      cliPath: string = "bd"
      dataDir: string = ".beads"
  ```

**CLI commands to implement:**

- `src/cli/commands/beads.ts`
  - `git-copilot beads check` - Verify bd is installed and working
  - `git-copilot beads init` - Initialize beads in current repo
  - `git-copilot beads tasks [--ready]` - List tasks
  - `git-copilot beads show <task-id>` - Show task details
  - `git-copilot beads install` - Guide user through installation

**Testing:**
- Mock the `bd` CLI calls
- Test all client methods
- Test error handling (bd not found, task creation failure)

---

#### 3.2.3 Custom Memory System (Day 19-21)

**Files to create:**

- `src/beads/storage/types.ts`
  ```typescript
  interface FindingBead {
    id: string;                    // UUID v7 or v4
    type: 'security' | 'performance' | 'quality' | 'architecture';
    content: string;               // max 2000 chars
    filePath?: string;
    lineRange?: { start: number; end: number };
    priority: number;              // 1-10
    agentSource: string;
    createdAt: Date;
    tags: string[];                // keywords for search
    relatedTaskId?: string;        // link to external beads task
  }

  interface MemoryConfig {
    enabled: boolean;
    dbPath: string;                // ~/.git-copilot/data/findings.db
    maxFindingsPerTask: number;
    retentionDays: number;
    maxContextTokens: number;
  }
  ```

- `src/beads/storage/database.ts`
  - SQLite setup with `better-sqlite3`
  - Initialize DB if not exists
  - Create tables:
    ```sql
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      file_path TEXT,
      line_start INTEGER,
      line_end INTEGER,
      priority INTEGER NOT NULL,
      agent_source TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      related_task_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_findings_tags ON findings(type);
    CREATE INDEX IF NOT EXISTS idx_findings_priority ON findings(priority);
    CREATE INDEX IF NOT EXISTS idx_findings_task ON findings(related_task_id);
    CREATE INDEX IF NOT EXISTS idx_findings_created ON findings(created_at);
    ```
  - Migration system (future-proof)

- `src/beads/storage/repository.ts`
  - CRUD operations:
    - `storeFinding(finding: Omit<FindingBead, 'id' | 'createdAt'>): Promise<string>`
    - `getFinding(id: string): Promise<FindingBead | null>`
    - `searchFindings(query: string, limit?: number): Promise<FindingBead[]>` - LIKE search on tags + content
    - `getFindingsByTask(taskId: string): Promise<FindingBead[]>`
    - `deleteFinding(id: string): Promise<void>`
    - `clearOldFindings(olderThanDays: number): Promise<number>` - return count deleted

- `src/beads/memory.ts`
  - Main memory manager class
  - Methods:
    - `async init(): Promise<void>` - open DB
    - `async storeFinding(finding: FindingBeadInput): Promise<string>`
    - `async searchRelevant(query: string, limit?: number): Promise<FindingBead[]>`
    - `async getByTask(taskId: string): Promise<FindingBead[]>`
    - `async cleanup(): Promise<void>` - TTL cleanup
    - `async close(): Promise<void>` - close DB connection

**Configuration:**
- Add to `src/config/schema.yaml`:
  ```yaml
  beads:
    custom:
      enabled: boolean = true
      maxFindingsPerTask: number = 100
      retentionDays: number = 90
      maxContextTokens: number = 4096
  ```

**Testing:**
- Unit tests for repository (use in-memory SQLite)
- Test CRUD operations
- Test search functionality (LIKE queries)
- Test TTL cleanup
- Test concurrent access (better-sqlite3 is safe?)

---

#### 3.2.4 Basic Agent Framework (Day 22-24)

**Files to create:**

- `src/agents/base.ts`
  ```typescript
  abstract class BaseAgent {
    readonly name: string;
    readonly type: AgentType;
    protected config: AgentConfig;
    protected llm: LLMAdapter;
    protected memory?: MemoryManager;
    protected beadsClient?: BeadsExternalClient;
    protected logger: Logger;

    constructor(
      name: string,
      type: AgentType,
      llm: LLMAdapter,
      config: AgentConfig,
      deps: AgentDependencies
    );

    abstract analyze(
      files: FileContent[],
      context?: any
    ): Promise<AgentResult>;

    protected abstract buildPrompt(
      files: FileContent[],
      context: any
    ): Promise<LLMMessage[]>;

    protected abstract parseResponse(content: string): AgentFinding[];

    // Helper for context injection
    protected async getContext(query: string): Promise<string> {
      if (!this.memory) return '';
      const findings = await this.memory.searchRelevant(query, 5);
      return this.formatContext(findings);
    }

    // Template method
    async execute(
      files: FileContent[],
      sharedStore: SharedStore
    ): Promise<AgentResult> {
      // 1. Claim task if beads enabled
      // 2. Get context from memory
      // 3. Build prompt
      // 4. Call LLM
      // 5. Parse response
      // 6. Store findings to memory
      // 7. Close task
    }
  }

  interface AgentResult {
    agentName: string;
    findings: AgentFinding[];
    tokensUsed: number;
    duration: number;
    error?: string;
  }

  interface AgentFinding {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    filePath?: string;
    lineRange?: { start: number; end: number };
    message: string;
    suggestion?: string;
    codeExample?: string;
  }
  ```

- `src/agents/types.ts`
  - Shared types for agents, findings, config

- `src/agents/logger.ts` (or use shared logger from utils)

**Testing:**
- Create mock agent to test base class
- Test context injection, prompt building, response parsing
- Test error handling and graceful degradation

---

#### 3.2.5 First Agent: CodeQualityAgent (Day 25-26)

**Files to create:**

- `src/agents/code-quality.ts`
  ```typescript
  class CodeQualityAgent extends BaseAgent {
    constructor(llm: LLMAdapter, config: AgentConfig, deps: AgentDependencies);

    async analyze(files: FileContent[]): Promise<AgentResult> {
      // Filter: only analyze source files (ts, js, py, go, java, etc.)
      const relevantFiles = this.filterSourceFiles(files);

      // Build prompt with instructions for:
      // - Cyclomatic complexity
      // - Code duplication
      // - Naming conventions
      // - SOLID principles violations
      // - Dead code detection

      const messages = await this.buildPrompt(relevantFiles);
      const response = await this.llm.chat(messages);
      const findings = this.parseResponse(response.content);

      return {
        agentName: this.name,
        findings,
        tokensUsed: response.tokensUsed,
        duration: ...
      };
    }

    protected buildPrompt(files: FileContent[]): Promise<LLMMessage[]> {
      // System prompt from CodeReview Skill
      // Include file contents (chunk if needed)
      // Ask for specific quality metrics
    }

    protected parseResponse(content: string): AgentFinding[] {
      // Parse structured output (expect JSON from LLM)
      // Transform to AgentFinding[]
    }
  }
  ```

**Skill to bundle:**
- `skills/code-review/code-review-skills.md` - General code quality best practices
  - Code readability principles
  - Function length limits
  - Naming conventions
  - SOLID violations examples
  - Refactoring patterns

**Testing:**
- Unit test with sample files and mocked LLM response
- Test parsing of LLM output (edge cases)
- Verify findings are correctly structured

---

**M2 Deliverables:**
- [x] LLM adapter layer complete (OpenAI, Anthropic, Ollama)
- [x] LLM factory working
- [x] Beads external client integrated (detect/init/use)
- [x] Custom memory store with SQLite
- [x] Basic agent framework with BaseAgent
- [x] CodeQualityAgent implemented and tested
- [x] Code review skill loaded and used
- [x] Unit tests for all adapters (>80% coverage)
- [x] Integration test: single agent can analyze files and store findings
- [x] Config supports beads and LLM provider settings

---

### Phase 3: M3 - PocketFlow Parallel + All Agents (Weeks 5-6)

#### 3.3.1 PocketFlow Workflow Setup (Day 27-29)

**Files to create:**

- `src/pocketflow/types.ts`
  ```typescript
  interface SharedStore {
    // Repository metadata
    repo: GitRepository;
    files: FileContent[]; // All files to analyze
    diffs?: FileChange[]; // If incremental review

    // Beads integration
    beadsEpicId?: string;
    memoryManager?: MemoryManager;
    beadsClient?: BeadsExternalClient;

    // Agent results
    results: Map<string, AgentResult>;

    // Progress tracking
    agentsCompleted: number;
    totalAgents: number;
    startTime: Date;
  }

  interface WorkflowConfig {
    maxConcurrent: number;
    timeoutPerAgent: number; // ms
    skipAgents?: string[];
  }
  ```

- `src/pocketflow/nodes/async-parallel-batch.ts`
  - Custom node extending PocketFlow's `AsyncParallelBatchNode`
  - Purpose: Run multiple agents in parallel on the same file set
  - Implementation:
    ```typescript
    class AgentParallelNode extends AsyncParallelBatchNode {
      constructor(
        private agents: BaseAgent[],
        private maxConcurrent: number
      );

      async prep(store: SharedStore): Promise<[BaseAgent, FileContent[]][]> {
        // Distribute agents to workers (up to maxConcurrent)
        const batches: Map<number, {agent: BaseAgent, files: FileContent[]}> = new Map();
        agents.forEach((agent, i) => {
          batches.set(i % maxConcurrent, { agent, files: store.files });
        });
        return Array.from(batches.values());
      }

      async exec(batch: {agent: BaseAgent, files: FileContent[]}): Promise<AgentResult> {
        const { agent, files } = batch;
        return await agent.execute(files, this.store);
      }

      async post(store: SharedStore, results: AgentResult[]): Promise<SharedStore> {
        results.forEach(r => store.results.set(r.agentName, r));
        store.agentsCompleted += results.length;
        return store;
      }
    }
    ```

- `src/pocketflow/nodes/aggregator.ts`
  ```typescript
  class AggregatorNode extends Node {
    async prep(store: SharedStore): Promise<AgentResult[]> {
      return Array.from(store.results.values());
    }

    async exec(results: AgentResult[]): Promise<AggregatedFindings> {
      // Deduplicate findings (similar content)
      // Calculate severity scores
      // Group by file/location
      // Prioritize
      return {
        findings: deduped,
        summary: {
          totalFindings: deduped.length,
          bySeverity: countBySeverity(deduped),
          byAgent: countByAgent(results),
          avgTokensUsed: average(results.map(r => r.tokensUsed))
        }
      };
    }

    async post(store: SharedStore, aggregated: AggregatedFindings): Promise<SharedStore> {
      store.aggregated = aggregated;
      return store;
    }
  }
  ```

- `src/pocketflow/nodes/report-writer.ts`
  ```typescript
  class ReportWriterNode extends Node {
    async prep(store: SharedStore): Promise<{ aggregated: AggregatedFindings; config: Config }> {
      return { aggregated: store.aggregated!, config: store.config };
    }

    async exec(input: { aggregated: AggregatedFindings; config: Config }): Promise<Report> {
      // Generate structured report
      // Sections: Executive Summary, Security, Quality, Performance, Architecture, Dependencies, Git Health, Fixes
      // Format based on config.output.format
      return {
        title: `Code Review Report: ${store.repo.currentBranch}`,
        generatedAt: new Date(),
        sections: [...]
      };
    }

    async post(store: SharedStore, report: Report): Promise<SharedStore> {
      store.report = report;
      return store;
    }
  }
  ```

- `src/pocketflow/workflow.ts`
  ```typescript
  class ReviewWorkflow {
    private agents: BaseAgent[];
    private parallelNode: AgentParallelNode;
    private aggregator: AggregatorNode;
    private reportWriter: ReportWriterNode;

    constructor(
      agents: BaseAgent[],
      config: WorkflowConfig,
      private memoryManager: MemoryManager,
      private beadsClient?: BeadsExternalClient
    );

    async run(files: FileContent[], repo: GitRepository): Promise<Report> {
      // 1. Initialize shared store
      const store: SharedStore = {
        repo,
        files,
        results: new Map(),
        agentsCompleted: 0,
        totalAgents: this.agents.length,
        startTime: new Date(),
        memoryManager: this.memoryManager,
        beadsClient: this.beadsClient
      };

      // 2. Create Beads epic if enabled
      if (this.beadsClient) {
        store.beadsEpicId = await this.beadsClient.createTask(
          `Code review: ${repo.currentBranch} at ${new Date().toISOString()}`
        );
      }

      // 3. Execute parallel agents
      const parallelResults = await this.parallelNode.run(store);

      // 4. Aggregate
      const aggregated = await this.aggregator.run(parallelResults);

      // 5. Write report
      const report = await this.reportWriter.run(aggregated);

      // 6. Close Beads tasks if enabled
      if (this.beadsClient) {
        for (const agent of this.agents) {
          const taskId = agent.getTaskId(); // agents should store this
          if (taskId) {
            await this.beadsClient.closeTask(taskId, `Completed. Findings: ${agent.result.findings.length}`);
          }
        }
      }

      return report;
    }
  }
  ```

**Testing:**
- Unit test each node with mock agents
- Test parallel execution (agents truly run concurrently)
- Test aggregation (deduplication logic)
- Test error handling (agent failures shouldn't crash workflow)
- Integration test: run full workflow with 2-3 mock agents

---

#### 3.3.2 Implement Remaining Agents (Day 30-35)

**Agent Implementation Pattern:**
Each agent extends `BaseAgent`, implements `analyze()` and `buildPrompt()`, uses appropriate skill.

---

**SecurityAgent** (`src/agents/security.ts`)

**Focus:** OWASP Top 10, CWE patterns, injection vulnerabilities

**Skill:** `skills/secure-code-review/secure-code-review-skills.md` + `skills/owasp-audit/owasp-audit-skills.md`

**Prompt Instructions:**
- Scan for XSS (reflected, stored, DOM-based)
- SQL injection, NoSQL injection, command injection
- CSRF vulnerabilities
- Insecure deserialization
- Broken authentication/session management
- Sensitive data exposure
- XXE, SSRF
- Hardcoded secrets detection (use regex patterns)

**Output:**
```typescript
{
  severity: 'critical' | 'high' | 'medium' | 'low',
  vulnerability: string, // e.g., "CWE-79: XSS"
  cve?: string,
  filePath: string,
  lineRange: { start, end },
  message: string,
  evidence: string, // code snippet
  remediation: string
}
```

**Testing:**
- Test with vulnerable code samples (XSS, SQLi)
- Verify correct severity assignment
- Test LLM prompt effectiveness (mock responses)

---

**PerformanceAgent** (`src/agents/performance.ts`)

**Focus:** Algorithm complexity, N+1 queries, memory leaks, inefficient loops

**Skill:** Custom skill file `skills/performance/performance-skills.md`

**Prompt Instructions:**
- Detect O(n²) or worse algorithms in loops
- N+1 query patterns (especially in ORM code)
- Unnecessary re-renders (React specific)
- Memory leaks (event listeners not removed, closures)
- Inefficient data structures (array vs Set/Map)
- Repeated expensive operations (should be memoized)
- Blocking operations on main thread

**Output:**
```typescript
{
  severity: 'high' | 'medium' | 'low',
  category: 'algorithm' | 'database' | 'memory' | 'rendering',
  complexity?: 'O(n)' | 'O(n²)' | 'O(2^n)',
  filePath: string,
  lineRange: { start, end },
  message: string,
  suggestion: string,
  beforeAfter?: { before: string; after: string }
}
```

**Testing:**
- Test with N+1 query examples
- Test with nested loops
- Verify performance suggestions are actionable

---

**ArchitectureAgent** (`src/agents/architecture.ts`)

**Focus:** Design patterns, coupling/cohesion, circular dependencies, layer violations

**Skill:** `skills/architecture/architecture-skills.md`

**Prompt Instructions:**
- Detect God classes / Blob anti-pattern
- Circular dependencies (import analysis)
- Tight coupling (high fan-in/fan-out)
- Feature envy (method uses data from another class excessively)
- Shotgun surgery (many classes need change for single feature)
- Proper use of design patterns (Factory, Strategy, Observer, etc.)
- Layered architecture violations (UI talking to DB directly)
- Dependency injection absence

**Analysis Requirements:**
- Need to parse import/require statements to build dependency graph
- Use `dependency-tree` or `madge` package to analyze module graph
- Detect cycles: if A→B→C→A, report

**Output:**
```typescript
{
  severity: 'critical' | 'high' | 'medium',
  issue: 'circular-dependency' | 'god-class' | 'tight-coupling' | 'layer-violation',
  filePath: string,
  relatedFiles?: string[], // for circular deps
  message: string,
  suggestion: string,
  metrics?: {
    cyclomaticComplexity: number;
    coupling: number; // fan-in/fan-out
    linesOfCode: number;
  }
}
```

**Testing:**
- Create fixture with circular dependencies
- Test God class detection
- Verify dependency graph building

---

**DependencyAgent** (`src/agents/dependency.ts`)

**Focus:** Outdated dependencies, CVE vulnerabilities, license compliance

**Skill:** Custom skill for dependency auditing

**Analysis:**
- Read `package.json` (or `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, etc.)
- For each dependency, check:
  - Is there a newer version? (use `npm view` or `registry.npmjs.org` API)
  - Known CVEs? (use OSV database or Snyk API - optional, rate limits)
  - License type? (use `license-checker` or read from package-lock)
- Flag:
  - Major version behind (>2 versions)
  - Deprecated packages
  - Packages with known critical CVEs
  - License incompatible with project (e.g., GPL in commercial app)

**Implementation:**
- Use `npm ls --json` to get current installed versions
- Query npm registry for latest versions (cache results)
- Optional: OSV API for CVEs (https://osv.dev/api/v1/query)
- Generate report table

**Output:**
```typescript
{
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  hasCVE: boolean;
  cveIds?: string[];
  license: string;
  licenseCompatible: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: 'update' | 'replace' | 'monitor';
}
```

**Testing:**
- Mock npm registry responses
- Test with sample package.json with outdated deps
- Test CVE detection (mock OSV responses)

---

**GitHistoryAgent** (`src/agents/git-history.ts`)

**Focus:** Commit hygiene, secrets in history, large file commits, commit message quality

**Skill:** Custom skill for Git health

**Analysis:**
- Scan entire commit history (or recent N commits)
- Detect:
  - Secrets in diffs (AWS keys, API keys, passwords, private keys)
    - Use regex patterns: `(?i)secret|password|key|token|credential`
    - Also look for base64 strings with high entropy
  - Large files (>1MB) committed
  - Binary files that should be ignored (images, binaries in wrong place)
  - Commit message quality:
    - Conventional Commits format adherence? (feat:, fix:, chore:, etc.)
    - Length (too short < 5 chars or too long > 72 chars for subject)
    - Empty message?
    - "WIP" or "fix later" anti-patterns
  - Merge commits with too many files (potential bad merge)
  - Rebase/amend frequency (many modified commits = unclear history)

**Output:**
```typescript
{
  commitHash: string;
  issue: 'secret-detected' | 'large-file' | 'poor-message' | 'binary-in-repo' | 'merge-mess';
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath?: string;
  message: string;
  suggestion: string;
}
```

**Testing:**
- Create git repo with intentional bad commits
- Test secret detection (regex patterns)
- Test commit message parsing
- Verify findings are accurate

---

#### 3.3.3 Beads Integration Across Agents (Day 36-37)

**Integration Points:**

- Modify `BaseAgent.execute()` to include Beads operations:
  ```typescript
  async execute(files: FileContent[], sharedStore: SharedStore): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 1. Create and claim sub-task if external beads enabled
      let taskId: string | undefined;
      if (sharedStore.beadsClient && sharedStore.beadsEpicId) {
        taskId = await sharedStore.beadsClient.createSubTask(
          sharedStore.beadsEpicId,
          this.name
        );
        await sharedStore.beadsClient.claimTask(taskId);
        this.taskId = taskId; // store for later closure
      }

      // 2. Retrieve context from custom memory
      const query = this.getSearchQuery(); // agents define what they're looking for
      const context = await sharedStore.memoryManager?.searchRelevant(query, 5) || [];
      const contextStr = this.formatContext(context);

      // 3. Build prompt with context
      const messages = await this.buildPrompt(files, contextStr);

      // 4. Call LLM
      const response = await this.llm.chat(messages);

      // 5. Parse findings
      const findings = this.parseResponse(response.content);

      // 6. Store findings to custom memory (link to taskId)
      for (const finding of findings) {
        const beadId = await sharedStore.memoryManager?.storeFinding({
          ...finding,
          agentSource: this.name,
          relatedTaskId: taskId
        });
      }

      // 7. Close Beads task
      if (taskId && sharedStore.beadsClient) {
        await sharedStore.beadsClient.closeTask(
          taskId,
          `Found ${findings.length} issues`
        );
      }

      return {
        agentName: this.name,
        findings,
        tokensUsed: response.tokensUsed,
        duration: Date.now() - startTime
      };

    } catch (error) {
      // Close task with error status if beads
      if (taskId && sharedStore.beadsClient) {
        await sharedStore.beadsClient.closeTask(taskId, `Error: ${error.message}`);
      }
      throw error; // Let workflow handle gracefully
    }
  }
  ```

**Testing:**
- Integration test: run two agents sequentially, verify second agent can see findings from first via memory
- Test Beads task lifecycle (create → claim → close)
- Test failure scenarios (agent crash, LLM timeout)

---

**M3 Deliverables:**
- [x] PocketFlow workflow with parallel execution (max 4 concurrent)
- [x] All 7 agents implemented and tested:
  - SecurityAgent (OWASP)
  - PerformanceAgent (complexity, N+1)
  - ArchitectureAgent (design patterns, deps)
  - CodeQualityAgent (quality metrics)
  - DependencyAgent (CVE, outdated)
  - GitHistoryAgent (commit hygiene)
  - AggregatorAgent (deduplication)
- [x] ReportWriterAgent (basic report structure)
- [x] Full Beads integration (external + custom)
- [x] Cross-agent context sharing verified
- [x] Integration tests for full workflow (>80% coverage)
- [x] `git-copilot review` command executes full workflow (with progress UI stub)

---

### Phase 4: M4 - Report System + Skills (Week 7)

#### 4.1 Terminal UI Framework (Day 38-40)

**Files to create:**

- `src/ui/types.ts`
  ```typescript
  interface Theme {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    muted: string;
    background: string;
  }

  interface ProgressState {
    total: number;
    completed: number;
    currentAgent?: string;
    agentStatuses: AgentProgress[];
  }

  interface AgentProgress {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    findingsCount?: number;
    progress?: number; // 0-100
    logs?: string[];
  }
  ```

- `src/ui/theme.ts`
  - Define default theme (from PRD: red=high-risk, yellow=medium, green=pass, blue=info)
  - Support dark/light variants
  - Use `chalk` for color
  - Export themes object

- `src/ui/components/progress-dashboard.tsx`
  - Ink component (React for terminal)
  - Show overall progress bar
  - List agent statuses with colors
  - Real-time updates via prop changes
  - Optional: agent logs stream (collapsible)

- `src/ui/components/agent-status.tsx`
  - Individual agent status card
  - Icon: ⏳ / 🏃 / ✅ / ❌
  - Show findings count when completed
  - Click to expand logs (if interactive)

- `src/ui/components/report-viewer.tsx`
  - Render Markdown report in terminal
  - Use `marked-terminal` package
  - Syntax highlighting via `shiki`
  - Collapsible sections (press Enter to expand)
  - Pagination if report long

- `src/ui/index.ts`
  - Export all components

**CLI Integration:**

- Modify `src/cli/commands/review.ts`
  - After starting workflow, render `<ProgressDashboard />`
  - Use Ink's `render` to update UI in real-time
  - On completion, show summary and render report
  - Command: `git-copilot review [--since HEAD~N] [--format terminal|md|html]`

**Testing:**
- Unit test UI components with Ink test renderer
- Snapshot tests for rendered output
- Test theme color application

---

#### 4.2 Claude Skills Integration (Day 41-43)

**Files to create:**

- `src/skills/types.ts`
  ```typescript
  interface Skill {
    name: string;
    path: string; // absolute path to skill directory
    description: string;
    category: 'domain' | 'output' | 'custom';
    priority: number; // higher wins on conflict
    systemPrompt?: string; // injected as system message
    examples?: SkillExample[];
    outputFormat?: OutputFormatSpec;
  }

  interface SkillExample {
    description: string;
    input: { files: string[]; context?: string };
    output: string;
  }

  interface SkillConfig {
    enabled: boolean;
    customPaths: string[]; // from config
  }
  ```

- `src/skills/manager.ts`
  ```typescript
  class SkillsManager {
    private skills: Map<string, Skill> = new Map();
    private config: SkillConfig;

    constructor(config: SkillConfig, private logger: Logger);

    async loadBuiltInSkills(): Promise<void> {
      // Scan skills/built-in/ directory
      // Load all subdirectories as skills
      // Read skill.md and examples/
    }

    async loadCustomSkills(): Promise<void> {
      // Load from config.customPaths
    }

    getSkillsForAgent(agentName: string, priority?: 'high' | 'medium' | 'low'): Skill[] {
      // Filter skills by agent relevance (agentName in skill.name or metadata)
      // Sort by priority
      return [...];
    }

    getFormattingSkills(): Skill[] {
      // Return skills with output.format (docx, pdf, pptx, xlsx, theme-factory)
      return [...];
    }

    getSkillContent(skillName: string): string {
      // Read skill.md content
    }

    reload(): Promise<void> {
      // Hot-reload all skills
      this.skills.clear();
      return this.loadAll();
    }
  }
  ```

**Built-in Skills to Create:**

- `skills/code-review/code-review-skills.md` - General code quality (already partially described in PRD)
- `skills/secure-code-review/secure-code-review-skills.md` - Trail of Bits methodology
- `skills/owasp-audit/owasp-audit-skills.md` - OWASP Top 10 deep dive
- `skills/architecture/architecture-skills.md` - Design patterns and architecture principles
- `skills/performance/performance-skills.md` - Performance anti-patterns
- `skills/git-health/git-health-skills.md` - Git hygiene
- `skills/dependency-audit/dependency-audit-skills.md` - Dependency security
- `skills/code-review-report/code-review-report-skills.md` - Report structure and writing

**Formatting Skills (Output):**
- `skills/docx/docx-skill.md` - Word report generation
- `skills/pdf/pdf-skill.md` - PDF export
- `skills/pptx/pptx-skill.md` - PowerPoint generation
- `skills/xlsx/xlsx-skill.md` - Excel export
- `skills/html-report/html-report-skill.md` - HTML themes
- `skills/theme-factory/theme-factory-skill.md` - 10 color themes

**Integration with Agents:**

- In `BaseAgent.buildPrompt()`, inject relevant skills:
  ```typescript
  protected async buildPrompt(files: FileContent[], context: string): Promise<LLMMessage[]> {
    const relevantSkills = this.skillsManager.getSkillsForAgent(this.name);
    const skillContents = relevantSkills.map(s => this.skillsManager.getSkillContent(s.name));

    return [
      {
        role: 'system',
        content: `
          You are a specialized code review agent: ${this.name}

          ${skillContents.join('\n\n')}

          Analyze the following files and provide structured findings in JSON format.
        `
      },
      ...files.map(f => ({ role: 'user' as const, content: `File: ${f.path}\n\n${f.content}` })),
      { role: 'user', content: `Additional context from previous reviews:\n${context}` }
    ];
  }
  ```

**CLI Command:**

- `src/cli/commands/skills.ts`
  - `git-copilot skills list` - Show all loaded skills (built-in + custom)
  - `git-copilot skills reload` - Hot-reload skills
  - `git-copilot skills info <skill-name>` - Show skill details

**Testing:**
- Test skill loading from directory
- Test priority resolution (custom overrides built-in)
- Test filtering by agent type
- Test hot-reload

---

#### 4.3 Basic Report Generation (Day 44-46)

**Files to create:**

- `src/reports/types.ts`
  ```typescript
  interface ReportSection {
    title: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    findings: AgentFinding[];
    summary?: string;
    recommendations?: string[];
  }

  interface Report {
    title: string;
    repository: string;
    branch: string;
    generatedAt: Date;
    duration: number; // ms
    overallScore: number; // 0-100
    sections: ReportSection[];
    aggregated: AggregatedFindings;
    metadata: {
      totalFiles: number;
      linesOfCode: number;
      agentsRun: string[];
      llmUsed: string;
      tokensUsed: number;
    };
  }

  interface ReportGenerator {
    generate(aggregated: AggregatedFindings, config: OutputConfig): Promise<Report>;
    toMarkdown(report: Report): string;
    toHTML(report: Report, theme?: Theme): string;
    toJSON(report: Report): string;
  }
  ```

- `src/reports/generator.ts`
  ```typescript
  class ReportGenerator implements ReportGenerator {
    constructor(private skillsManager: SkillsManager);

    async generate(aggregated: AggregatedFindings, config: OutputConfig): Promise<Report> {
      const sections = await this.buildSections(aggregated);
      const score = this.calculateScore(aggregated);

      return {
        title: `Code Review Report`,
        repository: aggregated.repoInfo.name,
        branch: aggregated.repoInfo.branch,
        generatedAt: new Date(),
        duration: aggregated.duration,
        overallScore: score,
        sections,
        aggregated,
        metadata: {
          totalFiles: aggregated.totalFiles,
          linesOfCode: aggregated.totalLines,
          agentsRun: aggregated.agentsRun,
          llmUsed: aggregated.llmUsed,
          tokensUsed: aggregated.tokensUsed
        }
      };
    }

    private async buildSections(aggregated: AggregatedFindings): Promise<ReportSection[]> {
      return [
        await this.buildExecutiveSummary(aggregated),
        await this.buildSecuritySection(aggregated.findings),
        await this.buildCodeQualitySection(aggregated.findings),
        await this.buildPerformanceSection(aggregated.findings),
        await this.buildArchitectureSection(aggregated.findings),
        await this.buildDependencySection(aggregated.findings),
        await this.buildGitHealthSection(aggregated.findings),
        await this.buildFixExamples(aggregated.findings)
      ];
    }

    private calculateScore(aggregated: AggregatedFindings): number {
      // Weighted scoring:
      // - Critical findings: -20 each
      // - High: -10 each
      // - Medium: -5 each
      // - Low: -1 each
      // Base score 100, floor at 0
      const penalties = aggregated.findings.reduce((acc, f) => {
        const weight = { critical: 20, high: 10, medium: 5, low: 1, info: 0 };
        return acc + (weight[f.severity] || 0);
      }, 0);
      return Math.max(0, 100 - penalties);
    }

    toMarkdown(report: Report): string {
      // Use marked to generate markdown
      // Sections with headers, tables for findings, code blocks for examples
    }

    toHTML(report: Report, theme?: Theme): string {
      // Use template from skills/html-report/
      // Apply theme colors
      // Include interactive elements (collapsible sections)
    }

    toJSON(report: Report): string {
      return JSON.stringify(report, null, 2);
    }
  }
  ```

**Report Writer Node Update:**

- Modify `ReportWriterNode` to use `ReportGenerator`
- Generate report in configured format(s)
- Save to file(s) in output directory

**CLI Integration:**

- Update `git-copilot review` to:
  - Run workflow
  - Generate report in configured format (default: terminal)
  - If `--format markdown`, write to `./git-copilot-report.md`
  - If `--format html`, write to `./git-copilot-report.html`
  - If `--format terminal`, render to console

**Testing:**
- Unit test score calculation
- Test markdown generation (snapshot)
- Test HTML template rendering
- Test JSON export

---

**M4 Deliverables:**
- [x] Terminal UI with progress dashboard (Ink components)
- [x] Real-time agent status display during review
- [x] Claude Skills manager (load 15+ built-in skills)
- [x] Skill priority and hot-reload working
- [x] Report Generator with structured sections
- [x] Markdown output (file + terminal)
- [x] HTML output with basic theme (default theme)
- [x] `git-copilot review` shows live progress + final report
- [x] All agents using skills effectively
- [x] Unit/integration tests for report generation

---

### Phase 5: M5 - Git Visualization + Dashboard (Week 8)

#### 5.1 Git Graph Interactive UI (Day 47-50)

**Files to create:**

- `src/ui/components/git-graph.tsx`
  - Use `blessed` for low-level terminal control (box drawing, key events)
  - Use `ink` for React components if possible, or standalone blessed

  ```typescript
  // Option A: Pure blessed (more control over graphs)
  class GitGraphScreen {
    private grid: Grid;
    private commitList: List;
    private detailView: Box;

    constructor() {
      this.screen = blessed.screen({ smartCSR: true });
      this.grid = new Grid({ ... });
      this.commitList = new List({ ... });
      this.detailView = new Box({ ... });

      // Key bindings
      this.screen.key(['j', 'k', 'down', 'up'], () => this.navigate());
      this.screen.key(['enter'], () => this.showDetails());
      this.screen.key(['/'], () => this.search());
      this.screen.key(['q', 'escape'], () => process.exit(0));
    }

    async loadCommits(limit: number = 50) {
      const commits = await gitCollector.getCommitHistory(`-${limit}`);
      this.renderGraph(commits);
    }

    private renderGraph(commits: GitCommit[]) {
      // Build ASCII DAG
      // Use Unicode box-drawing characters: │, ├, ─, └, ┬, ┴, ┐, ┘
      // Layout:
      //   [commit hash] [author] [date] [message]
      //      │
      //      ├─ parent1
      //      ├─ parent2 (merge)
      //      └─ parent3

      // Color coding:
      // - Different color per author
      // - Or by time (newer = brighter)
      // - Or by commit type (merge, feat, fix)

      this.commitList.setItems(renderedLines);
    }

    private async showDetails(commit: GitCommit) {
      // Show full commit info in detail view (right pane or bottom)
      // - Full message
      // - Files changed (list)
      // - Diff preview (optional, may be long)
    }

    private async search(query: string) {
      // Filter commit list by message or author
    }
  }
  ```

**CLI Command:**

- `src/cli/commands/graph.ts` (enhanced from M1)
  - Interactive mode: `git-copilot graph` → launch blessed UI
  - Non-interactive mode: `git-copilot graph --ascii` → print to stdout
  - Options:
    - `--limit N` (default 50)
    - `--since <date>` filter
    - `--branch <name>` show specific branch

**Testing:**
- Unit test graph layout algorithm
- Test DAG rendering (merges, branches)
- Manual testing in terminal

---

#### 5.2 Repository Health Dashboard (Day 51-53)

**Files to create:**

- `src/ui/components/dashboard.tsx`
  - Ink component showing health metrics

  ```typescript
  interface HealthMetrics {
    overallScore: number;
    scores: {
      security: number;
      quality: number;
      performance: number;
      architecture: number;
      git: number;
    };
    hotFiles: { path: string; score: number; changes: number }[];
    contributorActivity: { author: string; commits: number; lastActive: Date }[];
    commitTimeline: { date: Date; count: number }[];
    recentIssues: AgentFinding[];
  }

  function Dashboard({ metrics }: { metrics: HealthMetrics }) {
    return (
      <Box flexDirection="column">
        <Text bold>Repository Health Dashboard</Text>

        {/* Overall Score Ring */}
        <ScoreRing score={metrics.overallScore} />

        {/* Sub-scores Grid */}
        <Grid columns={2}>
          <Box>Security: {metrics.scores.security}/100</Box>
          <Box>Quality: {metrics.scores.quality}/100</Box>
          <Box>Performance: {metrics.scores.performance}/100</Box>
          <Box>Architecture: {metrics.scores.architecture}/100</Box>
        </Grid>

        {/* Hot Files Table */}
        <Text bold>Hot Files (high churn + risk)</Text>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Cell>File</Table.Cell>
              <Table.Cell>Risk Score</Table.Cell>
              <Table.Cell>Changes (30d)</Table.Cell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {metrics.hotFiles.map(file => (
              <Table.Row key={file.path}>
                <Table.Cell>{file.path}</Table.Cell>
                <Table.Cell color={file.score > 80 ? 'red' : file.score > 50 ? 'yellow' : 'green'}>{file.score}</Table.Cell>
                <Table.Cell>{file.changes}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        {/* Contributor Sparkline (text-based chart) */}
        <Text bold>Contributor Activity (last 30 days)</Text>
        <Sparkline data={metrics.contributorActivity} />

        {/* Recent Issues List */}
        <Text bold>Recent Critical Issues</Text>
        <IssueList issues={metrics.recentIssues.filter(i => i.severity === 'critical' || i.severity === 'high')} />
      </Box>
    );
  }
  ```

**CLI Command:**

- `src/cli/commands/dashboard.ts`
  - `git-copilot dashboard` → show interactive dashboard (Ink)
  - `git-copilot dashboard --export <file>` → export metrics as JSON
  - Refresh interval: `--watch` mode polls every 60s

**Data Sources:**
- Recent review reports from Beads memory (last 30 days)
- Git commit history (contributor activity, churn)
- Aggregated findings from multiple reviews

**Testing:**
- Unit test metric calculations
- Test dashboard rendering with mock data
- Test sparkline ASCII chart generation

---

#### 5.3 Web Artifacts Builder Integration (Day 54-55)

**Skill:** `skills/web-artifacts-builder/web-artifacts-builder-skill.md`

**Purpose:** Generate complex interactive HTML dashboard artifacts using React 18 + TypeScript + Tailwind + shadcn/ui

**Integration:**

- Update HTML report generation to use web-artifacts-builder skill if available
- Build a standalone HTML file with embedded React app
- Include interactive charts (using Chart.js or Recharts compiled to standalone)
- Allow filtering, sorting, drilling down into findings

**Files to create:**

- `src/reports/web-dashboard.tsx` (React component)
  - Compile with `esbuild` to standalone JS bundle
  - Embed in HTML template

- `src/reports/html-generator.ts`
  ```typescript
  async generateInteractiveHTML(report: Report): Promise<string> {
    // 1. Read web-artifacts-builder skill instructions
    const skillContent = skillsManager.getSkillContent('web-artifacts-builder');

    // 2. Use LLM to generate React dashboard code based on skill + report data
    const prompt = `
      ${skillContent}

      Generate a complete React 18 dashboard for this report:

      Report Data:
      ${JSON.stringify(report, null, 2)}

      Requirements:
      - Use Tailwind CSS via CDN
      - Use shadcn/ui component styles (copy from CDN)
      - Include: score ring, metrics cards, findings table with filters, file tree heatmap
      - All JS inline in single HTML file
      - No external build step, runs in browser standalone
    `;

    const response = await llm.chat([{ role: 'user', content: prompt }]);
    const html = response.content; // LLM generates full HTML

    // 3. Save to file
    return html;
  }
  ```

**Testing:**
- Test HTML generation produces valid HTML
- Test dashboard renders correctly in browser (manual)
- Verify React/Chart.js loads from CDN

---

**M5 Deliverables:**
- [x] Interactive Git graph UI (blessed, navigation with j/k, search /)
- [x] Graph shows merges, branches, tags
- [x] Repository health dashboard (Ink UI)
- [x] Metrics: scores by category, hot files, contributor activity
- [x] `git-copilot dashboard` command
- [x] Web artifacts builder integration (interactive HTML dashboard)
- [x] HTML export uses React dashboard (optional fallback to static)
- [x] Dashboard exported as standalone HTML file
- [x] Unit tests for dashboard metrics calculation

---

### Phase 6: M6 - Export Formats + Advanced Features (Week 9)

#### 6.1 DOCX Export (Day 56-57)

**Files to create:**

- `src/reports/exporters/docx.ts`
  - Use `docx` package (npm: `docx`)
  - Generate professional Word document

  ```typescript
  import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';

  async exportToDocx(report: Report): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),

          // Metadata table
          new Table({
            rows: [
              new TableRow({
                children: [
                  newTableCell('Repository'),
                  newTableCell(report.repository)
                ]
              }),
              // ... more metadata rows
            ]
          }),

          // Executive Summary
          new Paragraph({
            text: "Executive Summary",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            children: this.generateSummaryParagraph(report)
          }),

          // Findings by severity (table for each section)
          ...report.sections.map(section =>
            this.renderSection(section)
          ),

          // Appendix: Recommendations
          new Paragraph({
            text: "Recommendations",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            children: report.aggregated.recommendations.map(rec =>
              new Paragraph(new TextRun({ text: `• ${rec}` }))
            )
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  private renderSection(section: ReportSection): Table | Paragraph[] {
    // Render section title
    // Render findings as table rows with severity colors
    // Include code examples in monospace
  }
  ```

**Skill:** `skills/docx/docx-skill.md` - Professional Word formatting guidelines

**CLI Integration:**

- `git-copilot export --format docx` → generates `git-copilot-report.docx`
- Options: `--output <file>`, `--theme <theme-name>` (affects styles)

**Testing:**
- Generate sample docx and verify structure (manually open in Word/LibreOffice)
- Test with large reports (>50 findings)
- Verify formatting (headings, tables, code blocks)

---

#### 6.2 PDF Export (Day 58)

**Files to create:**

- `src/reports/exporters/pdf.ts`
  - Use `pdf-lib` (or `puppeteer` for HTML→PDF conversion)

  **Option A: pdf-lib** (programmatic)
  ```typescript
  import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

  async exportToPDF(report: Report): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 700;
    const lineHeight = 14;
    const margin = 50;

    // Title
    page.drawText(report.title, {
      x: margin,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    y -= lineHeight * 3;

    // Metadata
    page.drawText(`Repository: ${report.repository}`, { x: margin, y, size: 12, font });
    y -= lineHeight * 2;

    // Sections loop...
    for (const section of report.sections) {
      // Draw section title
      page.drawText(section.title, { x: margin, y, size: 16, font: boldFont });
      y -= lineHeight * 1.5;

      // Draw findings
      for (const finding of section.findings) {
        const severityColor = this.getSeverityColor(finding.severity);
        page.drawText(`[${finding.severity.toUpperCase()}]`, {
          x: margin,
          y,
          size: 10,
          font: boldFont,
          color: severityColor
        });
        page.drawText(finding.message, {
          x: margin + 50,
          y,
          size: 10,
          font
        });
        y -= lineHeight;

        // Truncate if too long
        if (y < margin) {
          const newPage = pdfDoc.addPage([612, 792]);
          y = 700;
        }
      }
      y -= lineHeight * 2;
    }

    return await pdfDoc.save();
  }
  ```

**Option B: Puppeteer** (HTML→PDF, better styling)
- Generate HTML report first (from M4)
- Launch headless Chrome, print to PDF
- Better for complex layouts and styling

**Skill:** `skills/pdf/pdf-skill.md` - PDF generation best practices, watermarking, security

**CLI Integration:**

- `git-copilot export --format pdf`
- Options:
  - `--watermark "CONFIDENTIAL"`
  - `--encrypt <password>` (optional)
  - `--no-annotations` (remove links)

**Testing:**
- Generate PDF and verify pages, text rendering
- Test watermark overlay
- Test encryption (if implemented)

---

#### 6.3 PPTX Export (Day 59)

**Files to create:**

- `src/reports/exporters/pptx.ts`
  - Use `pptxgenjs` (npm: `pptxgenjs`)
  - Generate presentation slides for architecture reviews

  ```typescript
  import PptxGenJS from 'pptxgenjs';

  async exportToPptx(report: Report): Promise<Buffer> {
    const pptx = new PptxGenJS();

    // Apply theme from skill
    const theme = this.getTheme('tech-innovation');
    pptx.defineTheme({ ...theme });

    // Slide 1: Title
    const titleSlide = pptx.addSlide();
    titleSlide.addText(report.title, { x: 1, y: 1.5, fontSize: 36, bold: true });
    titleSlide.addText(`Generated: ${report.generatedAt.toLocaleString()}`, {
      x: 1, y: 2.5, fontSize: 18, color: '666666'
    });

    // Slide 2: Executive Summary
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Executive Summary', { fontSize: 32, bold: true });
    summarySlide.addText(`Overall Score: ${report.overallScore}/100`, {
      fontSize: 24,
      color: this.getScoreColor(report.overallScore)
    });
    summarySlide.addText(`Total Findings: ${report.aggregated.findings.length}`, { fontSize: 20 });

    // Slide 3-6: Sections (one per major section)
    for (const section of report.sections) {
      if (section.findings.length === 0) continue;
      const slide = pptx.addSlide();
      slide.addText(section.title, { fontSize: 28, bold: true });

      // Top findings table
      const topFindings = section.findings.slice(0, 5);
      const table = slide.addTable({
        x: 0.5,
        y: 1.2,
        w: '90%',
        h: 4,
        rows: topFindings.length + 1,
        cols: 3
      });
      table.getCell(0, 0).text({ text: 'Severity', bold: true });
      table.getCell(0, 1).text({ text: 'Issue', bold: true });
      table.getCell(0, 2).text({ text: 'File', bold: true });

      topFindings.forEach((f, i) => {
        table.getCell(i+1, 0).text({ text: f.severity, color: this.getSeverityColor(f.severity) });
        table.getCell(i+1, 1).text({ text: f.message });
        table.getCell(i+1, 2).text({ text: f.filePath || 'N/A' });
      });
    }

    // Slide: Dependency Matrix
    const depSlide = pptx.addSlide();
    depSlide.addText('Dependencies', { fontSize: 28, bold: true });
    // Table of all dependencies with versions and CVE status

    // Slide: Recommendations
    const recSlide = pptx.addSlide();
    recSlide.addText('Recommendations', { fontSize: 28, bold: true });
    report.aggregated.recommendations.forEach(rec => {
      recSlide.addText(`• ${rec}`, { fontSize: 18, indent: 1 });
    });

    return Buffer.from(await pptx.writeFile({ outputType: 'buffer' }));
  }
  ```

**Skill:** `skills/pptx/pptx-skill.md` - Presentation design principles, slide layouts, data visualization

**CLI Integration:**

- `git-copilot export --format pptx`
- `--template <modern|classic|minimal>` (choose slide theme)

**Testing:**
- Generate PPTX and open in PowerPoint/LibreOffice Impress
- Verify all slides render correctly
- Test table formatting and text wrapping

---

#### 6.4 XLSX Export (Day 60)

**Files to create:**

- `src/reports/exporters/xlsx.ts`
  - Use `exceljs` (npm: `exceljs`)
  - Generate spreadsheet with multiple worksheets

  ```typescript
  import ExcelJS from 'exceljs';

  async exportToXlsx(report: Report): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Worksheet 1: Findings Summary
    const findingsSheet = workbook.addWorksheet('Findings');
    findingsSheet.columns = [
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Agent', key: 'agent', width: 15 },
      { header: 'File', key: 'file', width: 30 },
      { header: 'Line', key: 'line', width: 8 },
      { header: 'Message', key: 'message', width: 60 },
      { header: 'Suggestion', key: 'suggestion', width: 50 }
    ];
    // Add rows, color rows by severity

    // Worksheet 2: Dependencies
    const depsSheet = workbook.addWorksheet('Dependencies');
    depsSheet.columns = [
      { header: 'Package', key: 'name' },
      { header: 'Current', key: 'current' },
      { header: 'Latest', key: 'latest' },
      { header: 'Vulnerable', key: 'vulnerable' },
      { header: 'License', key: 'license' },
      { header: 'Action', key: 'action' }
    ];

    // Worksheet 3: Metrics by File
    const filesSheet = workbook.addWorksheet('File Metrics');
    filesSheet.columns = [
      { header: 'File', key: 'file' },
      { header: 'LOC', key: 'loc' },
      { header: 'Complexity', key: 'complexity' },
      { header: 'Findings', key: 'findings' },
      { header: 'Churn (30d)', key: 'churn' }
    ];

    // Apply conditional formatting (red fill for critical rows)
    findingsSheet.eachRow((row, rowNumber) => {
      const severity = row.getCell(1).value;
      if (severity === 'critical') {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF0000' }
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
  ```

**Skill:** `skills/xlsx/xlsx-skill.md` - Excel best practices, conditional formatting, pivot tables

**CLI Integration:**

- `git-copilot export --format xlsx`
- Multiple worksheets automatically created

**Testing:**
- Open generated XLSX in Excel/LibreOffice Calc
- Verify all sheets, data, formatting
- Test conditional formatting

---

#### 6.4 Advanced CLI Commands (Day 61)

**Files to create:**

- `src/cli/commands/export.ts` (enhanced)
  - Support all formats: `--format markdown|html|docx|pdf|pptx|xlsx|json`
  - `--output <file>` (default: `git-copilot-report.<ext>` in cwd)
  - `--theme <theme>` (for HTML/PPTX)
  - `--since <commit>` (re-export from cached report)

- `src/cli/commands/history.ts`
  - `git-copilot history` → show trend of reviews over time
  - Use memory store to fetch past reviews (last 10)
  - Render ASCII line chart of score trends
  - Options: `--metric <score|findings|tokens>`

- `src/cli/commands/scan.ts`
  - Quick single-dimension scans (faster than full review)
  - `git-copilot scan --security` → run only SecurityAgent
  - `git-copilot scan --deps` → only DependencyAgent
  - `git-copilot scan --performance` → only PerformanceAgent
  - Returns quick report without full aggregation

**Testing:**
- CLI integration tests for all export formats
- Test history command with mock data
- Test scan commands for individual agents

---

**M6 Deliverables:**
- [x] DOCX export with professional formatting (TOC, styles, page numbers)
- [x] PDF export (with optional watermark/encryption)
- [x] PPTX export with multiple slide layouts (10+ themes)
- [x] XLSX export with multiple worksheets and conditional formatting
- [x] All export formats integrated into CLI
- [x] `git-copilot export --format <format>` works for all
- [x] `git-copilot history` with trend visualization
- [x] `git-copilot scan --<agent>` for quick scans
- [x] Theme selection for HTML/PPTX (10 themes from theme-factory skill)
- [x] Unit tests for all exporters (output validation)

---

### Phase 4: M4 - Report System + Skills (Week 7) CONTINUED

#### 4.4 Report Writer Agent with Skills (Day 46-47)

**Update ReportWriterAgent:**

- Load `code-review-report` skill for report structure
- Load output formatting skills based on config (docx, pdf, etc.)
- Generate structured report data first
- Then pass to exporters

**Files to modify:**

- `src/agents/report-writer.ts`
  ```typescript
  class ReportWriterAgent extends BaseAgent {
    async analyze(store: SharedStore): Promise<AgentResult> {
      const aggregated = store.aggregated!;

      // Build report structure
      const reportData = {
        title: `Code Review: ${store.repo.currentBranch}`,
        sections: this.buildSections(aggregated),
        recommendations: this.generateRecommendations(aggregated)
      };

      // Store as finding? No, this is final output
      // Instead, save report to shared store for export

      return {
        agentName: 'ReportWriter',
        findings: [], // No findings, just report
        tokensUsed: 0,
        duration: ...,
        reportData
      };
    }
  }
  ```

---

### Phase 7: M7 - Release Pipeline (Week 10)

#### 7.1 Package Publishing (Day 68-70)

**Files to create:**

- `.npmrc` - npm publish configuration
- `.release-it.json` or `standard-version` config
- `scripts/publish.js` - Automated release script

**Steps:**

1. Ensure `package.json` has:
   - `bin` field
   - `files` array (include `dist/`, `skills/`, `templates/`)
   - `repository` URL
   - `keywords`: `git`, `code-review`, `cli`, `ai`, `llm`, `security`
   - `author`, `license` (MIT)
   - `engines.node`: `>=18.0.0`

2. Test release dry-run:
   ```bash
   npm pack --dry-run
   ```

3. Bump version:
   ```bash
   npm version patch/minor/major (or use release-it)
   ```

4. Publish:
   ```bash
   npm publish --access public
   ```

5. Create GitHub release:
   - Generate changelog from commits
   - Attach compiled binaries (if using pkg)
   - Upload assets

**Testing:**
- Test `npm install git-copilot` from npm registry (test tag first)
- Verify binary works after install

---

#### 7.2 Homebrew Tap (Day 71)

**Files to create in separate repo `homebrew-tap`:**

- `Formula/git-copilot.rb`
  ```ruby
  class GitCopilot < Formula
    desc "AI-powered code review CLI"
    homepage "https://github.com/yourusername/git-copilot"
    url "https://github.com/yourusername/git-copilot/releases/download/v1.0.0/git-copilot-v1.0.0.tar.gz"
    sha256 "<checksum>"
    license "MIT"

    depends_on "node" => ":recommended"

    def install
      # Extract and move to prefix
      libexec.install Dir["*"]
      bin.install_symlink libexec/"bin/git-copilot"
    end

    test do
      system "#{bin}/git-copilot", "--version"
    end
  end
  ```

**Publishing:**
- Push formula to GitHub tap repo
- Submit to Homebrew core? (may take time, need to meet requirements)
- Document: `brew install yourusername/tap/git-copilot`

---

#### 7.3 pipx / PyPI (Stretch - Day 72)

**Note:** The PRD mentions pipx but this is a Node.js project. pipx typically installs Python packages.

**Option A:** Provide Docker container published to Docker Hub
- `docker build -t git-copilot:latest .`
- `docker push git-copilot:latest`
- Users: `docker run -v $(pwd):/repo git-copilot review`

**Option B:** Provide pre-built binaries using `pkg` or `nexe`
- Package Node.js app into single executable
- Publish to GitHub Releases
- Users download and run directly

**Chosen approach:** GitHub Releases binaries
- Use `pkg` to create standalone executables for:
  - Linux x64, arm64
  - macOS x64, arm64
  - Windows x64
- Upload to GitHub Releases
- Document: `curl -L https://github.com/.../git-copilot-linux-x64 -o git-copilot && chmod +x git-copilot`

---

#### 7.4 Documentation (Day 73-74)

**Files to create:**

- `docs/GETTING-STARTED.md` - Quick start guide
- `docs/CONFIGURATION.md` - Detailed config reference
- `docs/AGENTS.md` - What each agent does
- `docs/SKILLS.md` - Skills list and how to create custom ones
- `docs/BEADS.md` - Beads setup and troubleshooting
- `docs/PERFORMANCE.md` - Performance tuning tips
- `docs/TROUBLESHOOTING.md` - Common issues and fixes

- Update `README.md` with:
  - Installation instructions (npm, Homebrew, binary)
  - Basic usage examples
  - Screenshots/ASCII art of terminal UI
  - Links to full docs

**Website (optional):**
- GitHub Pages site with docs
- Or use `docsify` for simple markdown rendering

---

#### 7.5 CI/CD Pipeline (Day 75)

**Files to create:**

- `.github/workflows/ci.yml`
  - Run on PR and main
  - Steps:
    1. Setup Node.js
    2. Install deps (`bun install` or `npm ci`)
    3. Run typecheck
    4. Run lint
    5. Run tests with coverage
    6. Build project
    7. Upload coverage to Codecov (optional)

- `.github/workflows/release.yml`
  - On tag push (v*)
  - Build binaries for all platforms using `pkg` or `nexe`
  - Create GitHub Release with assets
  - Publish to npm (if not automated separately)

**Pre-commit hooks:**

- `.husky/pre-commit` (or simple `pre-commit` script)
  - Run `npm run lint`
  - Run `npm run test:unit` (fast tests only)
  - Run `npm run format` (auto-format)

---

**M7 Deliverables:**
- [x] Published on npm: `npm install git-copilot`
- [x] Homebrew formula available
- [x] GitHub Releases with binaries (Linux/macOS/Windows)
- [x] Complete documentation (docs/*.md)
- [x] README with quick start
- [x] CI/CD pipeline (GitHub Actions)
- [x] Pre-commit hooks
- [x] Code coverage reporting (Codecov)
- [x] v1.0.0 release tag
- [x] Release notes with all features and known limitations

---

## 4. Dependencies

### Core Runtime (package.json)

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^9.2.0",
    "ink": "^4.4.1",
    "blessed": "^0.1.81",
    "react": "^18.2.0",
    "simple-git": "^3.21.0",
    "pocketflow": "^0.2.0", // or custom implementation
    "better-sqlite3": "^9.2.2",
    "keytar": "^7.9.0",
    "marked": "^11.0.0",
    "marked-terminal": "^7.1.1",
    "shiki": "^1.5.0",
    "chalk": "^5.3.0",
    "yaml": "^2.3.4",
    "joi": "^17.11.0", // validation (replace with Zod?)
    "docx": "^8.5.0",
    "pdf-lib": "^1.17.1",
    "pptxgenjs": "^3.12.0",
    "exceljs": "^4.4.0",
    "uuid": "^9.0.0",
    "winston": "^3.11.0", // logging
    "ora": "^8.0.1", // spinners
    "cli-progress": "^3.12.0", // progress bars
    "axios": "^1.6.0", // LLM HTTP
    "@anthropic-ai/tokenizer": "^0.0.1", // optional for Claude token counting
    "tiktoken": "^1.0.0" // optional for OpenAI token counting
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/blessed": "^0.1.25",
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^9.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.1.0",
    "@typescript-eslint/parser": "^6.0.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.0.0",
    "nock": "^13.4.0",
    "playwright": "^1.40.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

### External System Dependencies

- **Node.js 20+** (required)
- **Git** (obviously)
- **Beads CLI (`bd`)** - Optional but recommended
  - Install: `npm install -g @beads/bd`
  - Or `brew install beads`
- **Dolt** (if using external Beads) - installed automatically with `bd`

---

## 5. Risks & Mitigations

### Technical Risks

**HIGH RISK:**

1. **Beads Integration Complexity**
   - External CLI dependency (`bd`) may not be installed
   - Dolt database setup can fail
   - Cross-platform issues (Windows vs Unix)
   - *Mitigation:*
     - Graceful fallback: if `beads.external.enabled=false`, use only custom memory
     - Detect installation in `init` and guide user
     - Comprehensive error messages
     - Consider embedding beads as library if CLI becomes blocker

2. **PocketFlow Parallelism Bugs**
   - Race conditions in shared store
   - Agents overwriting each other's results
   - Memory leaks from unclosed connections
   - *Mitigation:*
     - Use immutable data structures where possible
     - Each agent writes to `shared_store.results[agent_name]` (namespaced)
     - Implement proper cleanup in workflow post()
     - Extensive integration tests with 4+ concurrent agents

3. **LLM Output Parsing**
   - LLM may not follow structured output format (JSON)
   - Different providers have different response formats
   - Streaming responses harder to parse
   - *Mitigation:*
     - Strict prompting with examples (few-shot)
     - Use JSON schema validation (zod) on parsed output
     - Fallback: extract findings via regex if JSON parse fails
     - Retry with different prompt if parsing fails

4. **Performance at Scale**
   - 1000-file repo may exceed token limits
   - Parallel agent calls may hit rate limits quickly
   - Memory usage with large files
   - *Mitigation:*
     - Implement file chunking (analyze in batches)
     - Token-aware chunking (respect context window per agent)
     - Configurable concurrency (default 4)
     - Rate limiting per provider (configurable tokens-per-minute)
     - Stream responses to show progress early

5. **SQLite Concurrency**
   - Multiple agents writing to same memory DB simultaneously
   - `better-sqlite3` is synchronous but can block
   - *Mitigation:*
     - Use separate connection per agent? (overhead)
     - Or serialize writes through memory manager queue
     - Use WAL mode for better concurrency (`PRAGMA journal_mode=WAL`)
     - Test with high parallel load

**MEDIUM RISK:**

6. **Claude Skills Hot-Reload**
   - File watching may be flaky
   - Skill dependencies (one skill imports another)
   - *Mitigation:*
     - Manual `git-copilot skills reload` as primary method
     - Document skill structure clearly
     - Load order: custom > domain > formatting

7. **Terminal UI Compatibility**
   - Blessed doesn't work well on Windows (legacy cmd)
   - Ink requires modern terminal (iTerm2, Terminal.app, Windows Terminal)
   - *Mitigation:*
     - Detect terminal capabilities on init
     - Fall back to plain text if `--no-tui` or unsupported
     - Test on Windows (WSL2) early

8. **Export Formats Complexity**
   - DOCX/PDF/PPTX styling can be fiddly
   - Large reports may cause memory issues
   - *Mitigation:*
     - Start with simple templates, improve iteratively
     - Stream generation (don't load entire report in memory)
     - Test with edge cases (100+ findings)

**LOW RISK:**

9. **40+ Provider Support**
   - Some providers have unique API quirks
   - Rate limits vary widely
   - *Mitigation:*
     - Start with 3 (OpenAI, Anthropic, Ollama) in M2
     - Community contributions for other providers (plugin architecture v1.1)
     - Provider-specific adapters isolated (easy to add new)

10. **Beads v1.1 (Semantic Search) Deferred**
    - Current keyword search may be insufficient
    - Users may expect semantic similarity
    - *Mitigation:*
      - Document limitation clearly: v1.0 uses keyword search only
      - Plan v1.1 with embedding models (nomic-embed-text)
      - Keyword search with tag expansion may be enough for MVP

---

### Schedule Risks

**Scope Creep:**
- PRD is very comprehensive (7 milestones, 10 weeks)
- Risk of underestimating effort
- *Mitigation:*
  - Prioritize M1-M3 (core review functionality) for initial alpha
  - Defer M6 export polish to v1.1 if needed
  - MVP definition: Only Terminal Markdown reports, skip DOCX/PDF/PPTX initially
  - Track velocity and adjust scope weekly

**Integration Issues:**
- Multiple subsystems (LLM, Beads, PocketFlow, UI) must work together
- Integration bugs may surface late
- *Mitigation:*
  - Integration test from M2 onwards (single agent → multi-agent → full workflow)
  - Weekly end-to-end test runs
  - Feature flags to disable subsystems during debugging

---

## 6. Testing Strategy

### Unit Tests (Vitest)

**Coverage Target:** 80%+

**Test Files:**
- `tests/unit/config/manager.test.ts`
- `tests/unit/git/collector.test.ts`
- `tests/unit/llm/openai-adapter.test.ts`
- `tests/unit/agents/base.test.ts`
- `tests/unit/agents/code-quality.test.ts`
- `tests/unit/beads/storage/repository.test.ts`
- `tests/unit/beads/external-client.test.ts`
- `tests/unit/skills/manager.test.ts`
- `tests/unit/reports/generator.test.ts`
- `tests/unit/reports/exporters/*.test.ts`

**Mocking Strategy:**
- `simple-git` → mock responses
- LLM adapters → mock HTTP with `nock`
- `better-sqlite3` → use in-memory DB
- `keytar` → mock with in-memory storage
- `bd` CLI → mock exec with fixture outputs

---

### Integration Tests

**Test Scenarios:**

1. **Full Review Workflow (M3+)**
   - Setup: Git repo with sample code (multiple languages)
   - Run `git-copilot review` (with mock LLM provider that returns canned responses)
   - Verify:
     - All agents execute
     - Findings stored in memory
     - Report generated
     - Beads tasks created/closed (if enabled)

2. **Config Management**
   - Init → load → update → save
   - Encryption round-trip

3. **Beads Cross-Agent Context**
   - Agent1 finds XSS → store → Agent2 retrieves via memory search
   - Verify `relatedTaskId` linking

4. **Export Formats**
   - Generate each format and verify output is valid (not empty, correct MIME type)

**Fixtures:**
- `tests/fixtures/repos/` - Sample Git repositories with known issues
  - `vulnerable-node-app/` - XSS, SQLi, hardcoded secrets
  - `performance-anti-patterns/` - N+1 queries, nested loops
  - `architecture-smell/` - Circular deps, God class
  - `outdated-deps/` - package.json with old versions

---

### E2E Tests (Playwright)

**Test Scenarios:**

1. **CLI End-to-End**
   - Spawn `git-copilot` process
   - Interact with prompts (if any)
   - Verify output in terminal
   - Check files written (reports, config)

2. **Interactive UI**
   - Test `git-copilot graph` navigation
   - Test `git-copilot dashboard` rendering
   - Simulate key presses (j, k, Enter)

3. **Multi-Platform**
   - Test on Linux, macOS, Windows (WSL2)
   - Verify terminal colors render correctly

---

## 7. Code Quality Standards

### From PRD Section 3.5

**Naming:**
- `camelCase` for functions/variables
- `PascalCase` for classes/components
- `UPPER_SNAKE_CASE` for constants
- `kebab-case` for files

**Formatting:**
- Prettier with 2-space indent
- No semicolons (optional, follow existing style)
- Max 120 chars per line
- Single quotes

**TypeScript:**
- Strict mode: `strict: true`
- No `any` types (use `unknown` or specific)
- Explicit return types on public functions
- Interfaces over types for objects

**Modularity:**
- Each file < 300 lines (max)
- Single responsibility per module
- Extract utilities to `src/utils/`
- UI components in `src/ui/components/`

**Error Handling:**
- Try-catch all LLM calls
- User-friendly error messages (no stack traces)
- Exit with appropriate codes (0 success, 1 failure)
- Log errors to stderr

**Security:**
- Never log API keys
- Mask sensitive data in error reports
- Validate all user input (file paths, config values)
- Use `keytar` for API key storage (never plaintext)

---

## 8. Success Criteria per Milestone

### M1
- [ ] `git-copilot init` creates config with encrypted API key
- [ ] `git-copilot graph --limit 20` renders ASCII DAG correctly
- [ ] All TypeScript compiles without errors (`tsc --noEmit`)
- [ ] ESLint: 0 errors, 0 warnings
- [ ] Unit tests for config + git: >80% coverage

### M2
- [ ] `git-copilot review --help` shows all flags
- [ ] LLM adapter layer: OpenAI, Anthropic, Ollama all pass unit tests with mocked HTTP
- [ ] Beads detection: `git-copilot beads check` reports status
- [ ] Custom memory: SQLite DB created, CRUD operations tested
- [ ] CodeQualityAgent runs and produces findings (mock LLM)
- [ ] Integration test: Single agent review completes end-to-end

### M3
- [ ] 7 agents all implemented and tested
- [ ] Workflow runs 4 agents in parallel (verify with logs)
- [ ] Beads tasks created and closed (if enabled)
- [ ] Agent context sharing: Agent2 can see Agent1 findings in same review
- [ ] Aggregation deduplicates similar findings
- [ ] ReportWriter produces structured data
- [ ] `git-copilot review` runs full workflow with progress UI (real or stub)
- [ ] Integration tests: full workflow >80% coverage

### M4
- [ ] Terminal UI renders real-time progress (agents ticking off)
- [ ] Skills manager loads 15+ built-in skills
- [ ] Agents use skill content in prompts (verify by inspecting LLM calls in tests)
- [ ] Markdown report renders correctly in terminal (colored)
- [ ] HTML report generates with default theme (valid HTML)
- [ ] Score calculation (0-100) works as specified
- [ ] `git-copilot review` outputs report in terminal AND file (md)

### M5
- [ ] `git-copilot graph` interactive UI works (blessed)
- [ ] Navigation: j/k/up/down moves cursor, Enter shows details
- [ ] Graph correctly shows merges (multiple parents)
- [ ] Dashboard command works: `git-copilot dashboard`
- [ ] Dashboard shows metrics (scores, hot files, contributors)
- [ ] Web artifacts builder generates interactive HTML dashboard
- [ ] HTML export includes React dashboard (if skill enabled)

### M6
- [ ] All export formats produce non-empty files
- [ ] DOCX: opens in Word/LibreOffice, formatted correctly
- [ ] PDF: opens in Reader, text selectable
- [ ] PPTX: opens in PowerPoint, all slides present
- [ ] XLSX: opens in Excel/Calc, worksheets present, conditional formatting works
- [ ] `git-copilot export --format <format>` for all formats
- [ ] `git-copilot history` shows trend chart
- [ ] `git-copilot scan --security` runs single agent
- [ ] Theme selection works for HTML and PPTX

### M7
- [ ] `npm publish` succeeds (package name available)
- [ ] `npm install git-copilot` works in fresh project
- [ ] `brew install` works (if tap set up)
- [ ] GitHub Releases has binaries for Linux/macOS/Windows
- [ ] Binary runs without Node.js installed (if using pkg)
- [ ] CI pipeline runs on PR (green check)
- [ ] Documentation complete (8+ markdown files)
- [ ] README has installation + quick start
- [ ] v1.0.0 tag created
- [ ] Code coverage >80% (if reporting)

---

## 9. Development Workflow

### Branch Strategy

- `main` - stable, always releasable
- `feature/*` - new features (merge via PR)
- `bugfix/*` - bug fixes
- `release/v1.0.0` - release preparation

### Commit Conventions

Follow Conventional Commits:
- `feat:` - new feature
- `fix:` - bug fix
- `refactor:` - code restructuring
- `docs:` - documentation
- `test:` - tests
- `chore:` - build/CI changes

Example: `feat: add SecurityAgent OWASP scanning`

### Pull Request Process

1. Create feature branch
2. Implement feature with TDD (write tests first)
3. Run tests, lint, typecheck
4. Push and open PR
5. Use `/code-review` agent to review PR
6. Address feedback (fix critical/high issues)
7. Squash merge to main
8. Bump version if ready for release

### TDD Workflow

For each new module:
1. Write failing unit test
2. Implement minimum code to pass
3. Refactor (improve code structure)
4. Verify tests still pass
5. Repeat

For new agent:
1. Write test with mock LLM response
2. Implement prompt building
3. Implement response parsing
4. Verify integration with memory
5. Add integration test with real files

---

## 10. Post-M1 Adjustments

After completing M1 (foundation), review this plan and adjust:

- Did any dependencies prove harder than expected?
- Did any tools (PocketFlow, Beads) require API changes?
- Were there integration surprises?
- Should M2 scope be reduced (fewer agents) or M3 simplified?
- Update estimates based on actual velocity

---

**WAITING FOR CONFIRMATION**

This plan covers the complete implementation of git-copilot v1.0 following the PRD milestones. It includes:

✅ Detailed file structure and component breakdown
✅ Step-by-step implementation for each milestone (M1-M7)
✅ All major systems: LLM adapters, Beads, PocketFlow, Agents, Skills, UI, Exporters
✅ Testing strategy (unit, integration, E2E)
✅ Code quality standards (TypeScript strict, ESLint, Prettier)
✅ Release pipeline (npm, Homebrew, GitHub Releases)
✅ Risk assessment and mitigations
✅ Success criteria per milestone

**Next Steps:**
1. Confirm this plan (reply "yes" or "proceed")
2. Begin M1 implementation (Phase 1)
3. Set up project skeleton (package.json, tsconfig, etc.)
4. Implement config system and Git collector
5. Iterate through M2-M7

**Estimated Total Effort:** 10 weeks (70 days) for full v1.0 release.

**Questions or modifications before proceeding?**
