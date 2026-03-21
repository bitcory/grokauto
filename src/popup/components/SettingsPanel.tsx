import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import type { VideoSettings } from '../../types';

export default function SettingsPanel() {
  const { t } = useTranslation();
  const {
    videoSettings,
    setVideoSettings,
  } = useAppStore();

  return (
    <div className="px-4 py-3 space-y-4 overflow-y-auto card-stagger">
      {/* Video Settings */}
      <section className="neo-card p-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2.5">
          {t('settings.video.label')}
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground font-medium">
              {t('settings.video.aspectRatio')}
            </span>
            <select
              value={videoSettings.aspectRatio}
              onChange={(e) =>
                setVideoSettings({
                  aspectRatio: e.target.value as VideoSettings['aspectRatio'],
                })
              }
              className="memphis-select"
            >
              <option value="2:3">2:3</option>
              <option value="3:2">3:2</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground font-medium">
              {t('settings.video.duration')}
            </span>
            <select
              value={videoSettings.duration}
              onChange={(e) =>
                setVideoSettings({ duration: Number(e.target.value) as 5 | 10 })
              }
              className="memphis-select"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
