import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useAppStore();

  const handleLanguageChange = (lang: 'ko' | 'en') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <header className="px-4 py-3 border-b-3 border-foreground bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-neo-sm bg-primary border-3 border-foreground shadow-neo-sm flex items-center justify-center text-primary-foreground font-extrabold text-sm">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {t('header.title')}
              </h1>
              <span className="memphis-badge bg-secondary text-secondary-foreground">
                {t('header.version')}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t('header.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as 'ko' | 'en')}
            className="memphis-select text-[11px]"
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <button
            onClick={async () => {
              // Clear prompts, images, queue
              useAppStore.getState().setPromptText('');
              useAppStore.getState().setUploadedImages([]);
              useQueueStore.getState().clearItems();
              // Clear stored image data
              const allKeys = await chrome.storage.local.get(null);
              const imgKeys = Object.keys(allKeys).filter((k) => k.startsWith('img_'));
              if (imgKeys.length > 0) await chrome.storage.local.remove(imgKeys);
            }}
            className="w-7 h-7 rounded-neo-sm border-2 border-foreground bg-surface hover:bg-muted flex items-center justify-center transition-colors"
            title="Refresh page (bypass cache)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
