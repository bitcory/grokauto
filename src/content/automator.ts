import type { GenerationMode, PromptItem, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageFrameMode, ResizeRatio } from '../types';
import { typePrompt, submitWithEnter, clickSend, clearPrompt } from './dom/promptInput';
import { uploadImages } from './dom/imageUpload';
import { typeStartEndFramePrompt } from './dom/imageMention';
import { switchMode } from './dom/modeSwitch';
import { setAspectRatio } from './dom/aspectRatio';
import { setVideoDuration, setVideoResolution, clickVideoUpscale, waitForUpscaleComplete, clickVideoDownload } from './dom/videoSettings';
import { navigateToImagine, startNewImagineSession } from './dom/navigate';
import { waitForGenerationComplete } from './dom/waiters';
import { clickDownloadButton } from './dom/resultCapture';
import { randomDelay, delay } from './utils/delay';

interface AutomationConfig {
  mode: GenerationMode;
  prompts: PromptItem[];
  concurrentPrompts: number;
  delayMin: number;
  delayMax: number;
  outputPerPrompt: number;
  saveFolder: string;
  autoRename: boolean;
  videoSettings: VideoSettings;
  maxRetries: number;
  videoDownloadQuality: VideoDownloadQuality;
  imageDownloadQuality: ImageDownloadQuality;
  imageFrameMode: ImageFrameMode;
  resizeTargetRatio?: ResizeRatio;
}

let isRunning = false;

/**
 * Stop the current automation
 */
export function stopAutomation(): void {
  isRunning = false;
}

/**
 * Run the batch automation
 */
