export interface LogEntry {
  ts: number;
  level: 'log' | 'info' | 'warn' | 'error';
  source: 'content' | 'background';
  text: string;
}

export type OnLog = (entry: LogEntry) => void;

function formatArg(a: unknown): string {
  try {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

function formatMessage(args: unknown[]): string {
  const MAX = 800;
  const text = args.map(formatArg).join(' ');
  return text.length > MAX ? text.slice(0, MAX) + '…' : text;
}

// GrokAuto 태그가 붙은 로그만 UI로 중계해서 페이지/다른 코드의 잡음을 걸러낸다.
const TAG = '[GrokAuto]';

export function installLogRelay(source: LogEntry['source'], onLog: OnLog): void {
  (['log', 'info', 'warn', 'error'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try {
        const text = formatMessage(args);
        if (!text.includes(TAG)) return;
        onLog({ ts: Date.now(), level, source, text });
      } catch {
        // ignore
      }
    };
  });
}
