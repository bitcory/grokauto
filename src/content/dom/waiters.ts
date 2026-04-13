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
      dismissFeedbackScreen();
      tryResolve();
    }, 2000);

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
}

/**
 * Fast-path generation detection for text-to-image mode.
 *
 * Grok's /imagine page is an SPA, so the previous generation's <img> element
 * (with its base64 data URL src) often persists in the masonry section across
 * "new session" navigations. To avoid falsely matching that stale image, we
 * snapshot every existing data: URL in the masonry sections at the moment this
 * wait begins, then resolve only when an <img> with a src that's NOT in that
 * snapshot appears.
 *
 * Resolves with:
 * - { status: 'completed', imageUrl } → a new data:image src appeared
 * - { status: 'content-hidden' }      → moderation eye-off icon appeared
 * - { status: 'timeout' }             → neither happened within timeoutMs
 */
export function waitForTextToImageResult(
  timeoutMs: number = 120000
): Promise<TextToImageDetection> {
  // 프롬프트 제출 직후에 호출되는 함수이다.
  // Grok은 SPA이므로 이전 세션의 이미지가 DOM에 잔존할 수 있고,
  // 페이지 전환 과정에서 기존 이미지를 새 data URL로 리렌더하기도 한다.
  // 따라서:
  //  1) 기존 data URL을 baseline으로 캡처해서 "새 이미지"의 기준을 잡고
  //  2) MIN_WAIT 동안은 매칭하지 않아서 서버가 실제 생성을 시작할 시간을 확보
  //  3) 이후 baseline에 없는 새 src가 나타나면 비로소 완료 처리

  const MIN_WAIT = 8000; // 최소 8초 대기 — 서버 생성 시작까지 여유
  const STABLE_MS = 2000; // 후보 src가 이 시간 동안 변하지 않아야 "완전 생성"으로 인정

  return new Promise((resolve) => {
    // Snapshot existing data URL images so we ignore the previous generation
    const initialSrcs = new Set<string>();
    document
      .querySelectorAll('[id^="imagine-masonry-section-"] img')
      .forEach((el) => {
        const src = (el as HTMLImageElement).src;
        if (src && src.startsWith('data:image/')) initialSrcs.add(src);
      });
    console.log(
      `[GrokAuto] Text-to-image baseline: ${initialSrcs.size} pre-existing image(s) to ignore`
    );

    const startTime = Date.now();
    let settled = false;

    // 후보가 발견되면 src가 안정화될 때까지 추적
    let candidateImg: HTMLImageElement | null = null;
    let candidateSrc: string | null = null;
    let candidateSince = 0;

    const cleanup = () => {
      settled = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      clearInterval(pollId);
    };

    const isFullyLoaded = (img: HTMLImageElement): boolean =>
      img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;

    const check = () => {
      if (settled) return;
      const elapsed = Date.now() - startTime;

      // Moderation block — always check, even during MIN_WAIT
      if (document.querySelector('svg.lucide-eye-off')) {
        console.log(
          `[GrokAuto] Text-to-image: content hidden (${Math.round(elapsed / 1000)}s)`
        );
        cleanup();
        resolve({ status: 'content-hidden' });
        return;
      }

      // Don't match images until MIN_WAIT has passed,
      // to ensure grok has actually started generating (not just re-rendering old results)
      if (elapsed < MIN_WAIT) return;

      // Look for any data URL <img> that wasn't in the baseline snapshot
      const allImgs = document.querySelectorAll(
        '[id^="imagine-masonry-section-"] img'
      );
      let found: { img: HTMLImageElement; src: string } | null = null;
      for (const el of allImgs) {
        const img = el as HTMLImageElement;
        const src = img.src;
        if (
          src &&
          src.startsWith('data:image/') &&
          src.length > 1000 &&
          !initialSrcs.has(src)
        ) {
          found = { img, src };
          break;
        }
      }

      if (!found) {
        // 후보가 사라졌다면 초기화 (DOM 리렌더링 등)
        if (candidateImg) {
          candidateImg = null;
          candidateSrc = null;
        }
        return;
      }

      // 새 후보로 갱신 또는 기존 후보의 src 변경 시 타이머 리셋
      if (candidateSrc !== found.src) {
        candidateImg = found.img;
        candidateSrc = found.src;
        candidateSince = Date.now();
        console.log(
          `[GrokAuto] Text-to-image candidate detected at ${Math.round(elapsed / 1000)}s — waiting for stabilization (${STABLE_MS}ms)`
        );
        return;
      }

      // src가 유지되었는지 + 이미지가 실제로 디코드 완료인지 확인
      const stableFor = Date.now() - candidateSince;
      if (stableFor < STABLE_MS) return;
      if (!candidateImg || !isFullyLoaded(candidateImg)) return;

      console.log(
        `[GrokAuto] Text-to-image FULLY generated in ${Math.round(elapsed / 1000)}s (stable ${Math.round(stableFor / 1000)}s, ${candidateImg.naturalWidth}×${candidateImg.naturalHeight})`
      );
      cleanup();
      resolve({ status: 'completed', imageUrl: candidateSrc });
    };

    // MutationObserver for real-time DOM changes
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class'],
    });

    // 추가 폴링 — 후보 안정화 판정을 빠르게 잡기 위해 500ms 간격
    const pollId = setInterval(check, 500);

    const timeoutId = setTimeout(() => {
      if (!settled) {
        cleanup();
        console.log('[GrokAuto] Text-to-image generation timed out');
        resolve({ status: 'timeout' });
      }
    }, timeoutMs);

    // Initial check (MIN_WAIT 때문에 즉시 매칭은 안 됨)
    check();
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
