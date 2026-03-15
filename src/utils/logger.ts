import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'git-copilot', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    let color = 'white';
    let bgColor = 'bgBlue';

    switch (level) {
      case LogLevel.DEBUG:
        color = 'gray';
        break;
      case LogLevel.INFO:
        color = 'cyan';
        break;
      case LogLevel.WARN:
        color = 'yellow';
        bgColor = 'bgYellow';
        break;
      case LogLevel.ERROR:
        color = 'red';
        bgColor = 'bgRed';
        break;
    }

    const levelStr = level.toString().padStart(5);
    const prefix = chalk[bgColor](chalk.white(` ${levelStr} `));
    return `${chalk.gray(`[${timestamp}]`)} ${prefix} ${chalk[color](`[${this.prefix}]`)} ${message}`;
  }

  debug(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.log(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.level <= LogLevel.WARN) {
      console.log(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  error(message: string, error?: Error | unknown) {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage(LogLevel.ERROR, message));
      if (error) {
        if (error instanceof Error) {
          console.error(chalk.red(error.stack || error.message));
        } else {
          console.error(chalk.red(String(error)));
        }
      }
    }
  }

  success(message: string, ...args: unknown[]) {
    console.log(chalk.green(`✓ ${message}`), ...args);
  }

  infoBox(title: string, content: string) {
    const lines = content.split('\n');
    const maxWidth = Math.min(
      80,
      Math.max(
        title.length + 4,
        ...lines.map(l => l.length)
      )
    );

    const border = chalk.blue('─'.repeat(maxWidth + 2));
    const titleLine = chalk.bgBlue.white(` ${title} `).padEnd(maxWidth + 2);

    console.log(`┌${border}┐`);
    console.log(`│${titleLine}│`);

    for (const line of lines) {
      const padded = line.padEnd(maxWidth);
      console.log(`│ ${padded} │`);
    }

    console.log(`└${'─'.repeat(maxWidth + 2)}┘`);
  }
}

// Default logger instance
export const logger = new Logger();
