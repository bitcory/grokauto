import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { ImagePlus, Type, Film, Clapperboard, Maximize } from 'lucide-react';
import type { GenerationMode, ResizeRatio } from '../../types';
import type { LucideIcon } from 'lucide-react';

const MODE_ICONS: Record<GenerationMode, LucideIcon> = {
  'image-to-image': ImagePlus,
  'text-to-image': Type,
  'frame-to-video': Film,
  'text-to-video': Clapperboard,
  'remix-video': Film,
  'resize': Maximize,
};

const MODES: GenerationMode[] = [
  'image-to-image',
  'text-to-image',
  'frame-to-video',
  'text-to-video',
  'resize',
];

const RESIZE_RATIOS: ResizeRatio[] = ['16:9', '9:16', '1:1', '3:2', '2:3'];

export default function ModeSelector() {
  const { t } = useTranslation();
  const { mode, setMode, resizeTargetRatio, setResizeTargetRatio, setPromptText } = useAppStore();

  const getResizePrompt = (ratio: ResizeRatio) =>
    `Extend and expand the background to fill the entire ${ratio} canvas. Keep the main subject exactly as it is, only extend the surrounding background naturally.`;

  return (
    <div className="px-4 py-3">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
        {t('mode.label')}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                if (m === 'resize') {
                  setPromptText(getResizePrompt(resizeTargetRatio));
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-[10px] font-bold rounded-neo-sm border-3 transition-all duration-150',
                mode === m
                  ? 'bg-primary/10 text-primary border-primary shadow-neo-sm-primary'
                  : 'bg-white text-foreground border-foreground hover:-translate-y-px hover:shadow-neo-sm active:translate-y-px active:shadow-none'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="leading-tight">{t(`mode.${m}`)}</span>
            </button>
          );
        })}
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
