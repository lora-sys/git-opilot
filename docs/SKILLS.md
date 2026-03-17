# Claude Skills in git-copilot

Claude Skills are knowledge bases that enhance agent reasoning with domain-specific expertise. git-copilot includes 15+ built-in Skills and supports custom Skills.

## What Are Skills?

A Skill is a Markdown document (or directory) containing:
- Contextual information and examples
- Reasoning patterns
- Output formatting rules
- Domain-specific best practices

When using Anthropic Claude, relevant Skills are automatically loaded and injected into the LLM prompt, improving the quality and relevance of the analysis.

## Built-in Skills

| Skill | Purpose | Used By |
|-------|---------|---------|
| `code-review` | General code review patterns, style guides | All agents |
| `secure-code-review` | Deep security expertise, OWASP cheat sheets | SecurityAgent |
| `owasp-audit` | Detailed OWASP Top 10 with examples | SecurityAgent |
| `web-design-audit` | Frontend best practices, accessibility, UX | CodeQualityAgent |
| `docx` | Word document formatting rules | ReportWriterAgent |
| `pdf` | PDF generation and layout | ReportWriterAgent |
| `pptx` | PowerPoint slide design | ReportWriterAgent |
| `xlsx` | Excel formatting and data presentation | ReportWriterAgent |
| `theme-factory` | Color schemes and styling themes | ReportWriterAgent (HTML) |
| `frontend-design` | React, accessibility, performance | CodeQualityAgent |
| `web-artifacts-builder` | Interactive HTML dashboard patterns | ReportWriterAgent (HTML) |
| `doc-coauthoring` | Collaborative document review | ReportWriterAgent |
| `internal-comms` | Internal communication best practices | ReportWriterAgent |
| `mcp-builder` | Model Context Protocol development | Developers |
| `skill-creator` | How to create new Skills | Developers |

## Skill Loading Order

Skills are loaded in priority order:
1. **User custom Skills** (highest priority, can override built-in)
2. **Built-in domain Skills** (security, architecture, etc.)
3. **General output formatting Skills** (docx, pdf, pptx, xlsx)

Only Skills matching the current agent's type are loaded. For example, when SecurityAgent runs, it gets `secure-code-review`, `owasp-audit`, and `code-review`.

## Directory Structure

```
skills/
├── code-review/
│   ├── meta.json
│   └── SKILL.md
├── secure-code-review/
│   ├── meta.json
│   └── SKILL.md
├── docx/
│   ├── meta.json
│   └── SKILL.md
└── custom/              # User-provided custom Skills
    └── my-company-style/
        ├── meta.json
        └── SKILL.md
```

Each Skill must have a `meta.json`:

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Brief description",
  "tags": ["security", "web"],
  "author": "Your Name"
}
```

The main content is in `SKILL.md` (Markdown).

## Creating Custom Skills

1. Create a directory under `skills/custom/` or an external path
2. Write `meta.json` and `SKILL.md`
3. Add the path to config: `skills.paths: ["./my-skills"]`
4. Restart git-copilot (or use `update` command if hot-reload enabled)

### SKILL.md Structure

```markdown
# Skill Name

## Context
Describe when this skill is relevant.

## Examples
Provide concrete examples of good/bad patterns.

## Reasoning Patterns
Guidance for how to think about the problem.

## Output Rules
- Bullet points for required output format
- Required sections
- Prohibited content
```

## Hot-Reload

By default (`skills.autoReload: true`), Skills are reloaded on each run. Use `git-copilot update` to fetch latest built-in Skills from the remote repository.

## Disabling Skills

Set `skills.enabled: false` in config to disable all Skills, or remove a specific Skill directory.

## Updating Built-in Skills

Run:

```bash
git-copilot update
```

This fetches the latest Skills from the upstream repository without requiring a full tool update.
