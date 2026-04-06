import { useTranslation } from 'react-i18next';
import { useQueueStore } from '../../store/useQueueStore';
import { cn } from '../../utils/cn';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  running: 'bg-warning/20 text-warning border-warning/40',
  completed: 'bg-success/20 text-success border-success/40',
  failed: 'bg-danger/20 text-danger border-danger/40',
};

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-foreground',
  running: 'bg-warning animate-pulse',
  completed: 'bg-success',
  failed: 'bg-danger',
};

export default function PromptQueue() {
  const { t } = useTranslation();
  const { items, activeCount, completedCount, failedCount } = useQueueStore();

  if (items.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('queue.label')}
        </label>
        <div className="flex gap-1.5">
          <span className="memphis-badge bg-warning/15 text-warning border-warning/30">
            {t('queue.active', { count: activeCount() })}
          </span>
          <span className="memphis-badge bg-success/15 text-success border-success/30">
            {t('queue.completed', { count: completedCount() })}
          </span>
          <span className="memphis-badge bg-danger/15 text-danger border-danger/30">
            {t('queue.failed', { count: failedCount() })}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2 py-1 text-[9px] shadow-sm"
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                STATUS_DOT[item.status]
              )}
            />
            <span className="truncate flex-1 text-foreground font-medium">
              {item.text.slice(0, 50)}
              {item.text.length > 50 ? '...' : ''}
            </span>
            <span
              className={cn(
                'memphis-badge flex-shrink-0',
                STATUS_BADGE[item.status]
              )}
            >
              {t(`queue.${item.status === 'completed' ? 'completedStatus' : item.status === 'failed' ? 'failedStatus' : item.status}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
