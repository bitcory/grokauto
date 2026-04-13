import type { GenerationMode, PromptItem, VideoSettings, VideoDownloadQuality, ImageDownloadQuality, ImageFrameMode, ImageGenerationSpeed, ResizeRatio } from '../types';
import { typePrompt, submitWithEnter, clickSend, clearPrompt } from './dom/promptInput';
import { uploadImages } from './dom/imageUpload';
import { typeStartEndFramePrompt } from './dom/imageMention';
import { switchMode } from './dom/modeSwitch';
import { setAspectRatio } from './dom/aspectRatio';
import { setImageGenerationSpeed } from './dom/imageSpeed';
import { setVideoDuration, setVideoResolution, clickVideoUpscale, waitForUpscaleComplete, clickVideoDownload } from './dom/videoSettings';
import { navigateToImagine, startNewImagineSession } from './dom/navigate';
import { waitForGenerationComplete, waitForTextToImageResult, dismissFeedbackScreen, waitForImageFullyLoaded, waitForVideoProgressGone, waitForCloudflareChallenge, readVideoProgress } from './dom/waiters';
import { clickDownloadButton, getFirstGeneratedImageUrl } from './dom/resultCapture';
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
  imageGenerationSpeed: ImageGenerationSpeed;
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
    imageGenerationSpeed,
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

          // 영상 모드: 제출 직후부터 진행률 폴링 시작
          const sendPhase = (phase: 'generated' | 'upscaling' | 'downloading') => {
            chrome.runtime.sendMessage({
              type: 'PROMPT_PROGRESS_UPDATE',
              payload: { promptId: prompt.id, phase },
            });
          };

          let progressPoller: ReturnType<typeof setInterval> | null = null;
          if (isVideo) {
            let lastPct = -1;
            progressPoller = setInterval(() => {
              const pct = readVideoProgress();
              if (pct !== null && pct !== lastPct) {
                lastPct = pct;
                chrome.runtime.sendMessage({
                  type: 'PROMPT_PROGRESS_UPDATE',
                  payload: { promptId: prompt.id, progress: pct },
                });
              }
            }, 500);
          }

          // Wait for generation to complete
          // text-to-image는 base64 data URL이라 별도의 fast-path 감지를 사용 (안정화 대기 없음)
          const genTimeout = isVideo ? 180000 : 120000;
          let genResult: 'completed' | 'timeout' | 'content-hidden';
          let textToImageDataUrl: string | undefined;
          if (mode === 'text-to-image') {
            const t2iResult = await waitForTextToImageResult(genTimeout);
            genResult = t2iResult.status;
            textToImageDataUrl = t2iResult.imageUrl;
          } else {
            genResult = await waitForGenerationComplete(genTimeout, isVideo);
          }

          if (progressPoller) {
            clearInterval(progressPoller);
            progressPoller = null;
          }

          // Check for Cloudflare challenge during generation
          await waitForCloudflareChallenge();

          if (genResult === 'timeout') {
            throw new Error('Generation timed out');
          }

          // 모더레이션으로 결과가 숨김 처리된 경우: 재시도 없이 실패로 마크하고 다음 프롬프트로 진행
          if (genResult === 'content-hidden') {
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
            await waitForVideoProgressGone(180000);
            await delay(500);
          } else if (mode === 'text-to-image') {
            // text-to-image는 waitForTextToImageResult에서 이미 src 존재까지 확인 완료.
            // data URL은 즉시 사용 가능하므로 추가 대기 불필요.
          } else {
            await waitForImageFullyLoaded(30000);
            await delay(1000);
          }

          dismissFeedbackScreen(); // check again after media load

          // Download based on quality settings (with retry)
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
                payload: { folder: saveFolder },
              });
              await clickVideoDownload();
            }
          } else if (mode === 'text-to-image') {
            // text-to-image: waitForTextToImageResult가 이미 검증한 새 이미지 URL을 그대로 사용.
            // (DOM에서 다시 잡으려 하면 이전 세션의 잔존 이미지를 잘못 잡을 위험이 있음)
            if (imageDownloadQuality !== 'none') {
              const imgUrl = textToImageDataUrl ?? getFirstGeneratedImageUrl();
              if (imgUrl) {
                console.log(`[GrokAuto] text-to-image: downloading ${imgUrl.slice(0, 80)}...`);
                await chrome.runtime.sendMessage({
                  type: 'DOWNLOAD_RESULT',
                  payload: { url: imgUrl, folder: saveFolder },
                });
              } else {
                console.warn('[GrokAuto] text-to-image: first image URL not found, skipping download');
              }
            }
          } else {
            // image-to-image, resize 등 다른 이미지 모드는 기존 로직 유지
            if (imageDownloadQuality !== 'none') {
              // Set download folder right before download click
              await chrome.runtime.sendMessage({
                type: 'SET_DOWNLOAD_FOLDER',
                payload: { folder: saveFolder },
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
