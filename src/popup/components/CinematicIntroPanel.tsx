import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { ImageIcon, Video } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function CinematicIntroPanel() {
  const { t } = useTranslation();
  const { mode, cinematicIntro, setCinematicIntroJson, setCinematicGenTarget } = useAppStore();

  if (mode !== 'cinematic-intro') return null;

  const { jsonText, parsedScenes, parseError, generationTarget } = cinematicIntro;

  const imageCount = parsedScenes.filter((s) => s.imagePrompt).length;
  const videoCount = parsedScenes.filter((s) => s.videoPrompt).length;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* JSON Input */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
          JSON
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setCinematicIntroJson(e.target.value)}
          placeholder={t('cinematicIntro.jsonPlaceholder')}
          className="memphis-input h-28 resize-none text-[11px] font-mono"
        />
        {parseError && (
          <p className="text-[10px] text-[--danger] mt-1 font-bold">
            {t('cinematicIntro.parseError')}: {parseError}
          </p>
        )}
      </div>

      {/* Summary + Generation Target Tabs */}
      {parsedScenes.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground text-center py-1">
            {t('cinematicIntro.summary', { imageCount, videoCount })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCinematicGenTarget('image')}
              disabled={imageCount === 0}
              className={cn(
                'flex-1 neo-btn py-2 text-[11px] gap-1.5 disabled:opacity-40',
                generationTarget === 'image'
                  ? 'bg-primary/10 text-primary border-primary shadow-neo-sm-primary'
                  : 'bg-white text-foreground border-foreground'
              )}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {t('cinematicIntro.genImage')}
            </button>
            <button
              onClick={() => setCinematicGenTarget('video')}
              disabled={videoCount === 0}
              className={cn(
                'flex-1 neo-btn py-2 text-[11px] gap-1.5 disabled:opacity-40',
                generationTarget === 'video'
                  ? 'bg-primary/10 text-primary border-primary shadow-neo-sm-primary'
                  : 'bg-white text-foreground border-foreground'
              )}
            >
              <Video className="w-3.5 h-3.5" />
              {t('cinematicIntro.genVideo')}
            </button>
          </div>
        </div>
      )}

      {!parseError && jsonText.trim() === '' && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          {t('cinematicIntro.noScenes')}
        </p>
      )}
    </div>
  );
}
