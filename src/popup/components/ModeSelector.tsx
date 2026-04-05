import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Undo2 } from 'lucide-react';
import type { GenerationMode, ResizeRatio } from '../../types';

const MODES: GenerationMode[] = [
  'image-to-image',
  'text-to-image',
  'frame-to-video',
  'text-to-video',
  'remix-video',
  'resize',
  'talking-video',
  'cinematic-intro',
];

const RETURN_MODES: GenerationMode[] = ['talking-video', 'cinematic-intro'];

const RESIZE_RATIOS: ResizeRatio[] = ['16:9', '9:16', '1:1', '3:2', '2:3'];

export default function ModeSelector() {
  const { t } = useTranslation();
  const { mode, previousMode, setMode, resizeTargetRatio, setResizeTargetRatio, setPromptText } = useAppStore();

  const getResizePrompt = (ratio: ResizeRatio) =>
    `Extend and expand the background to fill the entire ${ratio} canvas. Keep the main subject exactly as it is, only extend the surrounding background naturally.`;

  return (
    <div className="px-4 py-3">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
        {t('mode.label')}
      </label>
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => {
            const m = e.target.value as GenerationMode;
            setMode(m);
            if (m === 'resize') {
              setPromptText(getResizePrompt(resizeTargetRatio));
            }
          }}
          className="memphis-select flex-1"
        >
          {MODES.map((m) => (
            <option key={m} value={m}>{t(`mode.${m}`)}</option>
          ))}
        </select>
        {previousMode && RETURN_MODES.includes(previousMode) && !RETURN_MODES.includes(mode) && (
          <button
            onClick={() => setMode(previousMode)}
            className="neo-btn px-2.5 py-1.5 text-[10px] gap-1 bg-primary/10 text-primary border-primary whitespace-nowrap"
          >
            <Undo2 className="w-3 h-3" />
            {t(`mode.${previousMode}`)}
          </button>
        )}
      </div>

      {/* Resize ratio selector */}
      {mode === 'resize' && (
        <div className="mt-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {t('mode.resizeRatio')}
          </label>
          <div className="flex gap-1.5">
            {RESIZE_RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setResizeTargetRatio(r);
                  setPromptText(getResizePrompt(r));
                }}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-bold rounded-neo-sm border-2 transition-all',
                  resizeTargetRatio === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-foreground border-foreground hover:bg-muted'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
