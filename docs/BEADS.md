# Beads Integration

git-copilot uses Beads for task coordination and cross-session memory. Beads consists of two parts:

1. **External Beads** (`steveyegge/beads`) - a task coordination system with Dolt-powered SQL database
2. **Custom Memory** - a local SQLite findings store for fast keyword search

## Why Two Systems?

- **External Beads** provides distributed task tracking, dependency graphs, and status updates. It's useful for large teams or when you want to see progress in the Beads UI.
- **Custom Memory** is lightweight, local-only, and optimized for fast retrieval of review findings. It stores data in SQLite with TTL-based cleanup.

Both can be used together or independently.

## Setup

### External Beads

1. Install Beads CLI:

```bash
npm install -g @beads/bd
# or using Homebrew (if available)
brew install beads/tap/bd
# or download from https://github.com/steveyegge/beads
```

2. Verify installation:

```bash
bd --version
```

3. Initialize in your repository (optional but recommended):

```bash
bd init
```

This creates a `.beads` directory with the Dolt database.

4. Enable in git-copilot config:

```bash
git-copilot config set beads.external.enabled true
```

### Custom Memory

Custom memory is enabled by default. It stores findings in:

```
~/.git-copilot/data/findings.db
```

You can change the location via `beads.custom.dataDir` (future). No setup required.

## How It Works

### During a Review

1. **Epic Creation**: When you run `git-copilot review`, an Epic task is created in Beads (if external enabled). The Epic ID is stored in the shared store.

2. **Agent Subtasks**: Each agent creates a sub-task, claims it, and executes. This provides fine-grained progress tracking.

3. **Findings Storage**: Each finding is stored in both:
   - The agent's result (in the workflow store)
   - Custom Memory (SQLite) for later retrieval
   - Linked to the Beads sub-task via `relatedTaskId`

4. **Context Injection**: Before an agent runs, it can query memory for related historical findings (e.g., "security" findings from previous reviews). This context is injected into the LLM prompt.

5. **Aggregation**: The AggregatorAgent deduplicates and scores findings.

6. **Epic Closure**: When done, the Epic is closed with a summary.

### Querying Memory

Use the `MemoryManager` API:

```typescript
const findings = await memory.searchFindings('xss', { limit: 10 })
const byTask = await memory.getFindingsByTask(taskId)
```

### Beads Commands

You can inspect progress using the `bd` CLI:

```bash
bd show <epic-id>       # Show task tree
bd ready                # List ready (unblocked) tasks
bd dep add <child> <parent>  # Set dependencies
```

## Configuration

```yaml
beads:
  external:
    enabled: true
    cliPath: bd                # Path to bd executable
    dataDir: .beads            # Beads data directory (relative to repo or absolute)
    autoInstall: false         # Auto-install if not found (default false)
  custom:
    enabled: true
    maxFindingsPerTask: 100
    retentionDays: 90          # Auto-delete findings older than this
    maxContextTokens: 4096     # Max tokens for context injection per agent
```

## Troubleshooting

### `bd: command not found`

Install Beads as described above, or set `beads.external.cliPath` to the full path.

### Permission errors on `.beads` directory

Ensure the directory is writable. Run `bd init` manually to initialize.

### Memory database locked

Better-sqlite3 uses write-ahead logging. If you encounter lock errors, ensure no other process is holding the DB. The custom memory DB is per-user and should not be shared.

### Findings not appearing in search

Check that `beads.custom.enabled` is true and the memory DB exists at `~/.git-copilot/data/findings.db`. Use `git-copilot config get beads.custom.enabled`.

### Disabling External Beads

If you don't want distributed task tracking, set `beads.external.enabled: false`. Custom memory will still work.

## Performance

- Custom Memory queries are fast (<100ms) with proper indexing on `tags` and `content`.
- Memory cleanup runs automatically on startup (removes entries older than `retentionDays`).

## Security

All data remains local. No telemetry is sent. The Beads external client only communicates with the local `bd` CLI, not with any remote server.
