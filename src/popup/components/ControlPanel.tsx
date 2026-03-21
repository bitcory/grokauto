import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Layers, Clock } from 'lucide-react';

export default function ControlPanel() {
  const { t } = useTranslation();
  const {
    concurrentPrompts,
    setConcurrentPrompts,
    delayMin,
    setDelay,
  } = useAppStore();

  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2 bg-white border-2 border-foreground rounded-neo-sm px-2.5 py-1.5">
        <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-bold text-muted-foreground flex-1">{t('control.concurrent')}</span>
        <select
          value={concurrentPrompts}
          onChange={(e) => setConcurrentPrompts(Number(e.target.value))}
          className="bg-muted border-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-foreground outline-none cursor-pointer"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 flex items-center gap-2 bg-white border-2 border-foreground rounded-neo-sm px-2.5 py-1.5">
        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-bold text-muted-foreground flex-1">{t('control.delay')}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={120}
            value={delayMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDelay(v, v);
            }}
            className="bg-muted border-0 rounded px-1.5 py-0.5 w-10 text-[11px] font-bold text-foreground text-center outline-none"
          />
          <span className="text-[9px] font-bold text-muted-foreground">s</span>
        </div>
      </div>
    </div>
  );
}
