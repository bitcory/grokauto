import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { Icon } from '@iconify/react';
import type { GenerationMode, PromptItem, ResizeRatio } from '../../types';

function parsePrompts(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Map resize ratio to template image filename
 */
const RATIO_TO_FILE: Record<ResizeRatio, string> = {
  '16:9': '16x9.png',
  '9:16': '9x16.png',
  '1:1': '1x1.png',
  '3:2': '3x2.png',
  '2:3': '2x3.png',
};

/**
 * Load a template image from extension assets and convert to data URL
 */
async function loadTemplateImage(ratio: ResizeRatio): Promise<string> {
  const filename = RATIO_TO_FILE[ratio];
  const url = chrome.runtime.getURL(`img/${filename}`);
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ActionButtons() {
  const { t } = useTranslation();
  const {
    promptText,
    setPromptText,
    isRunning,
    setIsRunning,
    mode,
    concurrentPrompts,
    delayMin,
    delayMax,
    outputPerPrompt,
    saveFolder,
    autoRename,
    uploadedImages,
    videoSettings,
    maxRetries,
    videoDownloadQuality,
    imageDownloadQuality,
    imageFrameMode,
    imageGenerationSpeed,
    resizeTargetRatio,
    cinematicIntro,
  } = useAppStore();
  const { setItems, clearItems } = useQueueStore();

  const handleClear = () => {
    setPromptText('');
    clearItems();
    useAppStore.getState().setUploadedImages([]);
  };

  const handleStart = async () => {
    let effectiveMode: GenerationMode = mode;
    if (mode === 'cinematic-intro') {
      effectiveMode = cinematicIntro.generationTarget === 'video' ? 'frame-to-video' : 'image-to-image';
    }

    let prompts = parsePrompts(promptText);

    if (prompts.length === 0 && mode === 'resize' && uploadedImages.length > 0) {
      prompts = uploadedImages.map(() => '');
    }

    if (prompts.length === 0) return;

    const { promptImageRefModes, promptImageSelections } = useAppStore.getState();

    let templateDataUrl: string | null = null;
    if (mode === 'resize') {
      try {
        templateDataUrl = await loadTemplateImage(resizeTargetRatio);
      } catch (err) {
        console.error('Failed to load template image:', err);
      }
    }

    const items: PromptItem[] = prompts.map((text, i) => {
      let images: string[] | undefined;

      if (mode === 'cinematic-intro' && cinematicIntro.generationTarget === 'image') {
        // 이미지 생성: 레퍼런스 이미지는 공유 키로 별도 저장
      } else if (mode === 'cinematic-intro' && cinematicIntro.generationTarget === 'video') {
        const img = uploadedImages[i];
        if (img) {
          images = [img];
        }
      } else if (mode === 'resize') {
        const userImage = uploadedImages.length === prompts.length
          ? uploadedImages[i]
          : uploadedImages.length === 1
            ? uploadedImages[0]
            : uploadedImages[i] ?? uploadedImages[0];

        if (templateDataUrl && userImage) {
          images = [templateDataUrl, userImage];
        } else if (userImage) {
          images = [userImage];
        }
      } else if (imageFrameMode === 'start-end') {
        const startImg = uploadedImages[i * 2];
        const endImg = uploadedImages[i * 2 + 1];
        if (startImg && endImg) {
          images = [startImg, endImg];
        } else if (startImg) {
          images = [startImg];
        }
      } else {
        const refMode = promptImageRefModes[i] ?? (uploadedImages.length <= 1 ? 'all' : 'single');
        if (refMode === 'all') {
          images = [...uploadedImages];
        } else if (refMode === 'select') {
          const selectedIndices = promptImageSelections[i] ?? [];
          const selectedImages = selectedIndices
            .filter((idx) => idx < uploadedImages.length)
            .map((idx) => uploadedImages[idx]);
          if (selectedImages.length > 0) {
            images = selectedImages;
          }
        } else {
          const img = uploadedImages[i];
          if (img) {
            images = [img];
          }
        }
      }

      return {
        id: `prompt-${Date.now()}-${i}`,
        text,
        imageDataUrls: images,
        status: 'pending',
        outputCount: outputPerPrompt,
      };
    });

    setItems(items);
    setIsRunning(true);

    try {
      const allKeys = await chrome.storage.local.get(null);
      const imgKeys = Object.keys(allKeys).filter((k) => k.startsWith('img_'));
      if (imgKeys.length > 0) {
        await chrome.storage.local.remove(imgKeys);
      }

      if (mode === 'cinematic-intro' && cinematicIntro.generationTarget === 'image' && uploadedImages.length > 0) {
        await chrome.storage.local.set({ img_cinematic_ref: uploadedImages });
      }

      for (const item of items) {
        if (item.imageDataUrls && item.imageDataUrls.length > 0) {
          await chrome.storage.local.set({ [`img_${item.id}`]: item.imageDataUrls });
        }
      }

      const promptsWithoutImages = items.map(({ imageDataUrls, ...rest }) => rest);

      await chrome.runtime.sendMessage({
        type: 'START_AUTOMATION',
        payload: {
          mode: effectiveMode,
          prompts: promptsWithoutImages,
          concurrentPrompts,
          delayMin,
          delayMax,
          outputPerPrompt,
          saveFolder,
          autoRename,
          videoSettings,
          maxRetries,
          videoDownloadQuality,
          imageDownloadQuality,
          imageFrameMode,
          imageGenerationSpeed,
          resizeTargetRatio: mode === 'resize' ? resizeTargetRatio : undefined,
        },
      });
    } catch (err) {
      console.error('Failed to start automation:', err);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'STOP_AUTOMATION' });
    } catch (err) {
      console.error('Failed to stop automation:', err);
    }
    setIsRunning(false);
  };

  return (
    <div className="px-4 py-3 flex gap-2 border-t border-border bg-white shadow-[0_-1px_8px_rgba(30,32,48,0.05)]">
      <button
        onClick={handleClear}
        disabled={isRunning}
        className="neo-btn flex-1 py-2.5 gap-1.5 bg-muted text-foreground border-border hover:bg-content2"
      >
        <Icon icon="solar:trash-bin-minimalistic-bold" width={14} height={14} />
        {t('actions.clear')}
      </button>
      {isRunning ? (
        <button
          onClick={handleStop}
          className="neo-btn flex-1 py-2.5 gap-1.5 bg-danger text-white border-transparent shadow-[0_4px_12px_rgba(239,68,68,0.35)]"
        >
          <Icon icon="solar:stop-bold" width={14} height={14} />
          {t('actions.stop')}
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="neo-btn flex-1 py-2.5 gap-1.5 btn-green-grad"
        >
          <Icon icon="solar:play-bold" width={14} height={14} />
          {t('actions.start')}
        </button>
      )}
    </div>
  );
}
