export class GitCopilotError extends Error {
  public code: string;
  public details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'GitCopilotError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export class ConfigError extends GitCopilotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFIG_ERROR', message, details);
    this.name = 'ConfigError';
  }
}

export class GitError extends GitCopilotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GIT_ERROR', message, details);
    this.name = 'GitError';
  }
}

export class LLMError extends GitCopilotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('LLM_ERROR', message, details);
    this.name = 'LLMError';
  }
}

export class ValidationError extends GitCopilotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends GitCopilotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('FILESYSTEM_ERROR', message, details);
    this.name = 'FileSystemError';
  }
}
