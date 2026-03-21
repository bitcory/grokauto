import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { Trash2, Play, Square } from 'lucide-react';
import type { PromptItem } from '../../types';

function parsePrompts(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
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
  } = useAppStore();
  const { setItems, clearItems } = useQueueStore();

  const handleClear = () => {
    setPromptText('');
    clearItems();
    useAppStore.getState().setUploadedImages([]);
  };

  const handleStart = async () => {
    const prompts = parsePrompts(promptText);
    if (prompts.length === 0) return;

    const { promptImageModes } = useAppStore.getState();

    const items: PromptItem[] = prompts.map((text, i) => {
      // Match images to prompts:
      // - Same count: 1:1 mapping (image[0]→prompt[0], image[1]→prompt[1], ...)
      // - 1 image: shared across all prompts
      // - Otherwise: all images to each prompt
      let images: string[] | undefined;
      if (uploadedImages.length === prompts.length) {
        images = [uploadedImages[i]];
      } else if (uploadedImages.length === 1) {
        images = uploadedImages;
      } else if (uploadedImages.length > 0) {
        images = uploadedImages;
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
      await chrome.runtime.sendMessage({
        type: 'START_AUTOMATION',
        payload: {
          mode,
          prompts: items,
          concurrentPrompts,
          delayMin,
          delayMax,
          outputPerPrompt,
          saveFolder,
          autoRename,
          videoSettings,
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
