import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';

export default function OutputSettings() {
  const { t } = useTranslation();
  const {
    outputPerPrompt,
    setOutputPerPrompt,
    saveFolder,
    setSaveFolder,
    autoRename,
    setAutoRename,
  } = useAppStore();

  return (
    <div className="px-4 py-2 space-y-2">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
        {t('output.label')}
      </label>

      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground font-medium">{t('output.perPrompt')}</span>
        <select
          value={outputPerPrompt}
          onChange={(e) => setOutputPerPrompt(Number(e.target.value))}
          className="memphis-select w-16"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground font-medium">{t('output.folder')}</span>
        <input
          type="text"
          value={saveFolder}
          onChange={(e) => setSaveFolder(e.target.value)}
          className="memphis-input !w-32 !py-1 text-xs"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={autoRename}
          onChange={(e) => setAutoRename(e.target.checked)}
          className="w-4 h-4 rounded-md border border-border"
        />
        <span className="text-xs text-foreground font-medium">{t('output.autoRename')}</span>
      </label>
    </div>
  );
}
