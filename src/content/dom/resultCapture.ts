/**
 * Get the URL of the first generated image inside the imagine masonry section.
 * Used for text-to-image where Grok no longer exposes the download button.
 */
export function getFirstGeneratedImageUrl(): string | null {
  // Prefer explicit alt="Generated image" to avoid picking up Discover thumbnails
  const tagged = document.querySelector(
    '[id^="imagine-masonry-section-"] img[alt="Generated image"]'
  ) as HTMLImageElement | null;
  if (tagged?.src) return tagged.src;

  // Fallback: first img in the main masonry section
  const section = document.querySelector('#imagine-masonry-section-0');
  if (section) {
    const img = section.querySelector('img') as HTMLImageElement | null;
    if (img?.src) return img.src;
  }
  const fallbackSection = document.querySelector('[id^="imagine-masonry-section-"]');
  if (fallbackSection) {
    const img = fallbackSection.querySelector('img') as HTMLImageElement | null;
    if (img?.src) return img.src;
  }
  console.warn('[GrokAuto] getFirstGeneratedImageUrl: no image found in masonry section');
  return null;
}

/**
 * Collect all text-to-image generated image URLs from the masonry.
 * Filters to `alt="Generated image"` so Discover/gallery thumbnails are ignored.
 * Optionally excludes a baseline set of URLs captured before submit.
 *
 * Quality mode → returns exactly 4 URLs. Speed mode returns many (caller decides).
 */
export function getTextToImageGeneratedUrls(baseline?: Set<string>): string[] {
  const imgs = Array.from(
    document.querySelectorAll('[id^="imagine-masonry-section-"] img[alt="Generated image"]')
  ) as HTMLImageElement[];
  const urls: string[] = [];
  for (const img of imgs) {
    const src = img.src;
    if (!src) continue;
    if (baseline?.has(src)) continue;
    urls.push(src);
  }
  return urls;
}

/**
 * Collect all image-to-image generated URLs from the result article.
 * Filters to URLs containing `/generated/` — the reference upload is at a
 * different path so it's naturally excluded.
 * `?cache=1` style query is stripped so the same image downloads as a clean URL.
 */
export function getImageToImageGeneratedUrls(): string[] {
  const articles = document.querySelectorAll('article');
  const lastArticle = articles[articles.length - 1];
  if (!lastArticle) return [];
  const imgs = Array.from(lastArticle.querySelectorAll('img')) as HTMLImageElement[];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const img of imgs) {
    const raw = img.src;
    if (!raw || !raw.includes('/generated/')) continue;
    const clean = raw.split('?')[0];
    if (seen.has(clean)) continue;
    seen.add(clean);
    urls.push(clean);
  }
  return urls;
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
