import { signal } from '@preact/signals';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: number;
  time: string;
  message: string;
  level: LogLevel;
  source?: string;
}

const MAX_LOGS = 200;

export class LogService {
  private _nextId = 0;
  readonly entries = signal<LogEntry[]>([]);

  private push(level: LogLevel, message: string, source?: string): void {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const entry: LogEntry = { id: this._nextId++, time, message, level, source };
    this.entries.value = [entry, ...this.entries.value].slice(0, MAX_LOGS);
  }

  info(message: string, source?: string): void {
    this.push('info', message, source);
  }

  warn(message: string, source?: string): void {
    this.push('warn', message, source);
  }

  error(message: string, source?: string): void {
    this.push('error', message, source);
  }

  success(message: string, source?: string): void {
    this.push('success', message, source);
  }

  clear(): void {
    this.entries.value = [];
  }
}

export const logService = new LogService();

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
