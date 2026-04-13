import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Icon } from '@iconify/react';
import type { GenerationMode, ResizeRatio, VideoSettings } from '../../types';

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

const IMAGE_ASPECT_RATIOS: VideoSettings['aspectRatio'][] = ['16:9', '9:16', '1:1', '3:2', '2:3'];

const IMAGE_RATIO_MODES: GenerationMode[] = ['text-to-image', 'image-to-image'];

export default function ModeSelector() {
  const { t } = useTranslation();
  const {
    mode,
    previousMode,
    setMode,
    resizeTargetRatio,
    setResizeTargetRatio,
    setPromptText,
    videoSettings,
    setVideoSettings,
  } = useAppStore();

  const getResizePrompt = (ratio: ResizeRatio) =>
    `Extend and expand the background to fill the entire ${ratio} canvas. Keep the main subject exactly as it is, only extend the surrounding background naturally.`;

  return (
    <div className="px-4 py-3">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
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
            className="neo-btn px-2.5 py-1.5 text-[10px] gap-1 bg-danger/10 text-danger border border-danger/30 whitespace-nowrap"
          >
            <Icon icon="solar:arrow-left-bold" width={12} height={12} />
            {t('actions.back')}
          </button>
        )}
      </div>

      {/* Resize ratio selector */}
      {mode === 'resize' && (
        <div className="mt-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
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
                  'flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all duration-200',
                  resizeTargetRatio === r
                    ? 'bg-primary text-white border-primary shadow-neo-sm-primary'
                    : 'bg-white text-foreground border-border hover:bg-muted'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image aspect ratio selector (text-to-image, image-to-image) */}
      {IMAGE_RATIO_MODES.includes(mode) && (
        <div className="mt-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {t('mode.aspectRatio')}
          </label>
          <div className="flex gap-1.5">
            {IMAGE_ASPECT_RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => setVideoSettings({ aspectRatio: r })}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all duration-200',
                  videoSettings.aspectRatio === r
                    ? 'bg-primary text-white border-primary shadow-neo-sm-primary'
                    : 'bg-white text-foreground border-border hover:bg-muted'
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
