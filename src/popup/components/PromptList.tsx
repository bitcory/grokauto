import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Clock } from 'lucide-react';
import type { PromptImageMode } from '../../types';

function parsePrompts(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default function PromptList() {
  const { t } = useTranslation();
  const {
    promptText,
    mode,
    promptImageModes,
    setPromptImageMode,
    syncPromptImageModes,
    uploadedImages,
    imageFrameMode,
  } = useAppStore();

  const prompts = parsePrompts(promptText);
  const showImageMode = mode === 'text-to-image' || mode === 'image-to-image';
  const needsImage = mode === 'image-to-image' || mode === 'frame-to-video' || mode === 'remix-video';
  const isStartEnd = imageFrameMode === 'start-end' && mode === 'frame-to-video';
  const isMatched = isStartEnd
    ? uploadedImages.length === prompts.length * 2
    : uploadedImages.length === prompts.length;

  // Sync modes array with prompt count
  useEffect(() => {
    syncPromptImageModes(prompts.length);
  }, [prompts.length]);

  if (prompts.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {t('prompt.perPromptMode')}
        </label>
      </div>

      <div className="space-y-1">
        {prompts.map((text, i) => (
          <div
            key={i}
            className="neo-card p-1.5 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-1.5">
              {showImageMode && (
                <select
                  value={promptImageModes[i] ?? 'new'}
                  onChange={(e) =>
                    setPromptImageMode(i, e.target.value as PromptImageMode)
                  }
                  className="memphis-select text-[9px] w-20 shrink-0 !py-0.5"
                >
                  <option value="new">{t('prompt.modeNew')}</option>
                  <option value="reuse">{t('prompt.modeReuse')}</option>
                </select>
              )}
              <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                {i + 1}.
              </span>
              <span className="text-[10px] text-foreground font-medium truncate flex-1 min-w-0">
                {text}
              </span>
              {needsImage && uploadedImages.length > 0 && (
                isStartEnd ? (
                  <div className="flex gap-0.5 shrink-0">
                    {(() => {
                      const startImg = isMatched ? uploadedImages[i * 2] : uploadedImages[0];
                      const endImg = isMatched ? uploadedImages[i * 2 + 1] : uploadedImages[1];
                      return (
                        <>
                          {startImg && (
                            <div className="relative">
                              <img src={startImg} alt="" className="w-6 h-6 object-cover rounded-neo-sm border-2 border-foreground" />
                              <span className="absolute bottom-0 left-0 right-0 text-[6px] font-bold text-center bg-foreground/80 text-white rounded-b-sm">S</span>
                            </div>
                          )}
                          {endImg && (
                            <div className="relative">
                              <img src={endImg} alt="" className="w-6 h-6 object-cover rounded-neo-sm border-2 border-foreground" />
                              <span className="absolute bottom-0 left-0 right-0 text-[6px] font-bold text-center bg-foreground/80 text-white rounded-b-sm">E</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <img
                    src={isMatched ? uploadedImages[i] : uploadedImages[0]}
                    alt=""
                    className="w-6 h-6 object-cover rounded-neo-sm border-2 border-foreground shrink-0"
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {needsImage && uploadedImages.length > 0 && (
        <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
          {isStartEnd
            ? isMatched
              ? `이미지 ${uploadedImages.length}장 ↔ 프롬프트 ${prompts.length}개 (2장씩 시작/종료 매칭)`
              : uploadedImages.length === 2
                ? `이미지 2장 (시작/종료) → 모든 프롬프트에 공유`
                : `이미지 ${uploadedImages.length}장 → 각 프롬프트에 전체 적용`
            : isMatched
              ? `이미지 ${uploadedImages.length}장 ↔ 프롬프트 ${prompts.length}개 1:1 매칭`
              : uploadedImages.length === 1
                ? `이미지 1장 → 모든 프롬프트에 공유`
                : `이미지 ${uploadedImages.length}장 → 각 프롬프트에 전체 적용`
          }
        </p>
      )}
    </div>
  );
}
