import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { ImagePlus, Type, Film, Clapperboard } from 'lucide-react';
import type { GenerationMode } from '../../types';
import type { LucideIcon } from 'lucide-react';

const MODE_ICONS: Record<GenerationMode, LucideIcon> = {
  'image-to-image': ImagePlus,
  'text-to-image': Type,
  'frame-to-video': Film,
  'text-to-video': Clapperboard,
  'remix-video': Film,
};

const MODES: GenerationMode[] = [
  'image-to-image',
  'text-to-image',
  'frame-to-video',
  'text-to-video',
];

export default function ModeSelector() {
  const { t } = useTranslation();
  const { mode, setMode } = useAppStore();

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
              onClick={() => setMode(m)}
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
    </div>
  );
}
