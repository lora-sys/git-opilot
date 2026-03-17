# Configuration Reference

git-copilot is configured via `~/.git-copilot/config.yaml` or by using `git-copilot config set` commands.

## Configuration Schema

### Top-level Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `activeProvider` | string | `openai` | Name of the LLM provider to use |
| `providers` | object | `{}` | Provider-specific configurations |
| `maxConcurrent` | number | `4` | Maximum number of agents running in parallel |
| `output` | object | `{ format: 'terminal' }` | Output format and options |
| `beads` | object | `{ external: { enabled: false }, custom: { enabled: true } }` | Beads integration settings |
| `skills` | object | `{ enabled: true, paths: [] }` | Skills configuration |

### Providers

Each provider under `providers` requires:

```yaml
providers:
  openai:
    apiKey: string
    baseUrl?: string (default: https://api.openai.com/v1)
    model?: string (default: gpt-4o)
    timeout?: number (ms)
    maxRetries?: number
  anthropic:
    apiKey: string
    baseUrl?: string (default: https://api.anthropic.com)
    model?: string (default: claude-3-5-sonnet-20241022)
    timeout?: number
    maxRetries?: number
  ollama:
    apiKey?: string (optional)
    baseUrl?: string (default: http://localhost:11434)
    model?: string (default: llama2)
```

Supported providers: openai, anthropic, ollama, litellm, openrouter, groq, together, replicate, etc. (40+ total)

### Output

```yaml
output:
  format: terminal | markdown | html | json | docx | pdf | pptx | xlsx
  path?: string (directory for file output)
  theme?: string (for HTML, select from built-in themes)
```

### Beads Integration

```yaml
beads:
  external:
    enabled: boolean
    cliPath: string (default: bd)
    dataDir: string (default: .beads)
    autoInstall: boolean (default: false)
  custom:
    enabled: boolean
    maxFindingsPerTask: number
    retentionDays: number
    maxContextTokens: number
```

### Skills

```yaml
skills:
  enabled: boolean
  paths: string[] (additional custom skill directories)
  autoReload: boolean (default: true)
```

## Setting Configuration via CLI

```bash
# View all config
git-copilot config list

# Get a specific key
git-copilot config get activeProvider

# Set a value
git-copilot config set activeProvider anthropic
git-copilot config set providers.anthropic.apiKey sk-ant-...

# Remove a key
git-copilot config unset providers.openai.apiKey
```

## Environment Variables

You can also set configuration via environment variables (useful for CI/CD):

- `GIT_COPILOT_ACTIVE_PROVIDER`
- `GIT_COPILOT_PROVIDERS_OPENAI_API_KEY`
- `GIT_COPILOT_PROVIDERS_ANTHROPIC_API_KEY`
- `GIT_COPILOT_MAX_CONCURRENT`
- `GIT_COPILOT_OUTPUT_FORMAT`
- `BEADS_DIR` (overrides Beads data directory)

## Security

API keys are stored in the system keychain (via `keytar`) when set through the CLI. Never hardcode secrets in config files.

## Validation

The config is validated on load. Invalid values will throw an error with a descriptive message.
