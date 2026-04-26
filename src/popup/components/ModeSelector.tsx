import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Icon } from '@iconify/react';
import type { GenerationMode, ResizeRatio, VideoSettings } from '../../types';

// Mode grouping for the dropdown optgroups
const MODE_GROUPS: Array<{ labelKey: string; modes: GenerationMode[] }> = [
  {
    labelKey: 'mode.group.image',
    modes: ['text-to-image', 'image-to-image', 'resize'],
  },
  {
    labelKey: 'mode.group.video',
    modes: ['text-to-video', 'frame-to-video', 'remix-video'],
  },
  {
    labelKey: 'mode.group.advanced',
    modes: ['talking-video', 'cinematic-intro'],
  },
];

const RETURN_MODES: GenerationMode[] = ['talking-video', 'cinematic-intro'];

const RESIZE_RATIOS: ResizeRatio[] = ['16:9', '9:16', '1:1', '3:2', '2:3'];

const ASPECT_RATIOS: VideoSettings['aspectRatio'][] = ['16:9', '9:16', '1:1', '3:2', '2:3'];

// Modes whose aspect ratio is user-chosen per generation (surfaced as chips here).
// Resize uses its own target ratio control; talking-video / cinematic-intro are
// upstream composers that delegate to other modes.
const ASPECT_CHIP_MODES: GenerationMode[] = [
  'text-to-image',
  'image-to-image',
  'text-to-video',
  'frame-to-video',
  'remix-video',
];

const VIDEO_MODES: GenerationMode[] = ['text-to-video', 'frame-to-video', 'remix-video'];

const VIDEO_DURATIONS: Array<6 | 10> = [6, 10];

// Short hint text + icon per mode. Keys resolve to `mode.hint.<mode>` in i18n.
const MODE_ICONS: Record<GenerationMode, string> = {
  'text-to-image': 'solar:text-bold-duotone',
  'image-to-image': 'solar:gallery-edit-bold-duotone',
  'resize': 'solar:square-transfer-horizontal-bold-duotone',
  'text-to-video': 'solar:video-library-bold-duotone',
  'frame-to-video': 'solar:videocamera-record-bold-duotone',
  'remix-video': 'solar:refresh-bold-duotone',
  'talking-video': 'solar:microphone-3-bold-duotone',
  'cinematic-intro': 'solar:clapperboard-play-bold-duotone',
};

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
          {MODE_GROUPS.map((grp) => (
            <optgroup key={grp.labelKey} label={t(grp.labelKey)}>
              {grp.modes.map((m) => (
                <option key={m} value={m}>{t(`mode.${m}`)}</option>
              ))}
            </optgroup>
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

      {/* 현재 모드의 짧은 설명 카드 */}
      <div className="mt-2 flex items-start gap-2 bg-muted/40 border border-border/60 rounded-lg px-2.5 py-1.5">
        <Icon
          icon={MODE_ICONS[mode]}
          width={14}
          height={14}
          className="mt-0.5 shrink-0 text-primary"
        />
        <p className="text-[10px] leading-tight text-muted-foreground">
          {t(`mode.hint.${mode}`)}
        </p>
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

      {/* Aspect ratio — image + video modes (resize has its own control above) */}
      {ASPECT_CHIP_MODES.includes(mode) && (
        <div className="mt-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {t('mode.aspectRatio')}
          </label>
          <div className="flex gap-1.5">
            {ASPECT_RATIOS.map((r) => (
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

      {/* Video duration — only for video modes */}
      {VIDEO_MODES.includes(mode) && (
        <div className="mt-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {t('mode.duration')}
          </label>
          <div className="flex gap-1.5">
            {VIDEO_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setVideoSettings({ duration: d })}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-semibold rounded-lg border transition-all duration-200',
                  videoSettings.duration === d
                    ? 'bg-primary text-white border-primary shadow-neo-sm-primary'
                    : 'bg-white text-foreground border-border hover:bg-muted'
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