export async function runAutomation(config: AutomationConfig): Promise<void> {
  isRunning = true;

  const {
    mode,
    prompts,
    concurrentPrompts,
    delayMin,
    delayMax,
    saveFolder,
    videoSettings,
    maxRetries,
    videoDownloadQuality,
    imageDownloadQuality,
    imageFrameMode,
    resizeTargetRatio,
  } = config;

  const isVideo = mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video';
  const isResize = mode === 'resize';

  // Navigate to grok.com/imagine first
  console.log(`[GrokAuto] runAutomation: mode=${mode}, prompts=${prompts.length}`);
  const navigated = await navigateToImagine();
  if (!navigated) {
    chrome.runtime.sendMessage({
      type: 'STORE_PENDING_AUTOMATION',
      payload: config,
    });
    return;
  }
  await delay(500);

  console.log(`[GrokAuto] runAutomation: on /imagine, switching to mode "${mode}"`);
  const modeSwitched = await switchMode(mode);
  if (!modeSwitched) {
    for (const prompt of prompts) {
      chrome.runtime.sendMessage({
        type: 'PROMPT_STATUS_UPDATE',
        payload: {
          promptId: prompt.id,
          status: 'failed',
          error: 'Mode switch failed - could not find mode button',
        },
      });
    }
    isRunning = false;
    chrome.runtime.sendMessage({ type: 'AUTOMATION_COMPLETE' });
    return;
  }
  await delay(300);

  // Apply aspect ratio — for resize mode use the target ratio
  const targetRatio = isResize && resizeTargetRatio ? resizeTargetRatio : videoSettings.aspectRatio;
  await setAspectRatio(targetRatio);
  await delay(300);

  if (isVideo) {
    // Determine resolution from download quality setting
    const resolution = videoDownloadQuality === '720p' ? '720p' : '480p';
    await setVideoResolution(resolution);
    await delay(300);
    await setVideoDuration(videoSettings.duration);
    await delay(300);
  }

  // Process prompts in batches
  for (let i = 0; i < prompts.length; i += concurrentPrompts) {
    if (!isRunning) break;

    const batch = prompts.slice(i, i + concurrentPrompts);

    for (const prompt of batch) {
      if (!isRunning) break;

      // Retry loop
      let succeeded = false;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isRunning) break;

        if (attempt > 0) {
          console.log(`[GrokAuto] Retry ${attempt}/${maxRetries} for prompt: ${prompt.text.slice(0, 30)}...`);
        }

        // Notify status: running
        chrome.runtime.sendMessage({
          type: 'PROMPT_STATUS_UPDATE',
          payload: { promptId: prompt.id, status: 'running' },
        });

        try {
          const onImagine = await startNewImagineSession();
          if (!onImagine) {
            throw new Error('Failed to start new imagine session');
          }
          await delay(1000);

          await switchMode(mode);
          await delay(300);

          // Re-apply settings after new session
          await setAspectRatio(targetRatio);
          await delay(300);

          if (isVideo) {
            const resolution = videoDownloadQuality === '720p' ? '720p' : '480p';
            await setVideoResolution(resolution);
            await delay(300);
            await setVideoDuration(videoSettings.duration);
            await delay(300);
          }

          // Load images from chrome.storage.local
          const imgKey = `img_${prompt.id}`;
          const stored = await chrome.storage.local.get(imgKey);
          const imageDataUrls: string[] | undefined = stored[imgKey];
          if (imageDataUrls && imageDataUrls.length > 0) {
            const uploaded = await uploadImages(imageDataUrls);
            if (!uploaded) {
              throw new Error('Failed to upload images');
            }
            await delay(300);
            // Only clean up on last attempt or success
          }

          // Use @Image mentions for start/end frame mode
          let typed: boolean;
          if (imageFrameMode === 'start-end' && imageDataUrls && imageDataUrls.length === 2) {
            typed = await typeStartEndFramePrompt(prompt.text);
          } else {
            typed = await typePrompt(prompt.text);
          }
          if (!typed) {
            throw new Error('Failed to type prompt');
          }

          await delay(5000);
          await submitWithEnter();
          await delay(2000);

          // Check if generation started
          const inputAfterEnter = document.querySelector('div[contenteditable="true"]');
          const hasText = inputAfterEnter?.textContent?.trim();
          if (hasText && hasText.length > 0) {
            console.log('[GrokAuto] Enter did not submit after 2s, clicking send button');
            await clickSend();
            await delay(1000);
          }

          // Wait for generation to complete
          const genTimeout = isVideo ? 180000 : 120000;
          const completed = await waitForGenerationComplete(genTimeout, isVideo);

          if (!completed) {
            throw new Error('Generation timed out');
          }

          await delay(isVideo ? 5000 : isResize ? 5000 : 3000);

          // Set download folder
          await chrome.runtime.sendMessage({
            type: 'SET_DOWNLOAD_FOLDER',
            payload: { folder: saveFolder },
          });

          // Download based on quality settings
          if (isVideo) {
            if (videoDownloadQuality !== 'none') {
              if (videoDownloadQuality === '480p-upscale') {
                const upscaled = await clickVideoUpscale();
                if (upscaled) {
                  await waitForUpscaleComplete(120000);
                  await delay(3000);
                }
              }
              await clickVideoDownload();
            }
          } else {
            if (imageDownloadQuality !== 'none') {
              clickDownloadButton(false);
            }
          }

          // Clear prompt for next
          clearPrompt();

          // Clean up stored image data on success
          if (imageDataUrls && imageDataUrls.length > 0) {
            await chrome.storage.local.remove(imgKey);
          }

          // Notify status: completed
          chrome.runtime.sendMessage({
            type: 'PROMPT_STATUS_UPDATE',
            payload: { promptId: prompt.id, status: 'completed' },
          });

          succeeded = true;
          break; // Exit retry loop on success
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[GrokAuto] Prompt failed (attempt ${attempt + 1}/${maxRetries}): ${errorMsg}`);

          if (attempt >= maxRetries - 1) {
            // Last attempt — mark as failed
            chrome.runtime.sendMessage({
              type: 'PROMPT_STATUS_UPDATE',
              payload: {
                promptId: prompt.id,
                status: 'failed',
                error: errorMsg,
              },
            });
          } else {
            // Wait before retry
            await delay(3000);
          }
        }
      }

      // Delay between prompts
      if (!isRunning) break;
      await randomDelay(delayMin, delayMax);
    }
  }

  isRunning = false;
  chrome.runtime.sendMessage({ type: 'AUTOMATION_COMPLETE' });
}
