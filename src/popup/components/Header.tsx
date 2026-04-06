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
    <header className="px-4 py-3 border-b border-border bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-neo-sm-primary">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {t('header.title')}
              </h1>
              <span className="memphis-badge bg-primary/10 text-primary border-primary/20">
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
              useAppStore.getState().setPromptText('');
              useAppStore.getState().setUploadedImages([]);
              useQueueStore.getState().clearItems();
              const allKeys = await chrome.storage.local.get(null);
              const imgKeys = Object.keys(allKeys).filter((k) => k.startsWith('img_'));
              if (imgKeys.length > 0) await chrome.storage.local.remove(imgKeys);
            }}
            className="w-7 h-7 rounded-lg border border-border bg-white hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh page (bypass cache)"
          >
            <Icon icon="solar:refresh-bold" width={14} height={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
