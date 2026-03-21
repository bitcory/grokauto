import { useTranslation } from 'react-i18next';
import { ExternalLink, AlertTriangle } from 'lucide-react';

export default function NotGrokPage() {
  const { t } = useTranslation();

  const handleGoToGrok = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.update(tab.id, { url: 'https://grok.com/imagine' });
      }
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 animate-fade-in">
      <div className="text-center">
        <div className="neo-card w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-warning/10 border-warning">
          <AlertTriangle className="w-7 h-7 text-warning" />
        </div>
        <h2 className="text-lg font-extrabold text-foreground mb-2">
          {t('notGrok.title')}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t('notGrok.description')}
        </p>
        <button
          onClick={handleGoToGrok}
          className="neo-btn px-5 py-2.5 gap-2 bg-primary text-primary-foreground text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          {t('notGrok.goToGrok')}
        </button>
      </div>
    </div>
  );
}
