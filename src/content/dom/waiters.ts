import { querySelector } from './selectors';
import { isStopRequested } from '../stopSignal';
import { getImageToImageGeneratedUrls, getTextToImageGeneratedUrls } from './resultCapture';

/**
 * Detect and dismiss the video feedback/comparison screen ("어떤 동영상을 남겨두고 싶으신가요?")
 * by clicking the "건너뛰기" (Skip) button.
 * Returns true if the screen was found and dismissed.
 */
export function dismissFeedbackScreen(): boolean {
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const text = (btn as HTMLElement).innerText?.trim() ?? '';
    if (text === '건너뛰기' || text === 'Skip') {
      console.log('[GrokAuto] Feedback screen detected — clicking skip');
      (btn as HTMLElement).click();
      return true;
    }
  }
  return false;
}

/**
 * Result of waiting for a generation to complete.
 * - 'completed': media appeared and DOM stabilized
 * - 'timeout': ran out of time
 * - 'content-hidden': Grok showed the "content hidden" (lucide-eye-off) icon — moderation block
 */
export type GenerationResult = 'completed' | 'timeout' | 'content-hidden';

/**
 * Check if Grok's "content hidden" icon (lucide eye-off SVG) is present in the DOM.
 * Grok renders this when the generated content is blocked by moderation.
 */
export function hasHiddenContentIcon(): boolean {
  return !!document.querySelector('svg.lucide-eye-off');
}

/**
 * Wait for generation to complete.
 * For images: wait for new <img> elements + DOM stabilization (5s min, 2s stable).
 * For videos: wait for <video> with valid src + longer stabilization (20s min, 5s stable).
 * Fails fast with 'content-hidden' if Grok shows the moderation eye-off icon.
 */
