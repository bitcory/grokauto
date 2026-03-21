/**
 * grok.com DOM selectors - centralized management
 * These selectors target the grok.com UI elements for automation.
 * Update here if grok.com changes its DOM structure.
 */
export const SELECTORS = {
  // Sidebar "Imagine" link
  sidebarImagineLink: [
    'a[href="/imagine"]',
    'nav a[href="/imagine"]',
    'aside a[href="/imagine"]',
  ],

  // Sidebar "Imagine" link inside the 4th section (starts a fresh /imagine session)
  sidebarImagineButton: [
    'div.shrink-0.pb-1 > div:nth-child(4) > ul > li > a',
    'div.shrink-0.pb-1 > div:nth-child(4) a',
  ],

  // Prompt input area
  promptInput: [
    'div[contenteditable="true"]',
    'textarea[placeholder]',
    '[data-testid="prompt-textarea"]',
  ],

  // Send/Generate button (bottom-right absolute div inside form)
  sendButtonContainer: [
    'form div.absolute.right-2.bottom-0',
  ],
  sendButton: [
    'button[aria-label="Send"]',
    'button[data-testid="send-button"]',
  ],

  // Mode chip buttons in the input area (Video, Image, etc.)
  modeChips: [
    'form button.rounded-2xl',
    'form div.flex.flex-wrap button',
  ],

  // Aspect ratio trigger (Radix dropdown)
  aspectRatioTrigger: [
    '[id^="radix-"][id$="_16_"]',
    'button[aria-haspopup="menu"][class*="rounded"]',
  ],

  // Aspect ratio menu items
  aspectRatioItem: '[role="menuitem"], [role="option"], [data-radix-collection-item]',

  // Mode switching buttons (legacy tablist-based)
  modeButtons: {
    base: '[role="tablist"] button, [data-testid="mode-selector"] button',
    video: 'button:has(svg), [data-testid="video-mode"]',
    image: 'button:has(svg), [data-testid="image-mode"]',
  },

  // Image upload
  imageUploadInput: 'input[type="file"][accept*="image"]',
  imageUploadArea: '[data-testid="image-upload"], .upload-area',

  // Generation results
  resultContainer: [
    '[data-testid="message-content"]',
    '.message-content',
    '[class*="message"]',
  ],
  resultImage: 'img[src*="blob:"], img[src*="grok"], img[src*="data:"]',
  resultVideo: 'video source, video[src]',

  // Loading/generating indicator (keep selectors specific to avoid false positives)
  loadingIndicator: [
    '[data-testid="loading"]',
    '[data-testid="generating"]',
    'svg.animate-spin',
    '[class*="animate-spin"]',
    '[class*="animate-pulse"]',
  ],

  // Download buttons in result
  downloadButton: [
    'button[aria-label="Download"]',
    'a[download]',
    '[data-testid="download-button"]',
  ],

  // Response messages container
  messagesContainer: [
    '[data-testid="conversation"]',
    '[class*="conversation"]',
    'main',
  ],
} as const;

/**
 * Try multiple selectors and return the first matching element
 */
export function querySelector(
  selectors: string | readonly string[],
  root: Element | Document = document
): Element | null {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  for (const selector of selectorList) {
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch {
      // Invalid selector, skip
    }
  }
  return null;
}

/**
 * Query all matching elements across multiple selectors
 */
export function querySelectorAll(
  selectors: string | readonly string[],
  root: Element | Document = document
): Element[] {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const results: Element[] = [];
  for (const selector of selectorList) {
    try {
      results.push(...root.querySelectorAll(selector));
    } catch {
      // Invalid selector, skip
    }
  }
  return results;
}
