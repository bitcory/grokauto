import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { Trash2, Play, Square } from 'lucide-react';
import type { PromptItem, ResizeRatio } from '../../types';

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
    resizeTargetRatio,
  } = useAppStore();
  const { setItems, clearItems } = useQueueStore();

  const handleClear = () => {
    setPromptText('');
    clearItems();
    useAppStore.getState().setUploadedImages([]);
  };

  const handleStart = async () => {
    let prompts = parsePrompts(promptText);

    // Resize mode: if no prompt text, create one entry per uploaded image
    if (prompts.length === 0 && mode === 'resize' && uploadedImages.length > 0) {
      prompts = uploadedImages.map(() => '');
    }

    if (prompts.length === 0) return;

    const { promptImageModes } = useAppStore.getState();

    // For resize mode, load the template image
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

      if (mode === 'resize') {
        // Resize mode: [template canvas, user image]
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
        // start-end mode: pair 2 images per prompt
        if (uploadedImages.length === prompts.length * 2) {
          images = [uploadedImages[i * 2], uploadedImages[i * 2 + 1]];
        } else if (uploadedImages.length === 2) {
          images = [uploadedImages[0], uploadedImages[1]];
        } else if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      } else {
        // start-only mode (existing behavior)
        if (uploadedImages.length === prompts.length) {
          images = [uploadedImages[i]];
        } else if (uploadedImages.length === 1) {
          images = uploadedImages;
        } else if (uploadedImages.length > 0) {
          images = uploadedImages;
        }
      }

      return {
        id: `prompt-${Date.now()}-${i}`,
        text,
        imageDataUrls: images,
        imageMode: promptImageModes[i] ?? 'new',
        status: 'pending',
        outputCount: outputPerPrompt,
      };
    });

    setItems(items);
    setIsRunning(true);

    try {
      // Clean up any leftover image data from previous runs
      const allKeys = await chrome.storage.local.get(null);
      const imgKeys = Object.keys(allKeys).filter((k) => k.startsWith('img_'));
      if (imgKeys.length > 0) {
        await chrome.storage.local.remove(imgKeys);
      }

      // Store image data separately in chrome.storage.local
      for (const item of items) {
        if (item.imageDataUrls && item.imageDataUrls.length > 0) {
          await chrome.storage.local.set({ [`img_${item.id}`]: item.imageDataUrls });
        }
      }

      // Send message without image data
      const promptsWithoutImages = items.map(({ imageDataUrls, ...rest }) => rest);

      await chrome.runtime.sendMessage({
        type: 'START_AUTOMATION',
        payload: {
          mode,
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
    <div className="px-4 py-3 flex gap-2 border-t-3 border-foreground bg-background">
      <button
        onClick={handleClear}
        disabled={isRunning}
        className="neo-btn flex-1 py-2.5 gap-1.5 bg-white text-foreground"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t('actions.clear')}
      </button>
      {isRunning ? (
        <button
          onClick={handleStop}
          className="neo-btn flex-1 py-2.5 gap-1.5 bg-danger text-white border-foreground"
        >
          <Square className="w-3.5 h-3.5" />
          {t('actions.stop')}
        </button>
      ) : (
        <button
          onClick={handleStart}
          className="neo-btn flex-1 py-2.5 gap-1.5 bg-primary text-primary-foreground border-foreground"
        >
          <Play className="w-3.5 h-3.5" />
          {t('actions.start')}
        </button>
      )}
    </div>
  );
}
