import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { LogEntry } from '../../shared/logger';

const MAX_ENTRIES = 500;

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function colorFor(level: LogEntry['level']): string {
  switch (level) {
    case 'error':
      return 'text-red-500';
    case 'warn':
      return 'text-amber-600';
    case 'info':
      return 'text-blue-500';
    default:
      return 'text-foreground';
  }
}

export default function LogsPanel() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 초기 히스토리 로드 + 실시간 구독
  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'GET_LOG_HISTORY' })
      .then((resp: { entries?: LogEntry[] }) => {
        if (resp?.entries) setEntries(resp.entries);
      })
      .catch(() => {});

    const listener = (msg: { type: string; payload?: LogEntry }) => {
      if (msg.type === 'LOG_ENTRY' && msg.payload) {
        setEntries((prev) => {
          const next = [...prev, msg.payload!];
          if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
          return next;
        });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const visible = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.toLowerCase();
    return entries.filter((e) => e.text.toLowerCase().includes(q));
  }, [entries, filter]);

  const clear = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_LOG_HISTORY' }).catch(() => {});
    setEntries([]);
  };

  const copyAll = async () => {
    const text = entries
      .map((e) => `${fmtTime(e.ts)} [${e.source}/${e.level}] ${e.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Logs
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {visible.length}/{entries.length}
        </span>
        <label className="ml-auto flex items-center gap-1 text-[10px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          자동 스크롤
        </label>
        <button
          onClick={copyAll}
          className="text-[10px] px-2 py-1 rounded-md border border-border bg-white hover:bg-muted flex items-center gap-1"
          title="전체 복사"
        >
          <Icon icon="solar:copy-linear" width={12} height={12} />
          복사
        </button>
        <button
          onClick={clear}
          className="text-[10px] px-2 py-1 rounded-md border border-border bg-white hover:bg-muted flex items-center gap-1"
        >
          <Icon icon="solar:trash-bin-trash-linear" width={12} height={12} />
          지우기
        </button>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="필터 (예: download, imagine, upscale)"
        className="memphis-input w-full text-xs"
      />

      <div
        ref={scrollRef}
        className="neo-card p-2 overflow-y-auto font-mono text-[10px] leading-snug space-y-0.5 bg-black/[0.04]"
        style={{ height: 'calc(100vh - 240px)' }}
      >
        {visible.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            {entries.length === 0
              ? '로그가 없습니다. 자동화를 시작하면 여기에 표시됩니다.'
              : '필터에 해당하는 로그가 없습니다.'}
          </div>
        )}
        {visible.map((e, i) => (
          <div
            key={`${e.ts}-${i}`}
            className={`${colorFor(e.level)} whitespace-pre-wrap break-all`}
          >
            <span className="text-muted-foreground">{fmtTime(e.ts)}</span>{' '}
            <span className="opacity-60">[{e.source[0]}]</span> {e.text}
          </div>
        ))}
      </div>
    </div>
  );
}
