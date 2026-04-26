import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueueStore } from '../../store/useQueueStore';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
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
  const { items, activeCount, completedCount, failedCount, removeItems, clearItems } = useQueueStore();
  const { setPromptText, isRunning, uploadedImages, setUploadedImages, imageFrameMode } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const toggleSelect = (id: string) => {
    if (isRunning) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (isRunning) return;
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // 이미지 매핑: start-end=프롬프트당 2장, 그 외=1장 (uploadedImages가 1장이면 공유라 건드리지 않음)
  const getImageIndicesForPrompts = (promptIndices: number[]): number[] => {
    if (uploadedImages.length <= 1) return []; // 공유 이미지는 건드리지 않음
    if (imageFrameMode === 'start-end') {
      return promptIndices.flatMap((i) => [i * 2, i * 2 + 1]);
    }
    return promptIndices;
  };

  const handleDelete = () => {
    const deletedIndices = items
      .map((item, i) => (selectedIds.has(item.id) ? i : -1))
      .filter((i) => i !== -1);

    const imgIndicesToRemove = new Set(getImageIndicesForPrompts(deletedIndices));
    if (imgIndicesToRemove.size > 0) {
      setUploadedImages(uploadedImages.filter((_, idx) => !imgIndicesToRemove.has(idx)));
    }

    // 큐가 비어 있지 않을 때만 텍스트 박스 동기화 (전체 삭제 시는 기존 텍스트 유지)
    const remaining = items.filter((item) => !selectedIds.has(item.id));
    if (remaining.length > 0) {
      setPromptText(remaining.map((item) => item.text).join('\n\n'));
    }

    removeItems([...selectedIds]);
    setSelectedIds(new Set());
  };

  const handleRerun = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    const selectedIndices = items
      .map((item, i) => (selectedIds.has(item.id) ? i : -1))
      .filter((i) => i !== -1);

    // 선택된 항목의 이미지만 남기기
    if (uploadedImages.length > 1) {
      const keepIndices = new Set(getImageIndicesForPrompts(selectedIndices));
      setUploadedImages(uploadedImages.filter((_, idx) => keepIndices.has(idx)));
    }

    const text = selectedItems.map((i) => i.text).join('\n\n');
    setPromptText(text);
    clearItems();
    setSelectedIds(new Set());
  };

  const allSelected = selectedIds.size === items.length && items.length > 0;

  return (
    <div className="px-4 py-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('queue.label')}
        </label>
        <div className="flex gap-1.5 items-center">
          {!isRunning && (
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="text-[9px] text-muted-foreground hover:text-foreground underline"
            >
              {allSelected ? '선택해제' : '전체선택'}
            </button>
          )}
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

      {/* 선택 시 액션 바 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-1.5 mb-1.5 p-1.5 bg-muted rounded-lg border border-border">
          <span className="text-[9px] text-muted-foreground flex-1">
            {selectedIds.size}개 선택됨
          </span>
          <button
            onClick={handleRerun}
            className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md bg-primary text-white hover:bg-primary/90"
          >
            <Icon icon="solar:refresh-bold" width={10} height={10} />
            재실행
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-[9px] font-semibold px-2 py-1 rounded-md bg-danger text-white hover:bg-danger/90"
          >
            <Icon icon="solar:trash-bin-minimalistic-bold" width={10} height={10} />
            삭제
          </button>
        </div>
      )}

      {/* 아이템 목록 */}
      <div className="space-y-1">
        {items.map((item, idx) => {
          const selected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={cn(
                'flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1 text-[9px] shadow-sm transition-all',
                !isRunning && 'cursor-pointer',
                selected
                  ? 'border-primary ring-1 ring-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              {!isRunning && (
                <div className={cn(
                  'w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center',
                  selected ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {selected && <Icon icon="solar:check-read-bold" width={8} height={8} className="text-white" />}
                </div>
              )}
              {/* 프롬프트 순번 — 저장 파일명의 앞번호와 동일하게 매칭됨 */}
              <span className="min-w-[18px] text-right font-semibold tabular-nums text-muted-foreground flex-shrink-0">
                {idx + 1}
              </span>
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
                {item.status === 'running'
                  ? item.phase
                    ? t(`queue.phase.${item.phase}`)
                    : item.progress != null
                      ? `${item.progress}%`
                      : t('queue.running')
                  : t(`queue.${item.status === 'completed' ? 'completedStatus' : item.status === 'failed' ? 'failedStatus' : item.status}`)
                }
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
