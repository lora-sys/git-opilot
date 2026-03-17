# Performance Tuning

This guide covers optimizing git-copilot for large repositories and slow networks.

## Factors Affecting Performance

1. **Number of files**: More files = more LLM context = longer analysis
2. **LLM provider speed**: GPT-4o is faster than GPT-4, Claude Sonnet is moderate, Ollama local models vary
3. **Parallelism**: `maxConcurrent` controls how many agents run simultaneously
4. **Network latency**: API round-trips add overhead
5. **Token limits**: Each LLM has context window limits; large diffs may be truncated

## Recommendations

### For Small Repos (< 100 files)

Default settings work well:

```yaml
maxConcurrent: 4
```

### For Medium Repos (100-1000 files)

- Reduce `maxConcurrent` to 2 or 3 if you hit rate limits
- Use faster models (e.g., `gpt-4o` instead of `gpt-4-turbo`)
- Consider enabling `output.format: terminal` to avoid extra rendering overhead

```yaml
maxConcurrent: 3
providers:
  openai:
    model: gpt-4o
```

### For Large Repos (> 1000 files)

- Set `maxConcurrent: 1` or 2 to avoid overwhelming the LLM
- Use `git-copilot review --range` to analyze only recent changes
- Split review into multiple runs (e.g., by directory)
- Increase timeouts if needed

```yaml
maxConcurrent: 2
providers:
  openai:
    timeout: 120000  # 2 minutes
    maxRetries: 5
```

### Offline Mode with Ollama

Ollama runs locally and avoids network latency, but model speed depends on your hardware.

```yaml
activeProvider: ollama
providers:
  ollama:
    baseUrl: http://localhost:11434
    model: llama3.3:70b-instruct-q4_K_M  # Quantized for speed
```

Ensure you have enough RAM/GPU memory. Pre-load the model before running.

### Memory Management

- The custom memory SQLite DB is small and fast. If it grows too large, `retentionDays` automatically prunes old entries.
- Use `beads.custom.maxFindingsPerTask` to limit how many findings each agent can store.

### Caching

Currently, each review run is independent. Future versions will add result caching based on file content hashes.

### Profiling

Enable debug logging to see timing:

```bash
DEBUG=* git-copilot review
```

Or set logger level in config (future).

## Expected Performance

| Repo Size | Agents | LLM | Concurrent | Typical Time |
|-----------|--------|-----|------------|--------------|
| Small (50 files) | 6 | GPT-4o | 4 | 30-60s |
| Medium (500 files) | 6 | GPT-4o | 3 | 1-2 min |
| Large (2000 files) | 6 | GPT-4o | 2 | 3-5 min |
| Large (2000 files) | 6 | Ollama (local) | 2 | 5-10 min |

These are approximate and depend on file content complexity.

## Slow? Try These First

1. Reduce `maxConcurrent` to 1
2. Switch to a faster model (e.g., `gpt-4o`)
3. Use `--range` to limit the review scope
4. Check network latency to your LLM provider
5. Ensure your API key has sufficient rate limits

## Future Optimizations

- **Streaming**: Stream LLM responses to reduce perceived latency
- **Parallel file chunking**: Split large files across multiple LLM calls
- **Result caching**: Reuse findings for unchanged files
- **Incremental review**: Only analyze files changed since last review
- **Adaptive concurrency**: Automatically adjust based on rate-limit responses
