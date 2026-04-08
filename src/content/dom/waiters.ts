import { querySelector } from './selectors';

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
 * Wait for generation to complete.
 * For images: wait for new <img> elements + DOM stabilization (5s min, 2s stable).
 * For videos: wait for <video> with valid src + longer stabilization (20s min, 5s stable).
 */
export function waitForGenerationComplete(
  timeoutMs: number = 120000,
  isVideo: boolean = false
): Promise<boolean> {
  const MIN_TIME = isVideo ? 20000 : 5000;
  const STABLE_TIME = isVideo ? 5000 : 2000;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const initialImgCount = document.querySelectorAll('img').length;
    const initialVideoCount = document.querySelectorAll('video').length;

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
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_TIME) return;

      const timeSinceLastChange = Date.now() - lastDomChangeTime;
      const domStable = timeSinceLastChange >= STABLE_TIME;

      if (isVideo) {
        // For video: require a <video> element with actual src and DOM stable
        if (hasVideoWithSrc() && domStable) {
          console.log(`[GrokAuto] Video generation complete (${Math.round(elapsed / 1000)}s, stable ${Math.round(timeSinceLastChange / 1000)}s)`);
          cleanup();
          resolve(true);
          return;
        }
        // Fallback: after 3x min time with DOM stable (video might use different element)
        if (domStable && elapsed > MIN_TIME * 3) {
          console.log(`[GrokAuto] Video generation complete (fallback, ${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve(true);
          return;
        }
      } else {
        // For images: check new media + DOM stable
        const currentImgCount = document.querySelectorAll('img').length;
        const hasNewMedia = currentImgCount > initialImgCount;

        if (hasNewMedia && domStable) {
          console.log(`[GrokAuto] Image generation complete (${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve(true);
          return;
        }
        // Fallback: DOM stable for a long time
        if (domStable && elapsed > MIN_TIME * 2) {
          console.log(`[GrokAuto] Generation complete (fallback, ${Math.round(elapsed / 1000)}s)`);
          cleanup();
          resolve(true);
          return;
        }
      }
    };

    const observer = new MutationObserver(() => {
      if (settled) return;
      lastDomChangeTime = Date.now();
      if (stabilizationTimer) clearTimeout(stabilizationTimer);
      stabilizationTimer = setTimeout(tryResolve, STABLE_TIME + 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const checkInterval = setInterval(() => {
      if (settled) { clearInterval(checkInterval); return; }
      dismissFeedbackScreen();
      tryResolve();
    }, 2000);

    timeoutId = setTimeout(() => {
      if (!settled) {
        clearInterval(checkInterval);
        cleanup();
        console.log('[GrokAuto] Generation timed out');
        resolve(false);
      }
    }, timeoutMs);
  });
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
 * Detect if the video generation progress indicator is visible.
 * Targets: span.tabular-nums.animate-pulse (e.g. "15%")
 */
function isVideoProgressVisible(): boolean {
  return !!document.querySelector('span.tabular-nums.animate-pulse');
}

/**
 * Read the current generation progress percentage from the DOM.
 * Returns null if the indicator is not visible.
 */
export function readVideoProgress(): number | null {
  const span = document.querySelector('span.tabular-nums.animate-pulse') as HTMLElement | null;
  if (!span) return null;
  const match = span.innerText?.trim().match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Wait for the video generation progress indicator to disappear.
 * Used to trigger upscaling the moment generation finishes.
 * Falls back to a max timeout if the indicator was never detected.
 */
export function waitForVideoProgressGone(
  timeoutMs: number = 180000,
  onProgress?: (pct: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    let indicatorSeen = false;
    const appearDeadline = Date.now() + 5000;
    let lastPct = -1;

    const check = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeoutMs) {
        console.warn('[GrokAuto] waitForVideoProgressGone: timed out');
        resolve(false);
        return;
      }

      const visible = isVideoProgressVisible();

      if (visible) {
        indicatorSeen = true;
        // 진행률 변화 시 콜백 호출
        if (onProgress) {
          const pct = readVideoProgress();
          if (pct !== null && pct !== lastPct) {
            lastPct = pct;
            onProgress(pct);
          }
        }
      }

      if (indicatorSeen && !visible) {
        console.log(`[GrokAuto] Video progress indicator gone (${Math.round(elapsed / 1000)}s)`);
        resolve(true);
        return;
      }

      if (!indicatorSeen && Date.now() > appearDeadline) {
        console.log('[GrokAuto] Video progress indicator never detected — assuming done');
        resolve(true);
        return;
      }

      setTimeout(check, 300);
    };

    check();
  });
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
