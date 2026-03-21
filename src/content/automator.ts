import type { GenerationMode, PromptItem, VideoSettings } from '../types';
import { typePrompt, submitWithEnter, clickSend, clearPrompt } from './dom/promptInput';
import { uploadImages } from './dom/imageUpload';
import { switchMode } from './dom/modeSwitch';
import { setAspectRatio } from './dom/aspectRatio';
import { setVideoDuration, clickVideoUpscale, waitForUpscaleComplete, clickVideoDownload } from './dom/videoSettings';
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
    outputPerPrompt,
    saveFolder,
    autoRename,
    videoSettings,
  } = config;

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

  if (mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video') {
    await setVideoDuration(videoSettings.duration);
    await delay(300);
    await setAspectRatio(videoSettings.aspectRatio);
    await delay(300);
  }

  // Process prompts in batches
  for (let i = 0; i < prompts.length; i += concurrentPrompts) {
    if (!isRunning) break;

    const batch = prompts.slice(i, i + concurrentPrompts);

    // Process each prompt in the batch sequentially
    // (grok.com typically supports one prompt at a time)
    for (const prompt of batch) {
      if (!isRunning) break;

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
        await delay(300);

        await switchMode(mode);
        await delay(300);

        if (prompt.imageDataUrls && prompt.imageDataUrls.length > 0) {
          const uploaded = await uploadImages(prompt.imageDataUrls);
          if (!uploaded) {
            throw new Error('Failed to upload images');
          }
          await delay(300);
        }

        const typed = await typePrompt(prompt.text);
        if (!typed) {
          throw new Error('Failed to type prompt');
        }

        await delay(300);
        // Try Enter key first, check if generation started, else click send button
        await submitWithEnter();
        await delay(1000);
        // Check if generation started (form/input might disappear or change)
        const inputAfterEnter = document.querySelector('div[contenteditable="true"]');
        const hasText = inputAfterEnter?.textContent?.trim();
        if (hasText) {
          // Text still in input = Enter didn't submit, click send button
          console.log('[GrokAuto] Enter did not submit, clicking send button');
          await clickSend();
        }

        // Wait for generation to complete
        const isVideo = mode === 'text-to-video' || mode === 'frame-to-video' || mode === 'remix-video';
        const genTimeout = isVideo ? 300000 : 120000;
        const completed = await waitForGenerationComplete(genTimeout, isVideo);

        if (!completed) {
          throw new Error('Generation timed out');
        }

        await delay(isVideo ? 3000 : 1500);

        // Set download folder
        await chrome.runtime.sendMessage({
          type: 'SET_DOWNLOAD_FOLDER',
          payload: { folder: saveFolder },
        });

        if (isVideo) {
          // Video: "추가 옵션" → "동영상 업스케일" → wait → "다운로드"
          const upscaled = await clickVideoUpscale();
          if (upscaled) {
            await waitForUpscaleComplete(180000);
            await delay(3000);
          }
          await clickVideoDownload();
        } else {
          // Image: click download button (4th button in toolbar)
          clickDownloadButton(false);
        }

        // Clear prompt for next
        clearPrompt();

        // Notify status: completed
        chrome.runtime.sendMessage({
          type: 'PROMPT_STATUS_UPDATE',
          payload: { promptId: prompt.id, status: 'completed' },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[GrokAuto] Prompt failed: ${errorMsg}`);

        chrome.runtime.sendMessage({
          type: 'PROMPT_STATUS_UPDATE',
          payload: {
            promptId: prompt.id,
            status: 'failed',
            error: errorMsg,
          },
        });
      }

      // Delay between prompts
      if (!isRunning) break;
      await randomDelay(delayMin, delayMax);
    }
  }

  isRunning = false;

  // Notify automation complete
  chrome.runtime.sendMessage({ type: 'AUTOMATION_COMPLETE' });
}
