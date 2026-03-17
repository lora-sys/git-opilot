# Getting Started with git-copilot

git-copilot is an AI-powered code review CLI that runs locally and supports 40+ LLM providers.

## Installation

```bash
# Using npm
npm install -g git-copilot

# Using Homebrew (if published)
brew install yourusername/tap/git-copilot

# Using pre-built binary (from GitHub Releases)
curl -L https://github.com/yourusername/git-copilot/releases/download/v1.0.0/git-copilot-linux-x64 -o git-copilot && chmod +x git-copilot && sudo mv git-copilot /usr/local/bin/
```

## Prerequisites

- Node.js 20+ (if installing via npm)
- A supported LLM provider API key (OpenAI, Anthropic, Ollama, etc.)
- For Beads integration: `bd` CLI (optional, install from [steveyegge/beads](https://github.com/steveyegge/beads))

## Initial Setup

1. **Configure your LLM provider:**

```bash
git-copilot config set providers.openai.apiKey sk-...
# or for anthropic:
git-copilot config set providers.anthropic.apiKey sk-ant-...
# set active provider:
git-copilot config set activeProvider openai
```

2. **(Optional) Initialize Beads for task coordination:**

```bash
bd init
```

## Basic Usage

### Review current branch

```bash
git-copilot review
```

This will:
- Analyze all changed files in the current branch
- Run parallel agents (security, performance, architecture, etc.)
- Show a progress dashboard in the terminal
- Output a comprehensive report

### Review a specific commit range

```bash
git-copilot review --range HEAD~5..HEAD
```

### Export report to different formats

```bash
git-copilot review --format markdown --output report.md
git-copilot review --format html --output report.html
git-copilot review --format pdf --output report.pdf
git-copilot review --format docx --output report.docx
git-copilot review --format pptx --output report.pptx
git-copilot review --format xlsx --output report.xlsx
```

### View Git history interactively

```bash
git-copilot graph
```

Use `j/k` to navigate, `Enter` to view commit details, `/` to search.

### View repository health dashboard

```bash
git-copilot dashboard
```

## Configuration

git-copilot stores configuration in `~/.git-copilot/config.yaml` (or use the CLI to set values).

Common settings:

```yaml
activeProvider: openai
providers:
  openai:
    apiKey: sk-...
    model: gpt-4o
  anthropic:
    apiKey: sk-ant-...
    model: claude-3-5-sonnet-20241022

maxConcurrent: 4
output:
  format: terminal

beads:
  external:
    enabled: true
    cliPath: bd
    dataDir: .beads
  custom:
    enabled: true
    retentionDays: 90
```

Use `git-copilot config get <key>` and `git-copilot config set <key> <value>` to manage config.

## Agents

git-copilot runs multiple specialized agents in parallel:

- **SecurityAgent**: OWASP Top 10, XSS, SQL injection, etc.
- **PerformanceAgent**: Complexity, N+1 queries, memory leaks
- **ArchitectureAgent**: Design patterns, coupling, cohesion
- **CodeQualityAgent**: Complexity, duplication, readability
- **DependencyAgent**: CVE checks, outdated dependencies
- **GitHistoryAgent**: Commit hygiene, secrets detection
- **AggregatorAgent**: Deduplication and severity scoring
- **ReportWriterAgent**: Formats final report

Each agent's findings are stored in the Beads memory system for cross-session context.

## Claude Skills

When using Anthropic Claude, git-copilot automatically loads relevant Skills for domain-specific expertise. Built-in Skills include:

- `code-review` - General code review patterns
- `secure-code-review` - Security-focused review
- `owasp-audit` - OWASP compliance
- `web-design-audit` - Frontend best practices
- `docx`, `pdf`, `pptx`, `xlsx` - Format-specific output rules
- And more...

Skills are loaded from the `skills/` directory and can be customized.

## Beads Integration

Beads provides task coordination and memory:

- **External Beads** (`bd` CLI) tracks review tasks, dependencies, and status
- **Custom Memory** (SQLite) stores findings for semantic search and context injection

Enable/disable in config under `beads` section.

## Troubleshooting

### TypeScript compilation errors
Ensure you're using Node.js 20+ and run `npm ci` to install exact dependencies.

### LLM API errors
Check your API key and network connectivity. For Ollama, ensure the server is running locally.

### Beads not found
Install Beads: `npm install -g @beads/bd` or follow instructions at https://github.com/steveyegge/beads

### Permission denied on Linux/macOS
Add your user to the appropriate group or use `sudo` for global install.

## Next Steps

- Read the full [Configuration](CONFIGURATION.md) reference
- Learn about [Agents](AGENTS.md) and what each one does
- Explore [Skills](SKILLS.md) and how to create custom ones
- Understand [Beads](BEADS.md) setup and troubleshooting
- Optimize [Performance](PERFORMANCE.md) for large repos
- Check [Troubleshooting](TROUBLESHOOTING.md) for common issues
