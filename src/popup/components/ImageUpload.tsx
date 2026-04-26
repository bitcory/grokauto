import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '@iconify/react';
import type { ImageFrameMode } from '../../types';

/**
 * Extract a trailing number from a filename (before the extension).
 * e.g., "X7GWaa8x_3.png" → 3, "photo-12.jpg" → 12, "abc.png" → Infinity
 */
function extractFileNumber(filename: string): number {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const match = nameWithoutExt.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : Infinity;
}

export default function ImageUpload() {
  const { t } = useTranslation();
  const { mode, uploadedImages, addUploadedImage, removeUploadedImage, reorderUploadedImages, imageFrameMode, setImageFrameMode } =
    useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const needsImage =
    mode === 'frame-to-video' ||
    mode === 'image-to-image' ||
    mode === 'remix-video' ||
    mode === 'resize' ||
    mode === 'cinematic-intro';

  const handleFiles = useCallback(
    (files: FileList) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      imageFiles.sort((a, b) => {
        const numA = extractFileNumber(a.name);
        const numB = extractFileNumber(b.name);
        return numA - numB;
      });

      const promises = imageFiles.map(
        (file) =>
          new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(promises).then((results) => {
        results.forEach((dataUrl) => {
          if (dataUrl) addUploadedImage(dataUrl);
        });
      });
    },
    [addUploadedImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  if (!needsImage) return null;

  // 모드별 라벨과 안내 문구
  const uploadLabel = (() => {
    if (mode === 'frame-to-video') {
      return imageFrameMode === 'start-end'
        ? t('image.uploadLabel.frameStartEnd')
        : t('image.uploadLabel.frameStart');
    }
    if (mode === 'image-to-image') return t('image.uploadLabel.i2i');
    if (mode === 'remix-video') return t('image.uploadLabel.remix');
    if (mode === 'resize') return t('image.uploadLabel.resize');
    if (mode === 'cinematic-intro') return t('image.uploadLabel.cinematic');
    return t('image.upload');
  })();

  const uploadHint = (() => {
    if (mode === 'frame-to-video') {
      return imageFrameMode === 'start-end'
        ? t('image.uploadHint.frameStartEnd')
        : t('image.uploadHint.frameStart');
    }
    if (mode === 'image-to-image') return t('image.uploadHint.i2i');
    if (mode === 'remix-video') return t('image.uploadHint.remix');
    if (mode === 'resize') return t('image.uploadHint.resize');
    if (mode === 'cinematic-intro') return t('image.uploadHint.cinematic');
    return t('image.dragDrop');
  })();

  return (
    <div className="px-4 py-2">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
        {uploadLabel}
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer
                   hover:border-primary hover:bg-primary/5 transition-all duration-200"
      >
        <Icon icon="solar:upload-bold" width={20} height={20} className="mx-auto mb-1 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium">{uploadHint}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {mode === 'frame-to-video' && (
        <div className="mt-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
            {t('image.frameMode')}
          </label>
          <select
            value={imageFrameMode}
            onChange={(e) => setImageFrameMode(e.target.value as ImageFrameMode)}
            className="memphis-select text-[10px] w-full"
          >
            <option value="start-only">{t('image.startOnly')}</option>
            <option value="start-end">{t('image.startEnd')}</option>
          </select>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {uploadedImages.map((img, idx) => {
            const isDragging = dragIndex === idx;
            const isOver = dragOverIndex === idx && dragIndex !== idx;
            return (
              <div
                key={idx}
                className={[
                  'relative group cursor-grab active:cursor-grabbing',
                  'transition-all duration-150',
                  isDragging
                    ? 'opacity-50 scale-95 rotate-3 ring-2 ring-purple-500 ring-offset-1 rounded-lg z-10'
                    : 'opacity-100 scale-100 rotate-0',
                  isOver
                    ? 'ring-2 ring-purple-400 ring-offset-1 rounded-lg scale-110 -translate-y-1 shadow-lg shadow-purple-500/30'
                    : '',
                ].join(' ')}
                draggable
                onDragStart={() => {
                  dragIndexRef.current = idx;
                  setDragIndex(idx);
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndexRef.current !== null && dragIndexRef.current !== idx) {
                    reorderUploadedImages(dragIndexRef.current, idx);
                  }
                  dragIndexRef.current = null;
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
              >
                <img
                  src={img}
                  alt=""
                  className={[
                    'w-12 h-12 object-cover rounded-lg border',
                    isOver ? 'border-purple-400' : 'border-border',
                  ].join(' ')}
                />
                {mode === 'frame-to-video' && imageFrameMode === 'start-end' && uploadedImages.length >= 2 && (
                  <span className="absolute bottom-0 left-0 right-0 text-[7px] font-bold text-center bg-foreground/70 text-white rounded-b-lg">
                    {idx % 2 === 0 ? t('image.startLabel') : t('image.endLabel')}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadedImage(idx);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full
                             flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Icon icon="solar:close-circle-bold" width={12} height={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
