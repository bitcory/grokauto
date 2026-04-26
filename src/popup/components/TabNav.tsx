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
    { key: 'logs', label: t('tabs.logs') },
  ];

  return (
    <div className="px-4 relative z-20" style={{ marginTop: '-22px' }}>
      <div className="container-900">
        <div className="glass-nav p-1 flex gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-2 text-xs font-semibold transition-all duration-200',
                  'rounded-full',
                  active
                    ? 'btn-green-grad text-white'
                    : 'text-[color:var(--sub-foreground)] hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
