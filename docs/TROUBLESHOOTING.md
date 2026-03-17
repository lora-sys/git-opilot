# Troubleshooting

Common issues and solutions for git-copilot.

## Installation Problems

### `EACCES: permission denied` during global install

**Fix:** Use a node version manager (nvm, fnm) or reinstall npm with a user-writable prefix.

```bash
# Reconfigure npm to use user directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

Or use `npx git-copilot` without global install.

### `command not found: git-copilot` after install

Ensure `~/.npm-global/bin` (or your npm global bin directory) is in your PATH.

```bash
export PATH=$(npm bin -g):$PATH
```

## Configuration Errors

### `No active LLM provider configured`

Set an active provider:

```bash
git-copilot config set activeProvider openai
```

### `API key not set for provider <name>`

Set the API key for that provider:

```bash
git-copilot config set providers.openai.apiKey sk-...
```

### `Cannot find module 'better-sqlite3'`

Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm ci
```

Or if on Linux, you may need `libsqlite3-dev`:

```bash
sudo apt-get install libsqlite3-dev
npm ci
```

## Runtime Errors

### `LLM request failed: rate limit exceeded`

- Reduce `maxConcurrent` to send fewer parallel requests
- Add a retry delay or increase `maxRetries`
- Upgrade your API plan for higher limits

### `Beads external client: bd: command not found`

Install Beads CLI:

```bash
npm install -g @beads/bd
```

Or set `beads.external.cliPath` to the correct path.

### `Database is locked` (better-sqlite3)

This occurs if multiple processes try to write to the same SQLite DB simultaneously. The custom memory DB is per-user and should be safe. If it happens:

1. Ensure no other git-copilot process is running
2. Delete `~/.git-copilot/data/findings.db` (data will be lost but safe)
3. Restart the review

### `Out of memory` (Ollama)

Your system doesn't have enough RAM for the model. Try:
- Use a quantized (smaller) model
- Close other applications
- Increase swap space (Linux/macOS)

### Review hangs indefinitely

- Check network connectivity to LLM provider
- Increase timeouts in config (`providers.<name>.timeout`)
- Enable debug logging: `DEBUG=* git-copilot review`

## Output Issues

### No colors in terminal output

Force color output:

```bash
git-copilot review --color
```

Or set environment variable: `FORCE_COLOR=1`

If your terminal doesn't support colors, use plain mode:

```bash
git-copilot review --plain
```

### Report sections missing

Some agents may have failed. Check the exit code and error messages. Run with `DEBUG=*` to see details.

### PDF/PPTX/XLSX export fails

These exporters have additional dependencies. Ensure you have the latest versions:

```bash
npm install pdf-lib pptxgenjs exceljs docx
```

If errors persist, report the issue with the full stack trace.

## Performance Issues

### Review takes too long

See [PERFORMANCE.md](PERFORMANCE.md) for tuning suggestions.

Common fixes:
- Lower `maxConcurrent`
- Use a faster LLM model
- Limit review range (`--range`)

## Beads Issues

### Tasks not appearing in `bd show`

Make sure you've initialized Beads in the repo: `bd init`

### `relatedTaskId` not linking findings

Check that `beads.external.enabled` is true and the Beads client can successfully create tasks. The `closeTask` might be failing; enable debug logging.

## Updating

### `git-copilot update` fails

The update command fetches latest Skills and the CLI binary. If it fails:
- Check network connectivity
- Ensure you have write permissions to the install directory
- Use `npm install -g git-copilot` to update manually

## Getting Help

If you encounter an issue not covered here:

1. Enable debug logging: `DEBUG=* git-copilot review > debug.log 2>&1`
2. Collect your config: `git-copilot config list > config.txt`
3. Open an issue on GitHub with:
   - OS and Node version (`node --version`)
   - git-copilot version (`git-copilot --version`)
   - The debug log and config
   - Steps to reproduce

## Known Limitations

- **Large files (>1MB)** may be skipped to avoid LLM context overflow
- **Binary files** are not analyzed (only text files)
- **Ollama** requires the model to be pre-pulled: `ollama pull <model>`
- **Windows** may require additional setup for better-sqlite3 (Visual Studio Build Tools)
