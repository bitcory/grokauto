import { querySelector } from './selectors';

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
