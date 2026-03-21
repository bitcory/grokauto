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
    <div className="flex gap-2 px-4 py-2 bg-background border-b-3 border-foreground">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-neo-sm border-3 border-foreground transition-all duration-150',
            activeTab === tab.key
              ? 'bg-primary text-primary-foreground shadow-neo-sm'
              : 'bg-white text-foreground hover:bg-content2 hover:-translate-y-px hover:shadow-neo-sm active:translate-y-px active:shadow-none'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
