import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import { cn } from '../../utils/cn';
import type { GenerationMode, VideoDownloadQuality, ImageDownloadQuality, ImageGenerationSpeed, ImageDownloadCount } from '../../types';

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

function CollapsibleGroup({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        <Icon
          icon="solar:alt-arrow-down-bold"
          width={12}
          height={12}
          className={cn('transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
        />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
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
    maxRetries,
    setMaxRetries,
    videoDownloadQuality,
    setVideoDownloadQuality,
    imageDownloadQuality,
    setImageDownloadQuality,
    imageGenerationSpeed,
    setImageGenerationSpeed,
    imageDownloadCount,
    setImageDownloadCount,
    language,
    setLanguage,
    resetToDefaults,
  } = useAppStore();

  return (
    <div className="px-4 py-3 space-y-4 overflow-y-auto card-stagger">
      {/* ═══ 필수 설정 (자주 바꿈) ═══ */}
      <CollapsibleGroup title={t('settings.group.essentials')} defaultOpen={true}>
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

        {/* Image Download Count */}
        <SettingSection label={t('settings.imageDownloadCount.label')} desc={t('settings.imageDownloadCount.desc')}>
          <select
            value={imageDownloadCount}
            onChange={(e) => setImageDownloadCount(e.target.value as ImageDownloadCount)}
            className="memphis-select w-full mt-1"
          >
            <option value="first">{t('settings.imageDownloadCount.first')}</option>
            <option value="all">{t('settings.imageDownloadCount.all')}</option>
          </select>
        </SettingSection>
      </CollapsibleGroup>

      {/* ═══ 고급 설정 (가끔 바꿈) ═══ */}
      <CollapsibleGroup title={t('settings.group.advanced')} defaultOpen={false}>
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
      </CollapsibleGroup>

      {/* ═══ 환경 설정 ═══ */}
      <CollapsibleGroup title={t('settings.group.environment')} defaultOpen={false}>
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
      </CollapsibleGroup>

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
