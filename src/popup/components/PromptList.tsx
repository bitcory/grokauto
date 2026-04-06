import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import type { ImageRefMode } from '../../types';

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
    promptImageRefModes,
    setPromptImageRefMode,
    syncPromptImageRefModes,
    promptImageSelections,
    togglePromptImageSelection,
    syncPromptImageSelections,
    uploadedImages,
    imageFrameMode,
  } = useAppStore();

  const prompts = parsePrompts(promptText);
  const needsImage = mode === 'image-to-image' || mode === 'frame-to-video' || mode === 'remix-video';
  const isStartEnd = imageFrameMode === 'start-end' && mode === 'frame-to-video';
  const showRefMode = needsImage && !isStartEnd && uploadedImages.length > 1;
  const isFullyMatched = isStartEnd
    ? uploadedImages.length >= prompts.length * 2
    : uploadedImages.length >= prompts.length;

  useEffect(() => {
    syncPromptImageRefModes(prompts.length, uploadedImages.length);
    syncPromptImageSelections(prompts.length);
  }, [prompts.length, uploadedImages.length]);

  if (prompts.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon icon="solar:clock-circle-bold" width={14} height={14} className="text-muted-foreground" />
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
              {showRefMode && (
                <select
                  value={promptImageRefModes[i] ?? 'single'}
                  onChange={(e) =>
                    setPromptImageRefMode(i, e.target.value as ImageRefMode)
                  }
                  className="memphis-select text-[9px] w-14 shrink-0 !py-0.5"
                >
                  <option value="single">{t('prompt.refSingle')}</option>
                  <option value="all">{t('prompt.refAll')}</option>
                  <option value="select">{t('prompt.refSelect')}</option>
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
                      const startImg = uploadedImages[i * 2];
                      const endImg = uploadedImages[i * 2 + 1];
                      if (!startImg) return null;
                      return (
                        <>
                          <div className="relative">
                            <img src={startImg} alt="" className="w-6 h-6 object-cover rounded-md border border-border" />
                            <span className="absolute bottom-0 left-0 right-0 text-[6px] font-bold text-center bg-foreground/70 text-white rounded-b-md">S</span>
                          </div>
                          {endImg && (
                            <div className="relative">
                              <img src={endImg} alt="" className="w-6 h-6 object-cover rounded-md border border-border" />
                              <span className="absolute bottom-0 left-0 right-0 text-[6px] font-bold text-center bg-foreground/70 text-white rounded-b-md">E</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (promptImageRefModes[i] ?? (uploadedImages.length <= 1 ? 'all' : 'single')) === 'all' ? (
                  uploadedImages.length === 1 ? (
                    <img
                      src={uploadedImages[0]}
                      alt=""
                      className="w-6 h-6 object-cover rounded-md border border-border shrink-0"
                    />
                  ) : uploadedImages.length > 1 ? (
                    <div className="relative w-8 h-6 shrink-0">
                      {uploadedImages.slice(0, 3).map((img, j) => (
                        <img
                          key={j}
                          src={img}
                          alt=""
                          className="w-6 h-6 object-cover rounded-md border border-border absolute"
                          style={{ left: `${j * 4}px`, zIndex: 3 - j }}
                        />
                      ))}
                    </div>
                  ) : null
                ) : (promptImageRefModes[i] ?? 'single') === 'select' ? (
                  (promptImageSelections[i]?.length ?? 0) > 0 ? (
                    <div className="relative shrink-0" style={{ width: `${Math.min(promptImageSelections[i].length, 3) * 4 + 20}px`, height: '24px' }}>
                      {promptImageSelections[i].slice(0, 3).map((imgIdx, j) => (
                        <img
                          key={imgIdx}
                          src={uploadedImages[imgIdx]}
                          alt=""
                          className="w-6 h-6 object-cover rounded-md border-2 border-primary absolute"
                          style={{ left: `${j * 4}px`, zIndex: 3 - j }}
                        />
                      ))}
                      {promptImageSelections[i].length > 3 && (
                        <span className="absolute right-0 bottom-0 text-[7px] font-bold text-primary">+{promptImageSelections[i].length - 3}</span>
                      )}
                    </div>
                  ) : null
                ) : (
                  uploadedImages[i] ? (
                    <img
                      src={uploadedImages[i]}
                      alt=""
                      className="w-6 h-6 object-cover rounded-md border border-border shrink-0"
                    />
                  ) : null
                )
              )}
            </div>
            {/* 선택 모드: 이미지 썸네일 그리드 */}
            {showRefMode && (promptImageRefModes[i] ?? 'single') === 'select' && (
              <div className="flex flex-wrap gap-1 mt-1 pl-1">
                {uploadedImages.map((img, imgIdx) => {
                  const selected = promptImageSelections[i]?.includes(imgIdx) ?? false;
                  return (
                    <button
                      key={imgIdx}
                      type="button"
                      onClick={() => togglePromptImageSelection(i, imgIdx)}
                      className={`relative w-8 h-8 rounded-lg border-2 overflow-hidden transition-all ${
                        selected ? 'border-primary ring-1 ring-primary opacity-100' : 'border-border opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-primary/30 text-white text-[8px] font-bold">
                          {promptImageSelections[i].indexOf(imgIdx) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {needsImage && uploadedImages.length > 0 && (
        <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
          {isStartEnd
            ? isFullyMatched
              ? `이미지 ${uploadedImages.length}장 ↔ 프롬프트 ${prompts.length}개 (2장씩 순차 매칭)`
              : `이미지 ${uploadedImages.length}장 → 앞 ${Math.floor(uploadedImages.length / 2)}개 프롬프트에 순차 매칭, 나머지는 이미지 없음`
            : isFullyMatched
              ? `이미지 ${uploadedImages.length}장 ↔ 프롬프트 ${prompts.length}개 순차 1:1 매칭`
              : `이미지 ${uploadedImages.length}장 → 앞 ${uploadedImages.length}개 프롬프트에 순차 매칭, 나머지는 이미지 없음`
          }
        </p>
      )}
    </div>
  );
}
