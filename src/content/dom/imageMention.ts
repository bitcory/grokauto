import { SELECTORS, querySelector } from './selectors';

/**
 * Wait for a mention/autocomplete popup to appear after typing '@'.
 * Grok.com shows a dropdown with uploaded image references.
 */
function waitForMentionPopup(timeoutMs: number = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check common popup selectors
    const findPopup = (): Element | null => {
      // Try various popup patterns grok.com might use
      const selectors = [
        '[data-radix-popper-content-wrapper]',
        '[role="listbox"]',
        '[role="menu"]',
        '[data-radix-menu-content]',
        '[class*="mention"]',
        '[class*="autocomplete"]',
        '[class*="dropdown"]',
        '[class*="popover"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
      }
      return null;
    };

    const existing = findPopup();
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const observer = new MutationObserver(() => {
      if (settled) return;
      const popup = findPopup();
      if (popup) {
        settled = true;
        observer.disconnect();
        resolve(popup);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        resolve(null);
      }
    }, timeoutMs);
  });
}

/**
 * Find and click a mention item matching the target text (e.g., "Image 1").
 */
function findAndClickMentionItem(targetText: string): boolean {
  // Search across multiple possible containers
  const containerSelectors = [
    '[data-radix-popper-content-wrapper]',
    '[role="listbox"]',
    '[role="menu"]',
    '[data-radix-menu-content]',
  ];

  for (const sel of containerSelectors) {
    const containers = document.querySelectorAll(sel);
    for (const container of containers) {
      // Search for clickable items
      const items = container.querySelectorAll(
        '[role="option"], [role="menuitem"], [data-radix-collection-item], li, div[class*="item"], button'
      );
      for (const item of items) {
        const text = (item as HTMLElement).innerText?.trim() ?? '';
        if (text.includes(targetText)) {
          clickMentionItem(item as HTMLElement);
          console.log(`[GrokAuto] Clicked mention item: "${text}"`);
          return true;
        }
      }
    }
  }

  // Fallback: search the entire document for newly appeared items
  const allClickable = document.querySelectorAll(
    '[role="option"], [role="menuitem"], [role="listbox"] > *'
  );
  for (const item of allClickable) {
    const text = (item as HTMLElement).innerText?.trim() ?? '';
    if (text.includes(targetText)) {
      clickMentionItem(item as HTMLElement);
      console.log(`[GrokAuto] Clicked mention item (fallback): "${text}"`);
      return true;
    }
  }

  return false;
}

/**
 * Click a mention dropdown item with proper event simulation.
 */
function clickMentionItem(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center' });
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts: PointerEventInit & MouseEventInit = {
    bubbles: true, cancelable: true, view: window,
    clientX: x, clientY: y, button: 0, buttons: 0,
  };

  // Hover
  el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseenter', opts));
  el.dispatchEvent(new MouseEvent('mouseover', opts));
  el.focus();

  // Click
  const clickOpts = { ...opts, buttons: 1 };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...clickOpts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', clickOpts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', { ...opts, button: 0 }));
}

/**
 * Type a single `@` character into the prompt input to trigger the mention menu,
 * then select the specified image (e.g., "Image 1").
 */
async function typeAtMention(imageLabel: string): Promise<boolean> {
  const input = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (!input) return false;

  input.focus();
  await new Promise((r) => setTimeout(r, 100));

  // Type '@' to trigger mention popup
  document.execCommand('insertText', false, '@');
  await new Promise((r) => setTimeout(r, 500));

  // Wait for mention popup
  const popup = await waitForMentionPopup(3000);
  if (!popup) {
    console.warn(`[GrokAuto] Mention popup did not appear for "${imageLabel}"`);
    // Delete the '@' we just typed and return false
    document.execCommand('delete', false);
    return false;
  }

  await new Promise((r) => setTimeout(r, 300));

  // Try to find and click the target image item
  for (let attempt = 0; attempt < 3; attempt++) {
    if (findAndClickMentionItem(imageLabel)) {
      await new Promise((r) => setTimeout(r, 500));
      return true;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.warn(`[GrokAuto] Mention item "${imageLabel}" not found`);
  // Close the popup
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return false;
}

/**
 * Insert text into the prompt using execCommand('insertText').
 */
function insertText(text: string): void {
  document.execCommand('insertText', false, text);
}

/**
 * Type the full start/end frame prompt with @Image mentions.
 * Sequence: "use " → @Image 1 → " as the exact start frame and use " → @Image 2 → " as the exact end frame "
 * Then appends the actual user prompt.
 */
export async function typeStartEndFramePrompt(promptText: string): Promise<boolean> {
  const input = querySelector(SELECTORS.promptInput) as HTMLElement | null;
  if (!input) {
    console.error('[GrokAuto] Prompt input not found');
    return false;
  }

  // Clear existing content
  input.focus();
  await new Promise((r) => setTimeout(r, 100));
  if (input instanceof HTMLTextAreaElement) {
    input.select();
  } else {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  document.execCommand('delete', false);
  await new Promise((r) => setTimeout(r, 100));

  // Step 1: Type "use "
  insertText('use ');
  await new Promise((r) => setTimeout(r, 200));

  // Step 2: Insert @Image 1 mention
  const img1 = await typeAtMention('Image 1');
  if (!img1) {
    console.warn('[GrokAuto] Failed to insert @Image 1, falling back to plain text');
    insertText('@Image 1');
  }
  await new Promise((r) => setTimeout(r, 200));

  // Step 3: Type " as the exact start frame and use "
  insertText(' as the exact start frame and use ');
  await new Promise((r) => setTimeout(r, 200));

  // Step 4: Insert @Image 2 mention
  const img2 = await typeAtMention('Image 2');
  if (!img2) {
    console.warn('[GrokAuto] Failed to insert @Image 2, falling back to plain text');
    insertText('@Image 2');
  }
  await new Promise((r) => setTimeout(r, 200));

  // Step 5: Type " as the exact end frame " + actual prompt
  insertText(` as the exact end frame ${promptText}`);
  await new Promise((r) => setTimeout(r, 300));

  console.log(`[GrokAuto] Typed start/end frame prompt with @mentions`);
  return true;
}
