import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { Icon } from '@iconify/react';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();

  const handleLanguageChange = (lang: 'ko' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <header className="hero-gradient pt-5 pb-10 px-5 text-white relative">
      {/* Fractal noise overlay */}
      <svg className="hero-noise" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="grok-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grok-noise)" />
      </svg>

      <div className="relative z-10 container-900">
        {/* Top row: eyebrow + controls */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold text-white/85"
            style={{ letterSpacing: '0.28em' }}
          >
            GROK · AUTO
          </span>

          <div className="flex items-center gap-1.5">
            <span className="glass-pill px-2.5 py-1 text-[10px] font-semibold inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
              {t('header.version')}
            </span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'ko' | 'en')}
              className="glass-pill text-[11px] px-2.5 py-1 outline-none cursor-pointer"
              style={{ color: '#fff' }}
            >
              <option value="ko" style={{ color: '#0f172a' }}>한국어</option>
              <option value="en" style={{ color: '#0f172a' }}>English</option>
            </select>
            <button
              onClick={async () => {
                useAppStore.getState().setPromptText('');
                useAppStore.getState().setUploadedImages([]);
                useQueueStore.getState().clearItems();
                const allKeys = await chrome.storage.local.get(null);
                const imgKeys = Object.keys(allKeys).filter((k) => k.startsWith('img_'));
                if (imgKeys.length > 0) await chrome.storage.local.remove(imgKeys);
              }}
              className="glass-pill w-7 h-7 flex items-center justify-center transition-colors hover:bg-white/25"
              title="Reset"
            >
              <Icon icon="solar:refresh-bold" width={14} height={14} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h1
          className="mt-3 font-black leading-tight text-white"
          style={{
            fontSize: 'clamp(26px, 7vw, 34px)',
            fontWeight: 900,
            letterSpacing: '-0.01em',
          }}
        >
          {t('header.title')}
        </h1>
        <p className="mt-1 text-[12px] text-white/80">
          {t('header.description')}
        </p>
      </div>

      {/* Bottom wave cutout */}
      <svg
        className="hero-wave"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M0,32 C240,64 480,0 720,20 C960,40 1200,60 1440,28 L1440,60 L0,60 Z"
          fill="#f8fafc"
        />
      </svg>
    </header>
  );
}