export function waitForGenerationComplete(
  timeoutMs: number = 120000,
  isVideo: boolean = false
): Promise<GenerationResult> {
  const MIN_TIME = isVideo ? 20000 : 5000;
  const STABLE_TIME = isVideo ? 5000 : 2000;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const initialImgCount = document.querySelectorAll('img').length;
    const initialVideoCount = document.querySelectorAll('video').length;
    const initialHiddenCount = document.querySelectorAll('svg.lucide-eye-off').length;

    let settled = false;
    let stabilizationTimer: ReturnType<typeof setTimeout> | null = null;
    let lastDomChangeTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      settled = true;
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      clearTimeout(timeoutId);
      observer.disconnect();
    };

    const hasVideoWithSrc = (): boolean => {
      const videos = document.querySelectorAll('video');
      for (const v of videos) {
        const src = v.src || v.querySelector('source')?.src;
        if (src && src.length > 0) return true;
      }
      return false;
    };

    const tryResolve = () => {
      if (settled) return;

      // 모더레이션 차단 아이콘이 새로 나타났으면 MIN_TIME 가드를 우회하고 즉시 실패 처리
      const currentHiddenCount = document.querySelectorAll('svg.lucide-eye-off').length;
      if (currentHiddenCount > initialHiddenCount) {
        const elapsed = Date.now() - startTime;
        console.log(`[GrokAuto] Content hidden icon detected — moderation block (${Math.round(elapsed / 1000)}s)`);
        cleanup();
        resolve('content-hidden');
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TIME) return;

      const timeSinceLastChange = Date.now() - lastDomChangeTime;
      const domStable = timeSinceLastChange >= STABLE_TIME;

      if (isVideo) {
        // For video: require a <video> element with actual src and DOM stable
        if (hasVideoWithSrc() && domStable) {
          console.log(`[GrokAuto] Video generation complete (${Math.round(elapsed / 1000)}s, stable ${Math.round(timeSinceLastChange / 1000)}s)`);
          cleanup();
          resolve('completed');
          return;
        }
        // Fallback: after 3x min time with DOM stable (video might use different element)
        if (domStable && elapsed > MIN_TIME * 3) {
          console.log(`[GrokAuto] Video generation complete (fallback, ${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve('completed');
          return;
        }
      } else {
        // For images: check new media + DOM stable
        const currentImgCount = document.querySelectorAll('img').length;
        const hasNewMedia = currentImgCount > initialImgCount;

        if (hasNewMedia && domStable) {
          console.log(`[GrokAuto] Image generation complete (${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve('completed');
          return;
        }
        // Fallback: DOM stable for a long time
        if (domStable && elapsed > MIN_TIME * 2) {
          console.log(`[GrokAuto] Generation complete (fallback, ${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve('completed');
          return;
        }
      }
    };

    const observer = new MutationObserver(() => {
      if (settled) return;
      lastDomChangeTime = Date.now();
      // 모더레이션 아이콘은 DOM 변경 즉시 확인 (안정화 대기 없이)
      const currentHiddenCount = document.querySelectorAll('svg.lucide-eye-off').length;
      if (currentHiddenCount > initialHiddenCount) {
        tryResolve();
        return;
      }
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      stabilizationTimer = setTimeout(tryResolve, STABLE_TIME + 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const checkInterval = setInterval(() => {
      if (settled) { clearInterval(checkInterval); return; }
      if (isStopRequested()) {
        clearInterval(checkInterval);
        cleanup();
        console.log('[GrokAuto] waitForGenerationComplete: stop requested, aborting');
        resolve('timeout');
        return;
      }
      dismissFeedbackScreen();
      tryResolve();
    }, 500);

    timeoutId = setTimeout(() => {
      if (!settled) {
        clearInterval(checkInterval);
        cleanup();
        console.log('[GrokAuto] Generation timed out');
        resolve('timeout');
      }
    }, timeoutMs);
  });
}

export interface TextToImageDetection {
  status: GenerationResult;
  imageUrl?: string;
  /** All new "Generated image" URLs in the masonry that weren't in the baseline. */
  imageUrls?: string[];
}

/**
 * Snapshot the current set of t2i result image URLs so a subsequent
 * `waitForTextToImageResult` call can distinguish NEW generations from stale
 * ones left over in the DOM from a previous session.
 */
export function snapshotTextToImageBaseline(): Set<string> {
  const set = new Set<string>();
  document
    .querySelectorAll('[id^="imagine-masonry-section-"] img[alt="Generated image"]')
    .forEach((el) => {
      const src = (el as HTMLImageElement).src;
      if (src) set.add(src);
    });
  return set;
}

/**
 * Fast-path generation detection for text-to-image mode.
 *
 * Grok renders new generations as <img alt="Generated image"> inside the
 * `#imagine-masonry-section-*` container. Quality mode outputs 4 such images;
 * Speed mode outputs many (Discover-style).
 *
 * This function uses `alt="Generated image"` to filter out Discover/gallery
 * results, and the caller-supplied `baseline` set (pre-submit snapshot) to
 * ignore any images left over from a prior session.
 *
 * When `expectedCount` is passed, the function waits for at least that many
 * NEW images with stable src. Otherwise it resolves as soon as one stable
 * new image is found.
 */
export function waitForTextToImageResult(
  timeoutMs: number = 120000,
  baseline?: Set<string>,
  expectedCount?: number
): Promise<TextToImageDetection> {
  const MIN_WAIT = 6000; // 최소 6s 서버 반응 대기
  const STABLE_MS = 2000; // 후보 집합이 이 시간 동안 변하지 않으면 완료

  return new Promise((resolve) => {
    const initialSrcs = baseline ?? new Set<string>();
    console.log(
      `[GrokAuto] Text-to-image baseline: ${initialSrcs.size} pre-existing image(s) to ignore, expectedCount=${expectedCount ?? 'any'}`
    );

    const startTime = Date.now();
    let settled = false;

    // 다중 이미지 안정화: 발견된 src set이 STABLE_MS 동안 변하지 않아야 완료
    let lastSetKey = '';
    let lastChangeAt = 0;

    const cleanup = () => {
      settled = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      clearInterval(pollId);
    };

    const collectNew = (): { srcs: string[]; allLoaded: boolean } => {
      const imgs = Array.from(
        document.querySelectorAll('[id^="imagine-masonry-section-"] img[alt="Generated image"]')
      ) as HTMLImageElement[];
      const srcs: string[] = [];
      let allLoaded = true;
      for (const img of imgs) {
        if (!img.src) continue;
        if (initialSrcs.has(img.src)) continue;
        srcs.push(img.src);
        if (!img.complete || img.naturalWidth === 0) allLoaded = false;
      }
      return { srcs, allLoaded };
    };

    const check = () => {
      if (settled) return;
      if (isStopRequested()) {
        console.log('[GrokAuto] waitForTextToImageResult: stop requested, aborting');
        cleanup();
        resolve({ status: 'timeout' });
        return;
      }
      const elapsed = Date.now() - startTime;

      if (document.querySelector('svg.lucide-eye-off')) {
        console.log(
          `[GrokAuto] Text-to-image: content hidden (${Math.round(elapsed / 1000)}s)`
        );
        cleanup();
        resolve({ status: 'content-hidden' });
        return;
      }

      if (elapsed < MIN_WAIT) return;

      const { srcs, allLoaded } = collectNew();
      if (srcs.length === 0) return;
      if (expectedCount != null && srcs.length < expectedCount) return;

      // 집합 변화 감지 (set의 정렬된 해시로 비교)
      const key = [...srcs].sort().join('|');
      if (key !== lastSetKey) {
        lastSetKey = key;
        lastChangeAt = Date.now();
        return;
      }

      const stableFor = Date.now() - lastChangeAt;
      if (stableFor < STABLE_MS) return;
      if (!allLoaded) return;

      console.log(
        `[GrokAuto] Text-to-image complete: ${srcs.length} image(s) in ${Math.round(elapsed / 1000)}s (stable ${Math.round(stableFor / 1000)}s)`
      );
      cleanup();
      resolve({ status: 'completed', imageUrl: srcs[0], imageUrls: srcs });
    };

    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class', 'alt'],
    });

    const pollId = setInterval(check, 500);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        cleanup();
        console.log('[GrokAuto] Text-to-image generation timed out');
        resolve({ status: 'timeout' });
      }
    }, timeoutMs);

    check();
  });
}

/**
 * Wait for a video generation to fully complete.
 *
 * Measured Grok behavior (2026-04):
 *  - On submit, page stays on /imagine briefly, then navigates to
 *    /imagine/post/{uuid} once the server accepts the request.
 *  - At that moment a <video> element appears with a valid https:// src,
 *    then its `readyState` climbs to 4 within ~1-2s.
 *  - The old `span.tabular-nums.animate-pulse` progress indicator no longer
 *    exists in Grok's current UI, so completion is detected by URL + readyState.
 *
 * Phase 1: wait up to `urlTimeoutMs` for the /post/ URL change.
 * Phase 2: wait for the last <article> <video> readyState >= 2 + videoWidth > 0.
 * Phase 3: 2s settle.
 */
export function waitForVideoComplete(
  timeoutMs: number = 240000,
  urlTimeoutMs: number = 120000
): Promise<GenerationResult> {
  return new Promise(async (resolve) => {
    const startTime = Date.now();

    // Phase 1: URL change
    while (Date.now() - startTime < urlTimeoutMs) {
      if (isStopRequested()) {
        console.log('[GrokAuto] waitForVideoComplete: stop requested (phase 1)');
        resolve('timeout');
        return;
      }
      if (document.querySelector('svg.lucide-eye-off')) {
        resolve('content-hidden');
        return;
      }
      if (location.pathname.startsWith('/imagine/post/')) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!location.pathname.startsWith('/imagine/post/')) {
      console.log('[GrokAuto] waitForVideoComplete: URL never changed to /imagine/post/');
      resolve('timeout');
      return;
    }
    const urlAt = Date.now() - startTime;

    // Phase 2: video playable
    while (Date.now() - startTime < timeoutMs) {
      if (isStopRequested()) {
        console.log('[GrokAuto] waitForVideoComplete: stop requested (phase 2)');
        resolve('timeout');
        return;
      }
      if (document.querySelector('svg.lucide-eye-off')) {
        resolve('content-hidden');
        return;
      }
      const videos = Array.from(document.querySelectorAll('article video')) as HTMLVideoElement[];
      const ready = videos.find((v) => {
        const src = v.src || v.querySelector('source')?.src || '';
        return src.startsWith('http') && v.readyState >= 2 && (v.videoWidth || 0) > 0;
      });
      if (ready) {
        const readyAt = Date.now() - startTime;
        await new Promise((r) => setTimeout(r, 2000)); // settle
        console.log(
          `[GrokAuto] Video complete: url@${Math.round(urlAt / 1000)}s, ready@${Math.round(readyAt / 1000)}s`
        );
        resolve('completed');
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log('[GrokAuto] waitForVideoComplete: video never reached readyState≥2');
    resolve('timeout');
  });
}

/**
 * Wait for image-to-image generation to complete.
 *
 * Measured Grok behavior (2026-04):
 *  - Submit → URL changes to /imagine/post/{uuid}
 *  - Result article contains: 1 reference image + N generated images
 *    (currently N=2, matched by URL containing "/generated/").
 *  - Each generated image is a cacheable https:// URL, loads in ~1s.
 */
export interface ImageToImageDetection {
  status: GenerationResult;
  urls?: string[];
}

export function waitForImageToImageComplete(
  timeoutMs: number = 120000,
  urlTimeoutMs: number = 60000,
  expectedCount: number = 2
): Promise<ImageToImageDetection> {
  return new Promise(async (resolve) => {
    const startTime = Date.now();

    while (Date.now() - startTime < urlTimeoutMs) {
      if (isStopRequested()) {
        resolve({ status: 'timeout' });
        return;
      }
      if (document.querySelector('svg.lucide-eye-off')) {
        resolve({ status: 'content-hidden' });
        return;
      }
      if (location.pathname.startsWith('/imagine/post/')) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!location.pathname.startsWith('/imagine/post/')) {
      console.log('[GrokAuto] waitForImageToImageComplete: URL never changed');
      resolve({ status: 'timeout' });
      return;
    }

    while (Date.now() - startTime < timeoutMs) {
      if (isStopRequested()) {
        resolve({ status: 'timeout' });
        return;
      }
      if (document.querySelector('svg.lucide-eye-off')) {
        resolve({ status: 'content-hidden' });
        return;
      }
      const urls = getImageToImageGeneratedUrls();
      if (urls.length >= expectedCount) {
        const articles = document.querySelectorAll('article');
        const lastArticle = articles[articles.length - 1];
        const imgs = lastArticle
          ? (Array.from(
              lastArticle.querySelectorAll('img')
            ) as HTMLImageElement[]).filter((i) => i.src.includes('/generated/'))
          : [];
        const allLoaded = imgs.length >= expectedCount && imgs.every((i) => i.complete && i.naturalWidth > 0);
        if (allLoaded) {
          await new Promise((r) => setTimeout(r, 1000));
          console.log(
            `[GrokAuto] i2i complete: ${urls.length} image(s) in ${Math.round((Date.now() - startTime) / 1000)}s`
          );
          resolve({ status: 'completed', urls });
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log('[GrokAuto] waitForImageToImageComplete: timeout');
    resolve({ status: 'timeout' });
  });
}

/**
 * @deprecated The `span.tabular-nums.animate-pulse` indicator no longer exists
 * in the current Grok UI. Keep exports for backward compatibility; always
 * returns null / true.
 */
export function readVideoProgress(): number | null {
  return null;
}

/**
 * Wait for media elements (images/videos) in a container to be fully loaded.
 */
export async function waitForMediaLoaded(
  container: Element,
  timeoutMs: number = 15000
): Promise<void> {
  const images = container.querySelectorAll('img');
  const promises: Promise<void>[] = [];

  for (const img of images) {
    if (img.complete && img.naturalWidth > 0) continue;
    promises.push(
      new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeoutMs);
      })
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

/**
 * Wait for all images in the last <article> to be fully loaded (complete && naturalWidth > 0).
 */
export function waitForImageFullyLoaded(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (isStopRequested()) {
        console.log('[GrokAuto] waitForImageFullyLoaded: stop requested, aborting');
        resolve(false);
        return;
      }
      if (Date.now() - startTime > timeoutMs) {
        console.warn('[GrokAuto] Image loading timed out');
        resolve(false);
        return;
      }

      const articles = document.querySelectorAll('article');
      const lastArticle = articles[articles.length - 1];
      if (!lastArticle) {
        setTimeout(check, 500);
        return;
      }

      const imgs = lastArticle.querySelectorAll('img');
      if (imgs.length === 0) {
        setTimeout(check, 500);
        return;
      }

      const allLoaded = Array.from(imgs).every((img) => img.complete && img.naturalWidth > 0);
      if (allLoaded) {
        console.log(`[GrokAuto] Image loaded: true (${imgs.length} images, ${Math.round((Date.now() - startTime) / 1000)}s)`);
        resolve(true);
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

/**
 * Wait for the last <video> element to have readyState >= 2 (HAVE_CURRENT_DATA).
 */
export function waitForVideoLoaded(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (Date.now() - startTime > timeoutMs) {
        console.warn('[GrokAuto] Video loading timed out');
        resolve(false);
        return;
      }

      const videos = document.querySelectorAll('video');
      const lastVideo = videos[videos.length - 1];
      if (!lastVideo) {
        setTimeout(check, 500);
        return;
      }

      if (lastVideo.readyState >= 2) {
        console.log(`[GrokAuto] Video loaded: true (readyState=${lastVideo.readyState}, ${Math.round((Date.now() - startTime) / 1000)}s)`);
        resolve(true);
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

/**
 * Detect Cloudflare challenge and wait for user to solve it.
 * Returns true if challenge was detected and resolved, false if no challenge or timeout.
 */
export function waitForCloudflareChallenge(timeoutMs: number = 300000): Promise<boolean> {
  const CLOUDFLARE_SELECTORS = [
    '#challenge-running',
    '#challenge-stage',
    'iframe[src*="challenges.cloudflare.com"]',
    '#turnstile-wrapper',
    '#cf-challenge-running',
  ];

  const isCloudflarePresent = (): boolean => {
    return CLOUDFLARE_SELECTORS.some((sel) => document.querySelector(sel) !== null);
  };

  if (!isCloudflarePresent()) {
    return Promise.resolve(false);
  }

  console.log('[GrokAuto] Cloudflare challenge detected — waiting for user to solve...');

  return new Promise((resolve) => {
    const startTime = Date.now();

    const poll = () => {
      if (isStopRequested()) {
        console.log('[GrokAuto] waitForCloudflareChallenge: stop requested, aborting');
        resolve(false);
        return;
      }
      if (Date.now() - startTime > timeoutMs) {
        console.warn('[GrokAuto] Cloudflare challenge wait timed out');
        resolve(false);
        return;
      }

      if (!isCloudflarePresent()) {
        console.log(`[GrokAuto] Cloudflare challenge resolved (${Math.round((Date.now() - startTime) / 1000)}s)`);
        resolve(true);
        return;
      }

      setTimeout(poll, 1000);
    };

    poll();
  });
}

/**
 * @deprecated The progress indicator this used to look for no longer exists
 * in Grok's UI. Retained as a no-op for any stale callers.
 */
function isVideoProgressVisible(): boolean {
  return !!document.querySelector('span.tabular-nums.animate-pulse');
}

/**
 * @deprecated Grok UI no longer exposes the video progress indicator.
 * Retained for backward compatibility so callers that still import it still link.
 * Returns true immediately.
 */
export function waitForVideoProgressGone(
  _timeoutMs: number = 180000,
  _onProgress?: (pct: number) => void
): Promise<boolean> {
  return Promise.resolve(true);
}

/**
 * Wait for a specified element to appear in the DOM
 */
export function waitForElement(
  selectors: string | readonly string[],
  timeoutMs: number = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if already exists
    const existing = querySelector(selectors);
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      const el = querySelector(selectors);
      if (el) {
        settled = true;
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}
