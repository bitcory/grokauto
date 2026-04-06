import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import type { TabType } from '../../types';

export default function TabNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useAppStore();

  const tabs: { key: TabType; label: string }[] = [
    { key: 'control', label: t('tabs.control') },
    { key: 'settings', label: t('tabs.settings') },
  ];

  return (
    <div className="flex gap-2 px-4 py-2 bg-white border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200',
            activeTab === tab.key
              ? 'bg-primary text-white border-primary shadow-neo-sm-primary'
              : 'bg-white text-muted-foreground border-border hover:bg-muted hover:text-foreground hover:-translate-y-px'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
