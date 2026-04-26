import type { GenerationMode, PromptItem, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageFrameMode, ImageGenerationSpeed, ImageDownloadCount, ResizeRatio } from '../types';
import { typePrompt, submitWithEnter, clickSend, clearPrompt } from './dom/promptInput';
import { uploadImages } from './dom/imageUpload';
import { typeStartEndFramePrompt } from './dom/imageMention';
import { switchMode } from './dom/modeSwitch';
import { setAspectRatio } from './dom/aspectRatio';
import { setImageGenerationSpeed } from './dom/imageSpeed';
import { setVideoDuration, setVideoResolution, clickVideoUpscale, waitForUpscaleComplete, clickVideoDownload } from './dom/videoSettings';
import { navigateToImagine, startNewImagineSession } from './dom/navigate';
import {
  waitForGenerationComplete,
  waitForTextToImageResult,
  waitForVideoComplete,
  waitForImageToImageComplete,
  snapshotTextToImageBaseline,
  dismissFeedbackScreen,
  waitForImageFullyLoaded,
  waitForCloudflareChallenge,
} from './dom/waiters';
import { clickDownloadButton, getFirstGeneratedImageUrl } from './dom/resultCapture';
import { randomDelay, delay } from './utils/delay';
import { markStopRequested, clearStopRequest } from './stopSignal';

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
  imageGenerationSpeed: ImageGenerationSpeed;
  imageDownloadCount: ImageDownloadCount;
  resizeTargetRatio?: ResizeRatio;
}

let isRunning = false;

export function isAutomationRunning(): boolean {
  return isRunning;
}

/**
 * Stop the current automation
 */
export function stopAutomation(): void {
  isRunning = false;
  markStopRequested();
}

/**
 * Run the batch automation
 */
