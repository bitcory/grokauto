import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

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
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as 'ko' | 'en')}
          className="memphis-select text-[11px]"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>
    </header>
  );
}
