import { SELECTORS, querySelector } from './selectors';

const IMAGINE_URL = 'https://grok.com/imagine';

/**
 * Check if the current page is exactly grok.com/imagine
 */
export function isOnImaginePage(): boolean {
  const { pathname } = window.location;
  return pathname === '/imagine' || pathname === '/imagine/';
}

/**
 * Always click the sidebar Imagine link to start a fresh /imagine session.
 * This is the single entry point for all generation (image & video).
 */
export async function startNewImagineSession(): Promise<boolean> {
  console.log(`[GrokAuto] startNewImagineSession: current URL = ${window.location.href}`);

  // Strategy 1: Click the sidebar Imagine link (div:nth-child(4) > ul > li > a)
  const sidebarLink = querySelector(SELECTORS.sidebarImagineButton);
  if (sidebarLink) {
    console.log('[GrokAuto] startNewImagineSession: clicking sidebar Imagine link');
    (sidebarLink as HTMLElement).click();
    const ready = await waitForImagineReady(10000);
    if (ready) {
      console.log('[GrokAuto] startNewImagineSession: /imagine ready');
      return true;
    }
  }

  // Strategy 2: Click any a[href="/imagine"] link
  const anyLink = querySelector(SELECTORS.sidebarImagineLink);
  if (anyLink) {
    console.log('[GrokAuto] startNewImagineSession: clicking a[href="/imagine"]');
    (anyLink as HTMLElement).click();
    const ready = await waitForImagineReady(10000);
    if (ready) {
      console.log('[GrokAuto] startNewImagineSession: /imagine ready (fallback link)');
      return true;
    }
  }

  // Strategy 3: Direct navigation (full page reload)
  console.log('[GrokAuto] startNewImagineSession: falling back to direct navigation');
  window.location.href = IMAGINE_URL;
  return false;
}

/**
 * Navigate to /imagine if not already there (used for initial setup only).
 */
export async function navigateToImagine(): Promise<boolean> {
  if (isOnImaginePage()) {
    const form = document.querySelector('form');
    const hasInput = querySelector(SELECTORS.promptInput);
    if (form && hasInput) {
      console.log('[GrokAuto] navigateToImagine: already on /imagine with form ready');
      return true;
    }
  }
  return startNewImagineSession();
}

/**
 * Wait for the imagine page to be ready.
 * Checks: correct URL + form + prompt input available.
 */
function waitForImagineReady(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      const onPage = isOnImaginePage();
      const form = document.querySelector('form');
      const hasInput = querySelector(SELECTORS.promptInput);

      if (onPage && form && hasInput) {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 300);
    };

    check();
  });
}
