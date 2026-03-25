import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import type { GenerationMode, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, PromptImageMode } from '../../types';

function SettingSection({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="neo-card p-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
        {label}
      </h3>
      {children}
      {desc && (
        <p className="text-[10px] text-muted-foreground mt-1.5">{desc}</p>
      )}
    </section>
  );
}

export default function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const {
    mode,
    setMode,
    videoSettings,
    setVideoSettings,
    maxRetries,
    setMaxRetries,
    videoDownloadQuality,
    setVideoDownloadQuality,
    imageDownloadQuality,
    setImageDownloadQuality,
    defaultImageMode,
    setDefaultImageMode,
    language,
    setLanguage,
    resetToDefaults,
  } = useAppStore();

  return (
    <div className="px-4 py-3 space-y-3 overflow-y-auto card-stagger">
      {/* Default Mode */}
      <SettingSection label={t('settings.defaultMode.label')} desc={t('settings.defaultMode.desc')}>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as GenerationMode)}
          className="memphis-select w-full mt-1"
        >
          <option value="text-to-image">{t('mode.text-to-image')}</option>
          <option value="image-to-image">{t('mode.image-to-image')}</option>
          <option value="text-to-video">{t('mode.text-to-video')}</option>
          <option value="frame-to-video">{t('mode.frame-to-video')}</option>
          <option value="remix-video">{t('mode.remix-video')}</option>
        </select>
      </SettingSection>

      {/* Default Aspect Ratio */}
      <SettingSection label={t('settings.aspectRatio.label')} desc={t('settings.aspectRatio.desc')}>
        <select
          value={videoSettings.aspectRatio}
          onChange={(e) =>
            setVideoSettings({ aspectRatio: e.target.value as VideoSettings['aspectRatio'] })
          }
          className="memphis-select w-full mt-1"
        >
          <option value="16:9">16:9 (YouTube)</option>
          <option value="9:16">9:16 (Shorts)</option>
          <option value="1:1">1:1</option>
          <option value="3:2">3:2</option>
          <option value="2:3">2:3</option>
        </select>
      </SettingSection>

      {/* Default Video Options */}
      <SettingSection label={t('settings.video.label')} desc={t('settings.video.desc')}>
        <select
          value={videoSettings.duration}
          onChange={(e) =>
            setVideoSettings({ duration: Number(e.target.value) as 6 | 10 })
          }
          className="memphis-select w-full mt-1"
        >
          <option value={6}>6s</option>
          <option value={10}>10s</option>
        </select>
      </SettingSection>

      {/* Default Image Mode */}
      <SettingSection label={t('settings.imageMode.label')} desc={t('settings.imageMode.desc')}>
        <select
          value={defaultImageMode}
          onChange={(e) => setDefaultImageMode(e.target.value as PromptImageMode)}
          className="memphis-select w-full mt-1"
        >
          <option value="new">{t('settings.imageMode.new')}</option>
          <option value="reuse">{t('settings.imageMode.reuse')}</option>
        </select>
      </SettingSection>

      {/* Max Retries */}
      <SettingSection label={t('settings.retry.label')} desc={t('settings.retry.desc')}>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setMaxRetries(maxRetries - 1)}
            disabled={maxRetries <= 1}
            className="w-8 h-8 rounded-neo-sm border-2 border-foreground bg-surface hover:bg-muted flex items-center justify-center text-sm font-bold disabled:opacity-30"
          >
            -
          </button>
          <input
            type="number"
            value={maxRetries}
            onChange={(e) => setMaxRetries(Number(e.target.value))}
            min={1}
            max={20}
            className="flex-1 text-center memphis-input text-sm font-semibold"
          />
          <button
            onClick={() => setMaxRetries(maxRetries + 1)}
            disabled={maxRetries >= 20}
            className="w-8 h-8 rounded-neo-sm border-2 border-foreground bg-surface hover:bg-muted flex items-center justify-center text-sm font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
      </SettingSection>

      {/* Video Download Quality */}
      <SettingSection label={t('settings.downloadQualityVideo.label')} desc={t('settings.downloadQualityVideo.desc')}>
        <select
          value={videoDownloadQuality}
          onChange={(e) => setVideoDownloadQuality(e.target.value as VideoDownloadQuality)}
          className="memphis-select w-full mt-1"
        >
          <option value="480p-upscale">{t('settings.downloadQualityVideo.480p-upscale')}</option>
          <option value="480p">{t('settings.downloadQualityVideo.480p')}</option>
          <option value="720p">{t('settings.downloadQualityVideo.720p')}</option>
          <option value="none">{t('settings.downloadQualityVideo.none')}</option>
        </select>
      </SettingSection>

      {/* Image Download Quality */}
      <SettingSection label={t('settings.downloadQualityImage.label')} desc={t('settings.downloadQualityImage.desc')}>
        <select
          value={imageDownloadQuality}
          onChange={(e) => setImageDownloadQuality(e.target.value as ImageDownloadQuality)}
          className="memphis-select w-full mt-1"
        >
          <option value="1k">{t('settings.downloadQualityImage.1k')}</option>
          <option value="none">{t('settings.downloadQualityImage.none')}</option>
        </select>
      </SettingSection>

      {/* Language */}
      <SettingSection label={t('settings.language.label')} desc={t('settings.language.desc')}>
        <select
          value={language}
          onChange={(e) => {
            const lang = e.target.value as 'ko' | 'en';
            setLanguage(lang);
            i18n.changeLanguage(lang);
          }}
          className="memphis-select w-full mt-1"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </SettingSection>

      {/* Download Info */}
      <section className="neo-card p-3">
        <div className="flex items-start gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {t('settings.download.label')}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t('settings.download.desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Reset to Defaults */}
      <button
        onClick={resetToDefaults}
        className="w-full py-2 rounded-neo-sm border-2 border-foreground bg-surface hover:bg-muted text-xs font-semibold transition-colors"
      >
        {t('settings.resetDefaults')}
      </button>

      <div className="h-2" />
    </div>
  );
}
