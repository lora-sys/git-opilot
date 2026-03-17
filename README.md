# git-copilot

> An intelligent CLI code collaboration assistant for Git repositories with multi-agent code review.

[![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

git-copilot is a **local-first** CLI tool that performs automated code review using a multi-agent parallel analysis framework. It integrates deeply with Git, supports 40+ LLM providers, and presents findings through a beautiful terminal UI.

## Features

- **Multi-agent parallel analysis**: Run 6 specialized agents concurrently (security, performance, architecture, code quality, dependencies, Git history)
- **40+ LLM providers**: OpenAI, Anthropic Claude, Ollama, DeepSeek, Groq, and more
- **Beads integration**: Task coordination and cross-session memory (external + custom SQLite)
- **Claude Skills**: Domain-specific expertise auto-loaded from built-in library (15+ Skills)
- **Multiple export formats**: Terminal, Markdown, HTML, DOCX, PDF, PPTX, XLSX
- **Interactive Git graph**: Navigate commit history with j/k, search with `/`
- **Health dashboard**: Repository metrics and trends
- **Zero telemetry**: All processing local, API keys encrypted with keytar

## Installation

### npm (recommended)

```bash
npm install -g git-copilot
```

### Homebrew

```bash
brew install yourusername/tap/git-copilot
```

### Pre-built binary

Download from [GitHub Releases](https://github.com/yourusername/git-copilot/releases) and make executable:

```bash
curl -L https://github.com/yourusername/git-copilot/releases/download/v1.0.0/git-copilot-linux-x64 -o git-copilot
chmod +x git-copilot
sudo mv git-copilot /usr/local/bin/
```

## Quick Start

1. **Configure your LLM provider** (first-time setup):

```bash
git-copilot config set activeProvider openai
git-copilot config set providers.openai.apiKey sk-...
```

Or for Anthropic:

```bash
git-copilot config set activeProvider anthropic
git-copilot config set providers.anthropic.apiKey sk-ant-...
```

2. **Run a review** on your current branch:

```bash
git-copilot review
```

Watch the progress dashboard as agents analyze your code in parallel.

3. **Export the report** (optional):

```bash
# Markdown file
git-copilot review --format markdown --output review.md

# PDF
git-copilot review --format pdf --output review.pdf

# HTML with interactive dashboard
git-copilot review --format html --output review.html
```

4. **Explore Git history**:

```bash
git-copilot graph
```

Navigate with `j/k`, press `Enter` for details, `/` to search.

## Documentation

- [Getting Started](docs/GETTING-STARTED.md) - Installation and basic usage
- [Configuration](docs/CONFIGURATION.md) - All config options and CLI commands
- [Agents](docs/AGENTS.md) - What each agent does and how they work
- [Skills](docs/SKILLS.md) - Claude Skills system and custom Skill creation
- [Beads](docs/BEADS.md) - Task coordination and memory system
- [Performance](docs/PERFORMANCE.md) - Tuning for large repositories
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and fixes

## Architecture

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

## Use Cases

- **Pull request review**: Get a second opinion before merging
- **Code audit**: Comprehensive security and quality scan of a codebase
- **Onboarding**: Understand codebase quality and architecture quickly
- **Compliance**: Generate reports for security standards (OWASP, SOC2)
- **Refactoring planning**: Identify technical debt hotspots

## Supported LLM Providers

OpenAI, Anthropic, Ollama, DeepSeek, Groq, Together, Replicate, OpenRouter, LiteLLM, Azure OpenAI, Google Vertex AI, Mistral AI, Cohere, Perplexity, and 20+ more via LiteLLM proxy.

## Requirements

- Node.js 20+
- Git
- For Beads: `bd` CLI (optional)
- API key for your chosen LLM provider (Ollama is free/local)

## Development Status

**Current Version:** 1.0.0 (M7 Release)

**Milestones:**
- ✅ M1: Foundation (CLI, config, Git collector)
- ✅ M2: LLM Adapters + Beads Integration
- ✅ M3: Multi-agent Parallel Execution
- ✅ M4: Terminal UI + Claude Skills
- ✅ M5: Git Graph + Dashboard
- ✅ M6: Report Exporters (DOCX, PDF, PPTX, XLSX)
- ✅ M7: Release Pipeline (CI/CD, Docs, Publishing)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT © 2025 git-copilot contributors

---

**Made with ❤️ for developers who care about code quality**
