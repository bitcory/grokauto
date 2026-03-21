import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { Upload, X } from 'lucide-react';

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
  const { mode, uploadedImages, addUploadedImage, removeUploadedImage } =
    useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsImage =
    mode === 'frame-to-video' ||
    mode === 'image-to-image' ||
    mode === 'remix-video';

  const handleFiles = useCallback(
    (files: FileList) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      // Sort by number extracted from filename (e.g., "X7GWaa8x_3.png" → 3)
      imageFiles.sort((a, b) => {
        const numA = extractFileNumber(a.name);
        const numB = extractFileNumber(b.name);
        return numA - numB;
      });

      // Read all files in sorted order, then add them sequentially
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

  return (
    <div className="px-4 py-2">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {t('image.upload')}
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-3 border-dashed border-foreground rounded-neo p-4 text-center cursor-pointer
                   hover:border-primary hover:bg-primary/5 transition-all duration-150"
      >
        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground font-medium">{t('image.dragDrop')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploadedImages.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {uploadedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt=""
                className="w-12 h-12 object-cover rounded-neo-sm border-2 border-foreground"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeUploadedImage(idx);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white border-2 border-foreground rounded-full
                           flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