export async function runAutomation(config: AutomationConfig): Promise<void> {
  if (isRunning) {
    console.warn('[GrokAuto] runAutomation: already running, ignoring start');
    return;
  }
  clearStopRequest();
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
    imageGenerationSpeed,
    imageDownloadCount,
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

  // Apply image generation speed (image modes only)
  const isImage = !isVideo && !isResize;
  if (isImage) {
    await setImageGenerationSpeed(imageGenerationSpeed);
    await delay(300);
  }

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

    for (let j = 0; j < batch.length; j++) {
      if (!isRunning) break;
      const prompt = batch[j];
      // 1-based position within the whole `prompts` array. Used to prefix
      // saved filenames so failed prompts leave a gap in the numbering
      // (matching the UI list position rather than a success-only counter).
      const promptIndex = i + j + 1;

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
          if (isImage) {
            await setImageGenerationSpeed(imageGenerationSpeed);
            await delay(300);
          }
          await setAspectRatio(targetRatio);
          await delay(300);

          if (isVideo) {
            const resolution = videoDownloadQuality === '720p' ? '720p' : '480p';
            await setVideoResolution(resolution);
            await delay(300);
            await setVideoDuration(videoSettings.duration);
            await delay(300);
          }

          // Load images from chrome.storage.local (per-prompt 또는 cinematic 공유 키)
          const imgKey = `img_${prompt.id}`;
          const stored = await chrome.storage.local.get([imgKey, 'img_cinematic_ref']);
          const imageDataUrls: string[] | undefined = stored[imgKey] ?? stored['img_cinematic_ref'];
          if (imageDataUrls && imageDataUrls.length > 0) {
            const uploaded = await uploadImages(imageDataUrls);
            if (!uploaded) {
              throw new Error('Failed to upload images');
            }
            await delay(300);
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

          // t2i: capture baseline BEFORE submit so we can distinguish NEW
          // generated images from any stale ones from the previous session.
          const t2iBaseline = mode === 'text-to-image'
            ? snapshotTextToImageBaseline()
            : undefined;

          await delay(5000);
          await submitWithEnter();
          await delay(2000);

          // Check for Cloudflare challenge after submit
          await waitForCloudflareChallenge();

          // Check if generation started
          const inputAfterEnter = document.querySelector('div[contenteditable="true"]');
          const hasText = inputAfterEnter?.textContent?.trim();
          if (hasText && hasText.length > 0) {
            console.log('[GrokAuto] Enter did not submit after 2s, clicking send button');
            await clickSend();
            await delay(1000);
          }

          const sendPhase = (phase: 'generated' | 'upscaling' | 'downloading') => {
            chrome.runtime.sendMessage({
              type: 'PROMPT_PROGRESS_UPDATE',
              payload: { promptId: prompt.id, phase },
            });
          };

          // Wait for generation to complete — use the right detector for the mode.
          // Timeout/content-hidden are handled with SKIP policy (no retry): the
          // user wants the batch to move on to the next prompt instead of
          // burning attempts on a stuck generation.
          const genTimeout = isVideo ? 240000 : 120000;
          let genStatus: 'completed' | 'timeout' | 'content-hidden' = 'timeout';
          let textToImageUrls: string[] | undefined;
          let imageToImageUrls: string[] | undefined;

          if (mode === 'text-to-image') {
            // Quality mode → expect 4 images. Speed mode → any (first match).
            const expected = imageGenerationSpeed === 'quality' ? 4 : undefined;
            const t2iResult = await waitForTextToImageResult(genTimeout, t2iBaseline, expected);
            genStatus = t2iResult.status;
            textToImageUrls = t2iResult.imageUrls;
          } else if (mode === 'image-to-image') {
            const i2iResult = await waitForImageToImageComplete(genTimeout);
            genStatus = i2iResult.status;
            imageToImageUrls = i2iResult.urls;
          } else if (isVideo) {
            genStatus = await waitForVideoComplete(genTimeout);
          } else {
            genStatus = await waitForGenerationComplete(genTimeout, isVideo);
          }

          // Check for Cloudflare challenge during generation
          await waitForCloudflareChallenge();

          // SKIP on timeout: mark as failed and move on (no retry)
          if (genStatus === 'timeout') {
            console.log('[GrokAuto] Generation timed out — skipping this prompt');
            chrome.runtime.sendMessage({
              type: 'PROMPT_STATUS_UPDATE',
              payload: { promptId: prompt.id, status: 'failed', error: 'Generation timed out' },
            });
            clearPrompt();
            if (imageDataUrls && imageDataUrls.length > 0) {
              await chrome.storage.local.remove(imgKey);
            }
            break; // exit retry loop → next prompt
          }

          // 모더레이션으로 결과가 숨김 처리된 경우: 재시도 없이 실패로 마크하고 다음 프롬프트로 진행
          if (genStatus === 'content-hidden') {
            console.log('[GrokAuto] Content blocked by moderation — marking as failed and moving on');
            chrome.runtime.sendMessage({
              type: 'PROMPT_STATUS_UPDATE',
              payload: {
                promptId: prompt.id,
                status: 'failed',
                error: 'Content blocked by moderation',
              },
            });
            clearPrompt();
            if (imageDataUrls && imageDataUrls.length > 0) {
              await chrome.storage.local.remove(imgKey);
            }
            break; // exit retry loop → next prompt
          }

          // Dismiss feedback/comparison screen if it appeared
          dismissFeedbackScreen();

          // Wait for media to be fully loaded before downloading
          if (isVideo) {
            sendPhase('generated');
            // waitForVideoComplete already verified readyState >= 2 and settled.
          } else if (mode === 'text-to-image' || mode === 'image-to-image') {
            // waitForTextToImageResult / waitForImageToImageComplete already
            // verified all N images are loaded and stable.
          } else {
            await waitForImageFullyLoaded(30000);
            await delay(1000);
          }

          dismissFeedbackScreen(); // check again after media load

          // Helper: request the background to save a URL to disk with optional
          // _N suffix in the filename. Always stamps the prompt's batch
          // position so filenames match the UI list (failed prompts leave
          // gaps in the numbering).
          const saveUrl = (url: string, indexSuffix?: number) => {
            return chrome.runtime.sendMessage({
              type: 'DOWNLOAD_RESULT',
              payload: { url, folder: saveFolder, indexSuffix, promptIndex },
            });
          };

          // Download based on quality settings
          if (isVideo) {
            if (videoDownloadQuality !== 'none') {
              if (videoDownloadQuality === '480p-upscale') {
                sendPhase('upscaling');
                const upscaled = await clickVideoUpscale();
                if (upscaled) {
                  await waitForUpscaleComplete(120000);
                  await delay(1000);
                }
              }
              sendPhase('downloading');
              // Set download folder right before download click
              await chrome.runtime.sendMessage({
                type: 'SET_DOWNLOAD_FOLDER',
                payload: { folder: saveFolder, promptIndex },
              });
              await clickVideoDownload();
            }
          } else if (mode === 'text-to-image') {
            if (imageDownloadQuality !== 'none') {
              const urls = textToImageUrls && textToImageUrls.length > 0
                ? textToImageUrls
                : (getFirstGeneratedImageUrl() ? [getFirstGeneratedImageUrl()!] : []);
              if (urls.length === 0) {
                console.warn('[GrokAuto] text-to-image: no result image URL found');
              } else if (imageDownloadCount === 'all' && urls.length > 1) {
                console.log(`[GrokAuto] t2i: downloading ${urls.length} images with _N suffix`);
                for (let k = 0; k < urls.length; k++) {
                  await saveUrl(urls[k], k + 1);
                }
              } else {
                console.log(`[GrokAuto] t2i: downloading first of ${urls.length} image(s)`);
                await saveUrl(urls[0]);
              }
            }
          } else if (mode === 'image-to-image') {
            if (imageDownloadQuality !== 'none') {
              const urls = imageToImageUrls ?? [];
              if (urls.length === 0) {
                console.warn('[GrokAuto] i2i: no generated image URLs found in result');
              } else if (imageDownloadCount === 'all' && urls.length > 1) {
                console.log(`[GrokAuto] i2i: downloading ${urls.length} images with _N suffix`);
                for (let k = 0; k < urls.length; k++) {
                  await saveUrl(urls[k], k + 1);
                }
              } else {
                console.log(`[GrokAuto] i2i: downloading first of ${urls.length} image(s)`);
                await saveUrl(urls[0]);
              }
            }
          } else {
            // resize 등 다른 이미지 모드는 기존 로직 유지
            if (imageDownloadQuality !== 'none') {
              // Set download folder right before download click
              await chrome.runtime.sendMessage({
                type: 'SET_DOWNLOAD_FOLDER',
                payload: { folder: saveFolder, promptIndex },
              });
              // Retry download button click up to 3 times
              let downloadClicked = false;
              for (let dlAttempt = 0; dlAttempt < 3; dlAttempt++) {
                downloadClicked = clickDownloadButton(false);
                if (downloadClicked) break;
                console.log(`[GrokAuto] Download button click failed, retry ${dlAttempt + 1}/3`);
                await delay(2000);
              }
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

  // 공유 레퍼런스 이미지 정리
  await chrome.storage.local.remove('img_cinematic_ref');

  isRunning = false;
  chrome.runtime.sendMessage({ type: 'AUTOMATION_COMPLETE' });
}
