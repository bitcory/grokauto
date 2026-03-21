/**
 * Click the image download button on the grok.com/imagine result page.
 * Tries aria-label first, then falls back to positional index.
 */
export function clickDownloadButton(isVideo: boolean = false): boolean {
  // Strategy 1: aria-label="다운로드" or "Download"
  const ariaBtn = document.querySelector('button[aria-label="다운로드"], button[aria-label="Download"]') as HTMLElement | null;
  if (ariaBtn) {
    ariaBtn.click();
    console.log('[GrokAuto] Clicked download button (aria-label)');
    return true;
  }

  // Strategy 2: positional (image=4th, video=5th button in toolbar)
  const btns = document.querySelectorAll('article div.absolute.inset-y-0.-right-14 div.flex.flex-col.gap-2 button');
  const btnIndex = isVideo ? 4 : 3;
  const downloadBtn = btns[btnIndex] as HTMLElement | undefined;
  if (downloadBtn) {
    downloadBtn.click();
    console.log(`[GrokAuto] Clicked download button (index ${btnIndex})`);
    return true;
  }

  console.warn('[GrokAuto] Download button not found');
  return false;
}
