import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Upload } from 'lucide-react';

function countPrompts(text: string): number {
  if (!text.trim()) return 0;
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;
}

export default function PromptInput() {
  const { t } = useTranslation();
  const { promptText, setPromptText, mode } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const count = countPrompts(promptText);

  if (mode === 'resize' || mode === 'talking-video') return null;

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPromptText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('prompt.label')}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            className="neo-btn px-2 py-1 text-[10px] gap-1 bg-white text-foreground"
          >
            {t('prompt.loadTxt')}
            <Upload className="w-3 h-3" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleTxtUpload}
          />
          {count > 0 && (
            <span className="memphis-badge bg-primary/10 text-primary border-primary">
              {t('prompt.count', { count })}
            </span>
          )}
        </div>
      </div>
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        placeholder={t('prompt.placeholder')}
        className="memphis-input h-24 resize-none"
      />
      <p className="text-[9px] text-muted-foreground mt-1">
        {t('prompt.hint')}
      </p>
    </div>
  );
}
