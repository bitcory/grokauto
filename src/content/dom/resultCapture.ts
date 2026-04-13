/**
 * Get the URL of the first generated image inside the imagine masonry section.
 * Used for text-to-image where Grok no longer exposes the download button.
 * Selector source: #imagine-masonry-section-0 ... > div:nth-child(1) > img
 */
export function getFirstGeneratedImageUrl(): string | null {
  // Primary: exact id #imagine-masonry-section-0
  const section = document.querySelector('#imagine-masonry-section-0');
  if (section) {
    const img = section.querySelector('img') as HTMLImageElement | null;
    if (img?.src) return img.src;
  }
  // Fallback: any imagine-masonry-section-* (in case the index changes)
  const fallbackSection = document.querySelector('[id^="imagine-masonry-section-"]');
  if (fallbackSection) {
    const img = fallbackSection.querySelector('img') as HTMLImageElement | null;
    if (img?.src) return img.src;
  }
  console.warn('[GrokAuto] getFirstGeneratedImageUrl: no image found in masonry section');
  return null;
}

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
