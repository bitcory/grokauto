import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import type { GenerationMode, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageGenerationSpeed } from '../../types';

function SettingSection({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="neo-card p-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
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
    concurrentPrompts,
    setConcurrentPrompts,
    delayMin,
    setDelay,
    videoSettings,
    setVideoSettings,
    maxRetries,
    setMaxRetries,
    videoDownloadQuality,
    setVideoDownloadQuality,
    imageDownloadQuality,
    setImageDownloadQuality,
    imageGenerationSpeed,
    setImageGenerationSpeed,
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
          <option value="resize">{t('mode.resize')}</option>
          <option value="talking-video">{t('mode.talking-video')}</option>
          <option value="cinematic-intro">{t('mode.cinematic-intro')}</option>
        </select>
      </SettingSection>

      {/* Concurrent Prompts */}
      <SettingSection label={t('settings.concurrent.label')} desc={t('settings.concurrent.desc')}>
        <select
          value={concurrentPrompts}
          onChange={(e) => setConcurrentPrompts(Number(e.target.value))}
          className="memphis-select w-full mt-1"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </SettingSection>

      {/* Random Delay */}
      <SettingSection label={t('settings.delay.label')} desc={t('settings.delay.desc')}>
        <input
          type="number"
          min={0}
          max={120}
          value={delayMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDelay(v, v);
          }}
          className="memphis-input w-full mt-1 text-sm font-semibold"
        />
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

      {/* Max Retries */}
      <SettingSection label={t('settings.retry.label')} desc={t('settings.retry.desc')}>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setMaxRetries(maxRetries - 1)}
            disabled={maxRetries <= 1}
            className="w-8 h-8 rounded-lg border border-border bg-white hover:bg-muted flex items-center justify-center text-sm font-bold disabled:opacity-30 transition-colors"
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
            className="w-8 h-8 rounded-lg border border-border bg-white hover:bg-muted flex items-center justify-center text-sm font-bold disabled:opacity-30 transition-colors"
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

      {/* Image Generation Speed */}
      <SettingSection label={t('settings.imageSpeed.label')} desc={t('settings.imageSpeed.desc')}>
        <select
          value={imageGenerationSpeed}
          onChange={(e) => setImageGenerationSpeed(e.target.value as ImageGenerationSpeed)}
          className="memphis-select w-full mt-1"
        >
          <option value="quality">{t('settings.imageSpeed.quality')}</option>
          <option value="speed">{t('settings.imageSpeed.speed')}</option>
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
          <Icon icon="solar:download-minimalistic-bold" width={16} height={16} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-primary">
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
        className="w-full py-2 rounded-lg border border-border bg-white hover:bg-muted text-xs font-semibold transition-colors text-foreground"
      >
        {t('settings.resetDefaults')}
      </button>

      <div className="h-2" />
    </div>
  );
}
